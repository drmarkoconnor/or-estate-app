import type { Handler } from "@netlify/functions";

// in-memory rate limit per sessionless IP (fallback) or cookie length
const rl = new Map<string, number[]>();
const allowRate = (key: string, limit: number, perMs: number) => {
  const now = Date.now();
  const arr = (rl.get(key) || []).filter((t) => now - t < perMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  rl.set(key, arr);
  return true;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };
  const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 20000);
  const ip = (event.headers["x-forwarded-for"] as string) || "0.0.0.0";
  if (!allowRate(`stt:${ip}`, 10, 60_000)) return { statusCode: 429, body: "Too Many Requests" };

  // Expect raw audio bytes; content-type like audio/webm or audio/ogg; filename via header for OpenAI
  const ct = (event.headers["content-type"] as string) || "application/octet-stream";
  const fileName =
    (event.headers["x-filename"] as string) ||
    `audio.${ct.includes("ogg") ? "ogg" : ct.includes("mp3") ? "mp3" : "webm"}`;
  const clientSaysBase64 = (event.headers["x-base64"] as string) === "1";
  const isB64 = !!event.isBase64Encoded || clientSaysBase64;
  const bodyStr = event.body || "";
  const bytes = isB64 ? Buffer.from(bodyStr, "base64") : Buffer.from(bodyStr, "binary");
  if (!bytes.length) return { statusCode: 400, body: "No audio" };
  // size guard (~10MB)
  const maxBytes = Number(process.env.STT_MAX_BYTES || 10_000_000);
  if (bytes.length > maxBytes) return { statusCode: 413, body: "Audio too large" };

  // Build multipart form for OpenAI whisper
  const form = new FormData();
  const blob = new Blob([bytes], { type: ct });
  form.append("file", blob, fileName);
  form.append("model", model);
  form.append("response_format", "json");
  const doFetch = async (attempt: number): Promise<Response> => {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form as any,
        signal: ac.signal,
      });
      if (r.status === 429 || r.status >= 500) {
        if (attempt < 2) {
          const backoff = 500 * Math.pow(2, attempt);
          await new Promise((res) => setTimeout(res, backoff));
          return doFetch(attempt + 1);
        }
      }
      return r;
    } finally {
      clearTimeout(to);
    }
  };
  const started = Date.now();
  const resp = await doFetch(0);
  if (!resp.ok) {
    const t = await resp.text();
    return { statusCode: resp.status, body: t };
  }
  const data = await resp.json();
  const latency = Date.now() - started;
  return {
    statusCode: 200,
    body: JSON.stringify({ text: data.text || data.text?.trim?.() || "" }),
    headers: { "x-openai-latency-ms": String(latency) },
  };
};
