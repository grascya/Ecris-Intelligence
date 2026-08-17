# Ecris Intelligence

Portable writing plugin: skills, a writing agent, and MCP tools. Any host that can send selected text plus optional references can plug it in.

This is the shareable plugin. [Ecris](https://github.com/grascya/Inkwell) is one host that implements the contract (Convex + TipTap). It is not the only host.

## What you get

| Piece | Role |
|---|---|
| Skills | `academic-writer`, `humanizer`, `document-reviewer` |
| Agent | `writing-agent` |
| MCP tools | `improve_with_references`, `review_document` |

The host owns documents, auth, and knowledge storage. This plugin only rewrites or reviews text it is given.

## Install in Cursor

**From GitHub (now)**

1. Clone this repository.
2. In Cursor: **Settings → Plugins** and add the local plugin folder, or import the repo URL on a Team Marketplace.
3. Set `OPENROUTER_API_KEY` for the MCP server.

**Public Marketplace (after review)**

Submit this repo at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). After approval:

```text
/add-plugin ecris-intelligence
```

**Skills-only (any SKILL.md host)**

```bash
npx skills add grascya/ecris-intelligence
```

## Plug into other software

Any MCP client (Claude Desktop, Cursor, VS Code Copilot, custom apps) can run the server:

```json
{
  "mcpServers": {
    "ecris-intelligence": {
      "command": "npx",
      "args": ["-y", "github:grascya/ecris-intelligence"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-key"
      }
    }
  }
}
```

Then call:

```ts
improve_with_references({
  selectedText: "…",
  documentContext: "…",       // optional
  writingGuidelines: "…",     // optional
  references: [
    { title: "Source", kind: "text", content: "…" }
  ]
})
```

`review_document` takes the same arguments and returns review notes instead of a rewrite.

## Host contract

Implement this in your app, then either call the MCP tools or import `improveWithReferences` / `reviewDocument` after `npm install`.

```ts
type Reference = {
  title: string;
  kind?: string;
  content: string;
};

type WritingRequest = {
  selectedText: string;          // required
  documentContext?: string;
  references?: Reference[];
  writingGuidelines?: string;
};
```

**Ecris adapter (stays in Inkwell):** Convex `ai/writingAgent.ts` + `lib/knowledgeTools.ts` collect the user's document knowledge, map it to `Reference[]`, and run the same workflow for the TipTap editor. Do not move Convex or TipTap into this repo.

## Local development

```bash
npm install
npm run dev
```

Required environment: `OPENROUTER_API_KEY`. Optional: `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`).

## Publish checklist

1. Public GitHub repository (this repo).
2. Cursor Marketplace: [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) — Anysphere reviews each plugin. Do not open a PR on `cursor/plugins`.
3. Optional npm: `npm publish` so `npx -y ecris-intelligence` works without GitHub.
4. Optional MCP Registry: `mcp-publisher publish` using `server.json` after the npm package exists.

## License

MIT
