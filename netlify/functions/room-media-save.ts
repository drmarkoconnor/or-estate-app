import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const bodySchema = z.object({
  room_id: z.string().uuid(),
  kind: z.enum(["photo", "doc"]),
  storage_path: z.string().min(3),
  title: z.string().optional(),
  caption: z.string().optional(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const parsed = bodySchema.safeParse(JSON.parse(event.body || "{}"));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify(parsed.error.flatten()) };
  const { room_id, kind, storage_path, title, caption } = parsed.data;

  if (kind === "doc") {
    const { error } = await supabase.from("documents").insert({
      household_id: session.household_id,
      title: title || "Document",
      doc_type: null,
      related_asset: null,
      storage_path,
      notes: caption,
      room_id,
    });
    if (error) return { statusCode: 500, body: error.message };
  } else {
    const { error } = await supabase.from("room_photos").insert({
      household_id: session.household_id,
      room_id,
      storage_path,
      caption,
    });
    if (error) return { statusCode: 500, body: error.message };
  }

  return { statusCode: 204 };
};
