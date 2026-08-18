# Ecris Intelligence — Developer documentation

This document explains the plugin **concept by concept**, then **step by step** through how a request becomes a rewrite or a review. It is for people who maintain this repo or want to plug it into another host.

Users who only want to install and use the plugin should read [README.md](./README.md).

---

## 1. What this plugin is

Ecris Intelligence is a **portable writing plugin**. It does not own documents, users, or knowledge bases. A **host** (Cursor, Claude Desktop, VS Code, or an app like [Ecris](https://github.com/grascya/Inkwell)) collects selected text and optional references, then this plugin:

1. **Improves** that text (rewrite grounded in sources), or
2. **Reviews** that text (notes, not a rewrite).

The same plugin is delivered in three complementary forms:

| Form | What it is | Who consumes it |
|---|---|---|
| **Skills** (`skills/*/SKILL.md`) | Playbooks an AI host can load as instructions | Cursor, `npx skills add`, any SKILL.md host |
| **Agent** (`agents/writing-agent.md`) | Named agent that describes the two workflows | Cursor agents, other agent hosts |
| **MCP server** (`src/`) | Process that exposes tools over stdio | Any MCP client |

Those three forms describe the **same** two jobs. Skills and the agent are instructions. The MCP server is the runnable implementation that actually calls a model.

---

## 2. Core idea: host vs plugin

Draw a hard line:

```text
┌─────────────────────────────────────────┐
│ Host (your app / Cursor / Claude)       │
│  - editor, selection, auth              │
│  - document storage                     │
│  - knowledge / references               │
│  - how the user picks text              │
└─────────────────┬───────────────────────┘
                  │ WritingRequest
                  ▼
┌─────────────────────────────────────────┐
│ This plugin                             │
│  - validate + truncate inputs           │
│  - build prompts from skills            │
│  - call OpenRouter                      │
│  - return plain text                    │
└─────────────────────────────────────────┘
```

The plugin **never**:

- Reads files from disk as “the user’s document”
- Talks to Convex, TipTap, or any product database
- Looks up knowledge on its own

If a host wants “rewrite this paragraph using my uploaded papers,” the host must fetch those papers and pass them in as `references`. That is the whole contract.

---

## 3. The host contract

All entry points (MCP tools, library functions, agent workflows) take the same shape, defined in `src/host.ts`.

### 3.1 `Reference`

One knowledge source the host already has in memory:

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | Human-readable name (shown in the prompt as `[1] Title`) |
| `kind` | no | Optional label such as `"pdf"`, `"note"`, `"url"` |
| `content` | yes | Full text the model is allowed to use |

The plugin does not fetch URLs or parse PDFs. `content` must already be text.

### 3.2 `WritingRequest`

| Field | Required | Meaning |
|---|---|---|
| `selectedText` | **yes** | The span to rewrite or review |
| `documentContext` | no | Surrounding text so the model can keep continuity |
| `references` | no | Knowledge sources; omit if there are none |
| `writingGuidelines` | no | Extra style rules from the user (improve path only) |

`selectedText` is the only required field. Empty or whitespace-only selection throws `"Selected text is required"`.

### 3.3 Limits (why they exist)

Prompts are capped so a huge paste cannot blow the context window:

| Constant | Default | Applied to |
|---|---|---|
| `MAX_SELECTION_CHARS` | 50 000 | `selectedText` (hard error if over) |
| `MAX_DOC_CONTEXT_CHARS` | 4 000 | `documentContext` (truncated) |
| `MAX_SYSTEM_INSTRUCTIONS_CHARS` | 4 000 | `writingGuidelines` (truncated) |
| `MAX_SOURCES_FOR_PROMPT` | 5 | Number of references kept |
| `MAX_SOURCE_CHARS` | 3 000 | Each reference body (truncated) |

Truncation appends `\n…[truncated for length]`. Extra references beyond the first five are dropped, not merged.

These helpers live next to the types:

- `truncate(text, max)` — length cap
- `formatSources(references)` — numbered `[1] Title (kind)\nbody` block, or `"No knowledge sources attached."`
- `requireSelectedText(text)` — trim + empty check + max length

---

## 4. Skills (playbooks)

A **skill** here is not executable code. It is a markdown playbook with YAML frontmatter (`name`, `description`) plus rules the model should follow.

Cursor (and other skill hosts) load files from `skills/`. The MCP server **cannot** read those files at runtime in a reliable way when published as a package, so the same rules are **copied** into TypeScript strings in `src/skills.ts`.

**Rule for maintainers:** if you edit a `SKILL.md`, update the matching string in `src/skills.ts` in the same change.

### 4.1 `academic-writer`

Used on the **improve** path.

Job: ground the rewrite in references. Formal but not stiff. Expand the selection with facts from sources when they actually help. Stay conservative if sources conflict or are thin.

Hard avoids: fake quotes, page numbers, DOIs; dumping sources at the expense of the user’s original point.

### 4.2 `humanizer`

Used on the **improve** path, together with academic-writer.

Job: keep meaning, fix robotic cadence, vary sentences, keep technical accuracy.

Hard avoids: stock AI phrases, extra headings, repetition.

Together, academic-writer supplies *what* to add from sources; humanizer supplies *how* the prose should sound.

### 4.3 `document-reviewer`

Used on the **review** path only.

Job: critique, do not rewrite. Flag vague claims, weak structure, and claims that are not in the selection or references. Prefer bullets. Suggest wording only when the fix is obvious.

---

## 5. The writing agent

`agents/writing-agent.md` is a Cursor (and similar) agent definition. It does not run by itself. A host that supports agents uses it as the persona for “improve or review this selection.”

It documents two workflows that map 1:1 to the MCP tools:

| Workflow in the agent | MCP tool | Code |
|---|---|---|
| `improveWithReferences` | `improve_with_references` | `src/improve.ts` |
| `reviewDocument` | `review_document` | `src/review.ts` |

The agent file also restates the host contract so an agent host knows what to pass in.

---

## 6. MCP server

### 6.1 What MCP is doing here

[MCP](https://modelcontextprotocol.io) (Model Context Protocol) is a standard for exposing **tools** to an AI client. This repo implements a server that speaks MCP over **stdio**: the client starts a Node process, talks JSON-RPC on stdin/stdout, and the process stays alive until the client exits.

Entry point: `src/index.ts` (shebang `#!/usr/bin/env node`). After `tsc`, that becomes `dist/index.js`, which is the `bin` named `ecris-intelligence` in `package.json`.

### 6.2 Boot sequence

1. Create `McpServer` named `ecris-intelligence` version `1.0.0`.
2. Register two tools with a shared Zod schema (`writingRequestSchema`).
3. Connect `StdioServerTransport`.
4. On uncaught failure in `main()`, log and `process.exit(1)`.

### 6.3 Tool schema

Both tools accept:

```ts
{
  selectedText: string;          // required
  documentContext?: string;
  references?: { title: string; kind?: string; content: string }[];
  writingGuidelines?: string;
}
```

`writingGuidelines` is accepted on both tools (same schema) but only **improve** puts it into the system prompt. Review ignores it today.

### 6.4 Tool handlers

Each handler:

1. Maps args → `WritingRequest` via `toRequest`.
2. Calls `improveWithReferences` or `reviewDocument`.
3. Returns MCP `content: [{ type: "text", text: result }]`.
4. On thrown errors, returns the message with `isError: true` instead of crashing the process.

That last point matters: a missing API key or empty selection is a tool error the client can show, not a dead server.

### 6.5 Config files around MCP

| File | Role |
|---|---|
| `mcp.json` | Example Cursor/client config: `npx -y github:grascya/ecris-intelligence` plus `OPENROUTER_API_KEY` |
| `server.json` | MCP Registry metadata (`mcpName` `io.github.grascya/ecris-intelligence`), npm package, required secret env |
| `.cursor-plugin/plugin.json` | Cursor plugin manifest: display name, logo, paths to `skills/` and `agents/` |

The plugin manifest does **not** start the MCP server by itself. Cursor uses `mcp.json` (or the user’s MCP settings) for the process, and `plugin.json` for skills/agent/marketplace metadata.

---

## 7. Improve pipeline (step by step)

Code: `src/improve.ts` → `improveWithReferences`.

```text
WritingRequest
    │
    ├─ requireSelectedText(selectedText)
    ├─ requireApiKey()                    // OPENROUTER_API_KEY
    ├─ formatSources(references)          // up to 5, each truncated
    ├─ truncate(writingGuidelines)
    ├─ buildImproveSystemPrompt(...)
    ├─ truncate(documentContext)
    ├─ build user message
    └─ callOpenRouter(system + user)
           │
           ▼
      rewritten plain text (trimmed)
```

### 7.1 System prompt layers

The system prompt is assembled as:

1. Role: “You are the Ecris writing agent…”
2. Full **academic-writer** skill text
3. Full **humanizer** skill text
4. **References** block from `formatSources`
5. Output rules: return **only** the rewritten selection; no preamble, quotes, or fences; do not invent facts
6. Optional **User writing guidelines** if the host sent any

### 7.2 User message

If `documentContext` is non-empty after trim:

```text
Document context (surrounding text, for continuity only):
<truncated context>

Selected text to rewrite:
<selection>
```

Otherwise only the selected-text block. Context is labeled “for continuity only” so the model should not rewrite the whole document.

### 7.3 Return value

Raw model content, `.trim()`. No JSON wrapper. Hosts that want to replace a selection can drop this string straight into the editor.

---

## 8. Review pipeline (step by step)

Code: `src/review.ts` → `reviewDocument`.

Same input validation, API key, and source formatting as improve. Differences:

| | Improve | Review |
|---|---|---|
| Skills in prompt | academic-writer + humanizer | document-reviewer |
| `writingGuidelines` | included | not used |
| Output rules | rewrite only, no commentary | concise bullets, not a full rewrite |
| Role line | writing agent | document reviewer |

User message is the same shape, with “Selected text to **review**” instead of rewrite.

---

## 9. OpenRouter (the model call)

Code: `src/openRouter.ts`.

This plugin does not embed a local model. It POSTs to OpenRouter’s Chat Completions API:

- URL: `https://openrouter.ai/api/v1/chat/completions`
- Model: `process.env.OPENROUTER_MODEL` or default `openai/gpt-4o-mini`
- Headers: `Authorization: Bearer <key>`, plus `HTTP-Referer` and `X-Title` for OpenRouter attribution
- Body: `{ model, messages }` where messages are `{ role, content }[]`

`requireApiKey()` reads `OPENROUTER_API_KEY`. If missing, it throws a message telling the operator to set it on the MCP server environment (not in this repo).

Failed HTTP responses are logged (status + first 200 chars) and rethrown as a generic `"AI request failed. Please try again."` so the key and provider payload are not echoed back to the user.

Empty `choices[0].message.content` becomes `""`; callers trim that.

---

## 10. Repository map

```text
ecris-intelligence/
├── DOCUMENTATION.md          ← this file (developers)
├── README.md                 ← users
├── LICENSE
├── package.json              ← npm package, bin, files whitelist
├── tsconfig.json             ← src/ → dist/, Node16 ESM
├── mcp.json                  ← example MCP client config
├── server.json               ← MCP Registry schema
├── .cursor-plugin/
│   └── plugin.json           ← Cursor marketplace / plugin metadata
├── assets/logo.svg
├── agents/writing-agent.md
├── skills/
│   ├── academic-writer/SKILL.md
│   ├── humanizer/SKILL.md
│   └── document-reviewer/SKILL.md
└── src/
    ├── index.ts              ← MCP stdio server + two tools
    ├── host.ts               ← types, limits, formatSources
    ├── skills.ts             ← skill strings mirrored from SKILL.md
    ├── improve.ts            ← improveWithReferences
    ├── review.ts             ← reviewDocument
    └── openRouter.ts         ← HTTP to OpenRouter
```

Compiled output is `dist/` (gitignored). `package.json` `"files"` ships `dist`, skills, agents, assets, `mcp.json`, `.cursor-plugin`, README, and LICENSE — not TypeScript sources.

---

## 11. Local development

Requirements: Node **≥ 18**, an OpenRouter API key.

```bash
npm install
```

`prepare` runs `tsc`, so a local install also produces `dist/`.

Run the MCP server on stdio (the same process a client would spawn):

```bash
npm run dev          # tsx src/index.ts
# or after build:
npm start            # node dist/index.js
```

You will not see a useful REPL: the process waits on stdin for MCP messages. To exercise it, point a local MCP client at:

```json
{
  "mcpServers": {
    "ecris-intelligence": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/absolute/path/to/ecris-intelligence",
      "env": {
        "OPENROUTER_API_KEY": "sk-or-..."
      }
    }
  }
}
```

Or import the functions in a scratch script:

```ts
import { improveWithReferences } from "./src/improve.ts";
import { reviewDocument } from "./src/review.ts";

const improved = await improveWithReferences({
  selectedText: "The method was applied to the dataset.",
  documentContext: "Chapter 2 discusses sampling.",
  writingGuidelines: "Keep British spelling.",
  references: [
    { title: "Paper A", kind: "pdf", content: "We sampled 1,200 households…" },
  ],
});

const notes = await reviewDocument({
  selectedText: "The method was applied to the dataset.",
  references: [
    { title: "Paper A", kind: "pdf", content: "We sampled 1,200 households…" },
  ],
});
```

Environment:

| Variable | Required | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | yes | — |
| `OPENROUTER_MODEL` | no | `openai/gpt-4o-mini` |

Do not commit `.env` files (they are gitignored).

---

## 12. How a host should integrate

You have two equivalent options. Pick one.

### 12.1 Spawn the MCP server (any language)

1. Implement UI: user selects text, host gathers references.
2. Start this package as an MCP server (`npx -y github:grascya/ecris-intelligence` or a local `node dist/index.js`).
3. Call `improve_with_references` or `review_document` with a `WritingRequest`.
4. Replace the selection with the returned text (improve) or show the notes (review).

### 12.2 Import the TypeScript API (Node hosts)

After `npm install ecris-intelligence` (or a path/git install), import `improveWithReferences` and `reviewDocument`. Same `WritingRequest`. Same env vars on the Node process.

### 12.3 Example: Ecris (Inkwell)

Ecris is **one** host, not part of this repo. Its adapter (Convex `ai/writingAgent.ts` + `lib/knowledgeTools.ts`) should:

1. Read the TipTap selection → `selectedText`
2. Optionally take nearby document text → `documentContext`
3. Load the user’s knowledge items → `Reference[]`
4. Call this plugin (MCP or import)
5. Write the result back into the editor

Do not move Convex or TipTap into this repository. If Ecris-specific code appears here, it is a layering bug.

### 12.4 Skills-only hosts

Hosts that only understand `SKILL.md` (no MCP) can still load `skills/` via:

```bash
npx skills add grascya/ecris-intelligence
```

Those hosts will apply the playbooks in their own agent loop. They will **not** get the OpenRouter pipeline unless they also run the MCP server or copy that logic.

---

## 13. Cursor plugin packaging

`.cursor-plugin/plugin.json` tells Cursor:

- Marketplace identity (`name`, `displayName`, `version`, `description`, `logo`)
- Where skills live (`"skills": "./skills/"`)
- Where agents live (`"agents": "./agents/"`)

Category is `developer-tools`. Publishing is **not** a PR to `cursor/plugins`; submit the public GitHub repo at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). After approval, users can `/add-plugin ecris-intelligence`.

Until then, developers add the cloned folder under **Settings → Plugins**.

---

## 14. Publishing (maintainers)

1. **GitHub** — this repo is the source of truth.
2. **Cursor Marketplace** — submit the repo URL; wait for Anysphere review.
3. **npm (optional)** — `npm publish` so clients can run `npx -y ecris-intelligence` instead of `github:grascya/ecris-intelligence`. Keep `package.json` `version` in sync with `plugin.json`, `server.json`, and the MCP server version in `src/index.ts`.
4. **MCP Registry (optional)** — after the npm package exists, `mcp-publisher publish` using `server.json`. The registry name is `io.github.grascya/ecris-intelligence`.

When you change skill markdown, bump the mirrored strings in `src/skills.ts` in the same commit.

---

## 15. Design constraints (do not violate)

1. **No product backends in this repo.** No Convex, no TipTap, no host database clients.
2. **Host supplies knowledge.** The plugin only sees `references[].content`.
3. **Two jobs only.** Improve returns a rewrite. Review returns notes. Do not merge them into one tool.
4. **Skills stay duplicated on purpose.** Markdown for hosts that load files; `src/skills.ts` for the MCP runtime. Keep them in sync.
5. **Stdio MCP.** The server is a CLI process, not an HTTP API.
6. **Plain text out.** No markdown fences around the rewrite; hosts paste it into an editor.

If you add a third workflow (for example “translate”), add a skill, an agent section, an MCP tool, and a module next to `improve.ts` / `review.ts`, and keep the same `WritingRequest`.
