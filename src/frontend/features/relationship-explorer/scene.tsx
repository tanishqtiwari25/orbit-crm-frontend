"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import type { Group } from "three";
function Network({ count }: { count: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.06;
  });
  return (
    <group ref={ref}>
      {Array.from({ length: Math.min(count + 1, 18) }, (_, i) => {
        const angle = i * 2.4;
        const radius = i === 0 ? 0 : 1.2 + (i % 3) * 0.25;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 0.7) * 0.7,
              Math.sin(angle) * radius,
            ]}
          >
            <icosahedronGeometry args={[i === 0 ? 0.4 : 0.12, 1]} />
            <meshStandardMaterial
              color={i === 0 ? "#e9a77b" : "#7cb7a1"}
              roughness={0.35}
              metalness={0.1}
            />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.008, 4, 80]} />
        <meshStandardMaterial color="#8eae9f" />
      </mesh>
    </group>
  );
}
export default function RelationshipScene({ count }: { count: number }) {
  return (
    <div
      className="relationship-canvas"
      role="img"
      aria-label={`Relationship constellation representing ${count} visible CRM records. The accessible record list is below.`}
    >
      <Canvas camera={{ position: [0, 1.2, 4.5], fov: 45 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[3, 4, 5]} intensity={2} />
          <Network count={count} />
        </Suspense>
      </Canvas>
    </div>
  );
}
