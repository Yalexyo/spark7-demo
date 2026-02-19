import { NextResponse } from "next/server";

// Serverless Function：图片生成需要更长超时（Edge 30s 不够）
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";

// 人格 → 画风
const styleMap: Record<string, string> = {
  storm:
    "Japanese anime illustration, clean bold lines, vibrant colors, Studio Ghibli warmth",
  moon: "Chinese ink wash painting, elegant minimalist brushstrokes, generous white space, zen tranquility",
  sun: "Warm storybook illustration, soft rounded shapes, golden hour lighting, cozy textured feel",
  forest:
    "Soft watercolor painting, gentle washes, dreamy edges, delicate translucent layers",
};

export async function POST(req: Request) {
  try {
    const { catAppearance, catDetail, catPhotoBase64, catPhotoMime, scene, sceneDescription, personality } =
      await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    if (!sceneDescription) {
      return NextResponse.json({ error: "missing sceneDescription" }, { status: 400 });
    }

    const style = styleMap[personality] || styleMap.forest;

    const prompt = `Generate a small, clean illustration of a cat in a specific pose/scene.

The cat: ${catAppearance || "A cute domestic cat"} ${catDetail || ""}

Scene: ${sceneDescription}

Art style: ${style}

RULES:
- Square composition, simple background
- The cat should be the SAME cat described above (same fur colors, patterns, features)
- Warm, emotional, gentle
- NO text, NO words, NO letters anywhere
- Small illustration suitable for a notification icon or watch display`;

    // 构建 parts（有猫照就加参考图）
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (catPhotoBase64) {
      parts.push({
        inlineData: {
          mimeType: catPhotoMime || "image/jpeg",
          data: catPhotoBase64,
        },
      });
      parts.push({
        text: `Above is the REAL photo of this cat. Your illustration MUST look like THIS specific cat.\n\n${prompt}`,
      });
    } else {
      parts.push({ text: prompt });
    }

    const res = await fetch(
      `https://api.302.ai/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.9,
          },
        }),
      }
    );

    const data = await res.json();
    const resParts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = resParts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );

    if (imagePart?.inlineData) {
      return NextResponse.json({
        image: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      });
    }

    return NextResponse.json({ error: "no image generated" }, { status: 500 });
  } catch (e) {
    console.error("scene-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
