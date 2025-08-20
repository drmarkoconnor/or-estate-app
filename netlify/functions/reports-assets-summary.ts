import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();

  // sum by room
  const { data: rooms, error: rErr } = await supabase
    .from('rooms')
    .select('id, name, floor')
    .eq('household_id', session.household_id);
  if (rErr) return { statusCode: 500, body: rErr.message };
  const roomIds = rooms.map(r => r.id);
  const { data: sums, error: sErr } = await supabase
    .from('assets')
    .select('room_id, purchase_price')
    .in('room_id', roomIds);
  if (sErr) return { statusCode: 500, body: sErr.message };
  const byRoom: Record<string, number> = {};
  for (const a of (sums||[])) {
    const v = Number(a.purchase_price || 0);
    byRoom[a.room_id] = (byRoom[a.room_id] || 0) + (isFinite(v)? v : 0);
  }
  const byFloor: Record<string, number> = {};
  let byHouse = 0;
  for (const r of rooms){
    const v = byRoom[r.id] || 0;
    byHouse += v;
    const f = r.floor || 'Unknown';
    byFloor[f] = (byFloor[f] || 0) + v;
  }
  return { statusCode: 200, body: JSON.stringify({ byRoom, byFloor, byHouse, rooms }) };
};
