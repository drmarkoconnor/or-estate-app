import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export const getServiceClient = () => {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
};
