export const runtime = "nodejs";

import { exportAll, exportSession } from "@/lib/web-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (sessionId) {
      const data = await exportSession(sessionId);
      if (!data) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      return Response.json({
        exportTime: new Date().toISOString(),
        source: "web-demo",
        totalUsers: 1,
        users: [data],
      });
    }

    const result = await exportAll();
    return Response.json(result);
  } catch (err) {
    console.error("[export] Error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
