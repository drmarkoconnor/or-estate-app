import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const scope = url.searchParams.get("scope") || "all"; // all | favorites | dates

  let update: Record<string, any> = {};
  if (scope === "all") update = { favorite: false, last_bought: null };
  else if (scope === "favorites") update = { favorite: false };
  else if (scope === "dates") update = { last_bought: null };

  const { error } = await supabase
    .from("shopping_item_meta")
    .update(update)
    .eq("household_id", session.household_id);
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
