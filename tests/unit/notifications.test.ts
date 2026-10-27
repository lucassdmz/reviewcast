import { describe, expect, it } from "vitest";
import { cleEnOctets } from "@/lib/notifications/cle";
import { abonnementSchema, messageAvisATraiter, messagePushSchema, messageResumeHebdo } from "@/lib/notifications/messages";
import { tacheAutorisee } from "@/lib/taches/autorisation";

describe("notification « avis à traiter »", () => {
  it("regroupe les avis en une phrase neutre qui mène à la file", () => {
    expect(messageAvisATraiter(1, 1)).toEqual({ titre: "Éclaircie", corps: "1 avis attend votre réponse. Le brouillon est prêt.", url: "/a-traiter", tag: "a-traiter" });
    expect(messageAvisATraiter(3, 3).corps).toBe("3 avis attendent votre réponse. Les brouillons sont prêts.");
    expect(messageAvisATraiter(3, 1).corps).toBe("3 avis attendent votre réponse. 1 avis avec un brouillon prêt.");
    expect(messageAvisATraiter(2, 0).corps).toBe("2 avis attendent votre réponse.");
  });

  it("ne dit jamais « négatif »", () => {
    expect(messageAvisATraiter(2, 1).corps).not.toMatch(/négatif/i);
  });
});

describe("résumé du lundi", () => {
  it("commence par les clients contents", () => {
    const m = messageResumeHebdo({ recus: 12, contents: 11, aTraiter: 1, reponses: 3 });
    expect(m.corps).toBe("11 clients contents sur 12 avis cette semaine. 3 réponses publiées. 1 avis à traiter.");
    expect(m.url).toBe("/");
  });

  it("célèbre une semaine sans fausse note", () => {
    expect(messageResumeHebdo({ recus: 4, contents: 4, aTraiter: 0, reponses: 0 }).corps).toBe("4 avis cette semaine, tous contents. Rien à traiter.");
    expect(messageResumeHebdo({ recus: 1, contents: 1, aTraiter: 0, reponses: 0 }).corps).toBe("1 avis cette semaine, un client content. Rien à traiter.");
  });

  it("reste court une semaine calme", () => {
    expect(messageResumeHebdo({ recus: 0, contents: 0, aTraiter: 0, reponses: 0 }).corps).toBe("Semaine calme, aucun nouvel avis. Rien à traiter.");
  });

  it("produit des messages acceptés par le service worker", () => {
    expect(messagePushSchema.safeParse(messageResumeHebdo({ recus: 9, contents: 8, aTraiter: 2, reponses: 1 })).success).toBe(true);
    expect(messagePushSchema.safeParse({ titre: "x", corps: "y", url: "https://ailleurs.example", tag: "t" }).success).toBe(false);
  });
});

describe("abonnement du navigateur", () => {
  const valide = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNc...", auth: "tBH..." } };

  it("accepte un abonnement complet en HTTPS", () => {
    expect(abonnementSchema.safeParse({ ...valide, expirationTime: null }).success).toBe(true);
  });

  it("refuse un service non chiffré ou des clés manquantes", () => {
    expect(abonnementSchema.safeParse({ ...valide, endpoint: "http://push.example/abc" }).success).toBe(false);
    expect(abonnementSchema.safeParse({ endpoint: valide.endpoint, keys: { p256dh: "x" } }).success).toBe(false);
  });

  it("convertit la clé publique VAPID en octets", () => {
    expect(Array.from(cleEnOctets("AQID_-8"))).toEqual([1, 2, 3, 255, 239]);
  });
});

describe("tâches planifiées", () => {
  const secret = "un-secret-de-tache-assez-long";

  it("acceptent le bon secret seulement", () => {
    expect(tacheAutorisee(`Bearer ${secret}`, secret)).toBe(true);
    expect(tacheAutorisee(`Bearer ${secret}x`, secret)).toBe(false);
    expect(tacheAutorisee(null, secret)).toBe(false);
  });

  it("refusent tout sans secret configuré, ou avec un secret trop court", () => {
    expect(tacheAutorisee("Bearer ", undefined)).toBe(false);
    expect(tacheAutorisee("Bearer court", "court")).toBe(false);
  });
});
