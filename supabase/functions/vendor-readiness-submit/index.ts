import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

serve(async (req) => {
  // ✅ HANDLE PREFLIGHT (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(),
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    const {
      orderId,
      pickupContactName,
      pickupContactPhone,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupCountry,
      pickupNotes,
      markReady,
    } = body;

    if (!orderId) {
      return json({ error: "orderId required" }, 400);
    }

    // Get Auth User ID from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized", message: "Missing Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userRes?.user) {
      console.error("User authentication check failed:", authError);
      return json({ error: "Unauthorized", message: authError?.message || "Invalid user token" }, 401);
    }

    const userId = userRes.user.id;

    // Get Vendor ID corresponding to Auth User ID
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (vendorError || !vendor) {
      console.error(`Vendor profile not found for user_id ${userId}:`, vendorError);
      return json({ error: "Forbidden", message: "Vendor profile not found for this user account" }, 403);
    }

    // Check for existing vendor order fulfillment
    const { data: existing, error: existingError } = await supabase
      .from("vendor_order_fulfillments")
      .select("*")
      .eq("order_id", orderId)
      .eq("vendor_id", vendor.id)
      .maybeSingle();

    if (existingError) {
      console.error("Fulfillment lookup error:", existingError);
      return json({ error: "Database error", message: existingError.message, code: existingError.code }, 500);
    }

    const payload = {
      order_id: orderId,
      vendor_id: vendor.id,
      status: markReady ? "ready" : "not_ready",
      pickup_contact_name: pickupContactName,
      pickup_contact_phone: pickupContactPhone,
      pickup_address: pickupAddress,
      pickup_city: pickupCity,
      pickup_state: pickupState,
      pickup_country: pickupCountry,
      pickup_notes: pickupNotes,
      submitted_at: markReady ? new Date().toISOString() : null,
    };

    let result;

    if (existing) {
      result = await supabase
        .from("vendor_order_fulfillments")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("vendor_order_fulfillments")
        .insert(payload)
        .select()
        .single();
    }

    // ✅ CRITICAL BUG FIX: Check database operation errors
    if (result.error) {
      console.error("Database operation failed inside Edge Function:", result.error);
      return json({
        error: "database_error",
        message: result.error.message,
        code: result.error.code,
        details: result.error.details
      }, 400);
    }

    return json({
      ok: true,
      data: result.data,
    });
  } catch (e) {
    console.error("Server exception inside Edge Function:", e);
    return json(
      {
        error: "server_error",
        message: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});
