# UI Message Rendering Tests

Use this checklist to verify chat message rendering (Markdown, code, lists, and streaming behavior).

## Quick Setup

1. Run the app locally or in preview.
2. Open a GPT chat page.
3. Run each prompt below and compare the expected result.

---

## Core Markdown

### 1) Headings and paragraphs

Prompt:

```
Give me a response with H1, H2, H3 and two short paragraphs.
```

Expected:

- H1 is largest, H2 medium, H3 smaller.
- Paragraph spacing is consistent.

### 2) Lists and nesting

Prompt:

```
Create a numbered list with 3 items. Item 2 should have a sub-bullet list of 2 items.
```

Expected:

- Top list is numbered.
- Sub-list is indented and uses bullets.

### 3) Inline formatting

Prompt:

```
Use **bold**, *italic*, and `inline code` in one sentence.
```

Expected:

- Bold, italic, and inline code appear correctly.

### 4) Blockquote

Prompt:

```
Write one normal paragraph and one blockquote.
```

Expected:

- Blockquote is visually distinct.

---

## Code Blocks

### 5) TypeScript snippet (fenced)

Prompt:

```
Show a TypeScript example in a fenced code block.
```

Expected:

- Code is rendered in a block with monospaced font.
- Language tag is visible (ts) if your UI shows it.

### 6) TypeScript snippet (no fences)

Prompt:

```
TypeScript generic function example (with constraints). Do not include code fences.
```

Expected:

- If auto-fencing is enabled, code is still rendered as a block.
- If disabled, plain text should render as plain text (not a block).

### 7) Mixed prose and code

Prompt:

```
Explain a generic function briefly, then show a short TypeScript snippet.
```

Expected:

- Prose stays normal text.
- Code block renders as a block (only the code is fenced).

---

## Tables and GFM

### 8) Markdown table

Prompt:

```
Create a 3-column markdown table with 2 rows.
```

Expected:

- Table renders as a table (if supported by your renderer).
- If not supported, it should still be readable.

---

## Streaming and Performance

### 9) Long response streaming

Prompt:

```
Write a 12-step checklist with short explanations.
```

Expected:

- Streaming updates only the latest message.
- Older messages do not flicker.

### 10) Rapid short responses

Prompt:

```
Reply with three short paragraphs, each 1 sentence.
```

Expected:

- No layout jump or flash.

---

## Copy Behavior

### 11) Copy a markdown response

Prompt:

```
Give a response with headings and a list. Keep it short.
```

Action:

- Use the Copy button on the assistant message.
  Expected:
- Copied text is clean (no raw HTML). Decide if you prefer Markdown or plain text.

### 12) Copy a code response

Prompt:

```
Provide a TypeScript snippet for array filtering.
```

Action:

- Copy the assistant message.
  Expected:
- Copied text includes the code cleanly, without UI artifacts.

---

## Edge Cases

### 13) Empty or short response

Prompt:

```
Reply with a single word: "OK".
```

Expected:

- No code block. No extra spacing.

### 14) Special characters

Prompt:

```
Show a line with angle brackets, pipes, and braces: <T> | { a: 1 }.
```

Expected:

- Characters render correctly without warnings.

### 15) Long unbroken text

Prompt:

```
Reply with one very long word: supercalifragilisticexpialidocioussupercalifragilisticexpialidocious
```

Expected:

- Text wraps or scrolls without breaking layout.

---

## Optional Visual Check

- Verify list bullets are visible.
- Verify spacing between paragraphs is consistent.
- Verify code blocks do not overflow on mobile width.

---

## Pass/Fail Notes

Use this block to track issues:

- Headings: PASS / FAIL
- Lists: PASS / FAIL
- Inline formatting: PASS / FAIL
- Code block: PASS / FAIL
- Streaming: PASS / FAIL
- Copy: PASS / FAIL
- Edge cases: PASS / FAIL
