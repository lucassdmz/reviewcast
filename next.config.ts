import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Revenir sur un onglet vu il y a moins de 30 s est immédiat, sans nouvel
    // appel au serveur. Toute action (publier, enregistrer) vide ce cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
