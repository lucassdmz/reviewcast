/** Texte d'un avis avec le passage cité par l'IA mis en évidence. */
export function TexteSurligne({ texte, passage }: { texte: string; passage: string | null }) {
  if (!passage) return <>{texte}</>;
  const index = texte.toLowerCase().indexOf(passage.toLowerCase());
  if (index === -1) return <>{texte}</>;
  return (
    <>
      {texte.slice(0, index)}
      <mark className="rounded bg-soleil-doux px-0.5 text-encre">{texte.slice(index, index + passage.length)}</mark>
      {texte.slice(index + passage.length)}
    </>
  );
}
