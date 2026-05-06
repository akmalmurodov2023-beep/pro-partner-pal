// Send a Telegram message via Bot API.
// Secrets required: TELEGRAM_BOT_TOKEN
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "no_token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { chat_id, text } = await req.json();
    if (!chat_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "no_chat_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error("Telegram error", json);
      return new Response(
        JSON.stringify({ ok: false, error: json.description || "send_failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-telegram-notification failed", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message || "fetch_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});