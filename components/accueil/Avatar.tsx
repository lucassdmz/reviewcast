import { initiales } from "@/lib/etablissements/actif";

/** Rond d'initiales d'un client. La teinte suit sa note : vert content, jaune mitigé, gris à rassurer. */
export function Avatar({ auteur, note, className = "h-10 w-10 text-[13px]" }: { auteur: string; note: number; className?: string }) {
  const teinte = note >= 4 ? "bg-matcha-doux text-matcha" : note === 3 ? "bg-soleil-doux text-[#7a5d12]" : "bg-nuage text-encre-douce";
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-bold ${teinte} ${className}`}>
      {initiales(auteur)}
    </span>
  );
}
