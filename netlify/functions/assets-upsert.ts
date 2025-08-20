import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  name: z.string(),
  category: z.string().optional(),
  purchase_price: z.number().optional(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { id, room_id, name, category, purchase_price } = parsed.data;

  const payload: any = {
    household_id: session.household_id,
    name,
    category: category || null,
    purchase_price: purchase_price ?? null,
  };
  if (room_id) payload.room_id = room_id;

  if (id) {
    const { error } = await supabase
      .from("assets")
      .update(payload)
      .eq("id", id)
      .eq("household_id", session.household_id);
    if (error) return { statusCode: 500, body: error.message };
    return { statusCode: 200, body: JSON.stringify({ id }) };
  } else {
    const { data, error } = await supabase.from("assets").insert(payload).select("id").single();
    if (error) return { statusCode: 500, body: error.message };
    return { statusCode: 200, body: JSON.stringify({ id: data!.id }) };
  }
};
