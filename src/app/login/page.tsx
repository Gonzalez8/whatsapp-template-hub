import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getAuthConfig, safeCallbackUrl } from "@/lib/auth-config";
import { getBrand } from "@/lib/brand";

export const metadata: Metadata = { title: "Iniciar sesión · Plantillas de WhatsApp" };

// Depends on the login configuration and the query (callbackUrl, error): never prerender it.
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  AccessDenied: "Tu cuenta no tiene acceso a esta herramienta. Pide acceso a quien la administra.",
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const authConfig = getAuthConfig();
  if (authConfig.status === "disabled") redirect("/");

  const { callbackUrl, error } = await searchParams;
  const brand = getBrand();

  async function login() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: safeCallbackUrl(callbackUrl) });
  }

  return (
    <main className="bg-chrome text-chrome-ink flex min-h-dvh items-center justify-center p-6">
      <div className="bg-surface text-ink w-full max-w-sm rounded-2xl p-8 shadow-2xl">
        {brand.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- any https URL from the deployment config
          <img
            src={brand.logoUrl}
            alt={brand.name ?? "Logo de la empresa"}
            className="mb-6 h-7 max-w-[160px] object-contain"
          />
        )}
        <h1 className="text-xl font-semibold">Plantillas de WhatsApp</h1>

        {authConfig.status === "incomplete" ? (
          <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">El inicio de sesión está a medio configurar.</p>
            <p className="mt-1">Faltan estas variables de entorno:</p>
            <ul className="mt-1 list-disc pl-5 font-mono text-xs">
              {authConfig.missing.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="text-muted mt-2 text-sm">Inicia sesión con tu cuenta de la empresa.</p>
            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {ERRORS[error] ?? "No se pudo iniciar sesión. Inténtalo de nuevo."}
              </p>
            )}
            <form action={login} className="mt-6">
              <button
                type="submit"
                className="bg-ink hover:bg-ink/85 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg text-sm font-semibold text-white"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Iniciar sesión con Microsoft
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
