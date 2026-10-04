'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  STATIONS,
  EXTRA_COLLIDERS,
  ROOM_BOUNDS,
  getStation,
  type StationDef,
  type StationKey,
} from './stations';
import { input, nav } from './controls';
import { gameManager, type GameItem, type FloatingText } from './gameState';
import styles from './DuckHouse.module.css';

export interface HouseSceneProps {
  paused: boolean;
  nearby: StationKey | null;
  onNearbyChange: (key: StationKey | null) => void;
  onArrive: (key: StationKey) => void;
  onStartMiniGame?: () => void;
}

type V3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const ALL_COLLIDERS: [number, number, number][] = [
  ...STATIONS.map((s) => s.collider),
  ...EXTRA_COLLIDERS,
];

/** Push a point out of every collider and keep it inside the room */
function resolvePoint(x: number, z: number, pad = 0.4): [number, number] {
  for (const [cx, cz, r] of ALL_COLLIDERS) {
    const ox = x - cx;
    const oz = z - cz;
    const d = Math.hypot(ox, oz);
    const min = r + pad;
    if (d < min) {
      const nx = d > 0.0001 ? ox / d : 0;
      const nz = d > 0.0001 ? oz / d : 1;
      x = cx + nx * min;
      z = cz + nz * min;
    }
  }
  return [
    clamp(x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX),
    clamp(z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ),
  ];
}

interface BoxProps {
  position: V3;
  size: V3;
  color: string;
  rotation?: V3;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
}

