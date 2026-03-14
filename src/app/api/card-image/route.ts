import { NextResponse } from "next/server";

// 架构：Vercel 一步到位（场景提炼 + 火山引擎 seedream 生图）
// 火山引擎直连 17-30s，Vercel 60s 限制够用
export const maxDuration = 60;

// 火山引擎方舟 API
const VOLC_API_KEY = process.env.VOLC_API_KEY;
const VOLC_ENDPOINT_ID = process.env.VOLC_ENDPOINT_ID;
const VOLC_BASE = "https://ark.cn-beijing.volces.com/api/v3";

// 场景提炼用 Gemini Flash
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_302_KEY;
const GEMINI_BASE = process.env.GOOGLE_API_KEY
  ? "https://generativelanguage.googleapis.com"
  : "https://api.302.ai";

const UNIFIED_STYLE = "warm storybook illustration style with soft lighting, keep the cat's real appearance";

const personalityScenes: Record<string, { scene: string; palette: string; mood: string }> = {
  storm: { scene: "cat leaping in sunset golden light, fur flying, tail high", palette: "warm orange, gold, amber", mood: "vibrant and free" },
  moon: { scene: "cat sitting on windowsill, blue moonlight, soft warm light inside", palette: "deep blue, silver, pale purple", mood: "quiet and poetic" },
  sun: { scene: "cat stretching on sunlit floor, golden light spots on fur", palette: "golden yellow, warm orange, cream", mood: "warm and happy" },
  forest: { scene: "cat gazing from a quiet corner, green plants and dappled light", palette: "deep green, wood brown, moss green", mood: "calm and profound" },
};

// ===== Gemini 场景提炼（Flash，<5s）=====
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

// ===== 火山引擎 Seedream 生图（直连，17-30s）=====
async function generateWithSeedream(
  prompt: string,
  catPhotoBase64?: string | null,
  catPhotoMime?: string,
): Promise<{ image: string; mimeType: string; mode: string } | null> {
  if (!VOLC_API_KEY || !VOLC_ENDPOINT_ID) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      model: VOLC_ENDPOINT_ID,
      prompt,
      response_format: "b64_json",
      sequential_image_generation: "disabled",
      watermark: false,
    };

    // 有猫照 → img2img（传 data URI）
    if (catPhotoBase64) {
      body.image = [`data:${catPhotoMime || "image/jpeg"};base64,${catPhotoBase64}`];
    }

    console.log("seedream request: mode=", catPhotoBase64 ? "img2img" : "txt2img");
    const res = await fetch(`${VOLC_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VOLC_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("seedream error:", res.status, await res.text().catch(() => ""));
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
      mode: catPhotoBase64 ? "seedream-img2img" : "seedream-txt2img",
    };
  } catch (e) {
    console.error("seedream error:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { catName, personalityType, catDescription, catPersonalityDesc, catPhotoBase64, catPhotoMime, conversation } = await req.json();

    if (!GOOGLE_API_KEY) {
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

    // ===== Step 2: 构建 prompt =====
    const hasVisionDesc = catAppearance && catAppearance !== "a cute domestic cat";
    let prompt: string;

    if (catPhotoBase64) {
      const visionAnchor = hasVisionDesc
        ? `\n\nVERIFIED CAT DESCRIPTION (from photo analysis):\n${catAppearance}\n\nUse BOTH the reference photo AND the description above as dual anchors.`
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
      prompt = `${stylePrompt} illustration of a cat named ${catName} with ${catAppearance} features${personalityHint}.
Scene: ${sceneDescription}
Color palette: ${ps.palette}. Mood: ${ps.mood}.
No text, no watermark. Square composition.`;
    }

    // ===== Step 3: 火山引擎 Seedream 生图（直连，17-30s）=====
    console.log("=== card-image: calling seedream ===");
    const result = await generateWithSeedream(prompt, catPhotoBase64, catPhotoMime);
    if (result) {
      console.log("card-image success:", result.mode, "b64 length:", result.image.length);
      return NextResponse.json(result);
    }

    console.error("card-image: seedream failed, no fallback");
    return NextResponse.json({ error: "image generation failed" }, { status: 500 });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
