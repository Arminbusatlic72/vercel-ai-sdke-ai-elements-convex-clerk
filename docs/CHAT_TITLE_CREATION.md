# Chat Title Creation

This document describes how chat titles are generated, when they are updated, and what guardrails prevent low-quality or internal titles from being saved.

## Goal

- Convert the first meaningful user message into a short summary title.
- Avoid verbatim/truncated user text when possible.
- Update title in the background without delaying first token streaming.

## Where It Happens

- Route orchestration and persistence: [app/api/chat/route.ts](../app/api/chat/route.ts)
- Title generation utility: [lib/chat-title.ts](../lib/chat-title.ts)
- Chat title mutation: [convex/chats.ts](../convex/chats.ts)

## Trigger Conditions

In the chat route, title generation is attempted only when all are true:

1. Chat already exists (`chatId` is present)
2. Existing title is a placeholder or an initial auto-title variant
3. Current user message is the first non-`__begin__` user message in that chat
4. Current turn is not a Begin trigger turn

### Placeholder/Initial Title Detection

The route treats an existing title as replaceable when it matches either:

- Placeholder patterns (e.g. `new chat`, `new <name> chat`)
- Initial truncated title forms derived from the first message
- Truncated-prefix variants (existing title is a prefix of the first message)

This avoids getting stuck with raw clipped titles.

## Generation Pipeline

`generateChatTitle(...)` in [lib/chat-title.ts](../lib/chat-title.ts):

1. Normalize input whitespace
2. Generate with AI model (route currently passes `gpt-4o-mini`)
3. Prompt constraints request:
   - 4-6 words
   - Topic summary, not verbatim copy
   - No punctuation/quotes/explanations
4. Sanitize output:
   - remove emojis
   - strip outer quotes
   - normalize spacing
   - clip to max words/length
   - enforce minimum words

If AI generation fails, fallback summarization logic is used.

## Fallback Strategy

Fallback does not just blindly truncate. It applies intent-based heuristics for common patterns, for example:

- Country + president + population -> `Country President and Population`
- Country + population -> `Country Population Information`
- Europe + mountain + largest city -> `Europe Mountain and Largest City`

If no pattern matches, it creates a cleaned, short phrase from user text.

## Persistence Flow

Title generation runs post-stream in a detached background task in the route:

1. Generate candidate title
2. Validate non-empty title
3. Create authenticated Convex HTTP client using Clerk token
4. Persist via `api.chats.updateChatTitle`

This is intentionally non-blocking and does not delay response streaming.

## Auth Requirements

Route fetches Clerk token and uses it for Convex title mutation.

- Primary: token template `convex`
- Fallback: generic `getToken()`

If token is unavailable, title update is skipped safely.

## Begin/Internal Prompt Protection

Internal Begin prompt text must never become a user-visible title source.

Guards in [app/api/chat/route.ts](../app/api/chat/route.ts):

- Internal begin prompt is excluded from user-message persistence
- Internal begin prompt is excluded when counting first meaningful user message for title triggers

## Current Limits/Settings

Defined in [lib/chat-title.ts](../lib/chat-title.ts):

- Max chars: 60
- Min words: 3
- Max words: 8
- Max output tokens: 24

## Known Behavior Notes

- Title updates are asynchronous; UI may show initial title briefly before update.
- Existing chats with already-custom titles are not overwritten.
- If generation repeatedly fails (provider/auth/network), fallback title logic applies.

## Quick Verification

1. Start a new GPT chat and send first real user message.
2. Confirm sidebar title changes from placeholder to concise summary.
3. Ensure title is not raw first-line truncation.
4. Verify Begin internal instruction text never appears as title.
