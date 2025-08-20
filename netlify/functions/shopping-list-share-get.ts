import type { Handler } from "@netlify/functions";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const t = url.searchParams.get("t");
  if (!t) return { statusCode: 400, body: "t required" };

  const { data: list, error: lerr } = await supabase
    .from("shopping_lists")
    .select("id, title, description, created_at")
    .eq("share_token", t)
    .single();
  if (lerr || !list) return { statusCode: 404, body: "Not found" };

  const { data: items, error: ierr } = await supabase
    .from("shopping_list_items")
    .select("id, name, source, checked")
    .eq("list_id", list.id)
    .order("created_at", { ascending: true });
  if (ierr) return { statusCode: 500, body: ierr.message };
  return { statusCode: 200, body: JSON.stringify({ ...list, items }) };
};
