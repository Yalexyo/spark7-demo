import { NextResponse } from "next/server";

// 有猫照 → seedream 4.5 img2img（302.AI，和 iOS 同款配方）
//         → Gemini 3 Pro Image img2img（fallback）
// 无猫照 → seedream 4.5 txt2img → Gemini txt2img
// 末端 fallback: Flux-Schnell via 302.AI
export const maxDuration = 60;

const API_KEY = process.env.API_302_KEY || process.env.GEMINI_API_KEY;
const API_302 = "https://api.302.ai";
const SEEDREAM_MODEL = "doubao-seedream-4-5-251128";

// 场景提炼用 Gemini Flash（快）
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_BASE = process.env.GOOGLE_API_KEY
  ? "https://generativelanguage.googleapis.com"
  : "https://api.302.ai";

// 统一画风：storybook（老板决策 2026-03-13，砍掉其他风格）
const UNIFIED_STYLE = "warm storybook illustration style with soft lighting, keep the cat's real appearance";

// 画风统一 storybook（2026-03-13），artStyle 参数保留做 API 兼容但不再使用

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
          contents: [{ parts: [{ text: `You are a scene director for a cat illustration. The cat named "${catName}" has personality type: ${personalityType}${personalityHint}.

Conversation between the cat and human:
${conversation}

Describe ONE scene in 2 English sentences. Focus ONLY on: what the cat is DOING, WHERE it is, the LIGHTING and ATMOSPHERE.
IMPORTANT: Do NOT describe the cat's appearance (fur color, markings, eye color, body type). Those details come from the reference photo, not from you.
Just describe: action, location, lighting, mood.` }] }],
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

// ===== seedream 4.5 img2img（和 iOS 同款，通过 302.AI）=====
async function uploadTo302(base64: string, mime: string = "image/jpeg"): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const ext = mime.includes("png") ? "png" : "jpg";
    const binaryData = Buffer.from(base64, "base64");

    // 用 Blob + FormData 构建 multipart（Edge Runtime 兼容）
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: mime });
    formData.append("file", blob, `cat.${ext}`);

    const res = await fetch(`${API_302}/302/upload-file`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: formData,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // 302.AI 返回格式: { code: 200, data: "https://file.302.ai/...", message: "success" }
    const url = typeof data?.data === "string" ? data.data : data?.data?.url;
    if (url) {
      console.log("302 upload success:", url.slice(0, 80));
      return url;
    }
    console.error("302 upload: no url in response", JSON.stringify(data).slice(0, 200));
    return null;
  } catch (e) {
    console.error("302 upload error:", e);
    return null;
  }
}

async function generateWithSeedream(
  prompt: string,
  imageURL?: string | null,
): Promise<{ image: string; mimeType: string; mode: string } | null> {
  if (!API_KEY) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      model: SEEDREAM_MODEL,
      prompt,
      response_format: "b64_json",
      sequential_image_generation: "disabled",
      watermark: false,
    };
    // 有参考图 → img2img（和 iOS APIClient.swift 一致）
    if (imageURL) {
      body.image = [imageURL];
    }

    const res = await fetch(`${API_302}/doubao/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("seedream API error:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("seedream: no b64 in response");
      return null;
    }

    return {
      image: b64,
      mimeType: "image/jpeg",
      mode: imageURL ? "seedream-img2img" : "seedream-txt2img",
    };
  } catch (e) {
    console.error("seedream error:", e);
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
    const { catName, personalityType, catDescription, catPersonalityDesc, catPhotoBase64, catPhotoMime, conversation } = await req.json();

    if (!GOOGLE_API_KEY && !API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;
    const stylePrompt = UNIFIED_STYLE;
    const catAppearance = catDescription || "a cute domestic cat";
    const personalityHint = catPersonalityDesc ? ` (personality: ${catPersonalityDesc})` : "";

    // ===== Step 1: 场景提炼（Gemini Flash，<5s）=====
    const sceneText = conversation
      ? await generateScene(catName, catAppearance, personalityHint, personalityType, conversation)
      : null;
    const sceneDescription = sceneText || `${ps.scene}`;

    // ===== Step 2: 上传猫照到 302.AI（<3s）=====
    let photoURL: string | null = null;
    if (catPhotoBase64) {
      photoURL = await uploadTo302(catPhotoBase64, catPhotoMime || "image/jpeg");
      console.log("photoURL:", photoURL || "UPLOAD FAILED");
    }

    // ===== Step 3: 构建 prompt =====
    const hasVisionDesc = catAppearance && catAppearance !== "a cute domestic cat";
    let prompt: string;

    if (photoURL) {
      // img2img prompt（双通道锚定）
      const visionAnchor = hasVisionDesc
        ? `\n\nVERIFIED CAT DESCRIPTION (from photo analysis):\n${catAppearance}\n\nUse BOTH the reference photo AND the description above as dual anchors. They must agree in the output.`
        : "";

      prompt = `Transform this cat photo into an illustration while keeping the cat's identity PERFECTLY intact.${visionAnchor}

ABSOLUTE RULES (violating any = failure):
1. SAME eye color as photo${hasVisionDesc ? " + description" : ""} — match the EXACT hue.
2. SAME fur colors in SAME places — do NOT add white where ${hasVisionDesc ? "BOTH photo AND description don't confirm it" : "there is none"}.
3. SAME age — if KITTEN, draw a KITTEN. Do NOT draw adult.
4. SAME face shape and proportions.
5. SAME fur length — if short sleek fur, keep it short. Do NOT add fluffiness.

SCENE: ${sceneDescription}
STYLE: ${stylePrompt}. Palette hint: ${ps.palette}. Mood: ${ps.mood}.
Style must NOT alter the cat's physical features.

The cat is the main subject (40%+ of image). Square composition. No text. No other cats.`;
    } else {
      // txt2img prompt
      prompt = `${stylePrompt} illustration of a cat named ${catName} with ${catAppearance} features${personalityHint}.
Scene: ${sceneDescription}
Color palette: ${ps.palette}. Mood: ${ps.mood}.
No text, no watermark. Square composition.`;
    }

    // ===== 返回 prompt + photoURL，前端直调 CF Proxy 生图 =====
    return NextResponse.json({
      prompt,
      photoURL,
      model: SEEDREAM_MODEL,
      mode: photoURL ? "img2img" : "txt2img",
    });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
