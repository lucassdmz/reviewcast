import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiOutputError, validerAvecNouvelEssai } from "@/lib/ai/validate";

const schema = z.object({ phrase: z.string() });

describe("validation avec nouvel essai", () => {
  it("renvoie la sortie dès qu'elle est valide", async () => {
    const produire = vi.fn().mockResolvedValue({ phrase: "ok" });
    await expect(validerAvecNouvelEssai("meteo", schema, produire)).resolves.toEqual({ phrase: "ok" });
    expect(produire).toHaveBeenCalledTimes(1);
  });

  it("réessaie une fois en transmettant le motif d'échec", async () => {
    const produire = vi.fn().mockResolvedValueOnce({ phrase: 42 }).mockResolvedValueOnce({ phrase: "corrigé" });
    await expect(validerAvecNouvelEssai("meteo", schema, produire)).resolves.toEqual({ phrase: "corrigé" });
    expect(produire).toHaveBeenNthCalledWith(1, 1, null);
    expect(produire.mock.calls[1][0]).toBe(2);
    expect(produire.mock.calls[1][1]).toMatch(/phrase/);
  });

  it("échoue visiblement après deux sorties invalides", async () => {
    const produire = vi.fn().mockResolvedValue("pas du json");
    await expect(validerAvecNouvelEssai("meteo", schema, produire)).rejects.toBeInstanceOf(AiOutputError);
    expect(produire).toHaveBeenCalledTimes(2);
  });
});
