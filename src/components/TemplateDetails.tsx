import type { ReactNode } from "react";
import type { Template, TemplateButton } from "@/types/template";
import { BUTTON_TYPE_LABELS, extractVariables, isRecategorized } from "@/lib/template-utils";
import { CopyButton } from "./CopyButton";
import { Highlight } from "./Highlight";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-100 px-5 py-4">
      <h3 className="mb-2.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[12px]">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-all text-gray-800">{children}</dd>
    </div>
  );
}

function ButtonTarget({ button }: { button: TemplateButton }) {
  if (button.url) {
    return (
      <>
        <p className="font-mono text-[11px] break-all text-gray-700">
          <Highlight text={button.url} />
        </p>
        {button.example?.[0] && button.example[0] !== button.url && (
          <p className="mt-0.5 text-[11px] break-all text-gray-500">
            Ejemplo: <span className="font-mono">{button.example[0]}</span>
          </p>
        )}
      </>
    );
  }
  if (button.phone_number) {
    return (
      <p className="font-mono text-[11px] text-gray-700">
        <Highlight text={button.phone_number} />
      </p>
    );
  }
  if (button.flow_id) {
    return (
      <p className="text-[11px] text-gray-600">
        Flow <span className="font-mono">{String(button.flow_id)}</span>
        {button.navigate_screen && <> · pantalla {button.navigate_screen}</>}
      </p>
    );
  }
  return null;
}

/** Everything about a template that the preview doesn't show: ids, variables, button targets. */
export function TemplateDetails({ template, wabaName }: { template: Template; wabaName: string }) {
  const variables = extractVariables(template);
  const buttons = template.components?.flatMap((c) => c.buttons ?? []) ?? [];
  const body = template.components?.find((c) => c.type === "BODY")?.text;

  return (
    <>
      <Section title="Copiar">
        <div className="flex flex-wrap gap-2">
          <CopyButton value={template.name} label="Nombre" />
          <CopyButton value={template.id} label="ID" />
          {body && <CopyButton value={body} label="Texto del cuerpo" />}
        </div>
      </Section>

      {variables.length > 0 && (
        <Section title={`Variables (${variables.length})`}>
          <table className="w-full text-left text-[12px]">
            <thead className="sr-only">
              <tr>
                <th>Variable</th>
                <th>Ejemplo</th>
                <th>Dónde</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v, i) => (
                <tr key={i} className="border-b border-gray-50 align-top last:border-b-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <code className="rounded bg-teal-50 px-1 py-0.5 text-[11px] font-medium text-teal-700">
                      {v.token}
                    </code>
                  </td>
                  <td className="py-1.5 pr-3 break-all text-gray-800">
                    {v.example ?? <span className="text-gray-400 italic">sin ejemplo</span>}
                  </td>
                  <td className="py-1.5 text-right text-[11px] whitespace-nowrap text-gray-500">{v.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {buttons.length > 0 && (
        <Section title={`Botones (${buttons.length})`}>
          <ul className="space-y-2.5">
            {buttons.map((b, i) => (
              <li key={i}>
                <div className="mb-0.5 flex items-center gap-2 text-[12px]">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                    {BUTTON_TYPE_LABELS[b.type] ?? b.type}
                  </span>
                  <span className="font-medium text-gray-800">
                    <Highlight text={b.text} />
                  </span>
                </div>
                <ButtonTarget button={b} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Información">
        <dl>
          <InfoRow label="WABA">{wabaName}</InfoRow>
          <InfoRow label="ID">
            <span className="font-mono">{template.id}</span>
          </InfoRow>
          {template.parameter_format && (
            <InfoRow label="Formato de variables">
              {template.parameter_format === "NAMED" ? "Con nombre" : "Numeradas"}
            </InfoRow>
          )}
          {template.sub_category && <InfoRow label="Subcategoría">{template.sub_category}</InfoRow>}
          {template.previous_category && (
            <InfoRow label="Categoría anterior">
              {template.previous_category}
              {isRecategorized(template) && <span className="text-amber-700"> (cambiada por Meta)</span>}
            </InfoRow>
          )}
          {template.rejected_reason && template.rejected_reason !== "NONE" && (
            <InfoRow label="Motivo de rechazo">
              <span className="text-red-600">{template.rejected_reason}</span>
            </InfoRow>
          )}
        </dl>
      </Section>
    </>
  );
}
