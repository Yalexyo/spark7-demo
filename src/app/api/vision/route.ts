import { NextResponse } from "next/server";

// Edge Function: 免费版 Serverless 超时 10s 不够用，Edge 可达 30s
export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "no image" }, { status: 400 });
    }

    const prompt = `You are an expert cat identification specialist. Your description will be used to generate illustrations that MUST look exactly like THIS specific cat. An owner must instantly recognize their cat from your description. ACCURACY IS EVERYTHING.

Analyze this photo with extreme precision. Pay special attention to:
- AGE: Is this a kitten (large ears/eyes relative to head, small body) or an adult cat? Be explicit.
- EYE COLOR: Look very carefully. Common mistakes: confusing teal/aqua with green, confusing amber with yellow. Use the most specific term possible (teal, aqua, blue-green, golden-amber, copper, hazel, vivid green, ice blue, etc.)
- WHITE AREAS: Be VERY precise about where white fur appears. If white is ONLY on the nose/muzzle, say so. Do NOT assume white chest or white paws unless clearly visible.

Return JSON:

1. "appearance": Structured English description in this EXACT format:
   "A [age: kitten ~X weeks / young cat / adult] [fur length] [body type] [breed or domestic] cat. Fur: [primary color] [pattern type], with [PRECISE color placement — list EXACTLY which body parts are which color. If white is only on muzzle, say 'white limited to muzzle/nose bridge only, no white on chest or paws']. Eyes: [exact color — be very specific, e.g. 'vivid teal/aqua' not just 'green']. Face: [shape] with [nose color] nose. [Unique markings: forehead M, tail rings, chin color, etc.]"
   COLOR PLACEMENT accuracy is the #1 priority. Do NOT exaggerate white areas. (3-4 sentences)

2. "mood": Current expression/posture. (1 sentence)

3. "detail": The single most distinctive visual feature. (1 sentence)

4. "appearance_cn": Chinese version with same precision. Include age. (2-3 sentences)

Output ONLY the JSON object.`;

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!raw) {
      return NextResponse.json({ error: "empty response" }, { status: 500 });
    }

    // 尝试解析 JSON（处理可能的 markdown 包裹）
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      // 英文完整描述给配图 API，中文给用户展示
      const enFull = [parsed.appearance, parsed.mood, parsed.detail].filter(Boolean).join(" ");
      const cnDisplay = parsed.appearance_cn || parsed.appearance;
      return NextResponse.json({
        description: parsed,
        summary: cnDisplay,
        summaryEn: enFull,
      });
    } catch {
      // 如果 JSON 解析失败，返回原始文本
      return NextResponse.json({
        description: { appearance: raw, mood: "", detail: "" },
        summary: raw,
      });
    }
  } catch (e) {
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
