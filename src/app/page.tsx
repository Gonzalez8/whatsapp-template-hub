import { getTemplatesSnapshot } from "@/lib/templates";
import { MetaConfigError } from "@/lib/meta-api";
import { Header } from "@/components/Header";
import { TemplatesDashboard } from "@/components/TemplatesDashboard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Suspense } from "react";

// Must be a literal; keep in sync with TEMPLATES_REVALIDATE_SECONDS.
export const revalidate = 300;

async function TemplatesContent() {
  try {
    const { wabas, fetchedAt } = await getTemplatesSnapshot();
    return <TemplatesDashboard wabas={wabas} fetchedAt={fetchedAt} />;
  } catch (e) {
    // Only a missing configuration is rendered here (e.g. a CI build without secrets).
    // Any other error is rethrown so ISR keeps serving the last good page instead of
    // caching an error page, and the request falls back to error.tsx.
    if (e instanceof MetaConfigError) {
      return <div className="py-10 text-center text-red-500">Configuración incompleta: {e.message}</div>;
    }
    throw e;
  }
}

export default function Home() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <Header />
      <Suspense fallback={<SkeletonLoader />}>
        <TemplatesContent />
      </Suspense>
    </div>
  );
}
