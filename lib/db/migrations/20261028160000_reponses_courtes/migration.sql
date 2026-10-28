-- Réponses plus courtes par défaut : la longueur « Courte » devient la valeur de départ,
-- et les établissements existants y passent.
ALTER TABLE "settings" ALTER COLUMN "longueur" SET DEFAULT 'COURTE';
UPDATE "settings" SET "longueur" = 'COURTE' WHERE "longueur" = 'MOYENNE';

-- Les règles « Le prix » et « L'accueil » restées telles que proposées au départ
-- prennent la nouvelle version (assumer le prix, une seule excuse). Une règle
-- modifiée par l'établissement n'est pas touchée.
UPDATE "settings" s
SET "regles_sujets" = (
  SELECT jsonb_agg(
    CASE
      WHEN r->>'dire' = 'Le prix compte, surtout quand on vient souvent. Chaque boisson est préparée à la commande, avec des produits choisis avec soin.'
        AND r->>'nePasDire' = 'Que les prix sont affichés. Les fournisseurs, les charges, le loyer. Une promesse sur les tarifs.'
      THEN jsonb_set(jsonb_set(r,
        '{dire}', to_jsonb('Le prix compte, on le comprend. Il paie une boisson préparée à la commande, avec un café de spécialité et des produits choisis avec soin.'::text)),
        '{nePasDire}', to_jsonb('Un montant. Une excuse pour le prix. Que les prix sont affichés. Les fournisseurs, les charges, le loyer, une comparaison avec un autre commerce. Une promesse sur les tarifs.'::text))
      WHEN r->>'nePasDire' = 'Qui était là ce jour-là. Une explication ou une excuse pour l''équipe. Une promesse de sanction.'
      THEN jsonb_set(r, '{nePasDire}', to_jsonb('Plus d''une excuse. Qui était là ce jour-là. Une explication pour l''équipe. Une promesse de sanction.'::text))
      ELSE r
    END ORDER BY ord)
  FROM jsonb_array_elements(s."regles_sujets") WITH ORDINALITY AS t(r, ord)
)
WHERE jsonb_typeof(s."regles_sujets") = 'array' AND jsonb_array_length(s."regles_sujets") > 0;
