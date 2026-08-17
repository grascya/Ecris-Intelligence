import {
  formatSources,
  requireSelectedText,
  truncate,
  type WritingRequest,
  MAX_DOC_CONTEXT_CHARS,
} from "./host.js";
import { callOpenRouter, requireApiKey } from "./openRouter.js";
import { DOCUMENT_REVIEWER_SKILL } from "./skills.js";

function buildReviewSystemPrompt(sourcesBlock: string): string {
  return `You are the Ecris document reviewer. Review the user's selected text.

## Document reviewer skill
${DOCUMENT_REVIEWER_SKILL}

## References
${sourcesBlock}

## Output rules
- Return a concise review, not a full rewrite
- Use short bullet points
- Flag issues; only suggest wording when a fix is obvious
- Do not invent facts beyond the selection and references`;
}

export async function reviewDocument(request: WritingRequest): Promise<string> {
  const text = requireSelectedText(request.selectedText);
  const apiKey = requireApiKey();
  const sourcesBlock = formatSources(request.references);
  const systemPrompt = buildReviewSystemPrompt(sourcesBlock);
  const docContext = truncate(
    (request.documentContext ?? "").trim(),
    MAX_DOC_CONTEXT_CHARS,
  );
  const userContent = docContext
    ? `Document context (surrounding text, for continuity only):\n${docContext}\n\nSelected text to review:\n${text}`
    : `Selected text to review:\n${text}`;

  const raw = await callOpenRouter(apiKey, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);
  return raw.trim();
}
