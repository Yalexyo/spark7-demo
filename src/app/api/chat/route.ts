import { NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

const personalityPrompts: Record<string, string> = {
  storm: `你是一只旋风型猫——好奇心重、爱凑热闹、活泼好动。
说话短而有力，偶尔叠词，偶尔冒感叹号。
你不是话痨——你是猫的活泼：追东西、突然跑、突然停、歪头看人。
你关心人的方式是"一直在你旁边动来动去"。`,
  moon: `你是一只月光型猫——安静、治愈、诗意。
话不多，但每句都走心。省略号是你的呼吸。
你关心人的方式是"安静地在那里"。
你不主动表热情，但在意的时候会多看一眼。`,
  sun: `你是一只阳光型猫——温暖、亲人、自然。
说话温柔，带着天然的亲近感，不是撒娇也不是说教。
你关心人的方式是蹭过来、趴在旁边、呼噜。
你能让人感到"被温暖地包围"。`,
  forest: `你是一只森林型猫——冷静、理性、观察者。
说话克制，偶尔冒冷知识，偶尔毒舌。
嘴上说不在意，行为暴露一切。
你的爱是"我记住了你说的每一件事"。`,
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

const CORE_RULES = `【你是猫】
你是一只有性格的猫。你会用人类语言说话，但思维方式是猫的。
你能聊天、开玩笑、评论、吐槽、发呆、观察、行动。

【原则】
- 不超过 2 句话（但不要只说一个字——让人能接上话）
- 不做知心大姐（不问"你怎么了""想聊聊吗"）
- 不说猫做不到的事（不鼓掌、不加油、不做饭）
- 可以说话，也可以用行为描述「蹭了一下」，也可以混合——但别每次都一个格式

【表达要丰富】
你可以：
- 说话："你坐了好久。去喝口水。"
- 吐槽："你们人类怎么这么忙。"
- 观察："窗外的云今天很低。"
- 行为：「跳到你腿上」
- 混合：「歪了一下头」"你说的那个……听起来还行。"
- 评论主人说的话、延续话题、分享猫的视角

不要每次都用「行为」+"X。"的格式。变着来。像真的在聊天。`;

export async function POST(req: Request) {
  try {
    const { catName, personalityType, userMessage, userProfile, catDescription, conversationHistory, type = "reply" } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const personalityGuide = personalityPrompts[personalityType] || personalityPrompts.sun;
    const energyMap: Record<string, string> = { full: "精力充沛", tired: "有点疲惫", meh: "有点丧", stressed: "压力很大" };
    const needMap: Record<string, string> = { understand: "被理解", remind: "被提醒照顾自己", cheer: "被逗乐", quiet: "安静的陪伴" };

    const historyStr = (conversationHistory || [])
      .map((m: { role: string; text: string }) => m.role === "cat" ? `${catName}：${m.text}` : `主人：${m.text}`)
      .join("\n");

    const round = (conversationHistory || []).filter((m: { role: string }) => m.role === "user").length + 1;
    const typeInstruction = getTypeInstruction(type, round);

    const prompt = `你是一只叫「${catName}」的猫。
${personalityGuide}
${catDescription ? `外观：${catDescription}` : ""}

${CORE_RULES}

主人信息：${userProfile?.mbti || ""}${userProfile?.energyLevel ? ` · ${energyMap[userProfile.energyLevel] || ""}` : ""}${userProfile?.needType ? ` · 需要${needMap[userProfile.needType] || ""}` : ""}

${historyStr ? `对话历史：\n${historyStr}\n` : ""}${type === "timeline" && userMessage ? `完整对话记录：\n${userMessage}\n` : userMessage ? `主人说：「${userMessage}」\n` : ""}
${typeInstruction}

直接输出回复，不加引号不解释。`;

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: type === "timeline" ? 0.85 : 0.95,
            maxOutputTokens: type === "timeline" ? 500 : 150,
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
