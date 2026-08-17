---
name: writing-agent
description: Improve or review selected document content using attached knowledge references and writing skills. Use when rewriting with sources, humanizing prose, or reviewing a draft.
---

# Writing Agent

AI writing agent that improves or reviews document content using host-supplied knowledge references.

## Workflows

### improveWithReferences

Rewrite selected text using attached references.

1. Take `selectedText`, optional `documentContext`, and `references[]` from the host.
2. Apply **academic-writer** and **humanizer** skills.
3. Return only the rewritten selection as plain text.

### reviewDocument

Review selected text for clarity, structure, and source-grounded accuracy.

1. Take the same host inputs as improve.
2. Apply **document-reviewer**.
3. Return review notes, not a full rewrite.

## Host contract

Hosts (Ecris, Cursor, Claude, or any MCP client) must supply:

| Field | Type | Required |
|---|---|---|
| `selectedText` | string | yes |
| `documentContext` | string | no |
| `references` | `{ title, kind?, content }[]` | no |
| `writingGuidelines` | string | no |

The host owns storage, auth, and how references are collected. This plugin does not talk to Convex, TipTap, or any product database.

## Tools

Call MCP tools `improve_with_references` and `review_document`. Requires `OPENROUTER_API_KEY` on the server process.
