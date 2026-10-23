import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site-url";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export function generateMetadata(): Metadata {
  const { name } = getBrand();
  const title = name ? `Plantillas de WhatsApp · ${name}` : "Plantillas de WhatsApp";
  const description = "Consulta las plantillas de WhatsApp Business de todas las WABAs";
  return {
    // Absolute URLs for the preview image (app/opengraph-image.tsx).
    metadataBase: getSiteUrl(),
    title,
    description,
    openGraph: { type: "website", title, description, siteName: name ?? "Plantillas de WhatsApp" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Brand color per deployment (BRAND_COLOR): overrides the theme's accent tokens.
  const brand = getBrand();
  const brandVars = {
    "--color-accent": brand.color,
    "--color-on-accent": brand.onColor,
    "--color-accent-ink": brand.inkColor,
    "--color-accent-bright": brand.brightColor,
    "--color-on-accent-bright": brand.onBrightColor,
  } as CSSProperties;

  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`} style={brandVars}>
      <body className="bg-canvas text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
