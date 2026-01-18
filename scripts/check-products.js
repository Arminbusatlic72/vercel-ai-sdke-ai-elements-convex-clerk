// scripts/check-products.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_...", {
  apiVersion: "2024-06-20"
});

async function checkProducts() {
  console.log("🔍 Checking your Stripe products...\n");

  try {
    // 1. List all products
    const products = await stripe.products.list({ limit: 10, active: true });

    console.log(`Found ${products.data.length} product(s):\n`);

    // 2. Show each product with prices
    for (const product of products.data) {
      console.log(`📦 ${product.name} (${product.id})`);
      console.log(`   Description: ${product.description || "No description"}`);

      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true
      });

      if (prices.data.length === 0) {
        console.log("   ⚠️  No prices found! Need to add pricing.");
      } else {
        console.log("   Prices:");
        prices.data.forEach((price) => {
          const amount = `$${(price.unit_amount / 100).toFixed(2)}`;
          const interval = price.recurring?.interval || "one-time";
          console.log(`   - ${amount} ${interval} → ${price.id}`);
        });
      }
      console.log("");
    }

    // 3. Advice based on what's missing
    const hasBasic = products.data.some((p) => p.name.includes("Basic"));
    const hasPro = products.data.some((p) => p.name.includes("Pro"));

    console.log("📋 ACTION REQUIRED:");
    if (!hasBasic) console.log('❌ Create "AI Sandbox Basic" product');
    if (hasPro) {
      const proProduct = products.data.find((p) => p.name.includes("Pro"));
      const proPrices = await stripe.prices.list({ product: proProduct.id });
      const hasYearly = proPrices.data.some(
        (p) => p.recurring?.interval === "year"
      );
      if (!hasYearly) console.log("❌ Add yearly price to AI Sandbox Pro");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkProducts();
