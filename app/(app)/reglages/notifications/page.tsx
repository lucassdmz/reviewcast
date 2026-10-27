import { Ecran } from "@/components/Ecran";
import { ReglageNotifications } from "@/components/reglages/ReglageNotifications";
import { clePubliquePush } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

/** Notifications : nouvel avis à traiter, résumé du lundi. Le choix vaut pour cet appareil. */
export default function NotificationsPage() {
  return (
    <Ecran titre="Notifications" retour={{ href: "/reglages", libelle: "Réglages" }}>
      <ReglageNotifications clePublique={clePubliquePush()} />
    </Ecran>
  );
}
