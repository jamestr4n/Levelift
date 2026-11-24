"use client";

import { useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { purchaseBuilding, upgradeBuilding } from "@/services";
import type { BuildingType, KingdomState, OwnedBuilding, PlayerProfile, PlotPosition } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ResourceBadge } from "@/components/ui/ResourceBadge";
import { Spinner } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/components/ui/errorMessage";
import { CoinIcon, MaterialsIcon } from "@/components/ui/icons";
import { BUILDABLE_TYPES, BUILDINGS, canAfford, upgradeCost } from "./catalog";

// WebGL only exists in the browser, so the scene is never server-rendered.
const KingdomScene = dynamic(() => import("./KingdomScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner className="h-8 w-8 text-gold-400" />
    </div>
  ),
});

type Wallet = Pick<PlayerProfile, "gold" | "materials">;

function Cost({ cost, wallet }: { cost: { gold: number; materials: number }; wallet: Wallet }) {
  return (
    <span className="inline-flex items-center gap-3 text-xs tabular-nums">
      <span className={`inline-flex items-center gap-1 ${wallet.gold < cost.gold ? "text-danger" : "text-parchment"}`}>
        <CoinIcon className="h-3.5 w-3.5 text-gold-400" />
        {cost.gold}
        <span className="sr-only">Gold</span>
      </span>
      <span
        className={`inline-flex items-center gap-1 ${wallet.materials < cost.materials ? "text-danger" : "text-parchment"}`}
      >
        <MaterialsIcon className="h-3.5 w-3.5 text-steel-300" />
        {cost.materials}
        <span className="sr-only">Materials</span>
      </span>
    </span>
  );
}

function plotLabel({ x, y }: PlotPosition) {
  return `plot ${x + 1}, ${y + 1}`;
}

