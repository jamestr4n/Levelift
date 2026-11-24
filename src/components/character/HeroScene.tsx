import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OutfitId } from "@/types/game";
import { usePrefersReducedMotion } from "@/components/ui/usePrefersReducedMotion";
import { HeroModel } from "./HeroModel";

function Pedestal() {
  return (
    <group>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[1.15, 1.28, 0.16, 8]} />
        <meshStandardMaterial color="#1f2330" roughness={0.6} metalness={0.3} flatShading />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.012, 6, 48]} />
        <meshStandardMaterial color="#e3b862" emissive="#c99a3e" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export default function HeroScene({ outfit }: { outfit: OutfitId }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.5, 4.6], fov: 34 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      fallback={<p className="p-6 text-center text-sm text-muted">Your browser can&apos;t show the 3D hero.</p>}
    >
      <hemisphereLight args={["#fff1d6", "#1a1c24", 0.7]} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} color="#ffe2b0" />
      <directionalLight position={[-3, 3, -4]} intensity={1.4} color="#e3b862" />

      <HeroModel outfit={outfit} animate={!reducedMotion} />
      <Pedestal />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={3} blur={2.4} far={2.5} frames={1} />

      <OrbitControls
        target={[0, 1.05, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.8}
        enableDamping
      />
    </Canvas>
  );
}
