import { createServerFn } from "@tanstack/react-start";

export const sendTelegramMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { chat_id: string; text: string }) => data)
  .handler(async ({ data }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN is not configured");
      return { ok: false, error: "no_token" };
    }
    if (!data.chat_id) return { ok: false, error: "no_chat_id" };
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: data.chat_id,
          text: data.text,
          parse_mode: "HTML",
        }),
      });
      const json: any = await res.json();
      if (!json.ok) {
        console.error("Telegram error", json);
        return { ok: false, error: json.description || "send_failed" };
      }
      return { ok: true };
    } catch (e: any) {
      console.error("Telegram fetch failed", e);
      return { ok: false, error: e?.message || "fetch_failed" };
    }
  });