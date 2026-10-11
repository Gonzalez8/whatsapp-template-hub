import { getTemplatesSnapshot } from "@/lib/templates";
import { getBrand } from "@/lib/brand";
import { getAuthConfig } from "@/lib/auth-config";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { MetaConfigError } from "@/lib/meta-api";
import { TemplatesDashboard } from "@/components/TemplatesDashboard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Suspense } from "react";

// Must be a literal; keep in sync with TEMPLATES_REVALIDATE_SECONDS.
export const revalidate = 300;

async function TemplatesContent() {
  try {
    const { wabas, fetchedAt } = await getTemplatesSnapshot();
    const { name, logoUrl, logoOnWhite } = getBrand();
    const authEnabled = getAuthConfig().status === "enabled";
    return (
      <TemplatesDashboard
        wabas={wabas}
        fetchedAt={fetchedAt}
        brand={{ name, logoUrl, logoOnWhite }}
        authEnabled={authEnabled}
        analyticsEnabled={getAnalyticsConfig().status === "enabled"}
      />
    );
  } catch (e) {
    // Only a missing configuration is rendered here (e.g. a CI build without secrets).
    // Any other error is rethrown so ISR keeps serving the last good page instead of
    // caching an error page, and the request falls back to error.tsx.
    if (e instanceof MetaConfigError) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-red-600">
          Configuración incompleta: {e.message}
        </div>
      );
    }
    throw e;
  }
}

export default function Home() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <TemplatesContent />
    </Suspense>
  );
}
