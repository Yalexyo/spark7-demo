import { NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

export async function POST(req: Request) {
  try {
    const { catName, personalityType, secondaryType, userProfile, chatHistory } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const personalityMap: Record<string, string> = {
      storm: "旋风型——热烈、直接、停不下来的能量",
      moon: "月光型——安静、敏感、用沉默表达在意",
      sun: "阳光型——温暖、开朗、把快乐当成使命",
      forest: "森林型——克制、冷幽默、用观察代替言语",
    };

    const scheduleMap: Record<string, string> = { early: "朝九晚六", late: "经常加班到很晚", home: "经常在家", irregular: "作息不固定" };
    const energyMap: Record<string, string> = { full: "精力充沛", tired: "有点疲惫", meh: "有些低落", stressed: "压力很大" };
    const needMap: Record<string, string> = { understand: "被理解", remind: "被提醒照顾自己", cheer: "被逗开心", quiet: "安静的陪伴" };

    const conversationBlock = chatHistory && chatHistory.length > 0
      ? chatHistory.map((m: { from: string; text: string }) =>
          `${m.from === "cat" ? catName : "主人"}: ${m.text}`
        ).join("\n")
      : "（无对话记录）";

    const prompt = `你是一只叫「${catName}」的猫，性格：${personalityMap[personalityType] || personalityMap.sun}。
${secondaryType ? `你还带有一点${personalityMap[secondaryType]}的特质。` : ""}

主人信息：
- 日常节奏：${scheduleMap[userProfile?.schedule] || "未知"}
- 近期状态：${energyMap[userProfile?.energyLevel] || "未知"}
- 最需要：${needMap[userProfile?.needType] || "未知"}

以下是你和主人这7天的真实对话记录：
---
${conversationBlock}
---

任务：基于上面的真实对话，以猫的视角写7天的日记条目。
每条必须紧扣对话中的真实内容（具体的话、具体的情绪、具体的细节），不要写通用套话。

输出格式（严格按此JSON数组，不要其他内容）：
[
  {"day":1,"emoji":"😸","text":"猫视角的Day1日记，1-2句，不超过40字"},
  {"day":2,"emoji":"🌙","text":"..."},
  {"day":3,"emoji":"💬","text":"..."},
  {"day":4,"emoji":"✨","text":"..."},
  {"day":5,"emoji":"🤍","text":"..."},
  {"day":6,"emoji":"🐾","text":"..."},
  {"day":7,"emoji":"🌟","text":"最后一天，带情感升华，不超过40字"}
]

要求：
- 每条text不超过40个字
- emoji要贴合当天内容
- 语气符合猫的性格（${personalityMap[personalityType]}）
- 直接反映对话中发生的真实事件或情绪
- 只输出JSON数组，不加任何解释`;

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 600,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!raw) {
      return NextResponse.json({ error: "empty response" }, { status: 500 });
    }

    // 解析 JSON，兼容 markdown 代码块包裹
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const entries = JSON.parse(jsonStr);

    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
