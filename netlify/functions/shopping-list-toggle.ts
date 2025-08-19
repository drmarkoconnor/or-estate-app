import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({ item_id: z.string().uuid(), checked: z.boolean() });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { item_id, checked } = parsed.data;
  // Load item to find list_id
  const { data: item, error: ierr } = await supabase
    .from("shopping_list_items")
    .select("id, list_id")
    .eq("id", item_id)
    .single();
  if (ierr || !item) return { statusCode: 404, body: "Item not found" };

  // Ensure list belongs to this household
  const { data: list, error: lerr } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", item.list_id)
    .eq("household_id", session.household_id)
    .single();
  if (lerr || !list) return { statusCode: 403, body: "Forbidden" };

  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", item_id);
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 204 };
};
