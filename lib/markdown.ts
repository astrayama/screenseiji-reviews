import { marked } from "marked";

// Review bodies are authored only by the site owner in Sage Desk,
// so raw HTML passthrough is acceptable here.
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}
