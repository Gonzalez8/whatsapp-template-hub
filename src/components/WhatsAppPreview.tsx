import type { TemplateComponent, PreviewMode } from "@/types/template";
import { formatWhatsAppText } from "@/lib/whatsapp-format";

interface WhatsAppPreviewProps {
  components: TemplateComponent[];
  mode: PreviewMode;
}

const BUTTON_ICONS: Record<string, string> = {
  URL: "\uD83D\uDD17",
  PHONE_NUMBER: "\uD83D\uDCDE",
  QUICK_REPLY: "\u21A9\uFE0F",
};

function replaceVariables(
  text: string,
  examples: string[] | undefined
): string {
  if (!examples || examples.length === 0) return text;
  let idx = 0;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const numericIndex = /^\d+$/.test(key) ? parseInt(key, 10) - 1 : idx;
    idx++;
    return examples[numericIndex] ?? match;
  });
}

function resolveText(
  component: TemplateComponent | undefined,
  mode: PreviewMode
): string | undefined {
  if (!component?.text) return undefined;
  if (mode === "template") return component.text;

  if (component.type === "BODY") {
    const bodyExamples = component.example?.body_text?.[0];
    return replaceVariables(component.text, bodyExamples);
  }
  if (component.type === "HEADER") {
    const headerExamples = component.example?.header_text;
    return replaceVariables(component.text, headerExamples);
  }
  return component.text;
}

export function WhatsAppPreview({ components, mode }: WhatsAppPreviewProps) {
  const header = components?.find((c) => c.type === "HEADER");
  const body = components?.find((c) => c.type === "BODY");
  const footer = components?.find((c) => c.type === "FOOTER");
  const buttons = components?.find((c) => c.type === "BUTTONS");

  const headerText = resolveText(header, mode);
  const bodyText = resolveText(body, mode);
  const footerText = resolveText(footer, mode);

  return (
    <div className="bg-[#efeae2] bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M30%205c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202zm0%2054c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202z%22%20fill=%22%23d6cfc4%22%20fill-opacity=%220.3%22/%3E%3C/svg%3E')] p-4">
      <div className="relative max-w-[95%] rounded-[0_8px_8px_8px] bg-white px-2.5 pt-2 pb-1.5 shadow-sm before:absolute before:top-0 before:-left-2 before:border-t-0 before:border-r-[8px] before:border-b-[8px] before:border-l-0 before:border-transparent before:border-r-white">
        {headerText && (
          <p className="mb-1 text-sm font-bold text-[#111b21]">
            {formatWhatsAppText(headerText)}
          </p>
        )}
        {bodyText && (
          <p className="max-h-[180px] overflow-y-auto break-words text-sm leading-[1.45] text-[#111b21] whitespace-pre-wrap [scrollbar-width:thin]">
            {formatWhatsAppText(bodyText)}
          </p>
        )}
        {footerText && (
          <p className="mt-1 text-xs text-[#8696a0]">
            {formatWhatsAppText(footerText)}
          </p>
        )}
        <div className="mt-0.5 flex justify-end text-[11px] text-[#8696a0]">
          12:00
        </div>
      </div>

      {buttons?.buttons && buttons.buttons.length > 0 && (
        <div className="mt-1 max-w-[95%] overflow-hidden rounded-lg bg-white shadow-sm">
          {buttons.buttons.map((btn, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-1.5 border-b border-[#e9edef] px-3 py-2.5 text-sm font-medium text-[#00a5f4] last:border-b-0"
            >
              <span className="inline-flex text-sm">
                {BUTTON_ICONS[btn.type] ?? "\u21A9\uFE0F"}
              </span>
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
