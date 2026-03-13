import { NextResponse } from "next/server";

// 有猫照 → Gemini 3 Pro Image img2img（强化 identity anchor prompt）
// 无猫照 → Gemini 3 Pro Image txt2img
// 末端 fallback: Flux-Schnell via 302.AI
export const maxDuration = 60;

const API_KEY = process.env.API_302_KEY || process.env.GEMINI_API_KEY;
const API_302 = "https://api.302.ai";

// 场景提炼用 Gemini Flash（快）
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_BASE = process.env.GOOGLE_API_KEY
  ? "https://generativelanguage.googleapis.com"
  : "https://api.302.ai";

// 人格 → 画风
const artStylePrompts: Record<string, string> = {
  anime: "Japanese anime illustration, vibrant colors, Studio Ghibli warmth",
  watercolor: "Soft watercolor painting, dreamy washes, delicate layers",
  ink: "Chinese ink wash painting, minimalist brushstrokes, zen tranquility",
  storybook: "Warm storybook illustration, soft shapes, golden hour lighting",
};

const personalityDefaultStyle: Record<string, string> = {
  storm: "anime", moon: "ink", sun: "storybook", forest: "watercolor",
};

const personalityScenes: Record<string, { scene: string; palette: string; mood: string }> = {
  storm: { scene: "cat leaping in sunset golden light, fur flying, tail high", palette: "warm orange, gold, amber", mood: "vibrant and free" },
  moon: { scene: "cat sitting on windowsill, blue moonlight, soft warm light inside", palette: "deep blue, silver, pale purple", mood: "quiet and poetic" },
  sun: { scene: "cat stretching on sunlit floor, golden light spots on fur", palette: "golden yellow, warm orange, cream", mood: "warm and happy" },
  forest: { scene: "cat gazing from a quiet corner, green plants and dappled light", palette: "deep green, wood brown, moss green", mood: "calm and profound" },
};

// ===== Gemini 场景提炼（Flash，快）=====
async function generateScene(catName: string, catAppearance: string, personalityHint: string, personalityType: string, conversation: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GEMINI_BASE}/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are illustrating a scene with a cat named "${catName}" (appearance: ${catAppearance}${personalityHint}, personality type: ${personalityType}).

Conversation between the cat and human:
${conversation}

Based on the conversation mood and the cat's personality, describe ONE illustration scene in 2 English sentences. Focus on: what the cat is doing, the setting, lighting and atmosphere. The cat is the main subject. Do NOT describe the cat's appearance — only the scene, action, and mood.` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 80 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

// ===== Gemini 图片生成（支持图生图 + 纯文生图）=====
async function generateWithGemini(
  prompt: string,
  catPhotoBase64?: string | null,
  catPhotoMime?: string,
): Promise<{ image: string; mimeType: string; mode: string } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    // 有猫照 → 先放图片（Gemini 图片编辑模式）
    if (catPhotoBase64) {
      parts.push({
        inlineData: {
          mimeType: catPhotoMime || "image/jpeg",
          data: catPhotoBase64,
        },
      });
    }

    parts.push({ text: prompt });

    const res = await fetch(
      `${GEMINI_BASE}/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("gemini image API error:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const responseParts = data?.candidates?.[0]?.content?.parts || [];

    for (const part of responseParts) {
      if (part.inlineData) {
        return {
          image: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/jpeg",
          mode: catPhotoBase64 ? "gemini-img2img" : "gemini-txt2img",
        };
      }
    }

    console.error("gemini image: no image in response, parts:", responseParts.map((p: { text?: string }) => p.text ? "text" : "other"));
    return null;
  } catch (e) {
    console.error("gemini image error:", e);
    return null;
  }
}

