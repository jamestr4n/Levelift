import { useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { KingdomState, PlotPosition } from "@/types/game";
import { usePrefersReducedMotion } from "@/components/ui/usePrefersReducedMotion";
import { BuildingModel } from "./BuildingModel";

// Pointer travel (px) above which a click is treated as a camera drag.
const DRAG_THRESHOLD = 6;

function samePlot(a: PlotPosition | null, b: PlotPosition) {
  return a !== null && a.x === b.x && a.y === b.y;
}

function Plot({
  position,
  world,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  position: PlotPosition;
  world: [number, number];
  selected: boolean;
  hovered: boolean;
  onHover: (plot: PlotPosition | null) => void;
  onSelect: (plot: PlotPosition) => void;
}) {
  const color = selected ? "#e3b862" : hovered ? "#7d8f4e" : (position.x + position.y) % 2 ? "#4f6236" : "#56693a";

  return (
    <mesh
      position={[world[0], 0.04, world[1]]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(position);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta <= DRAG_THRESHOLD) onSelect(position);
      }}
    >
      <boxGeometry args={[0.94, 0.08, 0.94]} />
      <meshStandardMaterial
        color={color}
        flatShading
        roughness={0.9}
        emissive={selected ? "#c99a3e" : "#000000"}
        emissiveIntensity={selected ? 0.4 : 0}
      />
    </mesh>
  );
}

export default function KingdomScene({
  kingdom,
  selected,
  onSelect,
}: {
  kingdom: KingdomState;
  selected: PlotPosition | null;
  onSelect: (plot: PlotPosition) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState<PlotPosition | null>(null);
  const { gridWidth: w, gridHeight: h } = kingdom;
  const span = Math.max(w, h);

  // Plot (x, y) sits at world (x, z), centred on the origin.
  const toWorld = ({ x, y }: PlotPosition): [number, number] => [x - (w - 1) / 2, y - (h - 1) / 2];

  const plots: PlotPosition[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) plots.push({ x, y });

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [span * 1.3, span * 1.55, span * 1.75], fov: 36 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onPointerMissed={() => setHovered(null)}
      style={{ cursor: hovered ? "pointer" : undefined }}
      fallback={<p className="p-6 text-center text-sm text-muted">Your browser can&apos;t show the 3D kingdom.</p>}
    >
      <hemisphereLight args={["#fff1d6", "#1a1c24", 0.8]} />
      <directionalLight position={[4, 8, 5]} intensity={1.8} color="#ffe2b0" />
      <directionalLight position={[-5, 4, -3]} intensity={0.8} color="#e3b862" />

      {/* Island: grassy top on a rocky base. */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[span * 0.78, span * 0.62, 0.2, 10]} />
        <meshStandardMaterial color="#3e4d2c" flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[span * 0.62, span * 0.25, 0.8, 10]} />
        <meshStandardMaterial color="#4a4436" flatShading roughness={1} />
      </mesh>

      {plots.map((plot) => (
        <Plot
          key={`${plot.x},${plot.y}`}
          position={plot}
          world={toWorld(plot)}
          selected={samePlot(selected, plot)}
          hovered={samePlot(hovered, plot)}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}

      {kingdom.buildings.map((b) => {
        const [x, z] = toWorld(b.position);
        return (
          <group
            key={`${b.id}-${b.level}`}
            position={[x, 0.08, z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(b.position);
            }}
            onPointerOut={() => setHovered(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (e.delta <= DRAG_THRESHOLD) onSelect(b.position);
            }}
          >
            <BuildingModel type={b.type} level={b.level} animate={!reducedMotion} />
          </group>
        );
      })}

      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={span * 1.1}
        maxDistance={span * 3.2}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.6}
        enableDamping
      />
    </Canvas>
  );
}
