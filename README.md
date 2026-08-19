# Ecris Intelligence

A portable writing plugin: three skills, a writing agent, and MCP tools that rewrite or review selected text using knowledge you attach.

The host (Cursor, Claude Desktop, VS Code, or an app such as [Ecris](https://github.com/grascya/Inkwell)) owns your documents and knowledge. This plugin only works on the text you give it.

A listing on [cursor.directory](https://cursor.directory/plugins/ecris-intelligence) is discovery only. It does not install the plugin or set `OPENROUTER_API_KEY`.

## What you get

| Piece | What it does |
|---|---|
| Skills | `academic-writer`, `humanizer`, `document-reviewer` |
| Agent | `writing-agent` |
| MCP tools | `improve_with_references` (rewrite), `review_document` (notes) |

Skills and the agent are playbooks. Rewrite and review run through the MCP server, which needs `OPENROUTER_API_KEY`.

## Add to another Cursor project

Do not copy this repository into the other project. Install the plugin in Cursor, then enable MCP in that workspace.

**1. Install the plugin once**

- Clone this repository, or use `https://github.com/grascya/ecris-intelligence`.
- In Cursor: **Settings → Plugins** and add the local plugin folder, or import the repo URL.

After that, the skills and `writing-agent` are available in every workspace.

**Public Marketplace (after review)**

```text
/add-plugin ecris-intelligence
```

**2. Enable MCP in the other project**

Create `.cursor/mcp.json` in that project. Point `cwd` at **this** repo if you are testing a local clone:

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

If the other project should not depend on a local clone, use the GitHub package instead:

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

Reload MCP. You should see `improve_with_references` and `review_document`.

**Skills only** (any host that loads `SKILL.md`)

```bash
npx skills add grascya/ecris-intelligence
```

That copies the playbooks. It does not call OpenRouter unless you also enable MCP.

## Use with any MCP client

Works in Claude Desktop, Cursor, VS Code Copilot, and custom MCP apps. Use the GitHub `mcpServers` block above.

Then ask the assistant to improve or review a selection. You can pass:

- `selectedText` — required
- `documentContext` — optional surrounding text
- `references` — optional sources `{ title, kind?, content }`
- `writingGuidelines` — optional style notes (used when improving)

Optional: set `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`).

## Add to an app you are building

The app is the host. It must collect selected text and references, then call this plugin. Do not move document storage, Convex, or TipTap into this repository.

**Spawn the MCP server** (any language)

1. User selects text; the host gathers references.
2. Start this package (`npx -y github:grascya/ecris-intelligence` or a local `node dist/index.js`).
3. Call `improve_with_references` or `review_document`.
4. Replace the selection with the rewrite, or show the review notes.

Set `OPENROUTER_API_KEY` on **that app’s** process.

## Test it

1. Confirm the MCP server is connected and both tools are listed.
2. Improve a short selection with one reference:

   > Call `improve_with_references` with `selectedText` “The method was applied to the dataset.”, `documentContext` “Chapter 2 discusses sampling.”, and a reference titled Paper A whose content is “We sampled 1,200 households in 2022 and found a 14% response rate.”

3. Call `review_document` with the same selection and reference.

Pass if:

- Improve returns a rewrite that uses the attached figures and does not invent a DOI or page number.
- Review returns notes, not a replacement paragraph.
- Empty `selectedText` returns a tool error, not a crash.
- A missing API key returns a tool error telling you to set `OPENROUTER_API_KEY`.

Skills can be tried without MCP by asking the assistant to apply `academic-writer`, `humanizer`, or `document-reviewer` to a paragraph.

## License

MIT

Developers: see [DOCUMENTATION.md](./DOCUMENTATION.md) for architecture, the host contract, and local development.
