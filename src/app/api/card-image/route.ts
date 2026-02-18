import { NextResponse } from "next/server";

// Edge Function：免费版超时 30 秒
export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash-exp-image-generation";

// ===== A. 按人格定画风 =====
const artStylePrompts: Record<string, string> = {
  anime: "Japanese anime illustration style, clean bold lines, vibrant saturated colors, expressive character, Studio Ghibli-inspired warmth, cel-shaded lighting",
  watercolor: "Soft watercolor painting, gentle washes of color, wet-on-wet technique, dreamy bleeding edges, delicate and translucent layers",
  ink: "Chinese ink wash painting (水墨画) style, elegant minimalist brushstrokes, generous white space, zen-like tranquility, subtle ink gradients",
  storybook: "Warm children's storybook illustration, soft rounded shapes, cozy textured paper feel, golden hour lighting, Beatrix Potter meets modern picture book",
};

// 每种人格默认画风
const personalityDefaultStyle: Record<string, string> = {
  storm: "anime",
  moon: "ink",
  sun: "storybook",
  forest: "watercolor",
};

// 每种人格的场景 + 配色 + 情绪
const personalityScenes: Record<string, { scene: string; palette: string; mood: string }> = {
  storm: {
    scene: "在夕阳金光中跳跃，毛发飞扬，充满活力，尾巴高高翘起",
    palette: "温暖的橘红色、金色、琥珀色、落日粉",
    mood: "活力、自由、热烈、无拘无束",
  },
  moon: {
    scene: "窗台上静静坐着，窗外是蓝色月光，室内有微弱的暖光，影子很长",
    palette: "深蓝、银白、淡紫、月光蓝、一点暖黄",
    mood: "安静、治愈、诗意、微微忧郁但温柔",
  },
  sun: {
    scene: "在阳光洒落的地板上舒展身体，金色光斑落在身上，表情满足",
    palette: "金黄、暖橙、奶白、蜜桃色、淡粉",
    mood: "温暖、幸福、让人微笑、充满爱",
  },
  forest: {
    scene: "在一个安静的角落里凝视远方，身边有绿植和斑驳的光影",
    palette: "深绿、墨色、木质棕、苔藓绿、一点金色光",
    mood: "从容、深邃、安静的力量、与世界保持恰好的距离",
  },
};

export async function POST(req: Request) {
  try {
    const { catName, personalityType, catDescription, artStyle, chatContext, userProfile } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;

    // A. 画风：用户选择 > 人格默认
    const style = artStyle || personalityDefaultStyle[personalityType] || "watercolor";
    const stylePrompt = artStylePrompts[style] || artStylePrompts.watercolor;

    // 猫的外观
    const catAppearance = catDescription
      ? `This cat's real appearance: ${catDescription}`
      : "A cute domestic cat";

    // ===== C. 融入对话/用户上下文 =====
    let contextScene = "";

    // 从对话内容提取场景灵感
    if (chatContext) {
      contextScene += `\nEmotional context from their conversation: "${chatContext}"`;
      contextScene += `\nLet this emotional tone subtly influence the atmosphere and mood of the illustration.`;
    }

    // 从用户画像提取氛围
    if (userProfile) {
      const moodMap: Record<string, string> = {
        tired: "The human is tired lately - show a gentle, restful atmosphere",
        stressed: "The human is stressed - show a calming, peaceful moment",
        meh: "The human feels low - show warmth and quiet companionship",
        full: "The human is energetic - show a vibrant, lively moment",
      };
      const needMap: Record<string, string> = {
        understand: "Theme of deep understanding between cat and human",
        remind: "Theme of gentle care and reminders",
        cheer: "Theme of joy and playfulness",
        quiet: "Theme of peaceful silent companionship",
      };
      if (userProfile.energyLevel && moodMap[userProfile.energyLevel]) {
        contextScene += `\n${moodMap[userProfile.energyLevel]}`;
      }
      if (userProfile.needType && needMap[userProfile.needType]) {
        contextScene += `\n${needMap[userProfile.needType]}`;
      }
    }

    const prompt = `Generate a beautiful illustration for a keepsake card called "灵光卡" (Sparkle Card).

Subject: A cat named "${catName}".
${catAppearance}

Scene: The cat is ${ps.scene}.
${contextScene}

Art style: ${stylePrompt}

Color palette: ${ps.palette}
Emotional mood: ${ps.mood}

Composition requirements:
- The cat is the main subject, occupying about 40-60% of the frame
- Simple, uncluttered background with atmospheric depth
- Beautiful lighting that matches the mood
- Square composition (1:1 aspect ratio)
- Absolutely NO text, NO words, NO letters, NO numbers anywhere in the image
- The overall feeling should make someone smile or feel deeply touched
- This is a precious keepsake card, make it feel special and emotional`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.9,
          },
        }),
      }
    );

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

    if (imagePart?.inlineData) {
      return NextResponse.json({
        image: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      });
    }

    return NextResponse.json({ error: "no image generated" }, { status: 500 });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
