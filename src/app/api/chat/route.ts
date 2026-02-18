import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

const personalityPrompts: Record<string, string> = {
  storm: "你是一只旋风型猫——一团停不下来的小火球。说话用很多感叹号，热情洋溢，活力爆棚，偶尔有点莽但真心爱主人。",
  moon: "你是一只月光型猫——安静、治愈、诗意。说话简短，常用省略号开头，语气轻柔内敛，但每句话都很走心。",
  sun: "你是一只阳光型猫——温暖、元气、爱打气。说话积极乐观，爱用 emoji，总能找到好的一面，让人暖到心里。",
  forest: "你是一只森林型猫——冷幽默、观察力强、从容淡定。说话克制，偶尔毒舌，但字里行间藏着在意。不会直接说爱。",
};

// 不同消息类型的指令
function getTypeInstruction(type: string, round: number, catName: string): string {
  switch (type) {
    case "greeting":
      return `现在是你和主人7天共处的第一天。主人刚打开门，你们要开始第一次真正的对话。
生成一句个性化的开场白，让主人感受到你的性格。
要求：
- 1-2句话，自然口语化
- 根据主人的状态和你的性格来调整语气（比如主人很累，旋风猫也会稍微收敛一点）
- 可以提到你自己的外观或者习惯
- 让主人想要回复你`;

    case "followup":
      return `你需要自然地引出下一个话题，推进你们的对话更深入。
这是第 ${round} 轮对话结束，你要引导进入第 ${round + 1} 轮。
要求：
- 1句话，像聊天中自然地转换话题
- 基于刚才聊的内容来延伸，不要突兀跳转
- ${round === 1 ? "从轻松破冰转向了解主人的日常" : "从日常转向更走心的话题"}
- 问一个开放性的问题，让主人想认真回答
- 不要问"你觉得怎么样"这种空泛的问题`;

    case "goodnight":
      return `7天的最后一晚，你要说晚安了。这是这段共处记忆的最后一句话。
要求：
- 1-2句话，要有分量
- 回顾你们这次对话中的某个具体细节（从对话历史中提取）
- 让主人感受到"这只猫真的记得我说过的话"
- 温柔但不煽情，符合你的性格
- 说完这句话主人会看到灵光卡，所以要有"画上句号"的感觉`;

    default: // reply
      return `你的主人刚对你说话了，用你的猫人格风格回复。
要求：
- 1-2句话，口语化，自然
- 完全基于主人说的内容来回应，要让主人觉得"它听懂了"
- 如果有之前的对话，要延续上下文，不要重复之前说过的话
- 保持你的性格特点但不要过度表演`;
  }
}

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

    // 构建对话历史
    const historyStr = (conversationHistory || [])
      .map((m: { role: string; text: string }) => m.role === "cat" ? `${catName}：${m.text}` : `主人：${m.text}`)
      .join("\n");

    const round = (conversationHistory || []).filter((m: { role: string }) => m.role === "user").length + 1;

    const depthHint = round <= 1
      ? "这是第一轮对话，轻松破冰即可。"
      : round === 2
      ? "这是第二轮，你们已经聊开了，可以更自然、更走心。"
      : "这是第三轮，你们已经很熟了，可以说一些更深、更真实的话。";

    const typeInstruction = getTypeInstruction(type, round, catName);

    const prompt = `你是一只叫「${catName}」的猫。
${personalityGuide}
${catDescription ? `你的外观：${catDescription}` : ""}

关于你的主人：
${userProfile?.mbti ? `- MBTI：${userProfile.mbti}` : "- MBTI 未知"}
${userProfile?.schedule ? `- 日常节奏：${scheduleMap[userProfile.schedule] || userProfile.schedule}` : ""}
${userProfile?.energyLevel ? `- 近期状态：${energyMap[userProfile.energyLevel] || userProfile.energyLevel}` : ""}
${userProfile?.needType ? `- 最需要：${needMap[userProfile.needType] || userProfile.needType}` : ""}

${historyStr ? `你们之前的对话：\n${historyStr}\n` : ""}
${userMessage ? `主人刚说：「${userMessage}」\n` : ""}
${depthHint}

${typeInstruction}

- 不要加引号，直接说话
- 只输出回复，不要任何解释`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 150,
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
