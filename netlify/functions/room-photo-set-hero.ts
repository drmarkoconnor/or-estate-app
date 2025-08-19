import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({ photo_id: z.string(), room_id: z.string() });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { photo_id, room_id } = parsed.data;

  // clear previous hero for room
  const { error: clearErr } = await supabase
    .from("room_photos")
    .update({ is_hero: false })
    .eq("household_id", session.household_id)
    .eq("room_id", room_id);
  if (clearErr) return { statusCode: 500, body: clearErr.message };

  // set new hero
  const { error: setErr } = await supabase
    .from("room_photos")
    .update({ is_hero: true })
    .eq("household_id", session.household_id)
    .eq("id", photo_id)
    .eq("room_id", room_id);
  if (setErr) return { statusCode: 500, body: setErr.message };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
