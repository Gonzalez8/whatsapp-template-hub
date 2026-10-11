import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison; an unset `expected` secret never matches. */
export function isValidSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
