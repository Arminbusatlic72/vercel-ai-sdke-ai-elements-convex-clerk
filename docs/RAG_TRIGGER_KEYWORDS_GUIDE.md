# RAG Trigger Keywords - Admin Guide

## What are RAG Trigger Keywords?

RAG (Retrieval-Augmented Generation) Trigger Keywords control when the system searches uploaded documents (PDFs) to answer user questions.

When a user's message contains one of these keywords, the system automatically uses `file_search` to retrieve relevant information from the GPT's uploaded documents.

---

## Why is this field optional?

**Short answer:** The system has built-in fallback detection, but custom keywords give you precise control.

### ✅ Without custom keywords (default behavior)

The system uses generic document cues:

- `document`
- `pdf`
- `file`
- `section`
- `according to`

Plus manual override phrases:

- "from the docs"
- "from the files"
- "according to the document"

**This works fine for general-purpose GPTs**, but may miss domain-specific queries.

### ✅ With custom keywords (recommended for specialized GPTs)

You define exactly which words trigger document search based on your GPT's domain.

**Example:**

- Legal GPT: `contract`, `clause`, `agreement`, `liability`
- Product GPT: `requirements`, `roadmap`, `feature`, `specification`
- CV GPT: `skills`, `experience`, `education`, `resume`

---

## How to configure RAG Trigger Keywords

### Step 1: Identify common user queries

Think about how users will ask questions about your documents.

**Examples:**

| GPT Type        | Common Questions                               | Keywords                                                  |
| --------------- | ---------------------------------------------- | --------------------------------------------------------- |
| Legal Contracts | "What does the agreement say about liability?" | `contract`, `agreement`, `clause`, `liability`, `terms`   |
| Product Docs    | "What features are on the roadmap?"            | `features`, `roadmap`, `requirements`, `specification`    |
| CV/Resume       | "What are my technical skills?"                | `skills`, `experience`, `education`, `projects`, `resume` |
| Technical Docs  | "How does the API authentication work?"        | `api`, `authentication`, `endpoint`, `method`, `request`  |

### Step 2: Add 15–25 keywords

**Format:** Comma-separated list

```
skills, experience, education, resume, cv, projects, employment, career, roles, technologies, tools, frameworks, certifications, achievements
```

### Step 3: Test with real queries

Send a few test messages to verify document retrieval:

**Test queries that SHOULD trigger RAG:**

- "What are my main skills?" ✅ (contains "skills")
- "Summarize my work experience" ✅ (contains "experience")

**Test queries that should NOT trigger RAG:**

- "Hello, how are you?" ❌ (no keywords)
- "What is machine learning?" ❌ (general knowledge)

---

## Best practices

### ✅ DO

1. **Include domain-specific terms**
   - For Legal: `contract`, `clause`, `indemnity`, `liability`
   - For Medical: `diagnosis`, `treatment`, `prescription`, `symptoms`
   - For Tech: `api`, `endpoint`, `configuration`, `deployment`

2. **Include singular and plural forms**
   - `skill` AND `skills`
   - `contract` AND `contracts`
   - `feature` AND `features`

3. **Include common variations**
   - `cv`, `resume`, `curriculum`
   - `clause`, `section`, `provision`
   - `spec`, `specification`, `requirements`

4. **Include action words users might use**
   - `analyze`, `summarize`, `extract`, `compare`
   - `review`, `check`, `verify`, `validate`

5. **Aim for 15–25 keywords**  
   This covers most real-world queries without being too broad.

### ❌ DON'T

1. **Don't add generic words**
   - Avoid: `the`, `and`, `is`, `what`, `how`
   - System already handles these

2. **Don't add single letters or numbers**
   - Avoid: `a`, `1`, `2`

3. **Don't add overly broad terms**
   - Avoid: `information`, `data`, `content` (too vague)

4. **Don't exceed 40–50 keywords**
   - Too many keywords = false positives
   - Keep it focused on your GPT's specific domain

---

## Auto-generated suggestions

When creating a new GPT, the system automatically suggests keywords based on:

- GPT name
- Description
- Common document cues

**You can:**

- ✅ Accept the suggestions as-is
- ✅ Edit them to match your needs
- ✅ Clear them and add your own
- ✅ Leave the field empty (fallback mode)

---

## When to update keywords

### Add keywords when:

- Users ask questions that should trigger RAG but don't
- You add new types of documents to the GPT
- You notice common query patterns in user messages

### Remove keywords when:

- They cause false positives (triggering RAG unnecessarily)
- They're too generic and slow down responses

---

## Performance impact

**✅ Benefits of custom keywords:**

- ⚡ Faster responses for non-document queries (RAG skipped)
- 🎯 More accurate document retrieval
- 💰 Lower token costs (no unnecessary tool calls)

**⚠️ No performance penalty:**

- Keyword matching is instant (deterministic string check)
- No model calls, no latency added

---

## Examples by GPT category

### Legal GPT

```
contract, agreement, clause, terms, liability, indemnity, provision, section, exhibit,
appendix, warranty, obligations, rights, termination, renewal, parties, governing law
```

### Product/SaaS GPT

```
features, roadmap, requirements, specification, user story, epic, sprint, release,
milestone, backlog, priority, functionality, integration, workflow
```

### Technical Documentation GPT

```
api, endpoint, authentication, configuration, deployment, installation, setup,
troubleshooting, error, method, request, response, parameter, schema
```

### HR/Resume GPT

```
skills, experience, education, resume, cv, employment, career, roles, position,
job title, projects, certifications, achievements, qualifications, background
```

### Medical/Clinical GPT

```
diagnosis, treatment, medication, prescription, symptoms, procedure, test results,
patient history, allergies, conditions, therapy, protocol
```

### Finance/Accounting GPT

```
invoice, payment, transaction, balance, ledger, expense, revenue, profit,
statement, report, reconciliation, audit, compliance
```

---

## Troubleshooting

### Problem: RAG not triggering when it should

**Solution:**

1. Check if your keywords match the user's query words
2. Add more keyword variations
3. Check server logs for `[RAG CHECK]` to see what's being matched

### Problem: RAG triggering too often

**Solution:**

1. Remove overly generic keywords
2. Make keywords more specific to your domain
3. Reduce total keyword count

### Problem: Empty keyword field

**Solution:**

- System will use fallback mode (generic document cues only)
- This is fine for general-purpose GPTs
- Add custom keywords for better precision

---

## Summary

| Field Status        | Behavior                               |
| ------------------- | -------------------------------------- |
| **Empty**           | Uses fallback mode (generic doc cues)  |
| **Custom keywords** | Precise control over when RAG triggers |
| **Auto-generated**  | Quick start based on GPT metadata      |

**Recommendation:** Start with auto-generated keywords, test with real queries, then refine as needed.

---

## Questions?

If you're unsure which keywords to add:

1. Look at your uploaded documents
2. List the main topics/concepts they cover
3. Think about how users will ask about those topics
4. Add 15–25 of the most common terms

**Example workflow:**

- Document: "SaaS Product Requirements.pdf"
- Topics: features, pricing, roadmap, integrations
- User questions: "What features are planned?", "Tell me about pricing tiers"
- Keywords: `features`, `pricing`, `roadmap`, `integrations`, `tiers`, `plans`
