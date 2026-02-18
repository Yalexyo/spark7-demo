import { NextResponse } from "next/server";

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

    const prompt = `分析这张猫咪照片，提取以下信息（用中文）：

1. **外观**：毛色、花纹、毛长、体型（如：橘白色短毛，微胖圆脸）
2. **表情/状态**：当前看起来的样子（如：眯着眼慵懒地趴着）
3. **特别之处**：一个有趣的细节（如：左耳有一小撮翘起的毛）

格式要求：
- 用 JSON 格式返回：{"appearance": "...", "mood": "...", "detail": "..."}
- 每个字段一句话，简洁生动
- 只输出 JSON，不要其他内容`;

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
      return NextResponse.json({
        description: parsed,
        summary: `${parsed.appearance}，${parsed.mood}`,
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
