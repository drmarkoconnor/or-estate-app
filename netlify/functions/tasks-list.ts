import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const room_id = url.searchParams.get("room_id");
  let q = supabase
    .from("tasks")
    .select("id, title, description, priority, due_date, status, room_id, asset_id, created_at")
    .eq("household_id", session.household_id)
    .order("created_at", { ascending: false });
  if (room_id) q = q.eq("room_id", room_id);
  const { data, error } = await q;
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify(data) };
};
