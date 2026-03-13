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
    const { catName, personalityType, catDescription, catPersonalityDesc, catPhotoBase64, catPhotoMime, artStyle, conversation } = await req.json();

    if (!GOOGLE_API_KEY && !API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    const ps = personalityScenes[personalityType] || personalityScenes.sun;
    // 统一 storybook，忽略前端传来的 artStyle
    const stylePrompt = UNIFIED_STYLE;
    const catAppearance = catDescription || "a cute domestic cat";
    const personalityHint = catPersonalityDesc ? ` (personality: ${catPersonalityDesc})` : "";

    console.log("=== card-image request ===");
    console.log("catPhotoBase64:", catPhotoBase64 ? `${catPhotoBase64.length} chars` : "NONE");
    console.log("catDescription:", catAppearance?.slice(0, 100));
    console.log("catName:", catName, "personality:", personalityType);

    // ===== 场景提炼 =====
    const sceneText = conversation
      ? await generateScene(catName, catAppearance, personalityHint, personalityType, conversation)
      : null;
    console.log("sceneText:", sceneText?.slice(0, 100) || "NONE");
    const sceneDescription = sceneText || `${ps.scene}`;

    // ===== 有猫照 → seedream img2img（和 iOS 同款配方）=====
    if (catPhotoBase64) {
      const hasVisionDesc = catAppearance && catAppearance !== "a cute domestic cat";

      // 双通道锚定 prompt（和 iOS APIClient.swift 对齐）
      const visionAnchor = hasVisionDesc
        ? `\n\nVERIFIED CAT DESCRIPTION (from photo analysis):\n${catAppearance}\n\nUse BOTH the reference photo AND the description above as dual anchors. They must agree in the output.`
        : "";

      const img2imgPrompt = `Transform this cat photo into an illustration while keeping the cat's identity PERFECTLY intact.${visionAnchor}

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

      // Step 1: 上传猫照到 302.AI 拿 URL
      console.log("uploading cat photo to 302.AI... (base64 length:", catPhotoBase64.length, "mime:", catPhotoMime, ")");
      const photoURL = await uploadTo302(catPhotoBase64, catPhotoMime || "image/jpeg");
      console.log("photoURL:", photoURL || "UPLOAD FAILED");

      if (photoURL) {
        // Step 2: seedream img2img（主通道）
        console.log("trying seedream img2img with photoURL:", photoURL.slice(0, 80));
        console.log("img2img prompt (first 200):", img2imgPrompt.slice(0, 200));
        const seedreamResult = await generateWithSeedream(img2imgPrompt, photoURL);
        if (seedreamResult) {
          console.log("seedream img2img success, mode:", seedreamResult.mode, "image size:", seedreamResult.image.length);
          return NextResponse.json(seedreamResult);
        }
        console.log("seedream img2img failed, falling back to Gemini...");
      } else {
        console.log("photo upload failed, skipping seedream img2img → will try Gemini");
      }

      // Gemini img2img fallback（直传 base64，不需要 URL）
      const geminiImg2ImgPrompt = `Transform this cat photo into an illustration.${hasVisionDesc ? `\n\nVERIFIED CAT DESCRIPTION:\n${catAppearance}\n\nMatch BOTH the photo AND description:` : "\n\nMatch the cat in the photo exactly:"}
- Fur colors: match exactly (do not shift warm↔cool)
- Eye color: match the exact shade
- White fur areas: ONLY where confirmed — do NOT add white
- Same age, body type, fur length

Scene: ${sceneDescription}
Style: ${stylePrompt}. Palette: ${ps.palette}. Mood: ${ps.mood}.
Cat is main subject (40%+). No text, no watermark, no other cats.`;

      console.log("trying Gemini img2img fallback...");
      const geminiResult = await generateWithGemini(geminiImg2ImgPrompt, catPhotoBase64, catPhotoMime);
      if (geminiResult) {
        console.log("gemini img2img fallback success");
        return NextResponse.json(geminiResult);
      }
      console.log("gemini img2img also failed");
    } else {
      // ===== 无猫照 → seedream txt2img → Gemini txt2img =====
      const txtPrompt = `${stylePrompt} illustration of a cat named ${catName} with ${catAppearance} features${personalityHint}.
Scene: ${sceneDescription}
Color palette: ${ps.palette}. Mood: ${ps.mood}.
No text, no watermark. Square composition.`;

      console.log("no cat photo, trying seedream txt2img...");
      const seedreamResult = await generateWithSeedream(txtPrompt);
      if (seedreamResult) {
        console.log("seedream txt2img success");
        return NextResponse.json(seedreamResult);
      }

      console.log("seedream txt2img failed, trying Gemini...");
      const geminiResult = await generateWithGemini(txtPrompt);
      if (geminiResult) {
        console.log("gemini txt2img success");
        return NextResponse.json(geminiResult);
      }
      console.log("gemini txt2img also failed");
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
