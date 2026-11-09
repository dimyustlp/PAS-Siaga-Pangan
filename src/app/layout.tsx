import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PAS-SIAGA Pangan", template: "%s | PAS-SIAGA Pangan" },
  description:
    "Sistem pemantauan dan pengamanan kegiatan ketahanan pangan pemasyarakatan.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef4fc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
