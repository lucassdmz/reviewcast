import { describe, expect, it } from "vitest";
import { compterExcuses, contientMontant } from "@/lib/ai/controles";

describe("contrôles des brouillons", () => {
  it("compte les formules d'excuse", () => {
    expect(compterExcuses("Merci pour votre visite, au plaisir de vous revoir.")).toBe(0);
    expect(compterExcuses("Nous sommes désolés pour l'attente.")).toBe(1);
    expect(compterExcuses("Je regrette ce moment, toutes mes excuses, j'en suis navrée.")).toBe(3);
    expect(compterExcuses("Pour nous faire pardonner, votre prochain café est offert.")).toBe(1);
  });

  it("ne prend pas un regret du client pour une excuse", () => {
    expect(compterExcuses("Vous ne le regretterez pas.")).toBe(0);
  });

  it("repère un montant chiffré", () => {
    expect(contientMontant("Notre latte est à 6 €.")).toBe(true);
    expect(contientMontant("Le latte à 5,50€ est préparé à la commande.")).toBe(true);
    expect(contientMontant("Un café à 3 euros.")).toBe(true);
    expect(contientMontant("€6 le latte")).toBe(true);
    expect(contientMontant("Ouvert dès 8 h, 2 baristas, café de spécialité.")).toBe(false);
  });
});
