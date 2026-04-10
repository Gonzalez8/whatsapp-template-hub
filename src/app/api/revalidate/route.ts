import { revalidatePath } from "next/cache";

const COOLDOWN_MS = 2 * 60 * 1000;
let lastRevalidation = 0;

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const elapsed = now - lastRevalidation;

  if (elapsed < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return Response.json({ error: "Rate limited", retryAfterSeconds: retryAfter }, { status: 429 });
  }

  lastRevalidation = now;
  revalidatePath("/");
  return Response.json({ revalidated: true, now });
}
