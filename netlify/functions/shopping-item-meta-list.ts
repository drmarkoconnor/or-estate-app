import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const onlyFav = url.searchParams.get("favorites") === "1";
  const { data, error } = await supabase
    .from("shopping_item_meta")
    .select("item_key, favorite, last_bought")
    .eq("household_id", session.household_id)
    .order("last_bought", { ascending: false, nullsFirst: false });
  if (error) return { statusCode: 500, body: error.message };
  const rows = onlyFav ? (data || []).filter((d) => d.favorite) : data;
  return { statusCode: 200, body: JSON.stringify(rows) };
};
