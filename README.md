# Ecris Intelligence

A portable writing plugin: Three skills, a writing agent, and MCP tools that rewrite or review selected text using knowledge you attach.

The host (Cursor, Claude Desktop, VS Code, or an app such as [Ecris](https://github.com/grascya/Inkwell)) owns your documents and knowledge. This plugin only works on the text you give it.

## What you get

| Piece | What it does |
|---|---|
| Skills | `academic-writer`, `humanizer`, `document-reviewer` |
| Agent | `writing-agent` |
| MCP tools | `improve_with_references` (rewrite), `review_document` (notes) |

## Install in Cursor

**From GitHub**

1. Clone this repository.
2. In Cursor: **Settings → Plugins** and add the local plugin folder, or import the repo URL on a Team Marketplace.
3. Set `OPENROUTER_API_KEY` for the MCP server.

**Public Marketplace (after review)**

```text
/add-plugin ecris-intelligence
```

**Skills only** (any host that loads `SKILL.md`)

```bash
npx skills add grascya/ecris-intelligence
```

## Use with any MCP client

Works in Claude Desktop, Cursor, VS Code Copilot, and custom MCP apps:

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

Then ask the assistant to improve or review a selection. You can pass:

- `selectedText` — required
- `documentContext` — optional surrounding text
- `references` — optional sources `{ title, kind?, content }`
- `writingGuidelines` — optional style notes (used when improving)

Optional: set `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`).

## License

MIT

Developers: see [DOCUMENTATION.md](./DOCUMENTATION.md) for architecture, the host contract, and local development.
