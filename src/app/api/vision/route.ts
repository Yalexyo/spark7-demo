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

    const prompt = `You are an expert cat portrait artist. Analyze this cat photo and extract a detailed visual description that could be used to recreate this SPECIFIC cat in an illustration.

Return JSON with these fields:

1. "appearance": Detailed physical description in English. Include: fur color(s) and pattern (tabby/solid/bicolor/calico/etc.), fur length, body type (slim/stocky/muscular/chubby), face shape, ear shape, eye color. Be SPECIFIC enough to distinguish this cat from others. (2-3 sentences)

2. "mood": Current expression and body language in English. (1 sentence)

3. "detail": One unique identifying feature that makes this cat special — a distinctive marking, scar, ear notch, nose pattern, paw color, etc. (1 sentence)

4. "appearance_cn": Same as appearance but in Chinese. (1-2 sentences)

Output ONLY the JSON object, no other text.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
            temperature: 0.7,
            maxOutputTokens: 200,
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
