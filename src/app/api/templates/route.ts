import { fetchWabasWithTemplates } from "@/lib/meta-api";

export const revalidate = 300;

export async function GET() {
  try {
    const wabas = await fetchWabasWithTemplates();
    return Response.json({ wabas });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
