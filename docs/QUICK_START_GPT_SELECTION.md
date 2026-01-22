/\*\*

- QUICK START: Subscription-Based GPT Selection
-
- This system ensures users only see GPTs from their purchased subscription package.
  \*/

// ═══════════════════════════════════════════════════════════════════════════
// BACKEND (Convex)
// ═══════════════════════════════════════════════════════════════════════════

/\*\*

- Query: api.packages.getSubscriptionGpts
-
- Location: convex/packages.ts
-
- What it does:
- 1.  Gets current user from Clerk auth
- 2.  Checks if they have an active subscription
- 3.  Finds the package matching their subscription's priceId
- 4.  Returns all GPTs assigned to that package
-
- Returns: Gpt[] (empty if no subscription)
- No arguments needed (uses authenticated user)
  \*/

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEND (React)
// ═══════════════════════════════════════════════════════════════════════════

// Option 1: Use the pre-built component (EASIEST)
// ─────────────────────────────────────────────

import { GptSelector } from "@/components/GptSelector";

export default function ChatPage() {
return (
<div>
<h1>Start a Chat</h1>
<GptSelector /> {/_ Automatically shows GPTs from user's subscription _/}
</div>
);
}

// Option 2: Use the hook (FLEXIBLE)
// ──────────────────────────────────

import { useSubscriptionGpts } from "@/components/GptSelector";

export default function ChatPage() {
const { gpts, isLoading, isEmpty } = useSubscriptionGpts();

if (isLoading) return <Skeleton />;

if (isEmpty) {
return (
<p>No GPTs available. Upgrade your subscription to get more.</p>
);
}

return (
<div>
<h1>Available GPTs ({gpts.length})</h1>
<ul>
{gpts.map((gpt) => (
<li key={gpt._id}>
{gpt.gptId} - {gpt.model}
</li>
))}
</ul>
</div>
);
}

// Option 3: Direct query (ADVANCED)
// ──────────────────────────────────

import { useQuery } from "convex/react";
import { api } from "@/convex/\_generated/api";

export default function ChatPage() {
const gpts = useQuery(api.packages.getSubscriptionGpts);

if (gpts === undefined) return <div>Loading...</div>;

return (
<select>
{gpts.map((gpt) => (
<option key={gpt._id} value={gpt._id}>
{gpt.gptId}
</option>
))}
</select>
);
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SETUP (How to configure packages and GPTs)
// ═══════════════════════════════════════════════════════════════════════════

/\*\*

- Step 1: Create a Stripe price
- ──────────────────────────────
- Go to Stripe Dashboard → Products → Create Product
-
- Product Name: "Workshop GPTs"
- Price: $0 (for free tier) or $4.99 (for paid)
- Price ID: price_1Srf2783ky3CgDNdJcAcYYQB
  \*/

/\*\*

- Step 2: Add to Convex packages table
- ────────────────────────────────────
- The seedPackages mutation already has this, but here's the structure:
-
- {
- name: "Workshop GPTs",
- key: "sandbox-workshop",
- tier: "free",
- stripePriceId: "price_1Srf2783ky3CgDNdJcAcYYQB", ← MUST match Stripe
- maxGpts: 4,
- description: "Free workshop series access"
- }
  \*/

/\*\*

- Step 3: Create GPTs and assign to package
- ─────────────────────────────────────────
- In your admin panel, create GPTs with:
-
- {
- gptId: "workshop-1",
- model: "gpt-4",
- packageId: "k1234567...", ← Set this to the package's \_id
- systemPrompt: "You are a workshop instructor..."
- }
-
- Create as many GPTs as needed (up to maxGpts limit)
  \*/

/\*\*

- Step 4: Set environment variable
- ────────────────────────────────
- In .env.local:
-
- STRIPE_PRICE_WORKSHOP_SANDBOX_FREE=price_1Srf2783ky3CgDNdJcAcYYQB
-
- This is used when creating subscriptions to validate the price ID
  \*/

/\*\*

- Step 5: Test
- ────────────
- 1.  User goes to checkout
- 2.  Selects "Workshop GPTs" tier
- 3.  Completes payment
- 4.  Webhook fires and stores subscription in user record
- 5.  User opens dropdown selector
- 6.  Sees only the 4 Workshop GPTs
-
- Done! ✅
  \*/

// ═══════════════════════════════════════════════════════════════════════════
// DATA FLOW DIAGRAM
// ═══════════════════════════════════════════════════════════════════════════

/\*\*

- User purchases subscription
-        ↓
- Stripe sends webhook
-        ↓
- Backend stores in user record:
- user.subscription.priceId = "price_1Srf2783ky3CgDNdJcAcYYQB"
-        ↓
- Frontend calls getSubscriptionGpts()
-        ↓
- Backend:
- 1.  Gets user.subscription.priceId
- 2.  Finds package where stripePriceId === priceId
- 3.  Gets all GPTs where packageId === package.\_id
- 4.  Returns GPT array
-        ↓
- Frontend renders dropdown with only those GPTs
  \*/

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTANT NOTES
// ═══════════════════════════════════════════════════════════════════════════

/\*\*

- ✓ Users can only see GPTs from their package
- ✓ No Stripe logic in frontend (secure)
- ✓ Automatic: Changing subscription changes available GPTs
- ✓ Efficient: Uses database indices for fast lookups
- ✓ Safe: Server validates subscription status before returning GPTs
-
- Common mistakes to avoid:
-
- ✗ Hardcoding GPT IDs in frontend
- ✗ Storing subscription status only in JWT (not in DB)
- ✗ Forgetting to set stripePriceId correctly (must match Stripe exactly)
- ✗ Not assigning GPTs to packageId (results in "no GPTs" error)
- ✗ Filtering on frontend (always filter on backend)
  \*/

export {};
