import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Revenir sur un onglet vu il y a moins de 30 s est immédiat, sans nouvel
    // appel au serveur. Toute action (publier, enregistrer) vide ce cache.
    staleTimes: { dynamic: 30 },
    // Sans réseau, une navigation ou une action (enregistrer, publier) attend
    // le retour de la connexion au lieu d'échouer, puis repart d'elle-même.
    useOffline: true,
    // Une remarque de bêta part avec sa capture d'écran (1,5 Mo au plus).
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    // Le service worker est toujours revérifié : une mise en ligne le remplace aussitôt.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
