import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

type Suggestion = {
  name: string;
  category?: string;
  confidence?: number; // 0..1
};

// basic in-memory rate limiter (per instance)
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
  const supabase = getServiceClient();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 20000);

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const photo_id = body.photo_id as string | undefined;
    const room_id = body.room_id as string | undefined;
    if (!photo_id || !room_id) return { statusCode: 400, body: "photo_id and room_id required" };

    // rate limit: 5 scans/min per household
    const rlKey = `${session.household_id}:scan`;
    if (!allowRate(rlKey, 5, 60_000)) return { statusCode: 429, body: "Too Many Requests" };

    // Load the photo record and ensure it belongs to the user's household and room
    const { data: photo, error } = await supabase
      .from("room_photos")
      .select("id, household_id, room_id, storage_path")
      .eq("id", photo_id)
      .single();
    if (error) return { statusCode: 500, body: error.message };
    if (!photo) return { statusCode: 404, body: "Photo not found" };
    if (photo.household_id !== session.household_id || photo.room_id !== room_id)
      return { statusCode: 403, body: "Forbidden" };

    // Create a short-lived signed URL to the image in Supabase Storage (photos bucket)
    const signed = await supabase.storage
      .from("photos")
      .createSignedUrl(photo.storage_path, 60 * 5);
    if (signed.error) return { statusCode: 500, body: signed.error.message };
    const imageUrl = signed.data.signedUrl;
    // Optional heuristic: reject very large originals based on naming; client should upload reasonable sizes

    // Cache lookup: by photo_id + storage_path
    const cacheRes = await supabase
      .from("room_photo_scan_cache")
      .select("items")
      .eq("photo_id", photo_id)
      .eq("storage_path", photo.storage_path)
      .maybeSingle();
    if (cacheRes.data && !body?.force) {
      return {
        statusCode: 200,
        body: JSON.stringify(cacheRes.data),
        headers: { "x-cache": "hit", "x-openai-latency-ms": "0" },
      };
    }

    // Ask a vision model to extract items. Use JSON response format for structured output
    const system =
      "You are a home inventory vision assistant. Given a household room photo, identify distinct, countable items visible. " +
      "Return a JSON object with an 'items' array; each item has: name (concise, generic), category (one of: Painting, Picture frame, Furniture, Electronics, Appliance, Lighting, Textiles, Decorative, Tableware, Tools, Book/Media, Rug/Carpet, Fixed fitting, Other), and confidence (0..1). " +
      "Prefer durable assets over consumables. Limit to top 12 items. Avoid duplicates. If uncertain, still propose with lower confidence.";

    const userText =
      'Extract a concise list of household items visible in this photo. Respond ONLY with JSON in this shape: {\n  "items": [\n    { "name": string, "category": string, "confidence": number }\n  ]\n}\n';

    // Timeout + retries
    const started = Date.now();
    const doFetch = async (attempt: number): Promise<Response> => {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                content: [
                  { type: "text", text: userText },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            max_tokens: 300,
            temperature: 0.2,
          }),
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
    const resp = await doFetch(0);
    if (!resp.ok) {
      const t = await resp.text();
      return { statusCode: 502, body: `Vision API error: ${t}` };
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: { items?: Suggestion[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Occasionally models wrap code fencing; try to extract JSON substring
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    // Basic sanitation
    const clean: Suggestion[] = items
      .filter((x) => x && typeof x.name === "string")
      .map((x) => ({
        name: String(x.name).slice(0, 80),
        category: x.category ? String(x.category).slice(0, 40) : undefined,
        confidence:
          typeof x.confidence === "number" ? Math.max(0, Math.min(1, x.confidence)) : undefined,
      }))
      .slice(0, 20);

    // upsert cache (best-effort). If the cache table doesn't exist yet (migration not run), ignore and continue
    try {
      const up = await supabase
        .from("room_photo_scan_cache")
        .upsert(
          { photo_id, storage_path: photo.storage_path, items: clean },
          { onConflict: "photo_id,storage_path" }
        );
      if ((up as any)?.error) {
        const msg = (up as any).error?.message || "";
        // relation "room_photo_scan_cache" does not exist
        if (!/does not exist/i.test(msg)) {
          console.warn("cache upsert error", msg);
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (!/does not exist/i.test(msg)) {
        console.warn("cache upsert threw", msg);
      }
      // swallow if table missing
    }

    const latency = Date.now() - started;
    console.log("photo-scan", {
      household: session.household_id,
      photo_id,
      model,
      latency_ms: latency,
      items: clean.length,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ items: clean }),
      headers: { "x-openai-latency-ms": String(latency), "x-cache": "miss" },
    };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Scan failed" };
  }
};
