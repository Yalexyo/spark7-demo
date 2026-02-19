import { NextResponse } from "next/server";

// Serverless: 图片生成需要较长时间
export const maxDuration = 60;

const API_KEY = process.env.GEMINI_API_KEY;
const IMAGE_MODEL = "doubao-seedream-4-5-251128";
const API_302 = "https://api.302.ai";

// 人格 → 画风
const styleMap: Record<string, string> = {
  storm: "Japanese anime illustration, clean bold lines, vibrant colors, Studio Ghibli warmth",
  moon: "Chinese ink wash painting, elegant minimalist brushstrokes, generous white space, zen tranquility",
  sun: "Warm storybook illustration, soft rounded shapes, golden hour lighting, cozy textured feel",
  forest: "Soft watercolor painting, gentle washes, dreamy edges, delicate translucent layers",
};

export async function POST(req: Request) {
  try {
    const { catAppearance, catDetail, sceneDescription, personality } = await req.json();

    if (!API_KEY) {
      return NextResponse.json({ error: "no api key" }, { status: 500 });
    }

    if (!sceneDescription) {
      return NextResponse.json({ error: "missing sceneDescription" }, { status: 400 });
    }

    const style = styleMap[personality] || styleMap.forest;
    const catDesc = catAppearance || "A cute domestic cat";

    const prompt = `A small clean illustration of a cat: ${catDesc} ${catDetail || ""}

Scene: ${sceneDescription}

Art style: ${style}

Square composition, simple background. The cat must match the description above. Warm, emotional, gentle. NO text, NO words, NO letters. Small illustration suitable for notification icon or watch display.`;

    const res = await fetch(`${API_302}/doubao/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        response_format: "b64_json",
        sequential_image_generation: "disabled",
        watermark: false,
      }),
    });

    const data = await res.json();

    if (data?.data?.[0]?.b64_json) {
      return NextResponse.json({
        image: data.data[0].b64_json,
        mimeType: "image/png",
      });
    }

    return NextResponse.json({ error: data?.error?.message || "no image generated" }, { status: 500 });
  } catch (e) {
    console.error("scene-image error:", e);
    return NextResponse.json({ error: "api error" }, { status: 500 });
  }
}
