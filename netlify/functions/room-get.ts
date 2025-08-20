import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const url = new URL(event.rawUrl);
  const id = url.searchParams.get("id");
  if (!id) return { statusCode: 400, body: "id required" };
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, floor, dimensions")
    .eq("household_id", session.household_id)
    .eq("id", id)
    .maybeSingle();
  if (error) return { statusCode: 500, body: error.message };
  if (!data) return { statusCode: 404, body: "Not found" };
  return { statusCode: 200, body: JSON.stringify(data) };
};
