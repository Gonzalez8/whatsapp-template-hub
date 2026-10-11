export interface DiffSegment {
  text: string;
  changed: boolean;
}

/** Words and the whitespace between them, so joining the tokens gives back the text. */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}

/** Indices of `a` that belong to a longest common subsequence with `b`. */
function commonIndices(a: string[], b: string[]): Set<number> {
  const n = a.length;
  const m = b.length;
  // lengths[i][j] = LCS length of a[i..] and b[j..]
  const lengths = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lengths[i][j] = a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const common = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      common.add(i);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) i++;
    else j++;
  }
  return common;
}

function toSegments(tokens: string[], changed: (index: number) => boolean): DiffSegment[] {
  const segments: DiffSegment[] = [];
  tokens.forEach((token, index) => {
    const last = segments[segments.length - 1];
    // Whitespace takes the state of the previous word so a changed phrase is one block.
    const isChanged = /^\s+$/.test(token) ? (last?.changed ?? false) : changed(index);
    if (last && last.changed === isChanged) last.text += token;
    else segments.push({ text: token, changed: isChanged });
  });
  return segments;
}

/**
 * Word-level differences between several texts, for side-by-side comparison.
 * A word is marked as changed in a text when it is not shared with every other text
 * (it is missing from the longest common subsequence with at least one of them).
 */
export function diffTexts(texts: string[]): DiffSegment[][] {
  const tokens = texts.map(tokenize);
  return tokens.map((own, i) => {
    if (texts.length < 2) return toSegments(own, () => false);
    const shared = tokens.filter((_, j) => j !== i).map((other) => commonIndices(own, other));
    return toSegments(own, (index) => shared.some((set) => !set.has(index)));
  });
}
