import type { ReactNode } from "react";
import type { Template, TemplateButton } from "@/types/template";
import { BUTTON_TYPE_LABELS, CATEGORY_LABELS, extractVariables, isRecategorized, label } from "@/lib/template-utils";
import { CopyButton } from "./CopyButton";
import { Highlight } from "./Highlight";

export const countButtons = (template: Template) =>
  template.components?.reduce((n, c) => n + (c.buttons?.length ?? 0), 0) ?? 0;

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted text-sm">{children}</p>;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-line/70 flex items-baseline justify-between gap-4 border-b py-2 text-[13px] last:border-b-0">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="min-w-0 text-right break-all">{children}</dd>
    </div>
  );
}

function ButtonTarget({ button }: { button: TemplateButton }) {
  if (button.url) {
    return (
      <>
        <p className="text-ink/80 font-mono text-xs break-all">
          <Highlight text={button.url} />
        </p>
        {button.example?.[0] && button.example[0] !== button.url && (
          <p className="text-muted mt-1 text-xs break-all">
            Ejemplo: <span className="font-mono">{button.example[0]}</span>
          </p>
        )}
      </>
    );
  }
  if (button.phone_number) {
    return (
      <p className="text-ink/80 font-mono text-xs">
        <Highlight text={button.phone_number} />
      </p>
    );
  }
  if (button.flow_id) {
    return (
      <p className="text-muted text-xs">
        Flow <span className="font-mono">{String(button.flow_id)}</span>
        {button.navigate_screen && <> · pantalla {button.navigate_screen}</>}
      </p>
    );
  }
  return null;
}

export function VariablesTab({ template }: { template: Template }) {
  const variables = extractVariables(template);
  if (variables.length === 0) return <Empty>Esta plantilla no tiene variables.</Empty>;

  return (
    <table className="w-full text-left text-[13px]">
      <thead>
        <tr className="border-line text-muted border-b text-xs">
          <th className="pb-2 font-medium">Variable</th>
          <th className="pb-2 font-medium">Ejemplo</th>
          <th className="pb-2 text-right font-medium">Dónde</th>
        </tr>
      </thead>
      <tbody>
        {variables.map((v, i) => (
          <tr key={i} className="border-line/70 border-b align-top last:border-b-0">
            <td className="py-2 pr-3 whitespace-nowrap">
              <code className="bg-accent-soft text-accent-ink rounded px-1 py-0.5 font-mono text-xs">{v.token}</code>
            </td>
            <td className="py-2 pr-3 break-all">
              {v.example ?? <span className="text-muted italic">sin ejemplo</span>}
            </td>
            <td className="text-muted py-2 text-right text-xs whitespace-nowrap">{v.location}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ButtonsTab({ template }: { template: Template }) {
  const buttons = template.components?.flatMap((c) => c.buttons ?? []) ?? [];
  if (buttons.length === 0) return <Empty>Esta plantilla no tiene botones.</Empty>;

  return (
    <ul className="divide-line/70 divide-y">
      {buttons.map((b, i) => (
        <li key={i} className="py-2.5 first:pt-0">
          <div className="mb-1 flex items-center gap-2 text-[13px]">
            <span className="bg-canvas text-muted rounded px-1.5 py-0.5 text-[11px] font-medium">
              {BUTTON_TYPE_LABELS[b.type] ?? b.type}
            </span>
            <span className="font-medium">
              <Highlight text={b.text} />
            </span>
          </div>
          <ButtonTarget button={b} />
        </li>
      ))}
    </ul>
  );
}

export function InfoTab({ template, wabaName }: { template: Template; wabaName: string }) {
  const body = template.components?.find((c) => c.type === "BODY")?.text;

  return (
    <>
      <dl>
        <InfoRow label="WABA">{wabaName}</InfoRow>
        <InfoRow label="ID">
          <span className="font-mono">{template.id}</span>
        </InfoRow>
        <InfoRow label="Idioma">
          <span className="font-mono">{template.language}</span>
        </InfoRow>
        <InfoRow label="Categoría">{label(CATEGORY_LABELS, template.category)}</InfoRow>
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
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton value={template.id} label="Copiar ID" />
        {body && <CopyButton value={body} label="Copiar texto del cuerpo" />}
      </div>
    </>
  );
}
