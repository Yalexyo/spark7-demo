import { NextResponse } from "next/server";

// 架构：Vercel 只做场景提炼，返回 prompt + 猫照 data URI
// 前端直调 CF Proxy → 火山引擎方舟 seedream 生图（无超时限制）
export const maxDuration = 60;

const API_KEY = process.env.API_302_KEY || process.env.GEMINI_API_KEY;

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

// 注：图片生成逻辑已搬到前端直调 CF Proxy → 火山引擎方舟
// Vercel 只做场景提炼，不再做图片生成/上传

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

    // 猫照由前端直接持有，不通过 Vercel 中转（避免 body 过大）
    const hasPhoto = !!catPhotoBase64;

    // ===== Step 3: 构建 prompt =====
    const hasVisionDesc = catAppearance && catAppearance !== "a cute domestic cat";
    let prompt: string;

    if (hasPhoto) {
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

    // ===== 返回 prompt，前端用本地 base64 + CF Proxy 生图 =====
    return NextResponse.json({
      prompt,
      mode: hasPhoto ? "img2img" : "txt2img",
    });
  } catch (e) {
    console.error("card-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
