import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  title: z.string().optional(),
  items: z
    .array(z.object({ id: z.string(), name: z.string(), source: z.string().optional() }))
    .min(1),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { title, items } = parsed.data;

  const { data: list, error: listErr } = await supabase
    .from("shopping_lists")
    .insert({ household_id: session.household_id, title: title || "Shopping List" })
    .select("id")
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

  return { statusCode: 200, body: JSON.stringify({ id: list.id }) };
};
