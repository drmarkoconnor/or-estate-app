import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();
  const url = new URL(event.rawUrl);
  const room_id = url.searchParams.get("room_id");
  if (!room_id) return { statusCode: 400, body: "room_id required" };

  const [photosRes, docsRes] = await Promise.all([
    supabase
      .from("room_photos")
      .select("id, storage_path, caption, created_at")
      .eq("household_id", session.household_id)
      .eq("room_id", room_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, storage_path, uploaded_at")
      .eq("household_id", session.household_id)
      .eq("room_id", room_id)
      .order("uploaded_at", { ascending: false }),
  ]);
  if (photosRes.error) return { statusCode: 500, body: photosRes.error.message };
  if (docsRes.error) return { statusCode: 500, body: docsRes.error.message };

  return {
    statusCode: 200,
    body: JSON.stringify({ photos: photosRes.data, documents: docsRes.data }),
  };
};
