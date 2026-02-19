import { NextResponse } from "next/server";

// Serverless: 图片生成需要较长时间
export const maxDuration = 60;

const API_KEY = process.env.GEMINI_API_KEY;
const TEXT_MODEL = "gemini-2.0-flash";
const IMAGE_MODEL = "doubao-seedream-4-5-251128";
const API_302 = "https://api.302.ai";

// ===== 人格 → 画风/场景 =====
const artStylePrompts: Record<string, string> = {
  anime: "Japanese anime illustration, clean bold lines, vibrant colors, Studio Ghibli warmth",
  watercolor: "Soft watercolor painting, gentle washes, dreamy bleeding edges, delicate layers",
  ink: "Chinese ink wash painting, elegant minimalist brushstrokes, generous white space, zen tranquility",
  storybook: "Warm storybook illustration, soft rounded shapes, golden hour lighting, cozy textured feel",
};

const personalityDefaultStyle: Record<string, string> = {
  storm: "anime", moon: "ink", sun: "storybook", forest: "watercolor",
};

const personalityScenes: Record<string, { scene: string; palette: string; mood: string }> = {
  storm: { scene: "cat leaping in sunset golden light, fur flying, tail high", palette: "warm orange, gold, amber, sunset pink", mood: "vibrant, free, passionate" },
  moon: { scene: "cat sitting quietly on windowsill, blue moonlight outside, soft warm light inside", palette: "deep blue, silver, pale purple, moonlight blue, warm yellow", mood: "quiet, healing, poetic, gentle melancholy" },
  sun: { scene: "cat stretching on sunlit floor, golden light spots on fur, content expression", palette: "golden yellow, warm orange, cream, peach, soft pink", mood: "warm, happy, smile-inducing, full of love" },
  forest: { scene: "cat gazing into distance from a quiet corner, green plants and dappled light", palette: "deep green, ink, wood brown, moss green, golden light", mood: "composed, profound, quiet strength" },
};

export async function POST(req: Request) {
  try {
    const { catName, personalityType, catDescription, catPhotoBase64, catPhotoMime, artStyle, conversation, userProfile } = await req.json();

    if (!API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;
    const style = artStyle || personalityDefaultStyle[personalityType] || "watercolor";
    const stylePrompt = artStylePrompts[style] || artStylePrompts.watercolor;
    const catAppearance = catDescription || "a cute domestic cat";

    // ===== Step 1: 用 Gemini 从对话中提炼视觉场景（如果有对话） =====
    let sceneDescription = `${catAppearance}, ${ps.scene}. A human silhouette nearby, showing the bond between cat and human.`;

    if (conversation) {
      try {
        const scenePrompt = `You are a visual scene director. Read this conversation between a cat named "${catName}" and their human, then describe ONE specific emotional visual scene to illustrate.

Conversation:
${conversation}

The cat's appearance: ${catAppearance}

Output a single English paragraph (3-4 sentences) describing the VISUAL SCENE to paint. Include:
- What the cat is doing (specific pose/action from the conversation)
- Where the human is (shown as gentle silhouette or partial figure)
- The lighting and atmosphere
- The emotional mood

Output ONLY the scene description, nothing else.`;

        const sceneRes = await fetch(
          `${API_302}/v1beta/models/${TEXT_MODEL}:generateContent?key=${API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: scenePrompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
            }),
          }
        );

        const sceneData = await sceneRes.json();
        const extracted = sceneData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (extracted) {
          sceneDescription = extracted;
        }
      } catch {
        // 提炼失败就用默认场景
      }
    }

    // 用户画像氛围补充
    let moodHints = "";
    if (userProfile) {
      const moodMap: Record<string, string> = {
        tired: "gentle restful atmosphere", stressed: "calming protective feeling",
        meh: "warm quiet companionship", full: "vibrant playful energy",
      };
      const needMap: Record<string, string> = {
        understand: "deep mutual understanding", remind: "gentle caring watch",
        cheer: "playful mischief", quiet: "peaceful silence together",
      };
      if (userProfile.energyLevel && moodMap[userProfile.energyLevel]) moodHints += `, ${moodMap[userProfile.energyLevel]}`;
      if (userProfile.needType && needMap[userProfile.needType]) moodHints += `, ${needMap[userProfile.needType]}`;
    }

    // ===== Step 2: 用 doubao-seedream 生成图片（~10s） =====
    const imagePrompt = `${sceneDescription}

Art style: ${stylePrompt}
Color palette: ${ps.palette}
Mood: ${ps.mood}${moodHints}

RULES: Show BOTH the cat AND their human (human as gentle silhouette or partial figure - hands, lap, back view). Square composition. Beautiful atmospheric lighting. Absolutely NO text, NO words, NO letters anywhere. Emotionally resonant keepsake card illustration.`;

    const imageRes = await fetch(`${API_302}/doubao/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: imagePrompt,
        response_format: "b64_json",
        sequential_image_generation: "disabled",
        watermark: false,
      }),
    });

    const imageData = await imageRes.json();

    if (imageData?.data?.[0]?.b64_json) {
      return NextResponse.json({
        image: imageData.data[0].b64_json,
        mimeType: "image/png",
      });
    }

    return NextResponse.json({ error: imageData?.error?.message || "no image generated" }, { status: 500 });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
