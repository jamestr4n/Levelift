// FRONTEND-OWNED. The player's own 3D kingdom: buy, place and upgrade buildings.
import { getCurrentPlayer, getKingdom } from "@/services";
import { KingdomView } from "@/components/kingdom/KingdomView";
import { Page } from "@/components/ui/Page";

export const dynamic = "force-dynamic";

export default async function KingdomPage() {
  const [kingdom, player] = await Promise.all([getKingdom(), getCurrentPlayer()]);

  return (
    <Page title="Kingdom" subtitle="Spend your workout rewards to build and upgrade.">
      <KingdomView kingdom={kingdom} player={player} />
    </Page>
  );
}
