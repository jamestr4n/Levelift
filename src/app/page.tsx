// FRONTEND-OWNED. Character hub (home screen). Placeholder until the 3D hero lands.
import { getCurrentPlayer } from "@/services";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { ResourceBadge } from "@/components/ui/ResourceBadge";
import { EmptyState } from "@/components/ui/States";
import { XpBar } from "@/components/ui/XpBar";

export const dynamic = "force-dynamic";

export default async function HeroPage() {
  const player = await getCurrentPlayer();

  return (
    <Page
      title={player.displayName}
      subtitle={`@${player.username}`}
      action={
        <div className="flex flex-wrap gap-2">
          <ResourceBadge resource="gold" amount={player.gold} />
          <ResourceBadge resource="materials" amount={player.materials} />
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <EmptyState title="Your hero awaits" description="The 3D character arrives in the next update." />
        </div>
        <Panel title="Progress">
          <XpBar level={player.level} xp={player.xp} xpToNextLevel={player.xpToNextLevel} />
          <p className="mt-4 text-sm text-muted">
            Kingdom score <span className="text-parchment tabular-nums">{player.kingdomScore}</span>
          </p>
        </Panel>
      </div>
    </Page>
  );
}
