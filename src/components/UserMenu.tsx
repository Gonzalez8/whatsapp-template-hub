"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

interface SessionUser {
  name?: string | null;
  email?: string | null;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

/**
 * Signed-in user and "Salir". The page is static, so the session is read in the
 * browser instead of at render time.
 */
export function UserMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => !cancelled && setUser(session?.user ?? null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;
  const name = user.name || user.email || "Usuario";

  return (
    <div className="flex items-center gap-2">
      <span
        title={user.email ?? name}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold"
      >
        {initials(name)}
      </span>
      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/login" })}
        className="text-chrome-muted h-8 rounded-lg px-2 text-xs hover:bg-white/10 hover:text-white"
      >
        Salir
      </button>
    </div>
  );
}
