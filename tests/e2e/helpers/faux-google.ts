/** Faux serveur Google et réglages partagés entre la configuration Playwright et les parcours. */
export const PORT_FAUX_GOOGLE = 4599;
export const URL_FAUX_GOOGLE = `http://127.0.0.1:${PORT_FAUX_GOOGLE}`;
export const AUDIENCE_PUSH = "https://eclaircie.test/api/google/notifications";
export const COMPTE_SERVICE_PUSH = "pubsub-push@eclaircie-test.iam.gserviceaccount.com";
export const SUJET_PUSH = "projects/eclaircie-test/topics/avis";

export const ENV_FAUX_GOOGLE = {
  GOOGLE_API_BASE_URL: URL_FAUX_GOOGLE,
  GOOGLE_OAUTH_BASE_URL: URL_FAUX_GOOGLE,
  GOOGLE_OIDC_JWKS_URL: `${URL_FAUX_GOOGLE}/oauth2/v3/certs`,
  GOOGLE_PUBSUB_TOPIC: SUJET_PUSH,
  GOOGLE_PUBSUB_AUDIENCE: AUDIENCE_PUSH,
  GOOGLE_PUBSUB_SERVICE_ACCOUNT: COMPTE_SERVICE_PUSH,
};
