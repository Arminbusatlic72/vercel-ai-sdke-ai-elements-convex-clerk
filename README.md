# AI GPT SaaS (Next.js + Convex + Clerk + AI SDK)

Production-style GPT SaaS application with:

- Dynamic GPT configurations (admin-managed)
- Subscription-based access (Stripe + package mapping)
- Clerk authentication + protected routes
- Convex as the primary app/backend data layer
- AI SDK streaming chat with tool-based RAG (`file_search`) and optional web search

## Tech Stack

- Next.js 16 App Router
- React 19
- AI SDK (`streamText`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/google`)
- Convex (`convex/browser`, `convex/react`, `convex/nextjs`)
- Clerk authentication
- Stripe subscriptions/webhooks

## Project Structure (Key Areas)

- API chat route: [app/api/chat/route.ts](app/api/chat/route.ts)
- Chat client hook: [lib/hooks/useAiChat.ts](lib/hooks/useAiChat.ts)
- Convex schema/functions: [convex/](convex/)
- GPT resolution helpers: [lib/](lib/)
- Admin + GPT management UI: [app/admin/](app/admin/)

## What the Chat Route Does

The chat route is optimized for first-token latency and reliability:

- Minimal pre-stream critical path
- Immediate `streamText()` start
- Tool-enabled RAG (`file_search`) with capped retrieval depth
- Rolling history window + deterministic summary compression for older turns
- Post-stream async tasks (persistence, warmups, summary updates)
- Request deduplication backup via idempotency key window

See admin validation guide: [docs/ADMIN_CHAT_IMPROVEMENTS_TEST_GUIDE.md](docs/ADMIN_CHAT_IMPROVEMENTS_TEST_GUIDE.md)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`.

3. Start Convex dev sync:

```bash
npx convex dev
```

4. Start Next.js dev server:

```bash
npm run dev
```

5. Open:

- http://localhost:3000

## Scripts

- `npm run dev` – Next.js dev server
- `npm run build` – production build
- `npm run start` – run built app
- `npm run lint` – lint checks
- `npm run test:stripe` – Stripe integration script
- `npm run test:stripe:env` – Stripe script with dotenv preload

## Chat Reliability & Performance Notes

- Client-side in-flight submit guard prevents duplicate submits.
- Server-side idempotency key check protects against near-duplicate POSTs.
- RAG/tool turns are constrained to reduce tail latency.
- Perf logs (`[PERF] pre-stream`, `[PERF] first-chunk`, `[PERF] finish`) are enabled for tuning.

## Deployment Notes

- Deployable on Vercel.
- For production-grade idempotency across multiple serverless instances, move from in-memory dedup storage to shared KV/Redis.
- Ensure all required env vars are configured in deployment environment.

## Useful Docs

- Admin test plan: [docs/ADMIN_CHAT_IMPROVEMENTS_TEST_GUIDE.md](docs/ADMIN_CHAT_IMPROVEMENTS_TEST_GUIDE.md)
- Deployment checklist: [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)
- Subscription implementation: [docs/SUBSCRIPTION_IMPLEMENTATION.md](docs/SUBSCRIPTION_IMPLEMENTATION.md)
