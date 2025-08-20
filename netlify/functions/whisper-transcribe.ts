import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };

  // Expect raw audio bytes; content-type like audio/webm or audio/ogg; filename via header for OpenAI
  const ct = event.headers["content-type"] || "application/octet-stream";
  const fileName = (event.headers["x-filename"] as string) || `audio.${ct.includes("ogg") ? "ogg" : ct.includes("mp3") ? "mp3" : "webm"}`;
  const bytes = event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64') : Buffer.from(event.body || '', 'utf8');
  if (!bytes.length) return { statusCode: 400, body: "No audio" };

  // Build multipart form for OpenAI whisper
  const form = new FormData();
  const blob = new Blob([bytes], { type: ct });
  form.append("file", blob, fileName);
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as any,
  });
  if (!resp.ok) {
    const t = await resp.text();
    return { statusCode: 500, body: t };
  }
  const data = await resp.json();
  return { statusCode: 200, body: JSON.stringify({ text: data.text || data.text?.trim?.() || "" }) };
};
