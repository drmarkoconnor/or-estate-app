import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  item_key: z.string(),
  favorite: z.boolean().optional(),
  last_bought: z.string().nullable().optional(), // ISO date or null
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { item_key, favorite, last_bought } = parsed.data;

  const patch: any = {};
  if (favorite !== undefined) patch.favorite = favorite;
  if (last_bought !== undefined) patch.last_bought = last_bought;

  const { error } = await supabase
    .from("shopping_item_meta")
    .upsert(
      { household_id: session.household_id, item_key, ...patch },
      { onConflict: "household_id,item_key" }
    );
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
