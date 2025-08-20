import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

type Suggestion = {
  name: string;
  category?: string;
  confidence?: number; // 0..1
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const photo_id = body.photo_id as string | undefined;
    const room_id = body.room_id as string | undefined;
    if (!photo_id || !room_id) return { statusCode: 400, body: "photo_id and room_id required" };

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
    const signed = await supabase.storage.from("photos").createSignedUrl(photo.storage_path, 60 * 5);
    if (signed.error) return { statusCode: 500, body: signed.error.message };
    const imageUrl = signed.data.signedUrl;

    // Ask a vision model to extract items. Use JSON response format for structured output
    const system =
      "You are a home inventory vision assistant. Given a household room photo, identify distinct, countable items visible. " +
      "Return a JSON object with an 'items' array; each item has: name (concise, generic), category (one of: Painting, Picture frame, Furniture, Electronics, Appliance, Lighting, Textiles, Decorative, Tableware, Tools, Book/Media, Rug/Carpet, Fixed fitting, Other), and confidence (0..1). " +
      "Prefer durable assets over consumables. Limit to top 12 items. Avoid duplicates. If uncertain, still propose with lower confidence.";

    const userText =
      "Extract a concise list of household items visible in this photo. Respond ONLY with JSON in this shape: {\n  \"items\": [\n    { \"name\": string, \"category\": string, \"confidence\": number }\n  ]\n}\n";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
        max_tokens: 700,
        temperature: 0.2,
      }),
    });
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
        confidence: typeof x.confidence === "number" ? Math.max(0, Math.min(1, x.confidence)) : undefined,
      }))
      .slice(0, 20);

    return { statusCode: 200, body: JSON.stringify({ items: clean }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Scan failed" };
  }
};
