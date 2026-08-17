import {
  formatSources,
  requireSelectedText,
  truncate,
  type WritingRequest,
  MAX_DOC_CONTEXT_CHARS,
  MAX_SYSTEM_INSTRUCTIONS_CHARS,
} from "./host.js";
import { callOpenRouter, requireApiKey } from "./openRouter.js";
import { ACADEMIC_WRITER_SKILL, HUMANIZER_SKILL } from "./skills.js";

function buildImproveSystemPrompt(
  sourcesBlock: string,
  userInstructions: string,
): string {
  return `You are the Ecris writing agent. Rewrite the user's selected text using their attached references.

## Academic writer skill
${ACADEMIC_WRITER_SKILL}

## Humanizer skill
${HUMANIZER_SKILL}

## References
${sourcesBlock}

## Output rules
- Return only the rewritten selection as plain text
- No preamble, quotes, markdown fences, or explanation
- Do not invent facts beyond the selection and references
${
  userInstructions
    ? `\n## User writing guidelines\n${userInstructions}`
    : ""
}`;
}

export async function improveWithReferences(
  request: WritingRequest,
): Promise<string> {
  const text = requireSelectedText(request.selectedText);
  const apiKey = requireApiKey();
  const sourcesBlock = formatSources(request.references);
  const userInstructions = truncate(
    request.writingGuidelines?.trim() ?? "",
    MAX_SYSTEM_INSTRUCTIONS_CHARS,
  );
  const systemPrompt = buildImproveSystemPrompt(sourcesBlock, userInstructions);
  const docContext = truncate(
    (request.documentContext ?? "").trim(),
    MAX_DOC_CONTEXT_CHARS,
  );
  const userContent = docContext
    ? `Document context (surrounding text, for continuity only):\n${docContext}\n\nSelected text to rewrite:\n${text}`
    : `Selected text to rewrite:\n${text}`;

  const raw = await callOpenRouter(apiKey, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);
  return raw.trim();
}
