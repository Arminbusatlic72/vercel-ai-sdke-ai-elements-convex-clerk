// scripts/test-stripe.js
require("dotenv").config({ path: ".env.local" });
// scripts/test-stripe.js - UPDATED VERSION
import Stripe from "stripe";

async function testStripeConnection() {
  console.log("🔍 Testing Stripe Connection...\n");

  // Get key from command line or .env
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error("❌ STRIPE_SECRET_KEY is not set");
    console.log("Run with: STRIPE_SECRET_KEY=sk_test_... npm run test:stripe");
    console.log("Or add to .env.local and use: npm run test:stripe:env");
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-06-20"
  });

  try {
    console.log("✅ Using key:", stripeKey.substring(0, 20) + "...");
    const balance = await stripe.balance.retrieve();

    console.log("\n🎉 STRIPE CONNECTION SUCCESSFUL!");
    console.log("Mode:", balance.livemode ? "LIVE 🔴" : "TEST 🟣");

    if (!balance.livemode) {
      console.log("\n🧪 Test card: 4242 4242 4242 4242");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testStripeConnection();
