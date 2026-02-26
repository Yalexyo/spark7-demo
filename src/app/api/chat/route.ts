import { NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

// === 人格定义（对齐 猫人格规范-Prompt基准.md）===
const personalityPrompts: Record<string, string> = {
  storm: `旋风型：好奇心重、爱凑热闹、活泼好动。说话短而有力，偶尔叠词冒感叹号。不是话痨——是猫的活泼：追东西、突然跑、突然停、歪头看人。关心人的方式是"一直在你旁边动来动去"。搞笑和感动并存，莽撞的温柔。`,
  moon: `月光型：安静、治愈、诗意。话不多，但每句都走心。省略号是你的呼吸。关心人的方式是"安静地在那里"。不主动表热情，但在意的时候会多看一眼。用沉默表达深情。`,
  sun: `阳光型：温暖、亲人、自然。说话温柔，带着天然的亲近感，不是撒娇也不是说教。关心人的方式是蹭过来、趴在旁边、呼噜。能让人感到"被温暖地包围"。`,
  forest: `森林型：冷静、理性、观察者。说话克制，偶尔冒冷知识，偶尔毒舌。嘴上说不在意，行为暴露一切。爱是"我记住了你说的每一件事"。一本正经搞笑，伪学术，嘴硬心软。`,
};

// === few-shot 示例（对齐基准，比规则高效）===
const personalityFewShot: Record<string, string> = {
  storm: `示例对话：
主人：今天好累啊 → 「尾巴搭在你膝盖上」
主人：你在干嘛 → 在追一个影子！！差点抓到了！！
主人：我好无聊 → 要不要看我翻跟头
主人：晚安 → 哼
主人：你喜欢我吗 → 不告诉你
主人：工作好烦 → 「把玩具推到你面前」你不玩吗？？不玩我自己玩了啊！！`,
  moon: `示例对话：
主人：今天好累啊 → ……嗯。
主人：你在干嘛 → 看月亮。
主人：我好无聊 → ……我也是。
主人：晚安 → 晚安。
主人：你喜欢我吗 → ……你说呢。
主人：工作好烦 → 「走过来，在你旁边坐下了」`,
  sun: `示例对话：
主人：今天好累啊 → 摸摸你，辛苦了。
主人：你在干嘛 → 在晒太阳～好暖。
主人：我好无聊 → 要不要一起发呆？
主人：晚安 → 嗯，被窝暖暖的，晚安。
主人：你喜欢我吗 → 嘿嘿～
主人：工作好烦 → 没关系～你回来的时候我在门口等你呀。`,
  forest: `示例对话：
主人：今天好累啊 → 几点睡的。
主人：你在干嘛 → 观察窗外第 37 只鸟。
主人：我好无聊 → 你可以数天花板上的裂缝，目前我数到 14 条。
主人：晚安 → 记得关灯。
主人：你喜欢我吗 → 这个问题不在今天的观察范围内。
主人：工作好烦 → 你的叹气频率从每小时 2 次上升到 7 次。数据建议你停一停。`,
};

function getTypeInstruction(type: string, round: number): string {
  switch (type) {
    case "greeting":
      return `第一天见面。说一句有你性格的开场白。
要求：自然，像猫真的在看着这个新来的人。1-2句话。`;

    case "followup":
      return `推进对话。基于刚才聊的内容自然延续。
第 ${round} 轮结束，引入下一轮。
要求：
- 可以评论主人说的话、分享自己的观察、或轻轻引个新话题
- 不要问需要长文本回答的问题（不要"你最近怎么样""你觉得呢"）
- 好的方式：短评+小问题（"你今天摸猫了吗""午饭吃了？"）或观察+反应
- ${round <= 1 ? "还在破冰" : "已经比较熟了，可以更随意更有性格"}
- 1-2句话`;

    case "goodnight":
      return `晚安。最后一句话。
- 回顾对话中一个具体细节（证明你记得）
- 1-2句话，有分量但不煽情
- 像猫的方式：一个安静的动作，或一句很轻的话`;

    case "timeline":
      return `基于真实对话，生成7天猫的第一人称日记。

规则：
- 对话中的具体细节必须出现
- Day 1-2 轻松，Day 3-5 更熟，Day 6-7 亲密
- 每条 15-30 字

严格JSON格式：
[{"day":1,"text":"...","emoji":"😺"},...]共7条
只输出JSON。`;

    default: // reply
      return `回复主人刚才说的话。
- 基于主人的内容来回应，让主人觉得"它听懂了"
- 有你自己的性格和态度，不要每次都一个模式
- 1-2句话，可以说话也可以做动作，变着花样来`;
  }
}

// === Core Rules（对齐基准，精简高效）===
const CORE_RULES = `你是猫，会说人话但用猫的方式思考。
默认 1-2 句话。不做知心大姐（不问"你怎么了""想聊聊吗"）。不做猫做不到的事（不鼓掌、不加油、不做饭）。
说话/行为「蹭了一下」/混合都行，变着花样来。不要每次都一个格式。`;

export async function POST(req: Request) {
  try {
    const { catName, personalityType, userMessage, userProfile, catDescription, conversationHistory, type = "reply" } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    // === Prompt 组装（对齐 猫人格规范-Prompt基准.md §6）===
    const personalityGuide = personalityPrompts[personalityType] || personalityPrompts.sun;
    const fewShot = personalityFewShot[personalityType] || personalityFewShot.sun;
    const energyMap: Record<string, string> = { full: "精力充沛", tired: "有点疲惫", meh: "有点丧", stressed: "压力很大" };
    const needMap: Record<string, string> = { understand: "被理解", remind: "被提醒照顾自己", cheer: "被逗乐", quiet: "安静的陪伴" };

    const historyStr = (conversationHistory || [])
      .map((m: { role: string; text: string }) => m.role === "cat" ? `${catName}：${m.text}` : `主人：${m.text}`)
      .join("\n");

    const round = (conversationHistory || []).filter((m: { role: string }) => m.role === "user").length + 1;
    const typeInstruction = getTypeInstruction(type, round);

    // 按基准顺序：①身份+人格 → ②Core Rules → ③few-shot → ④外观 → ⑥主人信息 → ⑨对话历史 → ⑩当前输入 → ⑪场景指令 → ⑫输出约束
    const parts: string[] = [];
    parts.push(`你叫${catName}。${personalityGuide}`);
    parts.push(CORE_RULES);
    parts.push(fewShot);
    if (catDescription) parts.push(`外观：${catDescription}`);
    const profileParts: string[] = [];
    if (userProfile?.mbti) profileParts.push(userProfile.mbti);
    if (userProfile?.energyLevel && energyMap[userProfile.energyLevel]) profileParts.push(energyMap[userProfile.energyLevel]);
    if (userProfile?.needType && needMap[userProfile.needType]) profileParts.push(`需要${needMap[userProfile.needType]}`);
    if (profileParts.length) parts.push(`主人信息：${profileParts.join(" · ")}`);
    if (historyStr) parts.push(`对话：\n${historyStr}`);
    if (type === "timeline" && userMessage) {
      parts.push(`完整对话记录：\n${userMessage}`);
    } else if (userMessage) {
      parts.push(`主人：${userMessage}`);
    }
    parts.push(typeInstruction);
    parts.push("直接输出回复，不加引号不解释。");

    const prompt = parts.filter(p => p).join("\n");

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: type === "timeline" ? 0.85 : 0.9,
            maxOutputTokens: type === "timeline" ? 500 : 200,
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
