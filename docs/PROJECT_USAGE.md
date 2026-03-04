# Project Usage Guide

This guide explains how to use Projects for organizing chats and attaching project-specific knowledge.

## 1) Create and open a project

- Open the sidebar and create a new project.
- Select the project to open its page.
- Start a new chat from inside the project page.

Expected behavior:

- Chats created in a project stay scoped to that project.

## 2) Move chats between project and global scope

You can move chats from the chat actions menu (`...`).

### Move a chat into a project

- Open chat actions.
- Choose **Move to Project**.
- Select the target project.

### Remove a chat from a project

- Open chat actions.
- Choose **Move to Project** → **Remove from project**.

Expected behavior:

- Project chat lists update instantly.
- All Chats updates instantly when a chat is moved in or out of a project.
- No page refresh is required.

## 3) Use Project Knowledge Base

On the project page, use **Project Knowledge Base** to manage PDFs.

### Upload PDF

- Click **Upload PDF**.
- Select one or more PDF files.
- Wait for processing to complete.

### Replace PDF

- Use the replace action on an existing file.
- Select a new PDF.

### Delete PDF

- Use the delete action on the file.

Expected behavior:

- File list updates immediately after upload/replace/delete.

## 4) Ask questions in project chat

After uploading project PDFs, ask project-specific questions in that project chat.

Expected behavior:

- Retrieval can use project knowledge when relevant.
- If a GPT-level knowledge base also exists, both sources can be used.

## 5) Troubleshooting

### "Not authenticated" during project PDF upload/delete

- Make sure you are signed in.
- Retry from the same authenticated session.

### Chat not visible where expected

- Confirm it was moved to the intended project from chat actions.
- Verify you are viewing the correct project page.

### Knowledge answer seems generic

- Ask a question that clearly references uploaded document content.
- Confirm your PDF appears in Project Knowledge Base list.

## Quick smoke test

1. Create a project.
2. Move an existing chat into it.
3. Verify it appears instantly in project list.
4. Upload one PDF in Project Knowledge Base.
5. Ask a document-specific question in that project chat.
6. Remove chat from project and verify instant list updates.
