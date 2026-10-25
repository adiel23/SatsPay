import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RemesasSV ⚡ | Remesas EE.UU. a El Salvador vía Bitcoin & Stablesats",
  description:
    "Plataforma Fullstack de remesas instantáneas hacia El Salvador usando Blink Stablesats (USD) y Chivo Wallet sobre Lightning Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
