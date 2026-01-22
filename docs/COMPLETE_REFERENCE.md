// COMPLETE REFERENCE: Subscription-Based GPT Selection System

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- FILES CREATED/MODIFIED
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// 1. Backend Query (MODIFIED)
// File: convex/packages.ts
// Added: getSubscriptionGpts query
// Purpose: Server-side logic to match user subscription to package and return GPTs

// 2. Frontend Component (NEW)
// File: components/GptSelector.tsx
// Exports: GptSelector component + useSubscriptionGpts hook
// Purpose: Ready-to-use UI and hook for accessing subscription GPTs

// 3. Type Definitions (NEW)
// File: lib/subscription-gpt-types.ts
// Exports: All TypeScript types for the system
// Purpose: Type safety for frontend and backend

// 4. Quick Start Guide (NEW)
// File: docs/QUICK_START_GPT_SELECTION.md
// Content: Step-by-step setup and usage
// Purpose: Quick reference for implementation

// 5. Architecture Documentation (NEW)
// File: docs/SUBSCRIPTION_GPT_SYSTEM.md
// Content: Detailed system architecture and data flow
// Purpose: Understanding how everything works

// 6. Examples (NEW)
// File: components/examples/GptSelectionExamples.tsx
// Content: 5 real-world implementation examples
// Purpose: Copy-paste ready code for common use cases

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- SYSTEM COMPONENTS
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// COMPONENT 1: Backend Query (Convex)
// ────────────────────────────────────

/\*
Query: api.packages.getSubscriptionGpts

Location: convex/packages.ts

Arguments: (none - uses authenticated user)

Returns: Gpt[]

Flow:

1. Get current user from Clerk auth
2. Find user in Convex database
3. Check for active subscription with priceId
4. Match priceId to package via stripePriceId
5. Get all GPTs where packageId === package.\_id
6. Return GPT array
   \*/

// COMPONENT 2: Frontend Hook
// ──────────────────────────

/\*
Hook: useSubscriptionGpts()

Location: components/GptSelector.tsx

Returns: {
gpts: Gpt[],
isLoading: boolean,
isEmpty: boolean
}

Usage:
const { gpts, isLoading, isEmpty } = useSubscriptionGpts()
\*/

// COMPONENT 3: Frontend Component
// ────────────────────────────────

/\*
Component: <GptSelector />

Location: components/GptSelector.tsx

Props: (none)

Returns: Dropdown select with user's available GPTs

Features:

- Automatically loads user's GPTs
- Shows loading state
- Shows empty state with helpful message
- Displays debug info (number of GPTs)
  \*/

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- DATA STRUCTURE
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// User Subscription Object
const userSubscription = {
status: "active", // Only "active" subscriptions return GPTs
priceId: "price_1Srf2783ky3CgDNdJcAcYYQB", // Key: Links to package
plan: "sandbox",
maxGpts: 4,
productName: "Workshop GPTs",
currentPeriodEnd: 1771628457712,
cancelAtPeriodEnd: false,
gptIds: ["gpt-1", "gpt-2", "gpt-3", "gpt-4"],
};

// Package Object
const package_obj = {
\_id: "k1234567890abcdef", // Primary key in Convex
name: "Workshop GPTs",
stripePriceId: "price_1Srf2783ky3CgDNdJcAcYYQB", // Must match subscription.priceId
maxGpts: 4,
tier: "free",
key: "sandbox-workshop",
};

// GPT Objects (Multiple)
const gpt_1 = {
\_id: "k9876543210fedcba",
gptId: "workshop-1",
model: "gpt-4",
packageId: "k1234567890abcdef", // Must match package.\_id
systemPrompt: "You are a workshop instructor...",
createdAt: 1769036416993,
};

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- MATCHING LOGIC
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// Step 1: Extract from user
const priceId = user.subscription.priceId;
// Result: "price_1Srf2783ky3CgDNdJcAcYYQB"

// Step 2: Find matching package
const pkg = await db
.query("packages")
.withIndex("by_stripePriceId", (q) => q.eq("stripePriceId", priceId))
.unique();
// Result: { \_id: "k1234567890abcdef", stripePriceId: "price_1Srf2783..." }

// Step 3: Get GPTs for package
const gpts = await db
.query("gpts")
.withIndex("by_packageId", (q) => q.eq("packageId", pkg.\_id))
.collect();
// Result: [{ gptId: "workshop-1", ... }, { gptId: "workshop-2", ... }, ...]

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- USAGE PATTERNS
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// PATTERN 1: Simple Dropdown (Recommended for most apps)
// ──────────────────────────────────────────────────────

