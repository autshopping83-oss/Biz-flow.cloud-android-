// ============================================
// Create PaySuite Payment - Edge Function
// ============================================
// POST /functions/v1/create-payment
// Body: { plan_name: "Pro" | "Empresarial", user_id: string, return_url: string }
// Response: { checkout_url: string, payment_id: string }

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const PAYSUITE_API = "https://paysuite.tech/api/v1";
const PAYSUITE_TOKEN = Deno.env.get("PAYSUITE_API_TOKEN") || "";

interface Plan {
  name: string;
  price: number;
}

const PLANS: Record<string, Plan> = {
  Pro: { name: "Pro", price: 250 },
  Empresarial: { name: "Empresarial", price: 500 },
};

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { plan_name, user_id, return_url } = await req.json();

    if (!plan_name || !user_id) {
      return new Response(
        JSON.stringify({ status: "error", message: "plan_name and user_id are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const plan = PLANS[plan_name];
    if (!plan) {
      return new Response(
        JSON.stringify({ status: "error", message: `Invalid plan: ${plan_name}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!PAYSUITE_TOKEN) {
      return new Response(
        JSON.stringify({ status: "error", message: "PaySuite API token not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const cleanUserId = user_id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const reference = `BIZ${cleanUserId}${Date.now()}`;

    const paySuiteResponse = await fetch(`${PAYSUITE_API}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSUITE_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        amount: plan.price.toString(),
        reference,
        description: `Plano ${plan.name} - BizFlow (${plan.price} MT)`,
        return_url: return_url || "https://biz-flow.cloud",
      }),
    });

    const paySuiteData = await paySuiteResponse.json();

    if (paySuiteData.status !== "success") {
      return new Response(
        JSON.stringify({ status: "error", message: paySuiteData.message || "Payment creation failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    const { id: payment_id, checkout_url } = paySuiteData.data;

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          checkout_url,
          payment_id,
          reference,
          amount: plan.price,
          plan: plan.name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("create-payment error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
