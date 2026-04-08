import { fetchWabasWithTemplates } from "@/lib/meta-api";
import { Header } from "@/components/Header";
import { TemplatesDashboard } from "@/components/TemplatesDashboard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Suspense } from "react";

export const revalidate = 300;

async function TemplatesContent() {
  try {
    const wabas = await fetchWabasWithTemplates();
    return <TemplatesDashboard wabas={wabas} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return (
      <div className="py-10 text-center text-red-500">
        Error: {message}
      </div>
    );
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
