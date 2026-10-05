/** Note sur 5, lisible par un lecteur d'écran. */
export function Etoiles({ note }: { note: number }) {
  return (
    <span aria-label={`${note} étoile${note > 1 ? "s" : ""} sur 5`} className="whitespace-nowrap text-sm tracking-tight">
      <span aria-hidden="true" className="text-soleil">
        {"★".repeat(note)}
      </span>
      <span aria-hidden="true" className="text-ciel-fonce">
        {"★".repeat(5 - note)}
      </span>
    </span>
  );
}

export const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
