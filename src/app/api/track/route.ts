export const runtime = "nodejs";

import { upsertSession, pushEvents, type TrackEvent } from "@/lib/web-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.FEISHU_WEBHOOK_URL;

    const {
      sessionId,
      catName,
      personalityType,
      secondaryType,
      feedback,
      peakMoment,
      peakExtra,
      nps,
      nickname,
      contact,
      joinedWaitlist,
      durationMs,
      cardSaved,
      cardShared,
      userProfile,
      isSupplemental,
      // event tracking fields
      events,
    } = body;

    // ── 1. Store to Redis (non-blocking, don't fail if Redis is down) ──
    if (sessionId) {
      try {
        await upsertSession(sessionId, {
          catName,
          personalityType,
          secondaryType,
          nickname,
          contact,
          userProfile,
          durationMs,
          peakMoment,
          peakExtra,
          feedback,
          nps,
          cardSaved,
          cardShared,
        });

        if (events && Array.isArray(events)) {
          await pushEvents(sessionId, events as TrackEvent[]);
        }
      } catch (storeErr) {
        console.error("[track] Redis store error (non-fatal):", storeErr);
      }
    }

    // ── 2. Push to Feishu Webhook (existing behavior, unchanged) ──
    if (webhookUrl) {
      const personalityEmoji: Record<string, string> = {
        storm: "⚡", moon: "🌙", sun: "☀️", forest: "🌲",
      };
      const peakLabels: Record<string, string> = {
        personality: "灵魂人格", chat: "跟猫聊天", timeline: "时间线", card: "灵光卡",
      };

      let card;

      if (isSupplemental) {
        card = {
          msg_type: "interactive",
          card: {
            header: {
              title: {
                tag: "plain_text",
                content: `📮 补充联系方式 — ${catName || "匿名猫"}`,
              },
              template: "green",
            },
            elements: [
              {
                tag: "markdown",
                content: [
                  `**🐱 猫名** ${catName || "-"}`,
                  `**🧬 人格** ${personalityEmoji[personalityType] || ""} ${personalityType}`,
                  `**👤 昵称** ${nickname || "-"}`,
                  `**📱 联系** ${contact || "-"}`,
                ].join("\n"),
              },
            ],
          },
        };
      } else {
        const durationMin = durationMs ? Math.round(durationMs / 60000) : "?";
        const fields: string[] = [
          `**🐱 猫名** ${catName || "-"}`,
          `**🧬 主人格** ${personalityEmoji[personalityType] || ""} ${personalityType}`,
          secondaryType ? `**🎭 副人格** ${personalityEmoji[secondaryType] || ""} ${secondaryType}` : "",
          `**📝 反馈** ${feedback || "-"}`,
          `**⭐ 情感峰值** ${peakMoment ? peakLabels[peakMoment] || peakMoment : "-"}`,
          peakExtra ? `**💬 补充** ${peakExtra}` : "",
          nps !== undefined && nps !== null ? `**📊 NPS** ${nps}/10` : "",
          `**⏱ 时长** ${durationMin} 分钟`,
          `**💾 保存卡** ${cardSaved ? "✅" : "❌"}`,
          `**📤 分享卡** ${cardShared ? "✅" : "❌"}`,
          userProfile?.mbti ? `**🔮 MBTI** ${userProfile.mbti}` : "",
        ].filter(Boolean);

        card = {
          msg_type: "interactive",
          card: {
            header: {
              title: {
                tag: "plain_text",
                content: `✨ Spark7 体验数据 — ${catName || "匿名猫"}`,
              },
              template: "purple",
            },
            elements: [
              {
                tag: "markdown",
                content: fields.join("\n"),
              },
            ],
          },
        };
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });

      if (!res.ok) {
        console.error("[track] Feishu webhook error:", res.status, await res.text());
      }
    } else {
      console.warn("[track] FEISHU_WEBHOOK_URL not set, skipping webhook");
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[track] Error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
