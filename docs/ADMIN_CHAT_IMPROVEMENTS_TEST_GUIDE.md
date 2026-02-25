# Admin Test Guide: Chat Performance & Reliability Improvements

This guide helps an admin validate the recent `/api/chat` improvements end-to-end.

## Scope of What Was Improved

- Faster first token (early streaming path)
- Better tail-latency for tool/RAG turns
- Deterministic RAG depth cap (`maxNumResults`)
- Conversation summary compression for older turns
- Duplicate request protection:
  - Client-side in-flight guard
  - Server-side idempotency key guard (`X-Idempotency-Key`)

---

## 1) Prerequisites

1. Ensure env vars are set (`OPENAI_API_KEY`, Convex URL, Clerk keys).
2. Start backend + frontend:
   - `npx convex dev`
   - `npm run dev`
3. Sign in as admin and open a GPT chat page in browser.
4. Use a GPT that has:
   - a configured model (preferably `gpt-5` to verify routing),
   - optional vector store + documents for RAG checks.

---

## 2) Core Functional Tests

### A. Simple greeting (fast-path)

Prompt:

- `hello`

Expected:

- Response starts very quickly.
- Logs should show low-complexity/greeting behavior and fast first chunk.

### B. Low-complexity question

Prompt:

- `what is 2+2`

Expected:

- Very low first-token latency.
- `effectiveModel` may downshift for speed.

### C. Complex non-RAG question

Prompt:

- `Compare monolithic and microservices architecture for a SaaS scaling from 10k to 1M users.`

Expected:

- Better reasoning quality than simple path.
- Admin model intent should be preserved when not in tool path.

### D. RAG question (document-grounded)

Prompt:

- `According to the uploaded document, what are Armin's skills?`

Expected:

- `useRAG: true` in logs.
- Final user-facing answer appears in UI (not empty).
- No `AI_APICallError` in server logs.

---

## 3) Duplicate Request Tests (Critical)

### A. Client-side duplicate prevention

1. Type one message.
2. Rapidly press Enter 3-5 times or click submit repeatedly.

Expected:

- Only one effective send while request is in-flight.
- No duplicated assistant responses for the same submit.

### B. Server-side idempotency guard

1. Trigger same request twice within 10 seconds with same idempotency key.
2. You can verify with logs/network panel.

Expected:

- First request: `200`
- Duplicate request: `409` with `Duplicate request`

---

## 4) Tail-Latency Validation

Use these prompts in order in one chat:

1. `hello`
2. `what is 2+2`
3. `According to the uploaded document, summarize Armin's top 5 skills with short evidence.`

Track in logs:

- `[PERF] pre-stream`
- `[PERF] stream-start`
- `[PERF] first-chunk`
- `[PERF] finish`

Target behavior:

- Pre-stream should stay low.
- First chunk should be much lower than old baseline.
- RAG turns should complete without empty output.

---

## 5) Conversation Summary Compression Test

1. Continue same chat for at least 8+ turns.
2. Ask a follow-up requiring continuity.

Expected:

- Older context gets summarized (cache path active).
- Recent turns remain relevant.
- No noticeable regression in answer quality.

---

## 6) Pass/Fail Checklist

Mark each item:

- [ ] Simple/low-complexity prompts return quickly
- [ ] Complex prompts still produce high-quality output
- [ ] RAG prompts return grounded answers (no empty response)
- [ ] Duplicate rapid submits do not create duplicate responses
- [ ] Duplicate idempotency-key requests return `409`
- [ ] No critical errors in server logs during chat flow
- [ ] 8+ turn conversation remains coherent

If all are checked, the improvements are validated for staging/UAT.

---

## 7) Known Caveat (Important)

Current server idempotency store is in-memory. On multi-instance serverless deployments, dedup may not be globally shared across instances. For strict production-grade dedup, migrate idempotency storage to shared KV/Redis.

---

## 8) Optional Monitoring Fields to Watch

In server logs:

- `effectiveModel`
- `resolvedModel`
- `preservedAdminModel`
- `useRAG`
- `ragMaxResults`
- `summaryApplied`
- `t_first_chunk_ms`
- `t_finish_ms`

These fields help validate both performance and policy behavior.
