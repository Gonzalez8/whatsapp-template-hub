import type { Waba } from "@/types/template";
import { TemplateCard } from "./TemplateCard";

interface WabaSectionProps {
  waba: Waba;
}

export function WabaSection({ waba }: WabaSectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-sm">
          {waba.waba_name.charAt(0)}
        </div>
        <h2 className="font-display flex-1 text-[15px] font-bold text-gray-900">
          {waba.waba_name}
        </h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200/80">
          {waba.templates.length} templates
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {waba.templates.map((t, i) => (
          <TemplateCard key={t.id} template={t} wabaId={waba.waba_id} index={i} />
        ))}
      </div>
    </section>
  );
}
