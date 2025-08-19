import type { Handler } from "@netlify/functions";
import { requireAuth } from "../lib/auth";
import { getServiceClient } from "../lib/supabase";

export const handler: Handler = async (event) => {
  try {
    const session = await requireAuth(event);
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, floor, dimensions, notes, created_at")
      .eq("household_id", session.household_id)
      .order("name", { ascending: true });
    if (error) throw error;
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data || []),
    };
  } catch (e) {
    const err = e as { message?: string; status?: number };
    const status = err.status || 500;
    return { statusCode: status, body: JSON.stringify({ error: err.message || "Server error" }) };
  }
};
