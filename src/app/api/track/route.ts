export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.FEISHU_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("[track] FEISHU_WEBHOOK_URL not set, skipping");
      return Response.json({ ok: true, skipped: true });
    }

    // 构造飞书交互式卡片消息
    const {
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
    } = body;

    const durationMin = durationMs ? Math.round(durationMs / 60000) : "?";
    const personalityEmoji: Record<string, string> = {
      storm: "⚡", moon: "🌙", sun: "☀️", forest: "🌲",
    };
    const peakLabels: Record<string, string> = {
      personality: "灵魂人格", chat: "跟猫聊天", timeline: "时间线", card: "灵光卡",
    };

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
      nickname ? `**👤 昵称** ${nickname}` : "",
      contact ? `**📱 联系** ${contact}` : "",
      `**📮 等待列表** ${joinedWaitlist ? "✅ 已加入" : "❌ 跳过"}`,
    ].filter(Boolean);

    const card = {
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

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });

    if (!res.ok) {
      console.error("[track] Feishu webhook error:", res.status, await res.text());
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[track] Error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
