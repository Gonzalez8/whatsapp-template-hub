import type { ReactNode } from "react";

interface FormatRule {
  pattern: RegExp;
  render: (text: string, key: string) => ReactNode;
}

const FORMAT_RULES: FormatRule[] = [
  {
    // ```monospace``` (must be checked before single patterns)
    pattern: /```([\s\S]+?)```/,
    render: (text, key) => (
      <code key={key} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[13px]">
        {text}
      </code>
    ),
  },
  {
    // *bold*
    pattern: /\*([\s\S]+?)\*/,
    render: (text, key) => (
      <strong key={key} className="font-bold">
        {text}
      </strong>
    ),
  },
  {
    // _italic_
    pattern: /_([\s\S]+?)_/,
    render: (text, key) => (
      <em key={key} className="italic">
        {text}
      </em>
    ),
  },
  {
    // ~strikethrough~
    pattern: /~([\s\S]+?)~/,
    render: (text, key) => (
      <s key={key} className="line-through">
        {text}
      </s>
    ),
  },
  {
    // {{1}}, {{nombre}}, {{rol}} variable placeholders
    pattern: /\{\{(\w+)\}\}/,
    render: (text, key) => (
      <span key={key} className="rounded bg-teal-50 px-1 py-0.5 text-[13px] font-medium text-teal-700">
        {`{{${text}}}`}
      </span>
    ),
  },
];

export function formatWhatsAppText(input: string): ReactNode[] {
  const result: ReactNode[] = [];
  let remaining = input;
  let keyCounter = 0;

  while (remaining.length > 0) {
    let earliestMatch: {
      rule: FormatRule;
      match: RegExpExecArray;
    } | null = null;

    for (const rule of FORMAT_RULES) {
      const match = rule.pattern.exec(remaining);
      if (match && (!earliestMatch || match.index < earliestMatch.match.index)) {
        earliestMatch = { rule, match };
      }
    }

    if (!earliestMatch) {
      result.push(remaining);
      break;
    }

    const { rule, match } = earliestMatch;

    // Add text before the match
    if (match.index > 0) {
      result.push(remaining.slice(0, match.index));
    }

    // Add formatted element
    result.push(rule.render(match[1], `fmt-${keyCounter++}`));

    // Continue after the match
    remaining = remaining.slice(match.index + match[0].length);
  }

  return result;
}
