import { demarrerFauxGoogle } from "./faux-google";

/** Lancé par playwright.config.ts à côté de l'application. */
const port = Number(process.env.PORT_FAUX_GOOGLE ?? 4599);

demarrerFauxGoogle(port).then((g) => console.log(`Faux serveur Google : ${g.url}`));
