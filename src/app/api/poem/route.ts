import { NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

const personalityStyles: Record<string, string> = {
  storm: "热烈、直接、充满感叹号和动感，像一团不会停的火",
  moon: "安静、含蓄、有留白和省略号，像月光下的独白",
  sun: "温暖、明亮、让人微笑，像晒到太阳时的那种幸福",
  forest: "克制、冷幽默、观察者视角，看似淡然实则在意",
};

export async function POST(req: Request) {
  try {
    const { catName, personalityType, secondaryType, userProfile, userReply, catDescription, conversation } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const style = personalityStyles[personalityType] || personalityStyles.sun;
    const scheduleMap: Record<string, string> = { early: "朝九晚六", late: "经常加班到很晚", home: "经常在家", irregular: "作息不固定" };
    const energyMap: Record<string, string> = { full: "精力充沛", tired: "有点疲惫", meh: "有些低落", stressed: "压力很大" };
    const needMap: Record<string, string> = { understand: "被理解", remind: "被提醒照顾自己", cheer: "被逗开心", quiet: "安静的陪伴" };

    const secondaryInfo = secondaryType
      ? `\n你还有一点${
          { storm: "旋风", moon: "月光", sun: "阳光", forest: "森林" }[secondaryType as string]
        }的特质——偶尔会展现出不同于主性格的一面。`
      : "";

    // 完整对话记录（核心素材）
    const conversationBlock = conversation
      ? `\n以下是你和主人这7天的真实对话记录（这是最重要的素材，诗句要从这些对话中提炼情感精华）：
---
${conversation}
---`
      : userReply
      ? `\n主人在对话中对你说过：「${userReply}」`
      : "";

    const prompt = `你是一只叫「${catName}」的猫。
你的主性格风格：${style}${secondaryInfo}
${catDescription ? `你的外观：${catDescription}` : ""}

你的主人：
${userProfile?.mbti ? `- MBTI 是 ${userProfile.mbti}` : "- MBTI 未知"}
- 日常节奏：${scheduleMap[userProfile?.schedule] || "未知"}
- 近期状态：${energyMap[userProfile?.energyLevel] || "未知"}
- 最需要的是：${needMap[userProfile?.needType] || "未知"}
${conversationBlock}

现在你要写灵光卡诗——这是你们7天共处记忆的结晶。

核心要求：
- 从对话记录中提炼最触动人心的瞬间（一个细节、一句话、一个画面）
- 用猫的第一人称，5-8行，每行不超过16个字，可以有空行分段
- 不要标题，直接输出诗
- 语气要符合你的性格风格
- 融入主人的真实状态和需要（但不要直接提MBTI这个词）
- 把对话中的某个具体瞬间化为诗意画面（比如主人说的某句话、某个场景、某种情绪）
${secondaryType ? "- 在最后隐约透出你性格中的另一面" : ""}
- 让人读了想流泪或微笑
- 不要用"在某个"、"有一天"这种开头
- 不要用"岁月"、"时光荏苒"这种老套词
- 只输出诗，不要任何解释或标点符号（句号、逗号都不要）`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    const data = await res.json();
    const poem = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!poem) {
      return NextResponse.json({ error: "empty response" }, { status: 500 });
    }

    return NextResponse.json({ poem });
  } catch (e) {
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
