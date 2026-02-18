import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// 使用 exp 模型支持图片生成
const MODEL = "gemini-2.0-flash-exp";

const personalityScenes: Record<string, { scene: string; palette: string; mood: string }> = {
  storm: {
    scene: "在夕阳金光中跳跃，毛发飞扬，充满活力",
    palette: "温暖的橘红色、金色、琥珀色",
    mood: "活力、自由、热烈",
  },
  moon: {
    scene: "窗台上静静坐着，窗外是蓝色月光，室内有微弱的暖光",
    palette: "深蓝、银白、淡紫、月光色",
    mood: "安静、治愈、诗意、微微忧郁",
  },
  sun: {
    scene: "在阳光洒落的地板上打滚，金色光斑落在身上",
    palette: "金黄、暖橙、奶白、蜜桃色",
    mood: "温暖、幸福、让人微笑",
  },
  forest: {
    scene: "在一个安静的角落里观察远方，身边有绿植的影子",
    palette: "深绿、墨色、木质棕、一点金色光",
    mood: "从容、深邃、安静的力量",
  },
};

export async function POST(req: Request) {
  try {
    const { catName, personalityType, catDescription } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;

    const catAppearance = catDescription
      ? `这只猫的外观：${catDescription}`
      : `一只可爱的家猫`;

    const prompt = `Generate a beautiful illustration for a keepsake card called "灵光卡" (Sparkle Card).

Subject: A cat named "${catName}".
${catAppearance}

Scene: The cat is ${ps.scene}.

Art style requirements:
- Soft watercolor or gentle digital painting style
- Dreamy, emotional atmosphere with ${ps.mood} feeling
- Color palette: ${ps.palette}
- The cat is the main subject, occupying about 40-60% of the frame
- Simple, uncluttered background with soft bokeh or gentle gradients
- Warm, gentle lighting
- Square composition (1:1 aspect ratio)
- No text, no words, no letters, no numbers anywhere in the image
- Suitable as a beautiful greeting card or art print
- The overall feeling should make someone smile or feel touched`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.8,
          },
        }),
      }
    );

    const data = await res.json();

    // 从响应中提取图片
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
