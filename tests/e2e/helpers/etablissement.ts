import { randomBytes } from "node:crypto";
import { PREFIXE_E2E, avecBase, idDeTest, utilisateurDeTest } from "./base";

export interface AvisACreer {
  note: number;
  /** Ancienneté de l'avis, en jours (dans la fenêtre de la file par défaut). */
  joursAvant?: number;
  /** Texte du brouillon : l'avis est alors « brouillon prêt à relire ». Sans brouillon, il reste hors file. */
  brouillon?: string;
}

export interface AvisDeTest {
  id: string;
  /** Unique par parcours : sert à retrouver la ligne de l'avis à l'écran. */
  auteur: string;
}

export interface EtablissementDeTest {
  id: string;
  avis: AvisDeTest[];
}

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Crée un établissement jetable avec ses avis (et leurs brouillons) pour un
 * parcours : chaque test a ses propres données, quel que soit l'état de la
 * démonstration et ce que les passages précédents ont publié.
 */
export async function creerEtablissementDeTest(avis: AvisACreer[]): Promise<EtablissementDeTest> {
  const cle = randomBytes(4).toString("hex");
  return avecBase(async (db) => {
    // Filet de sécurité : un passage interrompu n'a pas pu nettoyer derrière lui.
    await db.query(
      `DELETE FROM google_connections WHERE google_account_id LIKE $1 AND created_at < now() - interval '1 hour'`,
      [`${PREFIXE_E2E}%`],
    );

    const userId = await utilisateurDeTest(db);
    const connexionId = idDeTest();
    await db.query(
      `INSERT INTO google_connections (id, user_id, google_account_id, google_account_name, refresh_token_encrypted, scope, updated_at)
       VALUES ($1, $2, $3, 'Compte de test Playwright', 'e2e', 'e2e', now())`,
      [connexionId, userId, `${PREFIXE_E2E}${cle}`],
    );
    const locationId = idDeTest();
    await db.query(
      `INSERT INTO locations (id, google_location_id, google_connection_id, nom, updated_at)
       VALUES ($1, $2, $3, $4, now())`,
      [locationId, `${PREFIXE_E2E}${cle}`, connexionId, `Établissement de test ${cle}`],
    );

    const crees: AvisDeTest[] = [];
    for (const [i, a] of avis.entries()) {
      const id = idDeTest();
      const auteur = `Client ${cle}-${i + 1}`;
      const date = new Date(Date.now() - (a.joursAvant ?? 1) * JOUR_MS);
      await db.query(
        `INSERT INTO reviews (id, google_review_id, location_id, auteur, note, texte, date_creation, date_maj, statut, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, now())`,
        [
          id,
          `${PREFIXE_E2E}${cle}-${i + 1}`,
          locationId,
          auteur,
          a.note,
          "Commande arrivée avec une semaine de retard, personne ne m'a prévenu.",
          date,
          a.brouillon ? "BROUILLON_PRET" : "HORS_FILE",
        ],
      );
      if (a.brouillon) {
        await db.query(
          `INSERT INTO drafts (id, review_id, texte, version, modele) VALUES ($1, $2, $3, 1, 'fake')`,
          [idDeTest(), id, a.brouillon],
        );
      }
      crees.push({ id, auteur });
    }
    return { id: locationId, avis: crees };
  });
}

/**
 * Supprime l'établissement de test et tout ce qui en dépend (avis, brouillons,
 * notes, corrections, statistiques suivent par cascade), plus le journal
 * d'audit des actions faites sur ses avis.
 */
export async function supprimerEtablissementDeTest(etablissement: EtablissementDeTest): Promise<void> {
  await avecBase(async (db) => {
    await db.query(`DELETE FROM audit_logs WHERE cible = ANY($1::text[])`, [etablissement.avis.map((a) => a.id)]);
    await db.query(
      `DELETE FROM google_connections WHERE id = (SELECT google_connection_id FROM locations WHERE id = $1) AND google_account_id LIKE $2`,
      [etablissement.id, `${PREFIXE_E2E}%`],
    );
  });
}
