import { Fragment, type ReactNode } from "react";

type Decorate = (text: string) => ReactNode;

interface FormatRule {
  pattern: RegExp;
  render: (text: ReactNode, key: string) => ReactNode;
  /** Whether the captured text is user content that may be decorated (e.g. highlighted). */
  decorates?: boolean;
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
    decorates: true,
  },
  {
    // *bold*
    pattern: /\*([\s\S]+?)\*/,
    render: (text, key) => (
      <strong key={key} className="font-bold">
        {text}
      </strong>
    ),
    decorates: true,
  },
  {
    // _italic_
    pattern: /_([\s\S]+?)_/,
    render: (text, key) => (
      <em key={key} className="italic">
        {text}
      </em>
    ),
    decorates: true,
  },
  {
    // ~strikethrough~
    pattern: /~([\s\S]+?)~/,
    render: (text, key) => (
      <s key={key} className="line-through">
        {text}
      </s>
    ),
    decorates: true,
  },
  {
    // {{1}}, {{nombre}}, {{rol}} variable placeholders
    pattern: /\{\{(\w+)\}\}/,
    render: (text, key) => (
      <span key={key} className="rounded bg-teal-50 px-1 py-0.5 text-[13px] font-medium text-teal-700">
        {"{{"}
        {text}
        {"}}"}
      </span>
    ),
  },
];

/**
 * Renders WhatsApp markup (*bold*, _italic_…) and highlights {{variables}}.
 * `decorate` is applied to every plain-text fragment, e.g. to highlight search matches.
 */
export function formatWhatsAppText(input: string, decorate?: Decorate): ReactNode[] {
  const result: ReactNode[] = [];
  const plain = (text: string, key: string) => (decorate ? <Fragment key={key}>{decorate(text)}</Fragment> : text);
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
      result.push(plain(remaining, `txt-${keyCounter++}`));
      break;
    }

    const { rule, match } = earliestMatch;

    // Add text before the match
    if (match.index > 0) {
      result.push(plain(remaining.slice(0, match.index), `txt-${keyCounter++}`));
    }

    // Add formatted element
    const inner = rule.decorates && decorate ? decorate(match[1]) : match[1];
    result.push(rule.render(inner, `fmt-${keyCounter++}`));

    // Continue after the match
    remaining = remaining.slice(match.index + match[0].length);
  }

  return result;
}
