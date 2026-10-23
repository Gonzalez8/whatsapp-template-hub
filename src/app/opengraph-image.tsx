import { ImageResponse } from "next/og";
import { getBrand } from "@/lib/brand";

// Link preview for Slack, Teams, WhatsApp…: public (outside the login) and with no data,
// just the app's name and the deployment's brand.
export const alt = "Plantillas de WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const brand = getBrand();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#14181A",
        color: "#F2F4F3",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: brand.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChatBubble color={brand.onColor} />
        </div>
        {brand.name && <div style={{ fontSize: 36, fontWeight: 600, color: "#9AA3A0" }}>{brand.name}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>Plantillas de WhatsApp</div>
        <div style={{ fontSize: 34, color: "#9AA3A0", maxWidth: 1060 }}>
          Busca, compara y analiza las plantillas de todas las WABAs
        </div>
      </div>
      <div style={{ height: 10, width: 220, borderRadius: 5, background: brand.brightColor }} />
    </div>,
    size,
  );
}

function ChatBubble({ color }: { color: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2">
      <path strokeLinejoin="round" d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}
