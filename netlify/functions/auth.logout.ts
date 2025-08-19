import type { Handler } from "@netlify/functions";
import { clearSessionCookie } from "../lib/auth";

export const handler: Handler = async () => {
  return {
    statusCode: 204,
    headers: {
      "Set-Cookie": clearSessionCookie(),
    },
  };
};
