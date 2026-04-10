import type { Waba } from "@/types/template";
import { TemplateCard } from "./TemplateCard";

interface WabaSectionProps {
  waba: Waba;
}

export function WabaSection({ waba }: WabaSectionProps) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3.5 sm:mb-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold text-white shadow-sm shadow-teal-600/20">
          {waba.waba_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-bold text-gray-900 sm:text-[15px]">{waba.waba_name}</h2>
          {waba.phone_numbers.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
              {waba.phone_numbers.map((pn) => (
                <div key={pn.id} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="font-medium text-gray-700">{pn.display_phone_number}</span>
                  <span className="text-gray-300">·</span>
                  <span>{pn.verified_name}</span>
                  {pn.status && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                          pn.status === "CONNECTED"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
                        }`}
                      >
                        {pn.status}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200/80">
          {waba.templates.length} templates
        </span>
      </div>
      {waba.error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudieron cargar los templates de esta WABA: {waba.error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {waba.templates.map((t, i) => (
          <TemplateCard key={t.id} template={t} wabaId={waba.waba_id} index={i} />
        ))}
      </div>
    </section>
  );
}
