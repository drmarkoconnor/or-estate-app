import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  floor: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const session = await requireAuth(event);
    const input = JSON.parse(event.body || "{}");
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      return { statusCode: 400, body: JSON.stringify({ error: parsed.error.flatten() }) };
    const supabase = getServiceClient();

    const payload = {
      household_id: session.household_id,
      name: parsed.data.name,
      floor: parsed.data.floor ?? null,
      dimensions: parsed.data.dimensions ?? null,
      notes: parsed.data.notes ?? null,
    };

    let data;
    if (parsed.data.id) {
      const { data: d, error } = await supabase
        .from("rooms")
        .update(payload)
        .eq("id", parsed.data.id)
        .eq("household_id", session.household_id)
        .select()
        .single();
      if (error) throw error;
      data = d;
    } else {
      const { data: d, error } = await supabase.from("rooms").insert(payload).select().single();
      if (error) throw error;
      data = d;
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (e) {
    const err = e as { message?: string; status?: number };
    const status = err.status || 500;
    return { statusCode: status, body: JSON.stringify({ error: err.message || "Server error" }) };
  }
};
