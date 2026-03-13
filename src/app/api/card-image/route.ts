import { NextResponse } from "next/server";

// 有猫照 → Flux-Kontext-Pro (img2img, 高保真, ~20s, ¥0.36/张)
// 无猫照 → Flux-Schnell (txt2img, ~8s, ¥0.03/张)
export const maxDuration = 60;

const API_KEY = process.env.API_302_KEY || process.env.GEMINI_API_KEY;
const API_302 = "https://api.302.ai";

// 场景提炼直连 Google（快 10x）
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

// ===== 上传猫照到 302.AI 获取 URL =====
async function uploadCatPhoto(base64: string, mime: string): Promise<string | null> {
  try {
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
    if (data?.code === 200 && data?.data) return data.data;
    console.error("upload failed:", data);
    return null;
  } catch (e) {
    console.error("upload error:", e);
    return null;
  }
}

// ===== 下载图片 URL → base64（避免国内用户加载外部 URL 失败）=====
async function downloadImageAsBase64(url: string): Promise<{ image: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return { image: base64, mimeType: contentType };
  } catch (e) {
    console.error("download image error:", e);
    return null;
  }
}

// ===== Gemini 场景提炼（直连 Google，快 10x）=====
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

Based on the conversation mood and the cat's personality, describe ONE illustration scene in 2 English sentences. Focus on: what the cat is doing, the setting, lighting and atmosphere. The cat is the main subject.` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 80 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { catName, personalityType, catDescription, catPersonalityDesc, catPhotoBase64, catPhotoMime, artStyle, conversation } = await req.json();

    if (!API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;
    const style = artStyle || personalityDefaultStyle[personalityType] || "watercolor";
    const stylePrompt = artStylePrompts[style] || artStylePrompts.watercolor;
    const catAppearance = catDescription || "a cute domestic cat";
    const personalityHint = catPersonalityDesc ? ` (personality: ${catPersonalityDesc})` : "";

    // ===== 并行：上传猫照 + 场景提炼 =====
    console.log("catPhotoBase64:", catPhotoBase64 ? `${catPhotoBase64.length} chars` : "NONE");
    const uploadPromise = catPhotoBase64
      ? uploadCatPhoto(catPhotoBase64, catPhotoMime || "image/jpeg")
      : Promise.resolve(null);

    const scenePromise = conversation
      ? generateScene(catName, catAppearance, personalityHint, personalityType, conversation)
      : Promise.resolve(null);

    const [catPhotoUrl, sceneText] = await Promise.all([uploadPromise, scenePromise]);
    console.log("catPhotoUrl:", catPhotoUrl || "NONE (upload failed or no photo)");
    console.log("sceneText:", sceneText?.slice(0, 100) || "NONE (using fallback)");
    const sceneDescription = sceneText || `${catAppearance}${personalityHint}, ${ps.scene}`;

    // ===== 图片生成：有猫照 → Kontext-Pro（高保真图生图）；无猫照 → Schnell（快速文生图）=====
    const catInstruction = catPhotoBase64
      ? `The cat MUST match the reference photo exactly — same fur color, pattern, and markings. Do NOT change the cat's color.`
      : `The cat has ${catAppearance} features.`;
    const imagePrompt = `${sceneDescription}. Art style: ${stylePrompt}. Color palette: ${ps.palette}. Mood: ${ps.mood}. ${catInstruction} No text, no watermark, no signature.`;

    let mode: string;
    let imageData: Record<string, unknown>;

    if (catPhotoUrl) {
      // ── Kontext-Pro：图生图，保真度高（保留毛色/花纹/体型）──
      mode = "img2img-kontext";
      console.log("using Flux-Kontext-Pro (img2img), catPhotoUrl:", catPhotoUrl.slice(0, 80));
      console.log("prompt:", imagePrompt.slice(0, 200));

      const kontextRes = await fetch(`${API_302}/302/submit/flux-kontext-pro`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          image_url: catPhotoUrl,
          output_format: "jpeg",
        }),
      });
      imageData = await kontextRes.json();
      console.log("kontext status:", kontextRes.status, "keys:", Object.keys(imageData || {}));
    } else {
      // ── Schnell：纯文生图（无猫照 fallback）──
      mode = "txt2img-schnell";
      console.log("using Flux-Schnell (txt2img, no cat photo)");
      console.log("prompt:", imagePrompt.slice(0, 200));

      const schnellRes = await fetch(`${API_302}/302/submit/flux-schnell`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          output_format: "jpeg",
        }),
      });
      imageData = await schnellRes.json();
      console.log("schnell status:", schnellRes.status, "keys:", Object.keys(imageData || {}));
    }

    const imageUrl = imageData?.images?.[0]?.url as string | undefined;
    if (imageUrl) {
      // 下载图片转 base64（避免国内用户加载 file.302.ai 失败）
      const downloaded = await downloadImageAsBase64(imageUrl);
      if (downloaded) return NextResponse.json({ ...downloaded, mode });
      // 下载失败则直接返回 URL（fallback）
      return NextResponse.json({ imageUrl, mode });
    }

    console.error("image gen failed:", JSON.stringify(imageData).slice(0, 300));
    return NextResponse.json({ error: (imageData as Record<string, Record<string, string>>)?.error?.message || "image generation failed" }, { status: 500 });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
