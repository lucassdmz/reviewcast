import { describe, expect, it } from "vitest";
import { creerRegistreAttente, messageHorsLigne } from "@/lib/pwa/attente";
import { FRAICHEUR_PRECHARGEMENT_MS, aPrecharger, clePage, pageEnregistrable, traitement, type RequeteVue } from "@/lib/pwa/strategie";

const ORIGINE = "https://eclaircie.example";

function requete(chemin: string, autres: Partial<RequeteVue> = {}): RequeteVue {
  return { url: `${ORIGINE}${chemin}`, methode: "GET", mode: "navigate", rsc: false, ...autres };
}

describe("service worker : ce qui est gardé", () => {
  it("garde les écrans ouverts, réseau d'abord", () => {
    expect(traitement(requete("/"), ORIGINE)).toBe("page");
    expect(traitement(requete("/tendances?periode=12m"), ORIGINE)).toBe("page");
    expect(traitement(requete("/a-traiter/abc"), ORIGINE)).toBe("page");
  });

  it("garde les fichiers statiques, qui ne changent jamais", () => {
    expect(traitement(requete("/_next/static/chunks/app.js", { mode: "no-cors" }), ORIGINE)).toBe("statique");
    expect(traitement(requete("/icons/icon-192.png", { mode: "no-cors" }), ORIGINE)).toBe("statique");
  });

  it("ne touche ni à la connexion, ni aux API, ni aux envois", () => {
    expect(traitement(requete("/connexion"), ORIGINE)).toBe("ignorer");
    expect(traitement(requete("/connexion?callbackUrl=%2F"), ORIGINE)).toBe("ignorer");
    expect(traitement(requete("/api/auth/session", { mode: "cors" }), ORIGINE)).toBe("ignorer");
    expect(traitement(requete("/a-traiter/abc", { methode: "POST" }), ORIGINE)).toBe("ignorer");
  });

  it("laisse à Next ses navigations internes et ignore les autres sites", () => {
    expect(traitement(requete("/tendances", { mode: "cors", rsc: true }), ORIGINE)).toBe("ignorer");
    expect(traitement(requete("/tendances?_rsc=1x2y", { mode: "cors" }), ORIGINE)).toBe("ignorer");
    expect(traitement({ ...requete("/"), url: "https://fonts.example/police.woff2" }, ORIGINE)).toBe("ignorer");
  });
});

describe("service worker : ce qui est enregistré", () => {
  const html = { status: 200, redirigee: false, chemin: "/", typeContenu: "text/html; charset=utf-8" };

  it("enregistre une page complète d'une session ouverte", () => {
    expect(pageEnregistrable(html)).toBe(true);
  });

  it("n'enregistre jamais une redirection, l'écran de connexion ni une erreur", () => {
    expect(pageEnregistrable({ ...html, redirigee: true })).toBe(false);
    expect(pageEnregistrable({ ...html, chemin: "/connexion" })).toBe(false);
    expect(pageEnregistrable({ ...html, status: 500 })).toBe(false);
    expect(pageEnregistrable({ ...html, typeContenu: "application/json" })).toBe(false);
  });

  it("range une page par chemin et paramètres, sans l'ancre", () => {
    expect(clePage(`${ORIGINE}/tendances?periode=12m#themes`)).toBe("/tendances?periode=12m");
  });

  it("ne recharge pas un écran tout frais", () => {
    const maintenant = 10 * FRAICHEUR_PRECHARGEMENT_MS;
    expect(aPrecharger(null, maintenant)).toBe(true);
    expect(aPrecharger(maintenant - 1000, maintenant)).toBe(false);
    expect(aPrecharger(maintenant - FRAICHEUR_PRECHARGEMENT_MS, maintenant)).toBe(true);
  });
});

describe("actions en attente du réseau", () => {
  it("compte les actions et prévient les écrans", () => {
    const registre = creerRegistreAttente();
    let appels = 0;
    registre.abonner(() => (appels += 1));
    const retirer = registre.ajouter();
    registre.ajouter();
    expect(registre.nombre()).toBe(2);
    retirer();
    retirer();
    expect(registre.nombre()).toBe(1);
    expect(appels).toBe(3);
  });

  it("dit d'abord ce qui attend, sans alarme", () => {
    expect(messageHorsLigne(0)).toBe("Hors ligne. Vous lisez les derniers avis chargés.");
    expect(messageHorsLigne(1)).toBe("Hors ligne. Votre action partira au retour du réseau : gardez l'application ouverte.");
    expect(messageHorsLigne(2)).toContain("Vos 2 actions partiront");
  });
});
