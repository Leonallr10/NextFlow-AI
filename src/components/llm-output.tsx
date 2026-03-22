"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type LlmOutputMarkdownProps = {
  text: string;
  placeholder?: string;
};

/**
 * Renders LLM output with Markdown + GFM (lists, bold, tables) inside the flow canvas.
 */
export function LlmOutputMarkdown({
  text,
  placeholder = "Run workflow to see output inline",
}: LlmOutputMarkdownProps) {
  const trimmed = text.trim();
  if (!trimmed) {
    return <p className="text-left text-xs italic leading-relaxed text-zinc-500">{placeholder}</p>;
  }

  return (
    <div className="llm-output-markdown max-w-none text-left">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
}
