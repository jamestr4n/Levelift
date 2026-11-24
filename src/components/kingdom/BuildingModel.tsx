import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { BuildingType } from "@/types/game";

// Placeholder low-poly buildings made from primitives, each fitting in a
// 1 x 1 plot. Swap for .glb models from public/models/ when real art exists.

const STONE = "#8b8676";
const WOOD = "#7a5232";
const ROOF = "#9c3d2e";
const GOLD = "#e3b862";

function Mat({ color, emissive }: { color: string; emissive?: boolean }) {
  return (
    <meshStandardMaterial
      color={color}
      flatShading
      roughness={0.8}
      emissive={emissive ? color : "#000000"}
      emissiveIntensity={emissive ? 0.35 : 0}
    />
  );
}

function TownHall() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.8, 0.4, 0.8]} />
        <Mat color={STONE} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.42]} />
        <Mat color="#a49d89" />
      </mesh>
      <mesh position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.36, 0.38, 4]} />
        <Mat color={ROOF} />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.24, 4]} />
        <Mat color={WOOD} />
      </mesh>
      <mesh position={[0.07, 1.44, 0]}>
        <boxGeometry args={[0.13, 0.08, 0.01]} />
        <Mat color={GOLD} emissive />
      </mesh>
    </group>
  );
}

function House() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.55, 0.4, 0.5]} />
        <Mat color="#d8c9a8" />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.48, 0.32, 4]} />
        <Mat color={ROOF} />
      </mesh>
      <mesh position={[0, 0.12, 0.251]}>
        <boxGeometry args={[0.12, 0.22, 0.01]} />
        <Mat color={WOOD} />
      </mesh>
    </group>
  );
}

function Farm() {
  return (
    <group>
      {[-0.27, -0.09, 0.09, 0.27].map((x) => (
        <mesh key={x} position={[x, 0.04, 0.12]}>
          <boxGeometry args={[0.13, 0.08, 0.6]} />
          <Mat color={x < 0 ? "#c9a640" : "#8fa33f"} />
        </mesh>
      ))}
      <mesh position={[0.2, 0.17, -0.3]}>
        <boxGeometry args={[0.32, 0.34, 0.26]} />
        <Mat color="#9c3d2e" />
      </mesh>
      <mesh position={[0.2, 0.42, -0.3]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.25, 0.18, 4]} />
        <Mat color="#5a3a24" />
      </mesh>
    </group>
  );
}

function Workshop() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.7, 0.44, 0.5]} />
        <Mat color={WOOD} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.76, 0.1, 0.56]} />
        <Mat color="#4a4f5c" />
      </mesh>
      <mesh position={[0.22, 0.7, -0.1]}>
        <cylinderGeometry args={[0.06, 0.07, 0.36, 6]} />
        <Mat color={STONE} />
      </mesh>
      <mesh position={[-0.12, 0.2, 0.251]}>
        <boxGeometry args={[0.2, 0.18, 0.01]} />
        <Mat color={GOLD} emissive />
      </mesh>
    </group>
  );
}

const MODELS: Record<BuildingType, () => React.JSX.Element> = {
  town_hall: TownHall,
  house: House,
  farm: Farm,
  workshop: Workshop,
};

/** Higher levels are a little bigger and gain a gold trim ring. */
export function BuildingModel({
  type,
  level,
  animate,
}: {
  type: BuildingType;
  level: number;
  animate: boolean;
}) {
  const ref = useRef<Group>(null);
  const target = 0.85 + 0.12 * (level - 1);
  const Model = MODELS[type];

  // Grows in when first placed or upgraded.
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const current = group.scale.x;
    if (Math.abs(current - target) < 0.001) return;
    const next = animate ? current + (target - current) * Math.min(1, delta * 8) : target;
    group.scale.setScalar(next);
  });

  return (
    <group ref={ref} scale={animate ? 0.01 : target}>
      <Model />
      {level > 1 && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.015, 4, 32]} />
          <Mat color={GOLD} emissive />
        </mesh>
      )}
    </group>
  );
}
