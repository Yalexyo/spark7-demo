import { NextResponse } from "next/server";

// Serverless Function：免费版 maxDuration=60s（Edge 只有 30s 不够图片生成）
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";

// ===== A. 按人格定画风 =====
const artStylePrompts: Record<string, string> = {
  anime: "Japanese anime illustration style, clean bold lines, vibrant saturated colors, expressive character, Studio Ghibli-inspired warmth, cel-shaded lighting",
  watercolor: "Soft watercolor painting, gentle washes of color, wet-on-wet technique, dreamy bleeding edges, delicate and translucent layers",
  ink: "Chinese ink wash painting (水墨画) style, elegant minimalist brushstrokes, generous white space, zen-like tranquility, subtle ink gradients",
  storybook: "Warm children's storybook illustration, soft rounded shapes, cozy textured paper feel, golden hour lighting, Beatrix Potter meets modern picture book",
};

const personalityDefaultStyle: Record<string, string> = {
  storm: "anime",
  moon: "ink",
  sun: "storybook",
  forest: "watercolor",
};

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
    const { catName, personalityType, catDescription, catPhotoBase64, catPhotoMime, artStyle, conversation, userProfile } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;
    const style = artStyle || personalityDefaultStyle[personalityType] || "watercolor";
    const stylePrompt = artStylePrompts[style] || artStylePrompts.watercolor;

    const catAppearance = catDescription
      ? `This cat's real appearance: ${catDescription}`
      : "A cute domestic cat";

    // ===== C. 从完整对话提炼画面场景 =====
    let sceneInspiration = "";

    if (conversation) {
      sceneInspiration = `
IMPORTANT - The following is the real 7-day conversation between this cat and their human.
Read it carefully and extract ONE specific emotional moment or scene to depict in the illustration:
---
${conversation}
---
Transform the most touching moment from this conversation into a visual scene.
For example: if they talked about waiting by the door, show the cat waiting; if they discussed late nights, show moonlit companionship.
The illustration should tell the STORY from their conversation, not just a generic cat portrait.`;
    }

    // 用户画像氛围
    let moodHints = "";
    if (userProfile) {
      const moodMap: Record<string, string> = {
        tired: "gentle, restful atmosphere - the human needs peace",
        stressed: "calming, protective feeling - the cat is a sanctuary",
        meh: "warm companionship - quiet but deeply present",
        full: "vibrant, playful energy - joy shared between two souls",
      };
      const needMap: Record<string, string> = {
        understand: "deep mutual understanding, eye contact, knowing glances",
        remind: "gentle care, the cat watching over sleeping human",
        cheer: "playfulness, mischief, something that makes you smile",
        quiet: "peaceful silence, two beings simply existing together",
      };
      if (userProfile.energyLevel && moodMap[userProfile.energyLevel]) {
        moodHints += `\nEmotional undertone: ${moodMap[userProfile.energyLevel]}`;
      }
      if (userProfile.needType && needMap[userProfile.needType]) {
        moodHints += `\nRelationship theme: ${needMap[userProfile.needType]}`;
      }
    }

    const prompt = `Generate a beautiful illustration for a keepsake card called "灵光卡" (Sparkle Card).
This card captures the bond between a cat and their human — it is NOT a cat portrait. It is a RELATIONSHIP portrait.

The cat: "${catName}"
${catAppearance}

${conversation
  ? `CRITICAL — This is their real conversation. Extract the most emotional moment and paint THAT scene:
${sceneInspiration}

The illustration MUST depict the specific scene from the conversation above — showing BOTH the cat AND their human together in that moment.`
  : `Default scene (no conversation provided): The cat is ${ps.scene}, with their human nearby.`}
${moodHints}

Art style: ${stylePrompt}
Color palette: ${ps.palette}
Emotional mood: ${ps.mood}

COMPOSITION — This is about the relationship, not just the cat:
- Show BOTH the cat AND their human in the scene — this is essential
- The human should be depicted gently: soft silhouette, partial figure (hands petting, lap with cat curled up, back view sitting together, feet by the door, etc.)
- Do NOT show the human's full detailed face (keep it universal and poetic)
- The cat and the human should be INTERACTING — touching, near each other, sharing a moment
- Examples of good compositions:
  · Cat curled on human's lap, human's hand resting on the cat
  · Human sitting by window, cat leaning against their leg
  · Human sleeping on couch, cat watching over them from nearby
  · Human's hand reaching toward the cat in morning light
  · Both silhouetted together against moonlight/sunset
- Emotional depth through body language — the space between them tells the story
- Square composition (1:1 aspect ratio)
- Beautiful atmospheric lighting that matches the mood
- Absolutely NO text, NO words, NO letters, NO numbers anywhere in the image
- This card will make someone cry or smile — make it deeply personal and emotionally resonant`;

    // Multimodal: 原始猫照作为参考图 + 文本 prompt
    const parts: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = [];

    if (catPhotoBase64) {
      // 先发参考图，让模型"看到"这只猫的真实样子
      parts.push({
        inlineData: {
          mimeType: catPhotoMime || "image/jpeg",
          data: catPhotoBase64,
        },
      });
      parts.push({
        text: `Above is the REAL photo of the cat "${catName}". Your illustration MUST accurately depict THIS SPECIFIC cat — same fur colors, same patterns, same body type, same distinctive features. Do not invent a generic cat.\n\n${prompt}`,
      });
    } else {
      parts.push({ text: prompt });
    }

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.9,
          },
        }),
      }
    );

    const data = await res.json();
    const resParts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = resParts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

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
