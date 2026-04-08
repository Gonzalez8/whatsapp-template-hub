import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsApp Template Hub",
  description: "Visualiza todos los templates de WhatsApp Business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
