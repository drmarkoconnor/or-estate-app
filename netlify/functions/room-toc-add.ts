import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({ room_id: z.string(), line: z.string().min(1) });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || '{}'));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { room_id, line } = parsed.data;
  const { error } = await supabase.from('room_toc').insert({ household_id: session.household_id, room_id, line });
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
