export type Reference = {
  title: string;
  kind?: string;
  content: string;
};

export type WritingRequest = {
  selectedText: string;
  documentContext?: string;
  references?: Reference[];
  writingGuidelines?: string;
};

export const MAX_SELECTION_CHARS = 50_000;
export const MAX_DOC_CONTEXT_CHARS = 4_000;
export const MAX_SYSTEM_INSTRUCTIONS_CHARS = 4_000;
export const MAX_SOURCES_FOR_PROMPT = 5;
export const MAX_SOURCE_CHARS = 3_000;

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated for length]`;
}

export function formatSources(references: Reference[] | undefined): string {
  const top = (references ?? []).slice(0, MAX_SOURCES_FOR_PROMPT);
  if (top.length === 0) {
    return "No knowledge sources attached.";
  }
  return top
    .map((src, index) => {
      const kind = src.kind ? ` (${src.kind})` : "";
      const body = truncate(src.content, MAX_SOURCE_CHARS);
      return `[${index + 1}] ${src.title}${kind}\n${body}`;
    })
    .join("\n\n");
}

export function requireSelectedText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Selected text is required");
  }
  if (trimmed.length > MAX_SELECTION_CHARS) {
    throw new Error("Selected text is too long");
  }
  return trimmed;
}