function ChatPage() {
return <GptSelector />;
}

// PATTERN 2: Custom UI with hook
// ──────────────────────────────

function CustomGptList() {
const { gpts, isLoading, isEmpty } = useSubscriptionGpts();

if (isLoading) return <Skeleton />;
if (isEmpty) return <EmptyState />;

return (
<div>
{gpts.map((gpt) => (
<div key={gpt._id}>{gpt.gptId}</div>
))}
</div>
);
}

// PATTERN 3: Direct query access
// ──────────────────────────────

function DirectQueryExample() {
const gpts = useQuery(api.packages.getSubscriptionGpts);

return gpts?.map((g) => <div key={g._id}>{g.gptId}</div>);
}

// PATTERN 4: With error handling
// ───────────────────────────────

function RobustExample() {
const { gpts, isEmpty, isLoading } = useSubscriptionGpts();

if (isLoading) {
return <LoadingSpinner />;
}

if (isEmpty) {
return (
<div className="alert">
<p>You don't have an active subscription.</p>
<a href="/subscribe">View plans</a>
</div>
);
}

if (gpts.length === 0) {
return <p>No GPTs configured for your plan.</p>;
}

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

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- ADMIN SETUP CHECKLIST
- ═══════════════════════════════════════════════════════════════════════════
  \*/

/\*
☐ Create Stripe Product

- Name: "Workshop GPTs"
- Price: $0 or $X.XX
- Note the Price ID: price_1Srf2783ky3CgDNdJcAcYYQB

☐ Add to .env.local
STRIPE_PRICE_WORKSHOP_SANDBOX_FREE=price_1Srf2783ky3CgDNdJcAcYYQB

☐ Add to seedPackages mutation (or add manually)
{
name: "Workshop GPTs",
stripePriceId: "price_1Srf2783ky3CgDNdJcAcYYQB",
maxGpts: 4,
tier: "free",
key: "sandbox-workshop"
}

☐ Create GPTs in admin panel

- Assign each GPT to the package (packageId = package.\_id)
- Create as many as maxGpts allows

☐ Test

- Sign up with new user
- Select plan at checkout
- After payment, dropdown shows GPTs
- Switch plans → different GPTs show
  \*/

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- SECURITY FEATURES
- ═══════════════════════════════════════════════════════════════════════════
  \*/

/_
✓ Authentication: Requires valid Clerk user
✓ Authorization: Only returns GPTs for user's subscription
✓ Server-side filtering: Package matching happens on backend
✓ Status validation: Only returns GPTs for "active" subscriptions
✓ Type safety: Full TypeScript support
✓ No hardcoding: All prices/packages in database
✓ Audit trail: All access logged in Convex
_/

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- TROUBLESHOOTING
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// Issue: "No GPTs available" but user should have access
// Solution:
// 1. Check user.subscription exists
// 2. Check subscription.status === "active"
// 3. Check subscription.priceId matches a package.stripePriceId
// 4. Check that packageId exists on GPT records
// 5. Check Convex logs for detailed messages

// Issue: Wrong GPTs showing
// Solution:
// 1. Verify GPT.packageId is correct
// 2. Verify Package.stripePriceId matches Stripe exactly
// 3. Check user.subscription.priceId is correct
// 4. Reseed packages if .env.local changed

// Issue: Query never returns
// Solution:
// 1. Check user is authenticated (Clerk session)
// 2. Check user exists in Convex database
// 3. Check network requests in browser DevTools

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- KEY INDICES (for performance)
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// packages table indices:
// - by_stripePriceId: Fast lookup of package by Stripe price ID
// - by_tier: Filter packages by tier (free/paid/trial)

// gpts table indices:
// - by_packageId: Get all GPTs for a package (primary query)
// - by_gptId: Get individual GPT by gptId

// users table indices:
// - by_clerkId: Get user by Clerk ID (authentication)
// - by_subscription_status: Filter users by subscription status

/\*\*

- ═══════════════════════════════════════════════════════════════════════════
- FILES TO REFERENCE
- ═══════════════════════════════════════════════════════════════════════════
  \*/

// Backend:
// - convex/packages.ts (getSubscriptionGpts query)
// - convex/schema.ts (indices on packages, gpts, users)

// Frontend:
// - components/GptSelector.tsx (component + hook)
// - components/examples/GptSelectionExamples.tsx (5 examples)

// Types:
// - lib/subscription-gpt-types.ts (all type definitions)

// Documentation:
// - docs/QUICK_START_GPT_SELECTION.md (setup guide)
// - docs/SUBSCRIPTION_GPT_SYSTEM.md (architecture)

export {};
