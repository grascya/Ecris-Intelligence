/**
 * Skill playbooks mirrored from ../skills for the MCP runtime.
 * Keep these strings in sync when editing the markdown SKILL.md sources.
 */

export const ACADEMIC_WRITER_SKILL = `When rewriting with sources:
- Ground claims in the provided references; do not invent citations
- Prefer precise, formal language without sounding stiff
- Integrate source ideas naturally; mention source titles when helpful
- Expand the selected text using the provided references.
- Integrate relevant factual details from the references whenever they improve clarity.
- If the references contain technical information directly related to the selected text, incorporate those details naturally.
- Prioritize grounded information over generic rewriting.
- If sources conflict or are thin, stay conservative and do not overclaim

Avoid:
- Fabricated quotes, page numbers, or DOIs
- Unsupported generalizations
- Dropping the selection's core point to pad with source dump`;

export const HUMANIZER_SKILL = `When rewriting text:
- Keep original meaning
- Improve sentence flow
- Remove robotic patterns
- Add natural variation
- Preserve technical accuracy

Avoid:
- Generic AI phrases
- Excessive headings
- Repetition`;

export const DOCUMENT_REVIEWER_SKILL = `When reviewing or improving text:
- Check clarity: flag vague claims and ambiguous pronouns
- Check structure: ensure paragraphs have a clear point and logical flow
- Check accuracy: do not invent facts; ground claims in provided sources
- Prefer concrete wording over filler
- Preserve the author's voice unless asked to change tone

Avoid:
- Rewriting for style alone when the issue is structure
- Adding unsupported claims
- Expanding length without improving meaning`;
