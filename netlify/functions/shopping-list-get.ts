import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const id = url.searchParams.get("id");
  if (!id) return { statusCode: 400, body: "id required" };

  const { data: list, error: lerr } = await supabase
    .from("shopping_lists")
    .select("id, title, created_at")
    .eq("id", id)
    .eq("household_id", session.household_id)
    .single();
  if (lerr) return { statusCode: 404, body: "Not found" };
  const { data: items, error: ierr } = await supabase
    .from("shopping_list_items")
    .select("id, item_key, name, source, checked")
    .eq("list_id", id)
    .order("created_at", { ascending: true });
  if (ierr) return { statusCode: 500, body: ierr.message };
  return { statusCode: 200, body: JSON.stringify({ ...list, items }) };
};
