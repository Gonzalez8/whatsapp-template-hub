import type { Waba } from "@/types/template";
import { TemplateCard } from "./TemplateCard";

interface WabaSectionProps {
  waba: Waba;
}

export function WabaSection({ waba }: WabaSectionProps) {
  return (
    <section className="mb-9">
      <div className="mb-4 flex items-center gap-2.5 border-b-2 border-emerald-500 pb-2.5">
        <h2 className="text-lg font-semibold text-gray-900 ">
          {waba.waba_name}
        </h2>
        <span className="rounded-xl bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white">
          {waba.templates.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {waba.templates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </section>
  );
}
