import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  due_date: z.string().optional(),
  status: z.enum(["open", "done"]).optional(),
  room_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = schema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const payload = parsed.data;

  if (payload.id) {
    const id = payload.id;
    const update = { ...payload } as any;
    delete update.id;
    const { error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", id)
      .eq("household_id", session.household_id);
    if (error) return { statusCode: 500, body: error.message };
  } else {
    const { error } = await supabase
      .from("tasks")
      .insert({ ...payload, household_id: session.household_id });
    if (error) return { statusCode: 500, body: error.message };
  }
  return { statusCode: 204 };
};
