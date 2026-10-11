import { isValidSecret } from "@/lib/secret";
import { requestTemplatesSync } from "@/lib/templates";

export async function POST(request: Request) {
  if (!isValidSecret(request.headers.get("x-revalidate-secret"), process.env.REVALIDATE_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await requestTemplatesSync();

  switch (result.status) {
    case "ok":
      return Response.json({ revalidated: true, now: Date.now() });
    case "cooldown":
      return Response.json(
        { error: "Rate limited", retryAfterSeconds: result.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
    case "error":
      return Response.json({ error: result.message }, { status: 502 });
  }
}
