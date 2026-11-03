/** Réponse de la synchronisation d'ouverture. Illisible : on s'arrête, le prochain passage reprendra. */
export function lireReponseSynchro(donnees: unknown): { changements: number; restants: number } {
  if (typeof donnees !== "object" || donnees === null) return { changements: 0, restants: 0 };
  const { changements, restants } = donnees as { changements?: unknown; restants?: unknown };
  return { changements: typeof changements === "number" ? changements : 0, restants: typeof restants === "number" ? restants : 0 };
}
