import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";

export const handler: Handler = async (event) => {
  try {
    const session = await requireAuth(event);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(session)
    };
  } catch (e) {
    const err = e as { statusCode?: number; message?: string };
    return { statusCode: err.statusCode || 401, body: err.message || "Unauthorized" };
  }
};
