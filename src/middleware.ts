import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getAuthConfig } from "@/lib/auth-config";

const authConfig = getAuthConfig();

function toLogin(req: NextRequest) {
  const url = new URL("/login", req.nextUrl);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

const requireSession = auth((req) => {
  if (!req.auth) return toLogin(req);
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (authConfig.status === "disabled") return NextResponse.next();
  // Half-configured login keeps the app closed; /login explains what is missing.
  if (authConfig.status === "incomplete") return toLogin(req);
  return requireSession(req, event as never);
}

export const config = {
  // Everything except the login itself, Auth.js endpoints, the secret-protected
  // revalidation webhook and static assets. The page and its Server Actions are covered.
  matcher: ["/((?!login|api/auth|api/revalidate|_next/static|_next/image|favicon.ico).*)"],
};
