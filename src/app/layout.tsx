import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Geist, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const inter = Geist({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PAS-SIAGA Pangan", template: "%s | PAS-SIAGA Pangan" },
  description:
    "Sistem pemantauan dan pengamanan kegiatan ketahanan pangan pemasyarakatan.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B4332",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${inter.variable} ${plex.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
