import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  items: z
    .array(z.object({ id: z.string(), name: z.string(), source: z.string().optional() }))
    .min(1),
  setLastBoughtOnSave: z.boolean().optional(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { title, description, items, setLastBoughtOnSave } = parsed.data;

    const { data: list, error: listErr } = await supabase
      .from("shopping_lists")
  .insert({ household_id: session.household_id, title: title || "Shopping List", description: description || null })
  .select("id, share_token, description")
    .single();
  if (listErr) return { statusCode: 500, body: listErr.message };

  const payload = items.map((i) => ({
    list_id: list.id,
    item_key: i.id,
    name: i.name,
    source: i.source || null,
  }));
  const { error: itemsErr } = await supabase.from("shopping_list_items").insert(payload);
  if (itemsErr) return { statusCode: 500, body: itemsErr.message };

  if (setLastBoughtOnSave) {
    const today = new Date().toISOString().slice(0, 10);
    const upserts = items.map((i) => ({ household_id: session.household_id, item_key: i.id, last_bought: today }));
    const { error: metaErr } = await supabase.from("shopping_item_meta").upsert(upserts, { onConflict: "household_id,item_key" });
    if (metaErr) return { statusCode: 500, body: metaErr.message };
  }

  return { statusCode: 200, body: JSON.stringify({ id: list.id, share_token: list.share_token, description: list.description }) };
};
