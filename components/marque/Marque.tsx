/** Mot-symbole : le nom en minuscules, suivi de « 晴れ間 » (éclaircie, en japonais). */
export function Marque({ taille = "base" }: { taille?: "base" | "grande" }) {
  return (
    <span className={`flex items-baseline gap-2 ${taille === "grande" ? "text-3xl" : "text-lg"}`}>
      <span className="font-black tracking-tight">éclaircie</span>
      <span lang="ja" aria-hidden="true" className={`font-normal ${taille === "grande" ? "text-base" : "text-xs"}`}>
        晴れ間
      </span>
    </span>
  );
}
