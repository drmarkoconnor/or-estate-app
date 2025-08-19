import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { createSessionCookie } from "../lib/auth";

const schema = z.object({
  email: z.string().email(),
  passphrase: z.string().min(6)
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  let data: unknown;
  if (contentType.includes("application/json")) {
    data = JSON.parse(event.body || "{}");
  } else {
    // handle form-encoded submissions from the simple 11ty login form
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

  // For Phase 0, fake user/household IDs; Phase 1 will fetch from DB
  const session = {
    user_id: "00000000-0000-0000-0000-000000000001",
    household_id: "00000000-0000-0000-0000-0000000000aa",
    email
  };
  const cookie = await createSessionCookie(session);

  return {
    statusCode: 204,
    headers: {
      "Set-Cookie": cookie
    }
  };
};
