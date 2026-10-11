import { handlers } from "@/auth";
import { getAuthConfig } from "@/lib/auth-config";

const enabled = getAuthConfig().status === "enabled";
const notFound = () => new Response("Not found", { status: 404 });

// With login off there is nothing to serve here.
export const GET = enabled ? handlers.GET : notFound;
export const POST = enabled ? handlers.POST : notFound;
