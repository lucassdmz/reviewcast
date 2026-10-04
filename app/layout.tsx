import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-sans-app",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  // Cette police japonaise est découpée en plus de cent tranches par graisse.
  // Préchargée, elle faisait télécharger plus de 300 fichiers à l'ouverture ;
  // sans préchargement, le navigateur ne prend que les tranches utilisées.
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Éclaircie — la météo de vos avis",
  description: "Vos avis Google remis en perspective : le climat d'abord, les quelques avis à traiter ensuite.",
  applicationName: "Éclaircie",
  // Une démonstration partagée par lien ne doit pas être référencée.
  robots: process.env.MODE_DEMO === "1" ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f2f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111213" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${zenKaku.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
