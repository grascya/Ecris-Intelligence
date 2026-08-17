#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { improveWithReferences } from "./improve.js";
import { reviewDocument } from "./review.js";
import type { Reference, WritingRequest } from "./host.js";

const referenceSchema = z.object({
  title: z.string(),
  kind: z.string().optional(),
  content: z.string(),
});

const writingRequestSchema = {
  selectedText: z.string().describe("The text the user selected to rewrite or review"),
  documentContext: z
    .string()
    .optional()
    .describe("Optional surrounding document text for continuity"),
  references: z
    .array(referenceSchema)
    .optional()
    .describe("Host-supplied knowledge sources"),
  writingGuidelines: z
    .string()
    .optional()
    .describe("Optional user writing guidelines"),
};

function toRequest(args: {
  selectedText: string;
  documentContext?: string;
  references?: Reference[];
  writingGuidelines?: string;
}): WritingRequest {
  return {
    selectedText: args.selectedText,
    documentContext: args.documentContext,
    references: args.references,
    writingGuidelines: args.writingGuidelines,
  };
}

const server = new McpServer({
  name: "ecris-intelligence",
  version: "1.0.0",
});

server.tool(
  "improve_with_references",
  "Rewrite selected text using attached knowledge references, academic-writer, and humanizer skills.",
  writingRequestSchema,
  async (args) => {
    try {
      const improvedText = await improveWithReferences(toRequest(args));
      return { content: [{ type: "text" as const, text: improvedText }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Improve failed";
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  },
);

server.tool(
  "review_document",
  "Review selected text for clarity, structure, and source-grounded accuracy.",
  writingRequestSchema,
  async (args) => {
    try {
      const review = await reviewDocument(toRequest(args));
      return { content: [{ type: "text" as const, text: review }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review failed";
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Server failed";
  console.error(message);
  process.exit(1);
});
