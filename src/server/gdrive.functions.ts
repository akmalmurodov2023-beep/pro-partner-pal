import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive";

export const uploadToDrive = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; mimeType: string; base64: string }) => data)
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GOOGLE_DRIVE_API_KEY) throw new Error("GOOGLE_DRIVE_API_KEY is not configured");

    const boundary = "lovable_boundary_" + Math.random().toString(36).slice(2);
    const metadata = { name: data.fileName, mimeType: data.mimeType };
    const fileBuffer = Buffer.from(data.base64, "base64");

    const head =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${data.mimeType}\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;

    const body = Buffer.concat([Buffer.from(head, "utf8"), fileBuffer, Buffer.from(tail, "utf8")]);

    const res = await fetch(`${GATEWAY_URL}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    const json: any = await res.json();
    if (!res.ok) {
      console.error("Drive upload failed", json);
      throw new Error(`Drive upload failed [${res.status}]: ${JSON.stringify(json)}`);
    }
    // Make file readable by anyone with the link
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
    const webViewLink = json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`;
    return { id: json.id as string, name: json.name as string, webViewLink };
  });