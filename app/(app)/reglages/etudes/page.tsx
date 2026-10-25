import { Ecran } from "@/components/Ecran";
import { REPERES_ETUDES } from "@/lib/references/etudes";

/** Point d'information : ce que les études publiées disent de la réponse aux avis. */
export default function EtudesPage() {
  return (
    <Ecran titre="Pourquoi répondre" retour={{ href: "/reglages", libelle: "Réglages" }}>
      <p className="-mt-3 mb-4 px-1 text-[15px] leading-snug text-encre-douce">Ce que les études disent de la réponse aux avis, en six repères.</p>
      <ul className="space-y-3">
        {REPERES_ETUDES.map((r) => (
          <li key={r.cle} className="bloc">
            <p className="text-2xl font-bold leading-tight tracking-tight">{r.cle}</p>
            <p className="mt-1.5 text-[15px] leading-snug">{r.texte}</p>
            <p className="mt-2.5 text-[13px] text-encre-douce">{r.source}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 px-1 text-[13px] leading-snug text-encre-douce">
        Ces études portent surtout sur des hôtels. Elles donnent une tendance pour votre établissement, pas une garantie.
      </p>
    </Ecran>
  );
}
