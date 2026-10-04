import type { MetadataRoute } from "next";

/**
 * Manifeste de l'application installée : nom et icône sur l'écran d'accueil,
 * ouverture en plein écran, sans les barres du navigateur.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Éclaircie",
    short_name: "Éclaircie",
    description: "La météo de vos avis Google.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f2f0",
    theme_color: "#f1f2f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
