/// <reference lib="webworker" />
/**
 * Service worker d'Éclaircie, compilé vers public/sw.js par `npm run build:sw`.
 *
 * - Fichiers statiques (code, icônes) : servis depuis le cache, ils ne changent jamais.
 * - Pages : le réseau d'abord ; la dernière version chargée est gardée et servie
 *   hors ligne. Une page jamais chargée affiche l'écran « hors ligne ».
 * - Les avis contiennent des noms de clients : les pages gardées sont effacées
 *   dès que l'écran de connexion s'affiche (déconnexion ou session expirée).
 */
import {
  CACHE_PAGES,
  CACHE_STATIQUE,
  DELAI_RESEAU_MS,
  ECRANS_HORS_LIGNE,
  ENTETE_ENREGISTRE,
  MAX_FICHIERS_STATIQUES,
  PAGE_HORS_LIGNE,
  PRECACHE,
  aPrecharger,
  clePage,
  pageEnregistrable,
  traitement,
} from "./strategie";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIQUE);
      await cache.addAll([...PRECACHE]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const gardes = new Set([CACHE_STATIQUE, CACHE_PAGES]);
      for (const nom of await caches.keys()) if (!gardes.has(nom)) await caches.delete(nom);
      await self.clients.claim();
    })(),
  );
});

async function limiterStatique(cache: Cache): Promise<void> {
  const cles = await cache.keys();
  for (const cle of cles.slice(0, Math.max(0, cles.length - MAX_FICHIERS_STATIQUES))) await cache.delete(cle);
}

async function statique(requete: Request): Promise<Response> {
  const cache = await caches.open(CACHE_STATIQUE);
  const garde = await cache.match(requete);
  if (garde) return garde;
  const reponse = await fetch(requete);
  if (reponse.ok) {
    await cache.put(requete, reponse.clone());
    await limiterStatique(cache);
  }
  return reponse;
}

/** Copie la réponse avec sa date d'enregistrement, pour savoir quand la recharger. */
async function enregistrerPage(url: string, reponse: Response): Promise<void> {
  const chemin = new URL(reponse.url || url).pathname;
  if (!pageEnregistrable({ status: reponse.status, redirigee: reponse.redirected, chemin, typeContenu: reponse.headers.get("content-type") })) return;
  const entetes = new Headers(reponse.headers);
  entetes.set(ENTETE_ENREGISTRE, String(Date.now()));
  const copie = new Response(await reponse.clone().blob(), { status: 200, headers: entetes });
  await (await caches.open(CACHE_PAGES)).put(clePage(url), copie);
}

async function pageGardee(url: string): Promise<Response | undefined> {
  const pages = await caches.open(CACHE_PAGES);
  return (await pages.match(clePage(url))) ?? (await pages.match(clePage(url), { ignoreSearch: true }));
}

async function horsLigne(): Promise<Response> {
  return (await caches.match(PAGE_HORS_LIGNE)) ?? new Response("Vous êtes hors ligne.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
}

async function page(event: FetchEvent): Promise<Response> {
  const url = event.request.url;
  const reseau = fetch(event.request).then((reponse) => {
    event.waitUntil(enregistrerPage(url, reponse));
    return reponse;
  });
  reseau.catch(() => undefined);
  // Réseau lent : la copie gardée est servie, la page fraîche est enregistrée pour la prochaine fois.
  const delai = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), DELAI_RESEAU_MS));
  try {
    const premiere = await Promise.race([reseau, delai.then(() => pageGardee(url))]);
    return premiere ?? (await reseau);
  } catch {
    return (await pageGardee(url)) ?? (await horsLigne());
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const quoi = traitement(
    { url: request.url, methode: request.method, mode: request.mode, rsc: request.headers.get("RSC") === "1" },
    self.location.origin,
  );
  if (quoi === "statique") event.respondWith(statique(request));
  else if (quoi === "page") event.respondWith(page(event));
});

/** Recharge en arrière-plan les écrans lisibles hors ligne, s'ils ne sont pas tout frais. */
async function precharger(chemins: string[]): Promise<void> {
  const pages = await caches.open(CACHE_PAGES);
  for (const chemin of chemins) {
    const garde = await pages.match(chemin);
    const le = Number(garde?.headers.get(ENTETE_ENREGISTRE));
    if (!aPrecharger(Number.isFinite(le) && le > 0 ? le : null, Date.now())) continue;
    try {
      const reponse = await fetch(chemin, { credentials: "same-origin", redirect: "follow" });
      // Une redirection vers la connexion veut dire que la session est finie : on oublie tout.
      if (new URL(reponse.url).pathname === "/connexion") {
        await caches.delete(CACHE_PAGES);
        return;
      }
      await enregistrerPage(new URL(chemin, self.location.origin).href, reponse);
    } catch {
      return;
    }
  }
}

self.addEventListener("message", (event) => {
  const data: unknown = event.data;
  if (typeof data !== "object" || data === null || !("type" in data)) return;
  if (data.type === "oublier") event.waitUntil(caches.delete(CACHE_PAGES));
  if (data.type === "precharger" && "chemins" in data && Array.isArray(data.chemins)) {
    event.waitUntil(precharger(data.chemins.filter((c): c is string => (ECRANS_HORS_LIGNE as readonly unknown[]).includes(c))));
  }
});

/** Notification reçue : titre, texte, écran à ouvrir. Jamais de nom de client dedans (lib/notifications). */
interface NotificationRecue {
  titre: string;
  corps: string;
  url: string;
  tag: string;
}

function lireNotification(donnees: unknown): NotificationRecue | null {
  if (typeof donnees !== "object" || donnees === null) return null;
  const { titre, corps, url, tag } = donnees as Record<string, unknown>;
  if (typeof titre !== "string" || typeof corps !== "string" || typeof url !== "string" || !url.startsWith("/")) return null;
  return { titre, corps, url, tag: typeof tag === "string" ? tag : "eclaircie" };
}

self.addEventListener("push", (event) => {
  let notification: NotificationRecue | null = null;
  try {
    notification = lireNotification(event.data?.json());
  } catch {
    notification = null;
  }
  if (!notification) return;
  event.waitUntil(
    self.registration.showNotification(notification.titre, {
      body: notification.corps,
      icon: "/icons/icon-192.png",
      tag: notification.tag,
      lang: "fr",
      data: { url: notification.url },
    }),
  );
});

/** Un appui ouvre l'écran annoncé, dans la fenêtre déjà ouverte s'il y en a une. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const chemin = typeof data === "object" && data !== null && "url" in data && typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  const url = new URL(chemin, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const fenetre = fenetres.find((f) => new URL(f.url).origin === self.location.origin);
      if (fenetre) {
        await fenetre.focus();
        await fenetre.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
