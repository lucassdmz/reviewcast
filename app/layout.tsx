import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { cookies } from "next/headers";
import { COOKIE_THEME, COULEUR_BARRE, lireTheme, type Theme } from "@/lib/apparence";
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
  // Icône et mode plein écran quand l'application est ajoutée à l'écran d'accueil.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Éclaircie", statusBarStyle: "default" },
  // Une démonstration partagée par lien ne doit pas être référencée.
  robots: process.env.MODE_DEMO === "1" ? { index: false, follow: false } : undefined,
};

async function themeChoisi(): Promise<Theme> {
  return lireTheme((await cookies()).get(COOKIE_THEME)?.value);
}

/** La couleur de la barre du navigateur suit le thème choisi. */
export async function generateViewport(): Promise<Viewport> {
  const theme = await themeChoisi();
  return {
    themeColor:
      theme === "systeme"
        ? [
            { media: "(prefers-color-scheme: light)", color: COULEUR_BARRE.clair },
            { media: "(prefers-color-scheme: dark)", color: COULEUR_BARRE.sombre },
          ]
        : COULEUR_BARRE[theme],
    width: "device-width",
    initialScale: 1,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await themeChoisi();
  return (
    <html lang="fr" data-theme={theme} className={`${zenKaku.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
