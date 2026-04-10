"use server";

import { revalidatePath } from "next/cache";

const COOLDOWN_MS = 2 * 60 * 1000;
let lastRevalidation = 0;

export async function syncTemplates(): Promise<{ success: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();
  const elapsed = now - lastRevalidation;

  if (elapsed < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return { success: false, retryAfterSeconds: retryAfter };
  }

  lastRevalidation = now;
  revalidatePath("/");
  return { success: true };
}
