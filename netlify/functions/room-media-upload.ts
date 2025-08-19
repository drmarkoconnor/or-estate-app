import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const session = await requireAuth(event);
  const supabase = getServiceClient();

  // Expect multipart/form-data with: file, kind (photo|doc), room_id, title(optional)
  const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
  if (!ct.includes("multipart/form-data"))
    return { statusCode: 400, body: "Expected multipart/form-data" };

  // Netlify Functions don't parse multipart; use raw body (base64) and simple fields via query as a pragmatic MVP
  // For MVP: allow uploads via presigned URL flow
  try {
    const url = new URL(event.rawUrl);
    const kind = (url.searchParams.get("kind") || "photo").toLowerCase();
    const room_id = url.searchParams.get("room_id");
    const filename = url.searchParams.get("filename") || `upload-${Date.now()}`;
    if (!room_id) return { statusCode: 400, body: "room_id required" };
    if (kind !== "photo" && kind !== "doc")
      return { statusCode: 400, body: "kind must be photo or doc" };

    const bucket = kind === "photo" ? "photos" : "docs";
    const storagePath = `${session.household_id}/rooms/${room_id}/${filename}`;

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storagePath);
    if (error) return { statusCode: 500, body: error.message };

    return {
      statusCode: 200,
      body: JSON.stringify({ bucket, storagePath, signedUrl: data.signedUrl, token: data.token }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Upload init failed" };
  }
};
