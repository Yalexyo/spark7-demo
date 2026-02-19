import { NextResponse } from "next/server";

// Serverless: 上传(~6s) + Gemini场景提炼(~8s) + doubao图生图(~16s) ≈ 30s
export const maxDuration = 60;

const API_KEY = process.env.GEMINI_API_KEY;
const TEXT_MODEL = "gemini-2.0-flash";
const IMAGE_MODEL = "doubao-seedream-4-5-251128";
const API_302 = "https://api.302.ai";

// 人格 → 画风/场景
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

// ===== 上传猫照到 302.AI 获取 URL =====
async function uploadCatPhoto(base64: string, mime: string): Promise<string | null> {
  try {
    // base64 → Buffer → Blob → FormData
    const buffer = Buffer.from(base64, "base64");
    const ext = mime.includes("png") ? "png" : "jpg";
    const blob = new Blob([buffer], { type: mime });

    const formData = new FormData();
    formData.append("file", blob, `cat.${ext}`);

    const res = await fetch(`${API_302}/302/upload-file`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${API_KEY}` },
      body: formData,
    });

    const data = await res.json();
    if (data?.code === 200 && data?.data) {
      return data.data; // 返回 file.302.ai URL
    }
    console.error("upload failed:", data);
    return null;
  } catch (e) {
    console.error("upload error:", e);
    return null;
  }
}

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

    // ===== 并行：上传猫照 + Gemini 提炼场景 =====
    const uploadPromise = catPhotoBase64
      ? uploadCatPhoto(catPhotoBase64, catPhotoMime || "image/jpeg")
      : Promise.resolve(null);

    let sceneDescription = `${catAppearance}, ${ps.scene}. A human silhouette nearby, showing their bond.`;

    const scenePromise = conversation
      ? (async () => {
          try {
            const scenePrompt = `You are a visual scene director. Read this conversation between a cat named "${catName}" and their human, then describe ONE visual scene to illustrate.

Conversation:
${conversation}

The cat: ${catAppearance}

Output ONE English paragraph (3 sentences): what the cat is doing, where the human is (silhouette/partial figure), lighting and mood. ONLY the scene description.`;

            const sceneRes = await fetch(
              `${API_302}/v1beta/models/${TEXT_MODEL}:generateContent?key=${API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: scenePrompt }] }],
                  generationConfig: { temperature: 0.8, maxOutputTokens: 150 },
                }),
              }
            );

            const sceneData = await sceneRes.json();
            const extracted = sceneData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (extracted) sceneDescription = extracted;
          } catch { /* fallback to default */ }
        })()
      : Promise.resolve();

    // 等两个并行任务完成
    const [catPhotoUrl] = await Promise.all([uploadPromise, scenePromise]);

    // 用户画像氛围
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

    // ===== doubao 生成图片 =====
    const hasRef = !!catPhotoUrl;

    const imagePrompt = hasRef
      ? `Based on the reference cat photo, create an illustration of THIS EXACT SAME CAT (same fur colors, same markings, same face shape, same body type) in the following scene:

${sceneDescription}

Art style: ${stylePrompt}. Color palette: ${ps.palette}. Mood: ${ps.mood}${moodHints}.

CRITICAL: The cat in the illustration MUST look like the cat in the reference photo — same fur pattern, same colors, same distinctive features.
Show BOTH the cat AND their human (human as gentle silhouette or partial figure). Square composition. No text, no words, no letters.`
      : `${sceneDescription}

The cat: ${catAppearance}.
Art style: ${stylePrompt}. Color palette: ${ps.palette}. Mood: ${ps.mood}${moodHints}.

Show BOTH the cat AND their human (human as gentle silhouette or partial figure). Square composition. No text, no words, no letters.`;

    const imageBody: Record<string, unknown> = {
      model: IMAGE_MODEL,
      prompt: imagePrompt,
      response_format: "b64_json",
      sequential_image_generation: "disabled",
      watermark: false,
    };

    // 有猫照 URL 就做图生图
    if (catPhotoUrl) {
      imageBody.image = [catPhotoUrl];
    }

    const imageRes = await fetch(`${API_302}/doubao/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(imageBody),
    });

    const imageData = await imageRes.json();

    if (imageData?.data?.[0]?.b64_json) {
      return NextResponse.json({
        image: imageData.data[0].b64_json,
        mimeType: "image/png",
      });
    }

    // 图生图失败？fallback 到纯文生图（不带参考图）
    if (catPhotoUrl) {
      console.log("image-to-image failed, fallback to text-to-image");
      delete imageBody.image;
      const fallbackRes = await fetch(`${API_302}/doubao/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(imageBody),
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackData?.data?.[0]?.b64_json) {
        return NextResponse.json({
          image: fallbackData.data[0].b64_json,
          mimeType: "image/png",
        });
      }
    }

    return NextResponse.json({ error: imageData?.error?.message || "no image generated" }, { status: 500 });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
