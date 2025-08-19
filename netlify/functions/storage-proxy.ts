import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  await requireAuth(event);
  const url = new URL(event.rawUrl);
  const bucket = url.searchParams.get("bucket");
  const path = url.searchParams.get("path");
  if (!bucket || !path) return { statusCode: 400, body: "bucket and path required" };
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5); // 5 min
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 302, headers: { Location: data.signedUrl } };
};
