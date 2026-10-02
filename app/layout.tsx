import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-sans-app",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Éclaircie — la météo de vos avis",
  description: "Vos avis Google remis en perspective : le climat d'abord, les quelques avis à traiter ensuite.",
  applicationName: "Éclaircie",
};

export const viewport: Viewport = {
  themeColor: "#eaf4fb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
