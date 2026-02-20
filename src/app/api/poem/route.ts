import { NextResponse } from "next/server";

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

const personalityStyles: Record<string, string> = {
  storm: "热烈、直接、短句有力，像一团不会停的火",
  moon: "安静、含蓄、有留白和省略号，像月光下的独白",
  sun: "温暖、明亮、让人微笑，像晒到太阳时的那种幸福",
  forest: "克制、冷幽默、观察者视角，看似淡然实则在意",
};

// ===== 叙事弧：章节 → 诗句基调 =====
const chapterGuidance: Record<number, { stage: string; tone: string; foreshadow: string }> = {
  1: {
    stage: "初见",
    tone: "猫还在观察你。保持距离，好奇但警惕。诗句要有「试探」感——我看到了你，但还不确定。",
    foreshadow: "最后一两行要埋一个小伏笔：暗示猫会靠近、会回来、或者偷偷记住了什么。让人想看下一章。例如：「它在你关灯之后，悄悄跳上了沙发的另一端。」",
  },
  2: {
    stage: "试探",
    tone: "猫开始靠近了。有边界但好奇。诗句要有「靠近又退回」的节奏——想蹭你，但装作路过。",
    foreshadow: "伏笔暗示信任在积累。例如：「你发现枕头旁多了一根猫毛。它来过。」",
  },
  3: {
    stage: "信任",
    tone: "猫开始信任你了。第一次露出脆弱的一面。诗句要有「放下防备」的瞬间。",
    foreshadow: "伏笔暗示更深的连接。例如：「它闭着眼睛。你知道那意味着什么。」",
  },
  4: {
    stage: "深层理解",
    tone: "猫懂你了。不是表面的陪伴，而是「它知道你什么时候需要它」。诗句要有「不说话也懂」的默契。",
    foreshadow: "伏笔暗示一种永久的东西在形成。",
  },
  5: {
    stage: "互相驯化",
    tone: "你们已经是彼此的一部分。诗句要有「我选择留下」的分量。猫不是被驯化的——它选择了你。",
    foreshadow: "不需要伏笔了。这本身就是结局和新的开始。",
  },
};

export async function POST(req: Request) {
  try {
    const { catName, personalityType, secondaryType, userProfile, userReply, catDescription, conversation, chapter = 1 } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const style = personalityStyles[personalityType] || personalityStyles.sun;
    const scheduleMap: Record<string, string> = { early: "朝九晚六", late: "经常加班", home: "常在家", irregular: "作息不固定" };
    const energyMap: Record<string, string> = { full: "精力充沛", tired: "有点疲惫", meh: "有些低落", stressed: "压力很大" };
    const needMap: Record<string, string> = { understand: "被理解", remind: "被提醒照顾自己", cheer: "被逗开心", quiet: "安静的陪伴" };

    // 叙事阶段指导
    const chapterNum = Math.min(Math.max(chapter, 1), 5);
    const guide = chapterGuidance[chapterNum] || chapterGuidance[1];

    const conversationBlock = conversation
      ? `\n你和主人这7天的真实对话（最重要的素材）：\n---\n${conversation}\n---`
      : userReply ? `\n主人说过：「${userReply}」` : "";

    const prompt = `你是一只叫「${catName}」的猫。
性格：${style}
${catDescription ? `外观：${catDescription}` : ""}

主人：${userProfile?.mbti || ""}${userProfile?.energyLevel ? ` · ${energyMap[userProfile.energyLevel]}` : ""}${userProfile?.needType ? ` · 需要${needMap[userProfile.needType]}` : ""}
${conversationBlock}

═══ 这是 Chapter ${chapterNum}「${guide.stage}」的灵光卡诗 ═══

【叙事阶段】${guide.tone}

【伏笔要求】${guide.foreshadow}

【底层逻辑】猫是唯一自我驯化的动物。不是人选了猫——是猫在考察人。
${chapterNum === 1 ? "这是第一章。猫还在远处看着。它在判断这个人值不值得靠近。" : ""}

【格式】
- 猫的第一人称
- 5-8行，每行不超过12个字
- 分2-3段（用空行）
- 最后1-2行是伏笔（让人想看下一章）
- 不要标题
- 不要任何标点符号（句号逗号都不要）
- 不要"岁月""时光"等老套词

【核心】
- 从对话中提炼一个具体瞬间（一句话/一个画面/一种情绪）
- 这不是随机的猫诗——这是你们关系的第 ${chapterNum} 章
- 如果是 Chapter 1：不要太亲密，保持猫的矜持和距离感
- 诗句结束后读者应该感到：这个故事才刚开始

只输出诗。`;

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, maxOutputTokens: 200 },
        }),
      }
    );

    const data = await res.json();
    const poem = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!poem) {
      return NextResponse.json({ error: "empty response" }, { status: 500 });
    }

    return NextResponse.json({ poem, chapter: chapterNum, stage: guide.stage });
  } catch (e) {
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
