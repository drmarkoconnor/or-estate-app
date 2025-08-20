import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const room_id = url.searchParams.get('room_id');
  if (!room_id) return { statusCode: 400, body: 'room_id required' };
  const { data, error } = await supabase
    .from('room_toc')
    .select('id, line, position, created_at')
    .eq('household_id', session.household_id)
    .eq('room_id', room_id)
    .order('position', { ascending: true });
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify(data) };
};
