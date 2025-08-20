import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";

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
  const session = await requireAuth(event);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };
  const model = process.env.OPENAI_NLP_MODEL || "gpt-4o-mini";
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 15000);

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const text = String(body.text || "").trim();
    const kind = (body.kind === "toc" ? "toc" : "shopping") as "shopping" | "toc";
    if (!text) return { statusCode: 400, body: "text required" };
    if (!allowRate(`nlp:${session.household_id}`, 10, 60_000)) return { statusCode: 429, body: "Too Many Requests" };

    const system =
      kind === "shopping"
        ? "You clean grocery notes. Extract only concrete grocery items (singular or common label). Remove non-relevant words and chit-chat. Return JSON {\"items\":[string]}. Max 30."
        : "You clean room notes. Produce one short, clear ToC entry capturing the key content. No filler. Return JSON {\"items\": [string]} with exactly one entry.";
    const userText = kind === "shopping"
      ? `TEXT:\n${text}\nReturn only JSON: {"items":["item1","item2", ...]}`
      : `TEXT:\n${text}\nReturn only JSON: {"items":["single cleaned line"]}`;

    const started = Date.now();
    const doFetch = async (attempt: number): Promise<Response> => {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: userText },
            ],
            max_tokens: kind === "shopping" ? 200 : 80,
            temperature: 0.2,
          }),
          signal: ac.signal,
        });
        if (r.status === 429 || r.status >= 500) {
          if (attempt < 2) {
            const backoff = 400 * Math.pow(2, attempt);
            await new Promise((res) => setTimeout(res, backoff));
            return doFetch(attempt + 1);
          }
        }
        return r;
      } finally {
        clearTimeout(to);
      }
    };
    const resp = await doFetch(0);
    if (!resp.ok) return { statusCode: resp.status, body: await resp.text() };
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: { items?: string[] } = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]);
    }
    let items = Array.isArray(parsed.items) ? parsed.items : [];
    items = items
      .filter((s) => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, kind === "shopping" ? 30 : 1);

    const latency = Date.now() - started;
    return { statusCode: 200, body: JSON.stringify({ items }), headers: { "x-openai-latency-ms": String(latency) } };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "NLP error" };
  }
};