// ===== Flux-Schnell fallback（纯文生图）=====
async function generateWithFlux(prompt: string): Promise<{ image: string; mimeType: string; mode: string } | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${API_302}/302/submit/flux-schnell`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, output_format: "jpeg" }),
    });

    const data = await res.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) return null;

    // 下载转 base64
    const dlRes = await fetch(imageUrl);
    if (!dlRes.ok) return null;
    const buffer = await dlRes.arrayBuffer();
    return {
      image: Buffer.from(buffer).toString("base64"),
      mimeType: dlRes.headers.get("content-type") || "image/jpeg",
      mode: "flux-txt2img",
    };
  } catch (e) {
    console.error("flux fallback error:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { catName, personalityType, catDescription, catPersonalityDesc, catPhotoBase64, catPhotoMime, artStyle, conversation } = await req.json();

    if (!GOOGLE_API_KEY && !API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;
    const style = artStyle || personalityDefaultStyle[personalityType] || "watercolor";
    const stylePrompt = artStylePrompts[style] || artStylePrompts.watercolor;
    const catAppearance = catDescription || "a cute domestic cat";
    const personalityHint = catPersonalityDesc ? ` (personality: ${catPersonalityDesc})` : "";

    console.log("catPhotoBase64:", catPhotoBase64 ? `${catPhotoBase64.length} chars` : "NONE");

    // ===== 场景提炼 =====
    const sceneText = conversation
      ? await generateScene(catName, catAppearance, personalityHint, personalityType, conversation)
      : null;
    console.log("sceneText:", sceneText?.slice(0, 100) || "NONE");
    const sceneDescription = sceneText || `${ps.scene}`;

    // ===== 有猫照 → Gemini img2img =====
    if (catPhotoBase64) {
      const geminiImg2ImgPrompt = `IMPORTANT: This is a reference photo of a real cat. You MUST preserve this cat's exact identity in the illustration.

IDENTITY ANCHOR — copy these traits exactly from the photo:
- Fur color(s) and pattern (stripes, spots, patches, solid)
- Face shape, ear shape, eye color
- Body proportions and size
- Any unique markings (nose color, paw colors, tail pattern)

Now create an illustration of THIS EXACT CAT in a new scene:
Scene: ${sceneDescription}
Art style: ${stylePrompt}
Color palette: ${ps.palette}
Mood: ${ps.mood}

The cat must be IMMEDIATELY recognizable as the same cat from the reference photo. Do not change any physical features. No text, no watermark, no signature, no borders.`;

      console.log("trying Gemini img2img with identity anchor prompt...");
      const geminiResult = await generateWithGemini(geminiImg2ImgPrompt, catPhotoBase64, catPhotoMime);

      if (geminiResult) {
        console.log("gemini img2img success, image size:", geminiResult.image.length);
        return NextResponse.json(geminiResult);
      }
      console.log("gemini img2img failed");
    } else {
      // ===== 无猫照 → Gemini txt2img =====
      const txtPrompt = `Illustration of a cat named ${catName} with ${catAppearance} features${personalityHint}.
Scene: ${sceneDescription}
Art style: ${stylePrompt}
Color palette: ${ps.palette}
Mood: ${ps.mood}
No text, no watermark, no signature, no borders.`;

      console.log("no cat photo, trying Gemini txt2img...");
      const geminiResult = await generateWithGemini(txtPrompt);

      if (geminiResult) {
        console.log("gemini txt2img success, image size:", geminiResult.image.length);
        return NextResponse.json(geminiResult);
      }
      console.log("gemini txt2img failed");
    }

    // ===== 末端 Fallback: Flux-Schnell（纯文生图）=====
    const fallbackPrompt = `${stylePrompt} illustration of a cat with ${catAppearance} features. ${sceneDescription}. Color palette: ${ps.palette}. Mood: ${ps.mood}. No text, no watermark.`;
    console.log("all primary methods failed, falling back to Flux-Schnell txt2img");
    const fluxResult = await generateWithFlux(fallbackPrompt);
    if (fluxResult) {
      return NextResponse.json(fluxResult);
    }

    return NextResponse.json({ error: "all image generation methods failed" }, { status: 500 });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
