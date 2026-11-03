import { describe, expect, it } from "vitest";
import { lireReponseSynchro } from "@/lib/google/synchro-reponse";

describe("réponse de la synchro d'ouverture", () => {
  it("s'arrête sur une réponse illisible", () => {
    expect(lireReponseSynchro(null)).toEqual({ changements: 0, restants: 0 });
    expect(lireReponseSynchro({ changements: "x" })).toEqual({ changements: 0, restants: 0 });
    expect(lireReponseSynchro({ changements: 2, restants: 1 })).toEqual({ changements: 2, restants: 1 });
  });
});
