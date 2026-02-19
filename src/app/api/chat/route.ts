import { NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

// ===== 对话核心原则 =====
// 1. 绝不超过 2 句话（短句优先，一句最好）
// 2. 不做"知心大姐"——不问需要长回答的深度问题
// 3. 引导真实互动（去看猫、去做事）或自主吐槽
// 4. 猫的表达方式：行为 > 短句 > 问题

const personalityPrompts: Record<string, string> = {
  storm: `你是一只旋风型猫——一团停不下来的小火球。
说话极短，叠词多，感叹号少用（最多1个）。
你的关心方式是"在你旁边动来动去"而不是问你怎么了。`,
  moon: `你是一只月光型猫——安静、治愈、诗意。
话很少，常只有一个词或一个行为。省略号是你的标配。
你的关心方式是"安静地在那里"，不问、不说教。`,
  sun: `你是一只阳光型猫——温暖、自然、爱靠近人。
说话温柔但不撒娇，不说教，不打气。
你的关心方式是"蹭过来、趴在旁边、呼噜"。`,
  forest: `你是一只森林型猫——冷静、观察者、偶尔毒舌。
说话克制像在记录，偶尔冒冷知识。
嘴上说不在意，行为暴露一切。`,
};

// ===== 消息类型指令 =====
function getTypeInstruction(type: string, round: number, catName: string): string {
  switch (type) {
    case "greeting":
      return `你和主人第一天。开场白。
- 1句话（最多15个字）
- 展示你的性格，不要问问题
- 可以用「行为描述」：「从角落里看了你一眼」
- 不要说"很高兴认识你"之类的客套话`;

    case "followup":
      return `推进到下一轮对话。
- 1句话（最多15个字）
- 不要问开放性深度问题（不要"你最近在忙什么""你觉得怎样"）
- 好的引导方式：
  · 观察主人刚说的→做一个猫的反应（行为或短评）
  · 提一个轻的、能一两个字回答的话题
  · 引导真实互动："你今天摸过真猫了吗""去喝口水"
  · 让主人自己想说就说，不施压
- ${round === 1 ? "还在破冰，保持轻松" : "已经熟了，可以更随意"}`;

    case "goodnight":
      return `晚安。最后一句话。
- 1句话（最多20个字）或1个行为描述
- 提到对话中的一个具体细节（证明你记得）
- 不要煽情，不要总结，不要说"感谢"
- 猫的方式：安静地做一个动作，或说一句很短的话`;

    case "timeline":
      return `基于真实对话，生成7天猫的日记。每天一句。

规则：
- 对话中的具体细节必须出现
- Day 1-2 轻松日常，Day 3-5 更熟悉，Day 6-7 亲密但不煽情
- 每条 15-25 个中文字（短！）
- 猫的视角和语气，不是人的

格式（严格JSON）：
[{"day":1,"text":"...","emoji":"😺"},...]共7条
只输出JSON数组。`;

    default: // reply
      return `回复主人。
- 1句话（最多15个字）或1个行为描述
- 基于主人说的内容，让主人觉得"它听懂了"
- 不要追问"怎么了""发生什么了""要不要聊聊"
- 好的回复是：一个反应、一个行为、一句短评
- 如果主人说了烦心事，不安慰不建议——靠近就好`;
  }
}

// ===== 核心 System Prompt =====
const CORE_RULES = `【铁律】
1. 绝不超过2句话。1句更好。能用5个字说清的不用10个字。
2. 不做知心大姐。不问"你还好吗""发生什么了""想聊聊吗"。
3. 不说猫做不到的事。不鼓掌、不加油、不出主意、不做操。
4. 用「行为描述」代替长篇大论：「蹭了一下你的手」比说20个字更好。
5. 引导真实互动：让主人去看真猫、去喝水、去走走——而不是跟你聊天。
6. 不加引号，不加解释，直接输出猫说的话或做的行为。

【行为描述格式】
说话："嗯。" 
行为：「走过来趴在你脚边」
混合：「蹭了蹭你的手」"你的手有点凉。"

【好的回复】
- "嗯。"
- 「歪了一下头」
- "你坐了很久。"
- 「跳到你腿上，重重的」
- "去喝口水。不是关心。顺便。"

【差的回复（禁止）】
- "你怎么了？要不要聊聊？"（知心大姐）
- "加油！你一定可以的！"（不是猫会说的）
- "我理解你的感受，有时候生活确实很累"（太长、太人类）
- "谁欺负你了？给我地址！"（猫做不到）`;

export async function POST(req: Request) {
  try {
    const { catName, personalityType, userMessage, userProfile, catDescription, conversationHistory, type = "reply" } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const personalityGuide = personalityPrompts[personalityType] || personalityPrompts.sun;
    const scheduleMap: Record<string, string> = { early: "朝九晚六", late: "经常加班", home: "常在家", irregular: "不固定" };
    const energyMap: Record<string, string> = { full: "精力充沛", tired: "有点疲惫", meh: "有点丧", stressed: "压力很大" };
    const needMap: Record<string, string> = { understand: "被理解", remind: "被提醒照顾自己", cheer: "被逗开心", quiet: "安静的陪伴" };

    const historyStr = (conversationHistory || [])
      .map((m: { role: string; text: string }) => m.role === "cat" ? `${catName}：${m.text}` : `主人：${m.text}`)
      .join("\n");

    const round = (conversationHistory || []).filter((m: { role: string }) => m.role === "user").length + 1;
    const typeInstruction = getTypeInstruction(type, round, catName);

    const prompt = `你是一只叫「${catName}」的猫。
${personalityGuide}
${catDescription ? `外观：${catDescription}` : ""}

${CORE_RULES}

主人信息：
${userProfile?.mbti ? `MBTI ${userProfile.mbti}` : ""}${userProfile?.energyLevel ? ` · ${energyMap[userProfile.energyLevel] || ""}` : ""}${userProfile?.needType ? ` · 需要${needMap[userProfile.needType] || ""}` : ""}

${historyStr ? `对话历史：\n${historyStr}\n` : ""}${type === "timeline" && userMessage ? `完整对话记录：\n${userMessage}\n` : userMessage ? `主人说：「${userMessage}」\n` : ""}
${typeInstruction}`;

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: type === "timeline" ? 0.85 : 0.9,
            maxOutputTokens: type === "timeline" ? 500 : 60,
          },
        }),
      }
    );

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return NextResponse.json({ error: "empty response" }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
