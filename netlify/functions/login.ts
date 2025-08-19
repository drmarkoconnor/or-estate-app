import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { createSessionCookie } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

const schema = z.object({
  email: z.string().email(),
  passphrase: z.string().min(6),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  let data: unknown;
  if (contentType.includes("application/json")) {
    data = JSON.parse(event.body || "{}");
  } else {
    const params = new URLSearchParams(event.body || "");
    data = Object.fromEntries(params.entries());
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { statusCode: 400, body: JSON.stringify({ error: parsed.error.flatten() }) };
  }

  const { email, passphrase } = parsed.data;
  const allowed = (process.env.ALLOWED_EMAILS || "").split(/[,\s]+/).filter(Boolean);
  const okEmail = allowed.includes(email);
  const okPass = !!process.env.LOGIN_PASSPHRASE && passphrase === process.env.LOGIN_PASSPHRASE;
  if (!okEmail || !okPass) {
    return { statusCode: 401, body: "Invalid credentials" };
  }

  let household_id = "00000000-0000-0000-0000-0000000000aa";
  const slug = process.env.HOUSEHOLD_SLUG || "old-rectory";
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getServiceClient();
      const { data: household, error } = await supabase
        .from("households")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (household?.id) household_id = household.id;
    } catch (e) {
      // fallback to placeholder; log server-side only
      console.warn("Login: failed to fetch household id, using placeholder", e);
    }
  }

  const session = {
    user_id: "00000000-0000-0000-0000-000000000001",
    household_id,
    email,
  };
  const cookie = await createSessionCookie(session);

  return {
    statusCode: 204,
    headers: {
      "Set-Cookie": cookie,
    },
  };
};
