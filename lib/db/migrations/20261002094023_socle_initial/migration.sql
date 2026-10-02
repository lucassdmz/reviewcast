-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('A_TRAITER', 'BROUILLON_PRET', 'PUBLIE', 'IGNORE');

-- CreateEnum
CREATE TYPE "sentiment" AS ENUM ('POSITIF', 'NEUTRE', 'MIXTE', 'NEGATIF');

-- CreateEnum
CREATE TYPE "gravite" AS ENUM ('FAIBLE', 'MOYENNE', 'FORTE');

-- CreateEnum
CREATE TYPE "polarite" AS ENUM ('POSITIF', 'NEGATIF', 'MIXTE');

-- CreateEnum
CREATE TYPE "origine_theme" AS ENUM ('TAXONOMIE', 'IA');

-- CreateEnum
CREATE TYPE "meteo" AS ENUM ('GRAND_SOLEIL', 'SOLEIL_VOILE', 'NUAGEUX', 'PLUIE_LEGERE');

-- CreateEnum
CREATE TYPE "fournisseur_ia" AS ENUM ('ANTHROPIC', 'OPENAI', 'OLLAMA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "google_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_account_id" TEXT NOT NULL,
    "google_account_name" TEXT,
    "refresh_token_encrypted" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "google_location_id" TEXT NOT NULL,
    "google_connection_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "google_review_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "texte" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL,
    "date_maj" TIMESTAMP(3) NOT NULL,
    "reponse_google_texte" TEXT,
    "reponse_google_date" TIMESTAMP(3),
    "statut" "review_status" NOT NULL DEFAULT 'A_TRAITER',
    "retire_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_analyses" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "sentiment" "sentiment" NOT NULL,
    "gravite" "gravite",
    "resume" TEXT NOT NULL,
    "passages_cles" TEXT[],
    "modele" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_analysis_themes" (
    "analysis_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "passage" TEXT,

    CONSTRAINT "review_analysis_themes_pkey" PRIMARY KEY ("analysis_id","theme_id")
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "consigne" TEXT,
    "modele" TEXT NOT NULL,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "polarite" "polarite" NOT NULL,
    "origine" "origine_theme" NOT NULL DEFAULT 'TAXONOMIE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_summaries" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "mois" DATE NOT NULL,
    "texte" TEXT,
    "meteo" "meteo" NOT NULL,
    "note_moyenne" DECIMAL(3,2) NOT NULL,
    "volume" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "ligne_de_conduite" TEXT,
    "exemples_reference" TEXT[],
    "seuil_grand_soleil_note" DECIMAL(3,2) NOT NULL DEFAULT 4.7,
    "seuil_grand_soleil_part" INTEGER NOT NULL DEFAULT 90,
    "seuil_soleil_voile_note" DECIMAL(3,2) NOT NULL DEFAULT 4.3,
    "seuil_nuageux_note" DECIMAL(3,2) NOT NULL DEFAULT 3.8,
    "inclure_quatre_etoiles" BOOLEAN NOT NULL DEFAULT true,
    "fournisseur_ia" "fournisseur_ia" NOT NULL DEFAULT 'ANTHROPIC',
    "modele_analyse" TEXT,
    "modele_redaction" TEXT,
    "cle_ia_chiffree" TEXT,
    "notifications_actives" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "google_connections_google_account_id_key" ON "google_connections"("google_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_google_location_id_key" ON "locations"("google_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_google_review_id_key" ON "reviews"("google_review_id");

-- CreateIndex
CREATE INDEX "reviews_location_id_date_creation_idx" ON "reviews"("location_id", "date_creation");

-- CreateIndex
CREATE INDEX "reviews_location_id_statut_idx" ON "reviews"("location_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "review_analyses_review_id_key" ON "review_analyses"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "drafts_review_id_version_key" ON "drafts"("review_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "themes_libelle_key" ON "themes"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_summaries_location_id_mois_key" ON "monthly_summaries"("location_id", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "settings_location_id_key" ON "settings"("location_id");

-- CreateIndex
CREATE INDEX "notes_review_id_idx" ON "notes"("review_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_google_connection_id_fkey" FOREIGN KEY ("google_connection_id") REFERENCES "google_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_analyses" ADD CONSTRAINT "review_analyses_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_analysis_themes" ADD CONSTRAINT "review_analysis_themes_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "review_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_analysis_themes" ADD CONSTRAINT "review_analysis_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_summaries" ADD CONSTRAINT "monthly_summaries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
