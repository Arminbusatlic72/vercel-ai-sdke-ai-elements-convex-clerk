# Begin Flow Behavior

This document describes the current Begin flow behavior for GPT chats.

## Goal

- Show the Begin screen only once per browser session per GPT.
- Trigger the auto-opening assistant message only when the user explicitly comes through the Begin screen.
- Keep normal New Chat behavior free of Begin side effects.

## Entry Behavior (`/gpt5/[gptId]`)

Implemented in [components/gpt/GptEntryClient.tsx](../components/gpt/GptEntryClient.tsx):

- Session key: `begun_[gptId]`
- On mount:
  - If `begun_[gptId]` is missing, show `GptWelcomeScreen`.
  - If `begun_[gptId]` exists, skip Begin UI and auto-create a new chat.
- On Begin button click:
  - Set `sessionStorage.setItem('begun_[gptId]', 'true')`.
  - Create chat via `api.chats.createChat`.
  - Redirect to `/gpt5/[gptId]/chat/[chatId]?begin=true`.
- Auto-start (when Begin is already done in session):
  - Redirect to `/gpt5/[gptId]/chat/[chatId]` (no query flag).

## Auto `__begin__` Trigger Rules

Implemented in [lib/hooks/useAiChat.ts](../lib/hooks/useAiChat.ts):

Auto-send of internal `__begin__` only happens when all are true:

1. `initialChatId` exists
2. `initialMessages.length === 0`
3. `messages.length === 0`
4. Status is not `streaming` and not `submitted`
5. URL has `begin=true`
6. It has not already auto-triggered for this chat instance

When it triggers:

- Sends `{ text: "__begin__" }` with idempotency header.
- After send attempt, removes `begin` from URL using `router.replace(...)`.

This ensures:

- Refresh does not re-trigger Begin.
- Shared links do not keep Begin behavior.

## New Chat Behavior (No Begin Flag)

Implemented in [components/SideBar.tsx](../components/SideBar.tsx):

- New Chat creates chat directly and redirects to `/gpt5/[gptId]/chat/[chatId]`.
- It must not append `?begin=true`.
- Result: no auto-opening message for regular New Chat.

## Internal Begin Prompt Visibility Guard

Internal prompt text:

`Start this conversation with one concise, friendly opening message and a brief note about how you can help.`

Guards in place:

- In [app/api/chat/route.ts](../app/api/chat/route.ts):
  - Internal prompt is used only for model priming when `__begin__` is detected.
  - Internal prompt is excluded from persistence.
- In [lib/hooks/useAiChat.ts](../lib/hooks/useAiChat.ts):
  - Defensive display filter hides this internal prompt even if leaked from older data.

## Non-Goals / Constraints

- No localStorage usage for Begin trigger state.
- No Begin UI changes required for this behavior.
- No chat streaming or message persistence redesign required.

## Quick Verification Checklist

- Fresh session, open GPT entry page:
  - Begin screen appears.
  - Click Begin -> opening assistant message appears.
- Same session:
  - New Chat goes directly to empty chat, no opening message.
  - Visiting `/gpt5/[gptId]` skips Begin UI.
- Refresh Begin-started chat:
  - No re-fire of opening message.
