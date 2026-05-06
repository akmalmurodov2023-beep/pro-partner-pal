// Upload a file to Google Drive via the Lovable connector gateway.
// Secrets required: LOVABLE_API_KEY, GOOGLE_DRIVE_API_KEY
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive";
const TARGET_FOLDER_ID = "1scnhB_mphbLs_bqQRcXIZj7QOh0dNxkr";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_DRIVE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "missing_secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { fileName, mimeType, base64 } = await req.json();
    if (!fileName || !base64) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const boundary = "lovable_boundary_" + Math.random().toString(36).slice(2);
    const metadata = { name: fileName, mimeType, parents: [TARGET_FOLDER_ID] };
    const fileBytes = base64ToBytes(base64);
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    );
    const tail = enc.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(head.length + fileBytes.length + tail.length);
    body.set(head, 0);
    body.set(fileBytes, head.length);
    body.set(tail, head.length + fileBytes.length);

    const res = await fetch(
      `${GATEWAY_URL}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    const json = await res.json();
    if (!res.ok) {
      console.error("Drive upload failed", json);
      return new Response(
        JSON.stringify({ error: "drive_upload_failed", detail: json }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    try {
      await fetch(`${GATEWAY_URL}/drive/v3/files/${json.id}/permissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });
    } catch (e) {
      console.warn("permission set failed", e);
    }
    const webViewLink =
      json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`;
    return new Response(
      JSON.stringify({ id: json.id, name: json.name, webViewLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("upload-to-drive failed", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});