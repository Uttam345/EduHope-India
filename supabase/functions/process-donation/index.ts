import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { amount, name, email, phone } = await req.json();

    if (!amount || !name || !email) {
      throw new Error("Missing required fields");
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Donation",
            },
            unit_amount: amount, // amount in paise
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/donate`,
      metadata: {
        name,
        phone: phone || "",
      },
    });

    // Store donation intent in database
    const { error: dbError } = await supabaseClient
      .from("donations")
      .insert([
        {
          amount,
          name,
          email,
          phone,
          session_id: session.id,
          status: "pending",
        },
      ]);

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to record donation");
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing donation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process donation" }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});