export function KingdomView({ kingdom, player }: { kingdom: KingdomState; player: PlayerProfile }) {
  const router = useRouter();
  const toast = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<PlotPosition | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const buildingAt = (plot: PlotPosition | null): OwnedBuilding | undefined =>
    plot ? kingdom.buildings.find((b) => b.position.x === plot.x && b.position.y === plot.y) : undefined;
  const selectedBuilding = buildingAt(selected);
  const working = busy !== null || refreshing;

  function select(plot: PlotPosition) {
    setSelected(plot);
    setError(null);
    // On narrow screens the panel sits below the scene; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function run(key: string, action: () => Promise<{ player: PlayerProfile }>, success: (gained: number) => string) {
    setBusy(key);
    setError(null);
    try {
      const result = await action();
      toast(success(result.player.kingdomScore - player.kingdomScore), "success");
      startRefresh(() => router.refresh());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  function buy(type: BuildingType, position: PlotPosition) {
    const { name } = BUILDINGS[type];
    return run(
      type,
      () => purchaseBuilding({ type, position }),
      (gained) => `${name} built! +${gained} Kingdom Score`,
    );
  }

  function upgrade(building: OwnedBuilding) {
    const { name } = BUILDINGS[building.type];
    return run(
      "upgrade",
      () => upgradeBuilding(building.id),
      (gained) => `${name} upgraded to level ${building.level + 1}! +${gained} Kingdom Score`,
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div
        role="img"
        aria-label={`Your island kingdom with ${kingdom.buildings.length} building${kingdom.buildings.length === 1 ? "" : "s"}. Drag to rotate, tap a plot to select it. You can also use the plot map.`}
        className="relative h-[50dvh] min-h-80 touch-none overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/60 lg:h-[calc(100dvh-12rem)] lg:max-h-[40rem]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[15%] top-[20%] bottom-[15%] rounded-full bg-gold-500/10 blur-3xl"
        />
        <KingdomScene kingdom={kingdom} selected={selected} onSelect={select} />
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/70 px-3 py-1 text-xs text-muted">
          {kingdom.canEdit ? "Tap an empty plot to build" : "Tap a building to inspect it"}
        </p>
      </div>

      <div ref={panelRef} className="flex scroll-mt-4 flex-col gap-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-gold-400 uppercase">Kingdom score</p>
              <p className="font-display text-2xl text-gold-300 tabular-nums">{kingdom.kingdomScore}</p>
            </div>
            {kingdom.canEdit && (
              <div className="flex flex-wrap gap-2">
                <ResourceBadge resource="gold" amount={player.gold} />
                <ResourceBadge resource="materials" amount={player.materials} />
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title={
            !selected
              ? "Plot map"
              : selectedBuilding
                ? BUILDINGS[selectedBuilding.type].name
                : `Build on ${plotLabel(selected)}`
          }
          action={
            selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-muted hover:text-parchment"
              >
                Back to map
              </button>
            )
          }
        >
          {!selected && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {kingdom.canEdit
                  ? "Pick an empty plot to build on, or a building to upgrade it."
                  : "Pick a building to see what it is."}
              </p>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${kingdom.gridWidth}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: kingdom.gridHeight }, (_, y) =>
                  Array.from({ length: kingdom.gridWidth }, (_, x) => {
                    const b = buildingAt({ x, y });
                    const info = b && BUILDINGS[b.type];
                    return (
                      <button
                        key={`${x},${y}`}
                        type="button"
                        onClick={() => select({ x, y })}
                        disabled={!b && !kingdom.canEdit}
                        aria-label={`${plotLabel({ x, y })}: ${info ? `${info.name}, level ${b.level}` : "empty"}`}
                        className={`aspect-square rounded-md border text-[0.65rem] leading-tight transition-colors disabled:cursor-default disabled:opacity-40 ${
                          b
                            ? "border-gold-600/60 bg-gold-400/10 text-gold-300 hover:border-gold-400"
                            : "border-ink-600 bg-ink-900 text-muted hover:border-gold-500"
                        }`}
                      >
                        {info ? info.name.split(" ")[0] : "+"}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          )}

          {selected && !selectedBuilding && kingdom.canEdit && (
            <ul className="flex flex-col gap-2">
              {BUILDABLE_TYPES.map((type) => {
                const info = BUILDINGS[type];
                const cost = info.costs[0];
                const affordable = canAfford(player, cost);
                return (
                  <li
                    key={type}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-parchment">{info.name}</p>
                      <p className="text-xs text-muted">{info.blurb}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Cost cost={cost} wallet={player} />
                        <span className="text-xs text-gold-300">+{info.scoreByLevel[0]} score</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={affordable ? "primary" : "secondary"}
                      disabled={!affordable || working}
                      loading={busy === type}
                      onClick={() => buy(type, selected)}
                      aria-label={`Build ${info.name} on ${plotLabel(selected)}`}
                    >
                      Build
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedBuilding && (
            <BuildingDetails
              building={selectedBuilding}
              wallet={player}
              canEdit={kingdom.canEdit}
              loading={busy === "upgrade"}
              disabled={working}
              onUpgrade={() => upgrade(selectedBuilding)}
            />
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </Panel>

        {kingdom.canEdit && selected && !selectedBuilding && !BUILDABLE_TYPES.some((t) => canAfford(player, BUILDINGS[t].costs[0])) && (
          <p className="text-center text-sm text-muted">
            Short on resources?{" "}
            <Link href="/workouts" className="text-gold-300 hover:underline">
              Log a workout
            </Link>{" "}
            to earn Gold and Materials.
          </p>
        )}
      </div>
    </div>
  );
}

function BuildingDetails({
  building,
  wallet,
  canEdit,
  loading,
  disabled,
  onUpgrade,
}: {
  building: OwnedBuilding;
  wallet: Wallet;
  canEdit: boolean;
  loading: boolean;
  disabled: boolean;
  onUpgrade: () => void;
}) {
  const info = BUILDINGS[building.type];
  const cost = upgradeCost(building.type, building.level);
  const affordable = cost !== null && canAfford(wallet, cost);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{info.blurb}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-ink-900/70 p-2">
          <dt className="text-xs text-muted">Level</dt>
          <dd className="font-display text-lg text-parchment">
            {building.level}
            <span className="text-sm text-muted"> / {info.maxLevel}</span>
          </dd>
        </div>
        <div className="rounded-lg bg-ink-900/70 p-2">
          <dt className="text-xs text-muted">Score</dt>
          <dd className="font-display text-lg text-gold-300">{info.scoreByLevel[building.level - 1]}</dd>
        </div>
      </dl>

      {canEdit &&
        (cost ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900/70 p-3">
            <div>
              <p className="text-sm text-parchment">
                Upgrade to level {building.level + 1}
                <span className="text-muted"> · +{info.scoreByLevel[building.level] - info.scoreByLevel[building.level - 1]} score</span>
              </p>
              <div className="mt-1">
                <Cost cost={cost} wallet={wallet} />
              </div>
            </div>
            <Button
              size="sm"
              variant={affordable ? "primary" : "secondary"}
              disabled={!affordable || disabled}
              loading={loading}
              onClick={onUpgrade}
            >
              Upgrade
            </Button>
          </div>
        ) : (
          <p className="rounded-xl border border-gold-500/40 bg-gold-400/10 px-3 py-2 text-center text-sm text-gold-300">
            Max level reached
          </p>
        ))}
    </div>
  );
}