function Box({
  position,
  size,
  color,
  rotation,
  emissive,
  emissiveIntensity = 0,
  roughness = 0.8,
  metalness = 0,
}: BoxProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

interface CylProps {
  position: V3;
  args: [number, number, number, number?];
  color: string;
  rotation?: V3;
  emissive?: string;
  emissiveIntensity?: number;
}

function Cyl({ position, args, color, rotation, emissive, emissiveIntensity = 0 }: CylProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[args[0], args[1], args[2], args[3] ?? 24]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        roughness={0.7}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* The Duck                                                            */
/* ------------------------------------------------------------------ */

const DUCK_YELLOW = '#ffd23f';
const DUCK_WING = '#f4b400';
const BEAK = '#ff8c1a';

function Duck({ motion }: { motion: React.RefObject<{ moving: boolean }> }) {
  const inner = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lowerBeak = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const footL = useRef<THREE.Group>(null);
  const footR = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const moving = motion.current?.moving ?? false;
    const q = performance.now() / 1000 - input.quackAt;
    const quacking = q >= 0 && q < 0.5;

    if (moving) phase.current += dt * 14;

    if (inner.current) {
      const jump = quacking ? Math.sin((q / 0.5) * Math.PI) * 0.5 : 0;
      const bob = moving ? Math.abs(Math.sin(phase.current)) * 0.07 : Math.sin(t * 2) * 0.015;
      inner.current.position.y = jump + bob;
      const targetRoll = moving ? Math.sin(phase.current) * 0.14 : 0;
      inner.current.rotation.z = THREE.MathUtils.lerp(inner.current.rotation.z, targetRoll, 0.3);
    }
    if (head.current) {
      const look = moving ? 0 : Math.sin(t * 0.7) * 0.35;
      head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, look, 0.08);
      head.current.rotation.x = quacking ? -0.25 : THREE.MathUtils.lerp(head.current.rotation.x, 0, 0.15);
    }
    if (lowerBeak.current) {
      const open = quacking ? 0.35 + Math.abs(Math.sin(q * 30)) * 0.25 : 0;
      lowerBeak.current.rotation.x = THREE.MathUtils.lerp(lowerBeak.current.rotation.x, open, 0.5);
    }
    const flap = quacking ? Math.sin(q * 40) * 0.8 : moving ? Math.sin(phase.current * 2) * 0.12 : 0;
    if (wingL.current) wingL.current.rotation.z = 0.15 + Math.abs(flap);
    if (wingR.current) wingR.current.rotation.z = -0.15 - Math.abs(flap);
    const step = moving ? Math.sin(phase.current) * 0.7 : 0;
    if (footL.current) footL.current.rotation.x = step;
    if (footR.current) footR.current.rotation.x = -step;
  });

  return (
    <group ref={inner} scale={0.95}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} scale={[1, 0.85, 1.2]} castShadow>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color={DUCK_YELLOW} roughness={0.55} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.64, -0.5]} rotation={[-1.1, 0, 0]} castShadow>
        <coneGeometry args={[0.15, 0.32, 16]} />
        <meshStandardMaterial color={DUCK_YELLOW} roughness={0.55} />
      </mesh>
      {/* Wings */}
      <mesh ref={wingL} position={[0.38, 0.55, -0.02]} scale={[0.35, 0.7, 1.1]} castShadow>
        <sphereGeometry args={[0.24, 20, 20]} />
        <meshStandardMaterial color={DUCK_WING} roughness={0.6} />
      </mesh>
      <mesh ref={wingR} position={[-0.38, 0.55, -0.02]} scale={[0.35, 0.7, 1.1]} castShadow>
        <sphereGeometry args={[0.24, 20, 20]} />
        <meshStandardMaterial color={DUCK_WING} roughness={0.6} />
      </mesh>

      {/* Head */}
      <group ref={head} position={[0, 0.98, 0.3]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color={DUCK_YELLOW} roughness={0.55} />
        </mesh>
        {/* Eyes */}
        {[0.13, -0.13].map((x) => (
          <group key={x} position={[x, 0.07, 0.24]}>
            <mesh>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.2} />
            </mesh>
            <mesh position={[0.015, 0.02, 0.045]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {/* Cheeks */}
        {[0.2, -0.2].map((x) => (
          <mesh key={x} position={[x, -0.05, 0.19]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#ff9b85" roughness={0.9} />
          </mesh>
        ))}
        {/* Beak */}
        <mesh position={[0, -0.04, 0.33]} castShadow>
          <boxGeometry args={[0.26, 0.07, 0.24]} />
          <meshStandardMaterial color={BEAK} roughness={0.5} />
        </mesh>
        <group ref={lowerBeak} position={[0, -0.08, 0.23]}>
          <mesh position={[0, 0, 0.09]}>
            <boxGeometry args={[0.22, 0.05, 0.2]} />
            <meshStandardMaterial color="#e86f00" roughness={0.5} />
          </mesh>
        </group>
        {/* Dev cap */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <sphereGeometry args={[0.31, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
          <meshStandardMaterial color="#2563eb" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.13, 0.28]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.03, 0.26]} />
          <meshStandardMaterial color="#1e40af" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      </group>

      {/* Feet */}
      {[
        { x: 0.15, ref: footL },
        { x: -0.15, ref: footR },
      ].map(({ x, ref }) => (
        <group key={x} ref={ref} position={[x, 0.2, 0.02]}>
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.18, 8]} />
            <meshStandardMaterial color={BEAK} />
          </mesh>
          <mesh position={[0, -0.18, 0.07]} castShadow>
            <boxGeometry args={[0.18, 0.04, 0.26]} />
            <meshStandardMaterial color={BEAK} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Room                                                                */
/* ------------------------------------------------------------------ */

function WindowFrame({ x }: { x: number }) {
  return (
    <group position={[x, 2.3, -5.97]}>
      <mesh>
        <boxGeometry args={[1.8, 1.4, 0.08]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial color="#9ed8ff" emissive="#8fd0ff" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[0.06, 1.2, 0.03]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[1.6, 0.06, 0.03]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      {/* little cloud */}
      <mesh position={[-0.35, 0.25, 0.06]}>
        <circleGeometry args={[0.13, 20]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.18, 0.28, 0.06]}>
        <circleGeometry args={[0.17, 20]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* sill */}
      <Box position={[0, -0.78, 0.12]} size={[2, 0.08, 0.3]} color="#e9d5b5" />
    </group>
  );
}

function Plant({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Cyl position={[0, 0.3, 0]} args={[0.35, 0.26, 0.6]} color="#c2410c" />
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#3a7d44" roughness={0.9} />
      </mesh>
      <mesh position={[0.25, 1.3, 0.1]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#4f9d5a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 1.35, -0.1]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#5cb26b" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Room({ onFloorClick }: { onFloorClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const planks = useMemo(() => Array.from({ length: 19 }, (_, i) => -7.2 + i * 0.8), []);

  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#c08552" roughness={0.85} />
      </mesh>
      {planks.map((x) => (
        <mesh key={x} position={[x, 0.002, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.03, 12]} />
          <meshBasicMaterial color="#9a6239" />
        </mesh>
      ))}

      {/* Rug */}
      <mesh position={[0, 0.006, 1]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#f2cc8f" roughness={1} />
      </mesh>
      <mesh position={[0, 0.008, 1]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.95, 2.15, 48]} />
        <meshStandardMaterial color="#e07a5f" roughness={1} />
      </mesh>
      <mesh position={[0, 0.008, 1]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.2, 1.3, 48]} />
        <meshStandardMaterial color="#81b29a" roughness={1} />
      </mesh>

      {/* Walls */}
      <Box position={[0, 2, -6.15]} size={[16.6, 4, 0.3]} color="#f4e4c6" />
      <Box position={[0, 0.5, -5.98]} size={[16, 1, 0.06]} color="#c99a6b" />
      <Box position={[0, 1.02, -5.95]} size={[16, 0.06, 0.1]} color="#8d5a34" />
      <Box position={[-8.15, 2, 0]} size={[0.3, 4, 12.6]} color="#ecd8b6" />
      <Box position={[-7.98, 0.5, 0]} size={[0.06, 1, 12]} color="#c99a6b" />
      <Box position={[8.15, 2, 0]} size={[0.3, 4, 12.6]} color="#ecd8b6" />
      <Box position={[7.98, 0.5, 0]} size={[0.06, 1, 12]} color="#c99a6b" />
      {/* Roof beams */}
      <Box position={[0, 4.05, -6]} size={[16.6, 0.25, 0.5]} color="#7a4a2a" />
      <Box position={[-8.1, 4.05, 0]} size={[0.5, 0.25, 12.6]} color="#7a4a2a" />
      <Box position={[8.1, 4.05, 0]} size={[0.5, 0.25, 12.6]} color="#7a4a2a" />

      <WindowFrame x={-2.7} />
      <WindowFrame x={3.0} />

      {/* Wall sign */}
      <Html
        position={[0, 3.45, -5.95]}
        transform
        distanceFactor={5}
        zIndexRange={[5, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className={styles.wallSign}>🦆 Nhà của Vịt Vũ</div>
      </Html>

      <Plant position={[-7.1, 0, 4.8]} />
      <Plant position={[7.1, 0, 4.8]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Furniture per station                                               */
/* ------------------------------------------------------------------ */

function LivingRoom() {
  return (
    <group>
      {/* Sofa */}
      <Box position={[-5, 0.3, -4.9]} size={[2.8, 0.6, 1.1]} color="#d1495b" />
      <Box position={[-5, 0.9, -5.35]} size={[2.8, 0.9, 0.3]} color="#c03a4c" />
      <Box position={[-6.35, 0.55, -4.9]} size={[0.25, 0.75, 1.1]} color="#b02e40" />
      <Box position={[-3.65, 0.55, -4.9]} size={[0.25, 0.75, 1.1]} color="#b02e40" />
      <Box position={[-5.6, 0.68, -4.8]} size={[1.1, 0.16, 0.8]} color="#edae49" />
      <Box position={[-4.4, 0.68, -4.8]} size={[1.1, 0.16, 0.8]} color="#edae49" />
      {/* Duck plushie on sofa */}
      <mesh position={[-4.2, 0.95, -4.95]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={DUCK_YELLOW} />
      </mesh>
      <mesh position={[-4.2, 1.18, -4.88]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color={DUCK_YELLOW} />
      </mesh>
      <mesh position={[-4.2, 1.16, -4.75]}>
        <boxGeometry args={[0.08, 0.03, 0.08]} />
        <meshStandardMaterial color={BEAK} />
      </mesh>
      {/* Coffee table */}
      <Box position={[-5, 0.45, -3.4]} size={[1.4, 0.08, 0.7]} color="#6b4226" />
      {[
        [-5.6, -3.15],
        [-4.4, -3.15],
        [-5.6, -3.65],
        [-4.4, -3.65],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} position={[x, 0.2, z]} size={[0.07, 0.42, 0.07]} color="#4a2c17" />
      ))}
      <Cyl position={[-4.7, 0.56, -3.4]} args={[0.08, 0.07, 0.15]} color="#fefae0" />
      <Box position={[-5.3, 0.5, -3.35]} size={[0.4, 0.04, 0.3]} color="#2a9d8f" />
      {/* Picture frame */}
      <Box position={[-5, 2.5, -5.96]} size={[1.7, 1.15, 0.06]} color="#6b4226" />
      <mesh position={[-5, 2.5, -5.92]}>
        <planeGeometry args={[1.45, 0.9]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <mesh position={[-5.1, 2.42, -5.91]}>
        <circleGeometry args={[0.22, 24]} />
        <meshStandardMaterial color={DUCK_YELLOW} />
      </mesh>
      <mesh position={[-4.92, 2.62, -5.91]}>
        <circleGeometry args={[0.14, 24]} />
        <meshStandardMaterial color={DUCK_YELLOW} />
      </mesh>
      <mesh position={[-4.75, 2.6, -5.905]}>
        <circleGeometry args={[0.06, 3]} />
        <meshStandardMaterial color={BEAK} />
      </mesh>
      {/* Floor lamp */}
      <Cyl position={[-7.2, 0.03, -5.2]} args={[0.25, 0.25, 0.06]} color="#3d2b1f" />
      <Cyl position={[-7.2, 0.9, -5.2]} args={[0.03, 0.03, 1.8]} color="#3d2b1f" />
      <mesh position={[-7.2, 1.9, -5.2]}>
        <coneGeometry args={[0.38, 0.45, 24, 1, true]} />
        <meshStandardMaterial
          color="#ffe8b0"
          emissive="#ffb347"
          emissiveIntensity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[-7.2, 1.7, -5]} intensity={5} distance={5} color="#ffb347" />
    </group>
  );
}

function Rollers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, dt) => {
    refs.current.forEach((m, i) => {
      if (m) m.rotation.y += dt * (3 + i);
    });
  });
  const colors = ['#00b4d8', '#d81b60', '#ffd60a'];
  return (
    <group>
      {colors.map((c, i) => (
        <group key={c} position={[-6.25, 0.45 + i * 0.3, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            ref={(el) => {
              refs.current[i] = el;
            }}
            castShadow
          >
            <cylinderGeometry args={[0.12, 0.12, 1.9, 20]} />
            <meshStandardMaterial color={c} roughness={0.3} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BlinkLed({ position, color, speed = 3, offset = 0 }: { position: V3; color: string; speed?: number; offset?: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) {
      mat.current.emissiveIntensity = Math.sin(clock.elapsedTime * speed + offset) > 0 ? 2.2 : 0.2;
    }
  });
  return (
    <mesh position={position}>
      <boxGeometry args={[0.06, 0.06, 0.02]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1} />
    </mesh>
  );
}

function PrintWorkshop() {
  return (
    <group>
      {/* Machine body */}
      <Box position={[-7.1, 0.6, 1.8]} size={[1.4, 1.2, 2.3]} color="#3d5a80" metalness={0.2} roughness={0.5} />
      <Box position={[-7.1, 1.25, 1.8]} size={[1.3, 0.1, 2.1]} color="#293241" />
      <Rollers />
      {/* Paper coming out */}
      <mesh position={[-5.95, 0.3, 1.8]} rotation={[-Math.PI / 2, 0, 0.35]} receiveShadow>
        <planeGeometry args={[0.6, 1.5]} />
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      {/* Control panel */}
      <Box position={[-6.6, 1.5, 0.75]} size={[0.5, 0.45, 0.1]} color="#1f2937" rotation={[0, Math.PI / 2, 0]} />
      <BlinkLed position={[-6.54, 1.58, 0.65]} color="#22c55e" speed={4} />
      <BlinkLed position={[-6.54, 1.58, 0.85]} color="#f59e0b" speed={2.5} offset={1} />
      {/* Carton stack */}
      <Box position={[-7.2, 0.3, 3.8]} size={[0.9, 0.6, 0.9]} color="#c9a26b" />
      <Box position={[-7.15, 0.85, 3.75]} size={[0.75, 0.5, 0.75]} color="#b88c55" />
      <Box position={[-7.2, 1.3, 3.8]} size={[0.6, 0.4, 0.6]} color="#d4b07a" />
      {/* Label rolls */}
      <Cyl position={[-7.3, 0.18, 0.2]} args={[0.22, 0.22, 0.36]} color="#f8fafc" />
      <Cyl position={[-6.8, 0.18, 0.1]} args={[0.18, 0.18, 0.36]} color="#fde68a" />
    </group>
  );
}

function CodeScreen({ position, color }: { position: V3; color: string }) {
  const lines = [0.6, 0.85, 0.45, 0.7, 0.55];
  return (
    <group position={position}>
      <Box position={[0, 0, 0]} size={[0.95, 0.6, 0.05]} color="#111827" />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.86, 0.5]} />
        <meshStandardMaterial color="#0b1220" emissive="#0b1220" />
      </mesh>
      {lines.map((w, i) => (
        <mesh key={i} position={[-0.38 + (w * 0.7) / 2 + (i % 2) * 0.06, 0.18 - i * 0.09, 0.035]}>
          <planeGeometry args={[w * 0.7, 0.035]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

function TechLab() {
  const orb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (orb.current) {
      orb.current.position.y = 1.95 + Math.sin(clock.elapsedTime * 2) * 0.1;
      orb.current.rotation.y = clock.elapsedTime;
    }
  });
  return (
    <group>
      {/* Desk */}
      <Box position={[4.8, 0.8, -5.1]} size={[2.6, 0.08, 1.1]} color="#8d6e63" />
      {[
        [3.6, -5.55],
        [6.0, -5.55],
        [3.6, -4.65],
        [6.0, -4.65],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} position={[x, 0.38, z]} size={[0.08, 0.76, 0.08]} color="#5d4037" />
      ))}
      <CodeScreen position={[4.3, 1.35, -5.35]} color="#38bdf8" />
      <CodeScreen position={[5.35, 1.35, -5.35]} color="#a78bfa" />
      <Box position={[4.3, 0.95, -5.4]} size={[0.06, 0.25, 0.06]} color="#374151" />
      <Box position={[5.35, 0.95, -5.4]} size={[0.06, 0.25, 0.06]} color="#374151" />
      <Box position={[4.8, 0.86, -4.8]} size={[0.9, 0.03, 0.3]} color="#e5e7eb" />
      <Box position={[5.45, 0.86, -4.8]} size={[0.15, 0.03, 0.22]} color="#e5e7eb" />
      {/* Coffee mug */}
      <Cyl position={[3.8, 0.92, -4.9]} args={[0.07, 0.06, 0.16]} color="#ef4444" />
      {/* Chair */}
      <Box position={[4.8, 0.5, -4.05]} size={[0.7, 0.1, 0.65]} color="#264653" />
      <Box position={[4.8, 0.85, -3.75]} size={[0.7, 0.6, 0.08]} color="#264653" />
      <Cyl position={[4.8, 0.25, -4.05]} args={[0.04, 0.04, 0.45]} color="#111827" />
      <Cyl position={[4.8, 0.03, -4.05]} args={[0.32, 0.32, 0.05]} color="#111827" />
      {/* AI orb (Gemini) */}
      <mesh ref={orb} position={[3.7, 1.95, -5.2]}>
        <icosahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={1.8} flatShading />
      </mesh>
      <pointLight position={[4.8, 1.6, -4.8]} intensity={4} distance={4} color="#7dd3fc" />
      {/* Server rack */}
      <Box position={[7, 0.9, -5.2]} size={[0.8, 1.8, 0.8]} color="#1f2937" metalness={0.3} roughness={0.5} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <BlinkLed
          key={i}
          position={[6.7 + (i % 2) * 0.12, 0.4 + i * 0.24, -4.79]}
          color={i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#38bdf8' : '#f59e0b'}
          speed={2 + i}
          offset={i}
        />
      ))}
    </group>
  );
}

function ErpShelf() {
  const boxes: { pos: V3; size: V3; color: string }[] = [
    { pos: [7.4, 0.32, 0.9], size: [0.55, 0.38, 0.6], color: '#c9a26b' },
    { pos: [7.4, 0.32, 1.6], size: [0.55, 0.38, 0.55], color: '#34d399' },
    { pos: [7.4, 0.3, 2.4], size: [0.55, 0.34, 0.6], color: '#b88c55' },
    { pos: [7.4, 1.16, 1.0], size: [0.55, 0.36, 0.7], color: '#60a5fa' },
    { pos: [7.4, 1.16, 2.1], size: [0.55, 0.4, 0.8], color: '#c9a26b' },
    { pos: [7.4, 2.0, 0.85], size: [0.55, 0.34, 0.5], color: '#f472b6' },
    { pos: [7.4, 2.0, 1.6], size: [0.55, 0.38, 0.6], color: '#d4b07a' },
    { pos: [7.4, 2.0, 2.4], size: [0.55, 0.3, 0.5], color: '#fbbf24' },
  ];
  const screen = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!screen.current) return;
    screen.current.children.forEach((c, i) => {
      c.scale.y = 0.4 + Math.abs(Math.sin(clock.elapsedTime * 1.5 + i)) * 0.9;
    });
  });
  return (
    <group>
      {/* Shelf frame */}
      <Box position={[7.45, 1.3, 0.45]} size={[0.7, 2.6, 0.08]} color="#6d4c41" />
      <Box position={[7.45, 1.3, 2.95]} size={[0.7, 2.6, 0.08]} color="#6d4c41" />
      {[0.1, 0.95, 1.8, 2.6].map((y) => (
        <Box key={y} position={[7.45, y, 1.7]} size={[0.7, 0.06, 2.5]} color="#795548" />
      ))}
      {boxes.map((b, i) => (
        <Box key={i} position={b.pos} size={b.size} color={b.color} />
      ))}
      {/* Barcode stickers */}
      {boxes.slice(0, 5).map((b, i) => (
        <mesh key={`bc${i}`} position={[b.pos[0] - b.size[0] / 2 - 0.005, b.pos[1], b.pos[2]]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.22, 0.12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* ERP kiosk */}
      <Cyl position={[6.3, 0.03, 3.7]} args={[0.3, 0.3, 0.06]} color="#1f2937" />
      <Cyl position={[6.3, 0.6, 3.7]} args={[0.05, 0.05, 1.1]} color="#374151" />
      <group position={[6.3, 1.3, 3.7]} rotation={[0, -Math.PI / 2.4, 0]}>
        <Box position={[0, 0, 0]} size={[0.85, 0.6, 0.06]} color="#111827" />
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[0.76, 0.5]} />
          <meshStandardMaterial color="#022c22" emissive="#022c22" />
        </mesh>
        <group ref={screen} position={[0, -0.18, 0.04]}>
          {[-0.27, -0.13, 0.01, 0.15, 0.29].map((x) => (
            <mesh key={x} position={[x, 0.12, 0]}>
              <planeGeometry args={[0.08, 0.24]} />
              <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={1.5} />
            </mesh>
          ))}
        </group>
      </group>
      <pointLight position={[6, 1.4, 3.3]} intensity={2.5} distance={3} color="#34d399" />
    </group>
  );
}

function DoorMailbox() {
  const env = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (env.current) {
      env.current.position.y = 1.85 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
      env.current.rotation.y = Math.sin(clock.elapsedTime) * 0.5;
    }
  });
  return (
    <group>
      {/* Door */}
      <Box position={[0, 1.3, -5.97]} size={[1.7, 2.7, 0.1]} color="#5d4037" />
      <Box position={[0, 1.22, -5.92]} size={[1.4, 2.45, 0.08]} color="#a47148" />
      <Box position={[0, 1.7, -5.87]} size={[1.1, 0.9, 0.02]} color="#8d5f3a" />
      <Box position={[0, 0.65, -5.87]} size={[1.1, 0.8, 0.02]} color="#8d5f3a" />
      <mesh position={[0.5, 1.2, -5.85]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Doormat */}
      <mesh position={[0, 0.012, -5.3]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1.6, 0.8]} />
        <meshStandardMaterial color="#a5714b" roughness={1} />
      </mesh>
      {/* Mailbox */}
      <Cyl position={[1.5, 0.5, -5.2]} args={[0.05, 0.05, 1]} color="#4b5563" />
      <Box position={[1.5, 1.1, -5.2]} size={[0.45, 0.4, 0.7]} color="#e63946" />
      <mesh position={[1.5, 1.3, -5.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.225, 0.225, 0.7, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#e63946" />
      </mesh>
      <Box position={[1.76, 1.35, -5.05]} size={[0.03, 0.35, 0.06]} color="#fbbf24" />
      <Box position={[1.76, 1.5, -4.95]} size={[0.03, 0.12, 0.2]} color="#fbbf24" />
      {/* Floating envelope */}
      <group ref={env} position={[1.5, 1.85, -5.2]}>
        <Box position={[0, 0, 0]} size={[0.5, 0.32, 0.03]} color="#ffffff" />
        <mesh position={[0, 0.04, 0.02]} rotation={[0, 0, Math.PI]}>
          <circleGeometry args={[0.2, 3]} />
          <meshStandardMaterial color="#fbcfe8" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.02, 0.025]}>
          <circleGeometry args={[0.05, 16]} />
          <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

const FURNITURE: Record<StationKey, React.FC> = {
  overview: LivingRoom,
  experience: PrintWorkshop,
  skills: TechLab,
  projects: ErpShelf,
  contact: DoorMailbox,
};

/* ------------------------------------------------------------------ */
/* Station wrapper (click target + ring + label)                       */
/* ------------------------------------------------------------------ */

function InteractRing({ def, active }: { def: StationDef; active: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mat.current) mat.current.opacity = active ? 0.9 : 0.35 + Math.sin(t * 3) * 0.15;
    if (grp.current) grp.current.scale.setScalar(active ? 1.15 + Math.sin(t * 6) * 0.05 : 1);
  });
  return (
    <group ref={grp} position={[def.interact[0], 0.02, def.interact[1]]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.64, 40]} />
        <meshBasicMaterial ref={mat} color={def.color} transparent opacity={0.4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.004}>
        <circleGeometry args={[0.5, 40]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function Station({ def, active }: { def: StationDef; active: boolean }) {
  const Furniture = FURNITURE[def.key];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    nav.target = def.interact;
    nav.pending = def.key;
  };

  return (
    <group>
      <group
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <Furniture />
      </group>
      <InteractRing def={def} active={active} />
      <Html
        position={def.labelAt}
        center
        distanceFactor={11}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`${styles.label} ${active ? styles.labelActive : ''}`}
          style={{ '--accent': def.color } as React.CSSProperties}
        >
          <span>{def.emoji}</span>
          <span>{def.label}</span>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Mini Game 3D Meshes & Collectibles                                 */
/* ------------------------------------------------------------------ */

function CornMesh({ item }: { item: GameItem }) {
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (grp.current) {
      grp.current.rotation.y = clock.elapsedTime * 2.8;
      grp.current.position.y = 0.45 + Math.sin(clock.elapsedTime * 4 + item.x) * 0.08;
    }
  });

  return (
    <group ref={grp} position={[item.x, 0.45, item.z]} scale={item.scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[-0.08, -0.15, 0]} rotation={[0, 0, 0.35]}>
        <coneGeometry args={[0.09, 0.32, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, -0.15, 0]} rotation={[0, 0, -0.35]}>
        <coneGeometry args={[0.09, 0.32, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
      <pointLight color="#fbbf24" intensity={2} distance={1.8} />
    </group>
  );
}

function BugMesh({ item }: { item: GameItem }) {
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (grp.current) {
      grp.current.rotation.y = Math.sin(clock.elapsedTime * 2 + item.z) * 0.8;
      grp.current.position.y = 0.3 + Math.abs(Math.sin(clock.elapsedTime * 7 + item.x)) * 0.12;
    }
  });

  return (
    <group ref={grp} position={[item.x, 0.3, item.z]} scale={item.scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#0284c7" emissive="#38bdf8" emissiveIntensity={0.8} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.05, 0.18]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#0369a1" />
      </mesh>
      {/* Antennae */}
      <mesh position={[0.05, 0.2, 0.2]} rotation={[0.4, 0, 0.3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 6]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[-0.05, 0.2, 0.2]} rotation={[0.4, 0, -0.3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16, 6]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.5} />
      </mesh>
      <pointLight color="#38bdf8" intensity={2.5} distance={2} />
    </group>
  );
}

function StarMesh({ item }: { item: GameItem }) {
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (grp.current) {
      grp.current.rotation.x = clock.elapsedTime * 2;
      grp.current.rotation.y = clock.elapsedTime * 2.5;
      grp.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 4) * 0.12;
    }
  });

  return (
    <group ref={grp} position={[item.x, 0.5, item.z]} scale={item.scale}>
      <mesh castShadow>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={2} roughness={0.2} />
      </mesh>
      <pointLight color="#c084fc" intensity={3} distance={2.5} />
    </group>
  );
}

function CoffeeMesh({ item }: { item: GameItem }) {
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (grp.current) {
      grp.current.rotation.y = clock.elapsedTime * 1.5;
      grp.current.position.y = 0.38 + Math.sin(clock.elapsedTime * 3) * 0.06;
    }
  });

  return (
    <group ref={grp} position={[item.x, 0.38, item.z]} scale={item.scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.26, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
        <meshStandardMaterial color="#fef08a" />
      </mesh>
      <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.07, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <pointLight color="#f87171" intensity={1.5} distance={1.5} />
    </group>
  );
}

function ArcadeCabinet({ onStartGame }: { onStartGame: () => void }) {
  return (
    <group
      position={[-6.8, 0, 4.3]}
      rotation={[0, Math.PI / 4, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onStartGame();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <Box position={[0, 0.8, 0]} size={[0.8, 1.6, 0.7]} color="#1e1b4b" metalness={0.2} roughness={0.6} />
      <Box position={[0, 1.15, 0.12]} size={[0.65, 0.55, 0.1]} color="#0f172a" rotation={[-0.35, 0, 0]} />
      <mesh position={[0, 1.17, 0.18]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.55, 0.42]} />
        <meshStandardMaterial color="#0284c7" emissive="#38bdf8" emissiveIntensity={1.8} />
      </mesh>
      <Box position={[0, 1.65, 0.1]} size={[0.78, 0.22, 0.35]} color="#f59e0b" emissive="#fbbf24" emissiveIntensity={0.6} />
      <Cyl position={[-0.15, 0.88, 0.28]} args={[0.015, 0.015, 0.12]} color="#ffffff" />
      <mesh position={[-0.15, 0.95, 0.28]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <Html position={[0, 2.15, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1.5px solid #fbbf24',
          color: '#fbbf24',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          boxShadow: '0 0 12px rgba(251, 191, 36, 0.4)'
        }}>
          🎮 Máy Chơi Mini Game
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* World: lights + room + duck controller + follow camera              */
/* ------------------------------------------------------------------ */

function World({ paused, nearby, onNearbyChange, onArrive, onStartMiniGame }: HouseSceneProps) {
  const [, setGameTick] = React.useState(0);
  React.useEffect(() => {
    return gameManager.subscribe(() => setGameTick((t) => t + 1));
  }, []);

  const duckRef = useRef<THREE.Group>(null);
  const motion = useRef({ moving: false });
  const lastNearby = useRef<StationKey | null>(null);
  const look = useRef(new THREE.Vector3(0, 0.5, 0));
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const marker = useRef<THREE.Group>(null);
  const markerMat = useRef<THREE.MeshBasicMaterial>(null);
  const markerAge = useRef(10);

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (paused) return;
    const [x, z] = resolvePoint(e.point.x, e.point.z);
    nav.target = [x, z];
    nav.pending = null;
    markerAge.current = 0;
    marker.current?.position.set(x, 0.03, z);
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const duck = duckRef.current;
    if (!duck) return;
    const p = duck.position;

    if (nav.teleport) {
      p.x = nav.teleport[0];
      p.z = nav.teleport[1];
      nav.teleport = null;
      nav.target = null;
      nav.pending = null;
    }

    let dx = 0;
    let dz = 0;
    if (!paused) {
      const k = input.keys;
      if (k.has('KeyW') || k.has('ArrowUp')) dz -= 1;
      if (k.has('KeyS') || k.has('ArrowDown')) dz += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) dx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) dx += 1;
      dx += input.joyX;
      dz += input.joyY;
    }

    const manual = Math.hypot(dx, dz) > 0.08;
    if (manual) {
      nav.target = null;
      nav.pending = null;
    } else if (nav.target && !paused) {
      const tx = nav.target[0] - p.x;
      const tz = nav.target[1] - p.z;
      const d = Math.hypot(tx, tz);
      if (d < 0.12) {
        nav.target = null;
        const pend = nav.pending;
        nav.pending = null;
        if (pend) onArrive(pend);
      } else {
        const s = Math.min(1, d / 0.35);
        dx = (tx / d) * s;
        dz = (tz / d) * s;
      }
    }

    let len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
      len = 1;
    }

    const isBoosted = gameManager.isPlaying && gameManager.speedBoostUntil > performance.now();
    const SPEED = isBoosted ? 6.2 : 4.2;
    const [nx, nz] = resolvePoint(p.x + dx * SPEED * dt, p.z + dz * SPEED * dt, 0.38);
    p.x = nx;
    p.z = nz;

    const moving = len > 0.05;
    motion.current.moving = moving;

    // Mini-game item pickup collision
    if (gameManager.isPlaying) {
      for (let i = gameManager.items.length - 1; i >= 0; i--) {
        const it = gameManager.items[i];
        if (Math.hypot(p.x - it.x, p.z - it.z) < 0.78) {
          gameManager.collectItem(it.id, p.x, p.z);
        }
      }
    }

    // Facing: movement direction, or toward the station when reading it
    let yaw: number | null = null;
    if (moving) yaw = Math.atan2(dx, dz);
    else if (paused && lastNearby.current) {
      const c = getStation(lastNearby.current).collider;
      yaw = Math.atan2(c[0] - p.x, c[1] - p.z);
    }
    if (yaw !== null) duck.rotation.y = lerpAngle(duck.rotation.y, yaw, 1 - Math.exp(-dt * 12));

    // Nearby detection (only notify React on change)
    let best: StationKey | null = null;
    let bestD = 1.35;
    for (const s of STATIONS) {
      const d = Math.hypot(p.x - s.interact[0], p.z - s.interact[1]);
      if (d < bestD) {
        bestD = d;
        best = s.key;
      }
    }
    if (best !== lastNearby.current) {
      lastNearby.current = best;
      onNearbyChange(best);
    }

    // Follow camera
    const portrait = state.size.width < state.size.height;
    if (paused) tmpPos.set(p.x * 0.85, 5.4, p.z + 7);
    else if (portrait) tmpPos.set(p.x * 0.85, 13, p.z * 0.6 + 12.5);
    else tmpPos.set(p.x * 0.5, 9.6, p.z * 0.4 + 10.8);
    tmpLook.set(
      p.x * (paused ? 1 : 0.65),
      paused ? 0.9 : 0.4,
      p.z * (paused ? 1 : 0.55) - (paused ? 0 : 0.9),
    );
    const k = 1 - Math.exp(-dt * 2.6);
    state.camera.position.lerp(tmpPos, k);
    look.current.lerp(tmpLook, k);
    state.camera.lookAt(look.current);

    // Click marker fade
    markerAge.current += dt;
    if (markerMat.current && marker.current) {
      const a = Math.max(0, 1 - markerAge.current / 0.8);
      markerMat.current.opacity = a;
      marker.current.scale.setScalar(0.6 + (1 - a) * 0.8);
    }
  });

  return (
    <>
      <hemisphereLight args={['#fff4e0', '#6b4a33', 0.9]} />
      <directionalLight
        position={[6, 12, 7]}
        intensity={1.6}
        color="#ffe8c2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
      {/* Pendant lamp */}
      <group position={[0, 0, 1]}>
        <Cyl position={[0, 3.8, 0]} args={[0.015, 0.015, 0.5, 6]} color="#3d2b1f" />
        <mesh position={[0, 3.45, 0]}>
          <coneGeometry args={[0.45, 0.35, 24, 1, true]} />
          <meshStandardMaterial color="#2a9d8f" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 3.3, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffd27a" emissiveIntensity={3} />
        </mesh>
        <pointLight position={[0, 3.1, 0]} intensity={14} distance={10} color="#ffc977" />
      </group>

      <Room onFloorClick={handleFloorClick} />

      {STATIONS.map((s) => (
        <Station key={s.key} def={s} active={nearby === s.key} />
      ))}

      {/* Arcade Cabinet for Mini Game */}
      <ArcadeCabinet onStartGame={() => {
        if (onStartMiniGame) onStartMiniGame();
        else gameManager.start();
      }} />

      {/* Mini-game 3D Collectibles */}
      {gameManager.isPlaying && (
        <group>
          {gameManager.items.map((it) => {
            if (it.type === 'bug') return <BugMesh key={it.id} item={it} />;
            if (it.type === 'star') return <StarMesh key={it.id} item={it} />;
            if (it.type === 'coffee') return <CoffeeMesh key={it.id} item={it} />;
            return <CornMesh key={it.id} item={it} />;
          })}
        </group>
      )}

      {/* Click-to-move marker */}
      <group ref={marker} position={[0, -10, 0]}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.18, 0.26, 32]} />
          <meshBasicMaterial ref={markerMat} color="#fff3c4" transparent opacity={0} />
        </mesh>
      </group>

      <group ref={duckRef} position={[0, 0, 1.4]}>
        <Duck motion={motion} />
      </group>
    </>
  );
}

export default function HouseScene(props: HouseSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 9.6, 11.4], fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true }}
      onPointerMissed={() => {
        document.body.style.cursor = '';
      }}
    >
      <color attach="background" args={['#1b130d']} />
      <fog attach="fog" args={['#1b130d', 20, 34]} />
      <World {...props} />
    </Canvas>
  );
}
