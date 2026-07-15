import type { Components } from "react-markdown";

import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

/**
 * Renders a Markdown string with lightweight Tailwind styling. The app has no Tailwind Typography
 * plugin, so element styles are supplied via react-markdown's `components` map. Links open in a new tab.
 */
const components: Components = {
  h1: props => (
    <h1
      className="mt-3 mb-1 text-lg font-semibold"
      {...props}
    />
  ),
  h2: props => (
    <h2
      className="mt-3 mb-1 text-base font-semibold"
      {...props}
    />
  ),
  h3: props => (
    <h3
      className="mt-2 mb-1 text-sm font-semibold"
      {...props}
    />
  ),
  p: props => (
    <p
      className="my-1.5 leading-relaxed"
      {...props}
    />
  ),
  ul: props => (
    <ul
      className="my-1.5 ml-5 list-disc space-y-0.5"
      {...props}
    />
  ),
  ol: props => (
    <ol
      className="my-1.5 ml-5 list-decimal space-y-0.5"
      {...props}
    />
  ),
  li: props => (
    <li
      className="leading-relaxed"
      {...props}
    />
  ),
  a: props => (
    <a
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  strong: props => (
    <strong
      className="font-semibold"
      {...props}
    />
  ),
  em: props => (
    <em
      className="italic"
      {...props}
    />
  ),
  code: props => (
    <code
      className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    />
  ),
  blockquote: props => (
    <blockquote
      className="my-2 border-l-2 pl-3 text-muted-foreground"
      {...props}
    />
  ),
};

/** Render `content` as Markdown inside a styled block. */
export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
