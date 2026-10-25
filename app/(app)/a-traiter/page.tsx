import { redirect } from "next/navigation";

/** La file vit dans le fil de l'accueil : les avis à relire y sont en tête. */
export default function ATraiterPage() {
  redirect("/");
}
