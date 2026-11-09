import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PAS-SIAGA Pangan", template: "%s | PAS-SIAGA Pangan" },
  description:
    "Sistem pemantauan dan pengamanan kegiatan ketahanan pangan pemasyarakatan.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14284a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
