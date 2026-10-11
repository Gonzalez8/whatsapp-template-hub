"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import type { DiffSegment } from "@/lib/diff";
import type { TemplateComponent, PreviewMode } from "@/types/template";
import { formatWhatsAppText } from "@/lib/whatsapp-format";
import { resolveComponentText as resolveText } from "@/lib/template-utils";
import { findMatchRanges } from "@/lib/search";
import { Highlight, renderHighlighted, useSearchTerms } from "./Highlight";

interface WhatsAppPreviewProps {
  components: TemplateComponent[];
  mode: PreviewMode;
  /** Body split into segments to highlight what changes against other templates (compare view). */
  bodyDiff?: DiffSegment[];
}

const BUTTON_ICONS: Record<string, string> = {
  URL: "\uD83D\uDD17",
  PHONE_NUMBER: "\uD83D\uDCDE",
  QUICK_REPLY: "\u21A9\uFE0F",
  FLOW: "\uD83D\uDCCB",
  COPY_CODE: "\uD83D\uDCCB",
  OTP: "\uD83D\uDD11",
};

function MediaPlaceholder({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="mb-1.5 flex h-28 flex-col items-center justify-center gap-1 rounded-md bg-[#f0f2f5] text-[#667781]">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}

/**
 * IMAGE / VIDEO / DOCUMENT / LOCATION headers. The media shown is the example Meta
 * stores with the template (signed URL, refreshed with every data sync); the real
 * one is chosen when the message is sent.
 */
function MediaHeader({ component }: { component: TemplateComponent }) {
  const [failed, setFailed] = useState(false);
  const url = component.example?.header_handle?.[0];

  switch (component.format) {
    case "IMAGE":
      if (!url || failed) return <MediaPlaceholder icon={"\uD83D\uDDBC\uFE0F"} label="Imagen" />;
      return (
        // eslint-disable-next-line @next/next/no-img-element -- remote, signed and short-lived URLs; next/image adds nothing here
        <img
          src={url}
          alt="Imagen de ejemplo de la cabecera"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="mb-1.5 max-h-64 w-full rounded-md bg-[#f0f2f5] object-cover"
        />
      );
    case "VIDEO":
      if (!url || failed) return <MediaPlaceholder icon={"\uD83C\uDFAC"} label="Vídeo" />;
      return (
        // preload="none": example videos can weigh tens of MB, only load them on play.
        <video
          src={url}
          preload="none"
          controls
          playsInline
          onError={() => setFailed(true)}
          aria-label="Vídeo de ejemplo de la cabecera"
          className="mb-1.5 max-h-64 w-full rounded-md bg-black"
        />
      );
    case "DOCUMENT":
      return (
        <div className="mb-1.5 flex items-center gap-2.5 rounded-md bg-[#f0f2f5] px-3 py-2.5">
          <span className="text-xl" aria-hidden="true">
            {"\uD83D\uDCC4"}
          </span>
          <span className="min-w-0 flex-1 text-[12px] font-medium text-[#111b21]">Documento</span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[11px] font-semibold text-[#00a5f4] hover:underline"
            >
              Abrir ejemplo
            </a>
          )}
        </div>
      );
    case "LOCATION":
      return <MediaPlaceholder icon={"\uD83D\uDCCD"} label="Ubicación (se indica al enviar)" />;
    default:
      return null;
  }
}

export function WhatsAppPreview({ components, mode, bodyDiff }: WhatsAppPreviewProps) {
  const header = components?.find((c) => c.type === "HEADER");
  const body = components?.find((c) => c.type === "BODY");
  const footer = components?.find((c) => c.type === "FOOTER");
  const buttons = components?.find((c) => c.type === "BUTTONS");

  const { headerText, bodyText, footerText } = useMemo(
    () => ({
      headerText: resolveText(header, mode),
      bodyText: resolveText(body, mode),
      footerText: resolveText(footer, mode),
    }),
    [header, body, footer, mode],
  );

  const terms = useSearchTerms();
  const decorate = useCallback((text: string) => renderHighlighted(text, findMatchRanges(text, terms)), [terms]);
  const format = (text: string) => formatWhatsAppText(text, terms.length ? decorate : undefined);

  return (
    <div className="bg-[#efeae2] bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M30%205c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202zm0%2054c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202z%22%20fill=%22%23d6cfc4%22%20fill-opacity=%220.3%22/%3E%3C/svg%3E')] p-4">
      <div className="relative max-w-[95%] rounded-[0_8px_8px_8px] bg-white px-2.5 pt-2 pb-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] before:absolute before:top-0 before:-left-2 before:border-t-0 before:border-r-[8px] before:border-b-[8px] before:border-l-0 before:border-transparent before:border-r-white">
        {header?.format && header.format !== "TEXT" && <MediaHeader component={header} />}
        {headerText && <p className="mb-1 text-[13.5px] leading-snug font-bold text-[#111b21]">{format(headerText)}</p>}
        {bodyText && (
          <p className="overflow-y-auto text-[13.5px] leading-[1.45] break-words whitespace-pre-wrap text-[#111b21] [scrollbar-width:thin]">
            {bodyDiff
              ? bodyDiff.map((segment, i) =>
                  segment.changed ? (
                    <mark key={i} className="rounded-sm bg-amber-200/80 text-inherit">
                      {format(segment.text)}
                    </mark>
                  ) : (
                    <Fragment key={i}>{format(segment.text)}</Fragment>
                  ),
                )
              : format(bodyText)}
          </p>
        )}
        {footerText && <p className="mt-1.5 text-[11px] text-[#8696a0]">{format(footerText)}</p>}
        <div className="mt-0.5 flex justify-end text-[11px] text-[#8696a0]">12:00</div>
      </div>

      {buttons?.buttons && buttons.buttons.length > 0 && (
        <div className="mt-1.5 max-w-[95%] overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          {buttons.buttons.map((btn, i) => {
            const target = btn.url ?? btn.phone_number;
            // The search may have matched the hidden destination: mark the button instead of
            // showing the URL, so the bubble keeps looking like the real message.
            const targetMatched = !!target && findMatchRanges(target, terms).length > 0;
            const className = `flex items-center justify-center gap-1.5 border-b border-[#e9edef] px-3 py-2.5 text-[13px] font-medium text-[#00a5f4] last:border-b-0 ${
              targetMatched ? "bg-amber-50 ring-2 ring-amber-300 ring-inset" : ""
            }`;
            const content = (
              <>
                <span className="inline-flex text-[13px]">{BUTTON_ICONS[btn.type] ?? "\u21A9\uFE0F"}</span>
                <Highlight text={btn.text} />
                {targetMatched && <span className="sr-only"> (el destino coincide con la búsqueda)</span>}
              </>
            );

            // The template URL may contain {{1}}; Meta's example is the one that actually opens.
            const href = btn.url ? (btn.example?.[0] ?? btn.url) : undefined;
            if (href) {
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={btn.url}
                  className={`${className} transition-colors hover:bg-[#f5f6f6]`}
                >
                  {content}
                </a>
              );
            }
            return (
              <div key={i} title={target} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
