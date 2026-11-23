import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { OutfitId } from "@/types/game";
import { OUTFITS, SKIN } from "./outfits";

// Placeholder low-poly hero built from primitives (about 2 units tall).
// Swap for a .glb from public/models/ when real art exists.

function Mat({ color, metal = false }: { color: string; metal?: boolean }) {
  return <meshStandardMaterial color={color} flatShading roughness={metal ? 0.35 : 0.8} metalness={metal ? 0.6 : 0} />;
}

function Headgear({ outfit }: { outfit: OutfitId }) {
  const { accent, tunic } = OUTFITS[outfit];
  switch (outfit) {
    case "ranger":
      return (
        <mesh position={[0, 1.98, -0.02]}>
          <coneGeometry args={[0.31, 0.5, 6]} />
          <Mat color={tunic} />
        </mesh>
      );
    case "knight":
      return (
        <group position={[0, 1.86, 0]}>
          <mesh>
            <cylinderGeometry args={[0.27, 0.27, 0.36, 8]} />
            <Mat color="#a7b0bc" metal />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <boxGeometry args={[0.06, 0.18, 0.3]} />
            <Mat color={accent} metal />
          </mesh>
        </group>
      );
    case "mage":
      return (
        <group position={[0, 1.96, 0]}>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.04, 8]} />
            <Mat color={tunic} />
          </mesh>
          <mesh position={[0, 0.36, 0]} rotation={[0, 0, 0.08]}>
            <coneGeometry args={[0.28, 0.72, 8]} />
            <Mat color={tunic} />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh position={[0, 1.9, -0.02]} scale={[1, 0.65, 1]}>
          <icosahedronGeometry args={[0.255, 1]} />
          <Mat color="#4a3424" />
        </mesh>
      );
  }
}

export function HeroModel({ outfit, animate }: { outfit: OutfitId; animate: boolean }) {
  const group = useRef<Group>(null);
  const style = OUTFITS[outfit];
  const robe = outfit === "mage";

  useFrame(({ clock }) => {
    if (!animate || !group.current) return;
    group.current.position.y = Math.sin(clock.elapsedTime * 1.6) * 0.025;
  });

  return (
    <group ref={group}>
      {robe ? (
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.3, 0.48, 1.24, 6]} />
          <Mat color={style.tunic} />
        </mesh>
      ) : (
        [-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.42, 0]}>
            <boxGeometry args={[0.2, 0.84, 0.24]} />
            <Mat color={style.pants} />
          </mesh>
        ))
      )}

      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.78, 6]} />
        <Mat color={style.tunic} metal={outfit === "knight"} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.08, 6]} />
        <Mat color={style.accent} metal={outfit === "knight"} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.44, 1.2, 0]} rotation={[0, 0, side * 0.08]}>
          <mesh>
            <boxGeometry args={[0.16, 0.66, 0.18]} />
            <Mat color={style.sleeves} metal={outfit === "knight"} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <icosahedronGeometry args={[0.09, 0]} />
            <Mat color={SKIN} />
          </mesh>
        </group>
      ))}

      {outfit === "ranger" && (
        <mesh position={[0, 1.15, -0.22]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.62, 1.05, 0.04]} />
          <Mat color={style.accent} />
        </mesh>
      )}

      <mesh position={[0, 1.8, 0]}>
        <icosahedronGeometry args={[0.24, 1]} />
        <Mat color={SKIN} />
      </mesh>
      <Headgear outfit={outfit} />
    </group>
  );
}
