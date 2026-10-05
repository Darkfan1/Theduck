'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, RoundedBox } from '@react-three/drei';
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
import { Duck } from './DuckModel';
import styles from './DuckHouse.module.css';

export interface HouseSceneProps {
  paused: boolean;
  nearby: StationKey | null;
  onNearbyChange: (key: StationKey | null) => void;
  onArrive: (key: StationKey) => void;
  onOpenGardenGame?: () => void;
  onNearDoorChange?: (near: boolean) => void;
  openStationKey?: StationKey | null;
  onCloseStation?: () => void;
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

interface StationCameraPreset {
  pos: [number, number, number];
  look: [number, number, number];
  openPos: [number, number, number];
  openLook: [number, number, number];
}

const STATION_CAMERAS: Record<StationKey, StationCameraPreset> = {
  overview: {
    // Góc 01 · Phòng khách & Sofa (x=-4.5, z=-3.8)
    pos: [-4.2, 3.8, 0.4],
    look: [-4.5, 1.2, -3.2],
    openPos: [-2.6, 3.8, 0.8],
    openLook: [-3.8, 1.2, -3.0],
  },
  experience: {
    // Góc 02 · Xưởng in bao bì (x=-6.0, z=1.8)
    pos: [-3.8, 3.6, 5.4],
    look: [-5.8, 1.2, 2.0],
    openPos: [-2.4, 3.5, 5.4],
    openLook: [-5.0, 1.2, 2.0],
  },
  skills: {
    // Góc 03 · Bàn lab công nghệ & Màn hình code (x=4.8, z=-4.7)
    pos: [3.8, 3.6, -1.0],
    look: [5.0, 1.4, -4.4],
    openPos: [5.2, 3.6, -0.8],
    openLook: [4.4, 1.4, -4.4],
  },
  projects: {
    // Góc 04 · Kệ sách dự án (x=6.8, z=1.8)
    pos: [3.8, 3.8, 5.2],
    look: [6.5, 1.6, 1.8],
    openPos: [5.0, 3.8, 5.2],
    openLook: [5.8, 1.6, 1.8],
  },
  contact: {
    // Góc 05 · Hòm thư & Cửa ra vào (x=1.5, z=-5.2)
    pos: [1.2, 3.2, -1.6],
    look: [1.4, 1.4, -5.0],
    openPos: [2.4, 3.2, -1.6],
    openLook: [1.2, 1.4, -5.0],
  },
};

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
  // Bevelled edges catch highlights and kill the hard "lego block" look
  const radius = Math.min(0.04, Math.min(size[0], size[1], size[2]) * 0.3);
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
        metalness={metalness}
      />
    </RoundedBox>
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

const DUCK_YELLOW = '#ffc62e';
const BEAK = '#ff7a1a';

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

function RealisticPlant({
  position,
  rotation = [0, 0, 0],
}: {
  position: V3;
  rotation?: V3;
}) {
  const foliageRef = useRef<THREE.Group>(null);

  // 3D Plump Succulent Leaf Geometry matching the reference image
  const { bladeGeom, rimGeom } = useMemo(() => {
    // 1. Paddle / spoon shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.05, 0.12, -0.19, 0.32, -0.21, 0.52);
    shape.bezierCurveTo(-0.23, 0.72, -0.12, 0.88, 0, 0.98); // tip
    shape.bezierCurveTo(0.12, 0.88, 0.23, 0.72, 0.21, 0.52);
    shape.bezierCurveTo(0.19, 0.32, 0.05, 0.12, 0, 0);

    // Thick bevel for plump 3D succulent volume
    const bladeGeom = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 4,
    });
    bladeGeom.translate(0, 0, -0.026);

    // Apply natural downward arch and V-midrib crease
    const pos = bladeGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = Math.max(0, Math.min(1, y / 0.98));
      const arch = -Math.pow(ny, 1.8) * 0.18;
      const crease = Math.abs(x) * 0.08;
      pos.setZ(i, z + arch + crease);
    }
    bladeGeom.computeVertexNormals();
    bladeGeom.computeBoundingSphere();

    // 2. Pale-yellow/lime border edge geometry
    const rimShape = new THREE.Shape();
    rimShape.moveTo(0, 0);
    rimShape.bezierCurveTo(-0.055, 0.12, -0.205, 0.32, -0.225, 0.52);
    rimShape.bezierCurveTo(-0.245, 0.72, -0.13, 0.89, 0, 0.995);
    rimShape.bezierCurveTo(0.13, 0.89, 0.245, 0.72, 0.225, 0.52);
    rimShape.bezierCurveTo(0.205, 0.32, 0.055, 0.12, 0, 0);

    const rimGeom = new THREE.ExtrudeGeometry(rimShape, {
      steps: 1,
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.02,
      bevelSegments: 3,
    });
    rimGeom.translate(0, 0, -0.03);

    const rpos = rimGeom.attributes.position;
    for (let i = 0; i < rpos.count; i++) {
      const x = rpos.getX(i);
      const y = rpos.getY(i);
      const z = rpos.getZ(i);
      const ny = Math.max(0, Math.min(1, y / 0.995));
      const arch = -Math.pow(ny, 1.8) * 0.18;
      const crease = Math.abs(x) * 0.08;
      rpos.setZ(i, z + arch + crease);
    }
    rimGeom.computeVertexNormals();
    rimGeom.computeBoundingSphere();

    return { bladeGeom, rimGeom };
  }, []);

  useFrame(({ clock }) => {
    if (foliageRef.current) {
      const t = clock.elapsedTime;
      foliageRef.current.children.forEach((c, idx) => {
        c.rotation.z = Math.sin(t * 1.5 + idx * 0.8) * 0.015;
        c.rotation.x = Math.cos(t * 1.2 + idx * 0.9) * 0.01;
      });
    }
  });

  // Arrangement of 8 leaves matching the reference image
  const leaves = useMemo(
    () => [
      { rotY: 0, pitch: 0.16, stemLen: 0.44, scale: 1.15 }, // Top center upright
      { rotY: -0.65, pitch: 0.42, stemLen: 0.38, scale: 1.05 }, // Upper left
      { rotY: 0.65, pitch: 0.42, stemLen: 0.38, scale: 1.05 }, // Upper right
      { rotY: -1.25, pitch: 0.68, stemLen: 0.3, scale: 1.0 }, // Mid left
      { rotY: 1.25, pitch: 0.68, stemLen: 0.3, scale: 1.0 }, // Mid right
      { rotY: -0.45, pitch: 1.05, stemLen: 0.2, scale: 0.95 }, // Front left drooping
      { rotY: 0.45, pitch: 1.05, stemLen: 0.2, scale: 0.95 }, // Front right drooping
      { rotY: Math.PI, pitch: 0.48, stemLen: 0.36, scale: 0.98 }, // Back center
    ],
    []
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Peach terracotta flower pot matching reference image */}
      {/* Tapered lower body */}
      <Cyl position={[0, 0.25, 0]} args={[0.38, 0.29, 0.5, 32]} color="#ea9377" />
      {/* Rounded bottom torus */}
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.025, 12, 32]} />
        <meshStandardMaterial color="#ea9377" roughness={0.7} />
      </mesh>
      {/* Top collar / rim */}
      <Cyl position={[0, 0.55, 0]} args={[0.42, 0.42, 0.14, 32]} color="#ea9377" />
      {/* Rolled top rim rounded torus */}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.02, 12, 32]} />
        <meshStandardMaterial color="#ea9377" roughness={0.7} />
      </mesh>
      {/* Dark rich potting soil */}
      <Cyl position={[0, 0.54, 0]} args={[0.38, 0.38, 0.04, 32]} color="#241711" />

      {/* Foliage group */}
      <group ref={foliageRef} position={[0, 0.55, 0]}>
        {leaves.map((lf, i) => (
          <group key={i} rotation={[0, lf.rotY, 0]}>
            <group rotation={[lf.pitch, 0, 0]}>
              {/* Fleshy round succulent stalk */}
              <mesh position={[0, lf.stemLen / 2, 0]} castShadow>
                <cylinderGeometry args={[0.024, 0.036, lf.stemLen, 16]} />
                <meshStandardMaterial color="#84cc16" roughness={0.45} />
              </mesh>
              {/* Plump succulent leaf blade with two-tone creamy edge trim */}
              <group position={[0, lf.stemLen, 0]} rotation={[-0.15, 0, 0]} scale={lf.scale}>
                {/* Pale lime-yellow border trim */}
                <mesh geometry={rimGeom} castShadow receiveShadow>
                  <meshStandardMaterial
                    color="#d9f99d"
                    roughness={0.45}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {/* Apple green succulent leaf face */}
                <mesh position={[0, 0, 0.003]} geometry={bladeGeom} castShadow receiveShadow>
                  <meshStandardMaterial
                    color="#84cc16"
                    roughness={0.4}
                    metalness={0.04}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

function WallSign() {
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 512, 128);

    const x = 16, y = 16, w = 480, h = 96, r = 48;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

    ctx.fillStyle = 'rgba(43, 26, 14, 0.94)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦆 Nhà của Vịt Vũ', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  if (!tex) return null;
  return (
    <mesh position={[0, 3.45, -5.92]}>
      <planeGeometry args={[2.5, 0.62]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
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
      <WallSign />

      <RealisticPlant position={[-7.1, 0, 4.8]} rotation={[0, 0.35, 0]} />
      <RealisticPlant position={[7.1, 0, 4.8]} rotation={[0, -0.25, 0]} />
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

interface BookData {
  pos: V3;
  size: V3; // [depth in X, height in Y, spine thickness in Z]
  cover: string;
  foil?: string;
  tiltZ?: number;
}

function Book({ pos, size, cover, foil, tiltZ = 0 }: BookData) {
  const [dx, dy, dz] = size;
  return (
    <group position={pos} rotation={[tiltZ, 0, 0]}>
      {/* Book Cover */}
      <Box position={[0, 0, 0]} size={[dx, dy, dz]} color={cover} roughness={0.65} />
      {/* Pages core (recessed slightly from the front spine at -X) */}
      <Box
        position={[0.02, 0, 0]}
        size={[dx - 0.03, dy - 0.03, dz - 0.015]}
        color="#fffbeb"
        roughness={0.9}
      />
      {/* Spine Foil Band */}
      {foil && (
        <mesh position={[-dx / 2 - 0.002, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[dz * 0.88, dy * 0.18]} />
          <meshStandardMaterial color={foil} metalness={0.8} roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

function ProjectBookshelf() {
  return (
    <group>
      {/* --- GRAND ARCHITECTURAL WALNUT BOOKCASE --- */}
      {/* Backing panel */}
      <Box position={[7.78, 1.6, 1.7]} size={[0.06, 3.12, 2.66]} color="#2d1d16" roughness={0.9} />
      {/* Vertical Uprights */}
      <Box position={[7.46, 1.6, 0.4]} size={[0.62, 3.12, 0.08]} color="#3e2723" roughness={0.7} />
      <Box position={[7.46, 1.6, 3.0]} size={[0.62, 3.12, 0.08]} color="#3e2723" roughness={0.7} />
      {/* Center Divider Upright */}
      <Box position={[7.46, 1.6, 1.7]} size={[0.6, 3.12, 0.06]} color="#4e342e" roughness={0.7} />
      {/* Base Plinth */}
      <Box position={[7.46, 0.08, 1.7]} size={[0.66, 0.16, 2.74]} color="#2d1d16" roughness={0.7} />
      {/* Top Crown Molding / Cornice */}
      <Box position={[7.46, 3.18, 1.7]} size={[0.72, 0.12, 2.82]} color="#5d4037" roughness={0.6} />

      {/* Horizontal Shelves (Bottom, Tier 1, Tier 2, Tier 3, Top) */}
      {[0.18, 0.9, 1.62, 2.34, 3.06].map((y) => (
        <Box key={y} position={[7.46, y, 1.7]} size={[0.62, 0.05, 2.6]} color="#4e342e" roughness={0.7} />
      ))}

      {/* --- SHELF 1 (Bottom, y: 0.22 to 0.88) --- */}
      {/* Left Bay: Heavy Project Archive Binders & System Folios */}
      <Book pos={[7.46, 0.54, 0.52]} size={[0.42, 0.48, 0.11]} cover="#1e3a8a" foil="#fbbf24" />
      <Book pos={[7.46, 0.54, 0.65]} size={[0.42, 0.48, 0.11]} cover="#14532d" foil="#facc15" />
      <Book pos={[7.46, 0.54, 0.78]} size={[0.42, 0.48, 0.11]} cover="#831843" foil="#e2e8f0" />
      <Book pos={[7.46, 0.54, 0.91]} size={[0.42, 0.48, 0.11]} cover="#1e293b" foil="#fbbf24" />
      {/* Binder Spine Label Tags */}
      {[0.52, 0.65, 0.78, 0.91].map((z) => (
        <mesh key={z} position={[7.24, 0.58, z]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.07, 0.18]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Horizontal Portfolio Folios Stack */}
      <Book pos={[7.46, 0.25, 1.25]} size={[0.42, 0.08, 0.3]} cover="#b45309" />
      <Book pos={[7.46, 0.33, 1.25]} size={[0.4, 0.07, 0.28]} cover="#0369a1" />
      <Book pos={[7.46, 0.4, 1.25]} size={[0.38, 0.06, 0.26]} cover="#475569" foil="#facc15" />
      {/* Heavy Marble Bookend */}
      <Box position={[7.46, 0.36, 1.55]} size={[0.3, 0.26, 0.1]} color="#0f172a" roughness={0.3} metalness={0.2} />

      {/* Right Bay: Hardware / Component Storage Boxes */}
      <Box position={[7.46, 0.45, 2.05]} size={[0.48, 0.38, 0.5]} color="#334155" roughness={0.7} />
      <Box position={[7.21, 0.45, 2.05]} size={[0.02, 0.08, 0.16]} color="#fbbf24" metalness={0.8} roughness={0.2} />
      <Box position={[7.46, 0.45, 2.65]} size={[0.48, 0.38, 0.5]} color="#475569" roughness={0.7} />
      <Box position={[7.21, 0.45, 2.65]} size={[0.02, 0.08, 0.16]} color="#fbbf24" metalness={0.8} roughness={0.2} />

      {/* --- SHELF 2 (Mid-Lower, y: 0.94 to 1.60) --- */}
      {/* Left Bay: Software Engineering Library */}
      <Book pos={[7.46, 1.24, 0.48]} size={[0.36, 0.38, 0.07]} cover="#1e40af" foil="#fbbf24" />
      <Book pos={[7.46, 1.24, 0.56]} size={[0.36, 0.38, 0.07]} cover="#0f766e" />
      <Book pos={[7.46, 1.22, 0.64]} size={[0.35, 0.35, 0.06]} cover="#b91c1c" foil="#fbbf24" />
      <Book pos={[7.46, 1.26, 0.72]} size={[0.37, 0.42, 0.08]} cover="#581c87" />
      <Book pos={[7.46, 1.22, 0.8]} size={[0.35, 0.36, 0.06]} cover="#c2410c" />
      <Book pos={[7.46, 1.24, 0.88]} size={[0.36, 0.39, 0.07]} cover="#15803d" foil="#facc15" />
      <Book pos={[7.46, 1.22, 0.95]} size={[0.35, 0.35, 0.05]} cover="#0369a1" />
      {/* 2 Leaning Books */}
      <Book pos={[7.46, 1.22, 1.05]} size={[0.35, 0.36, 0.06]} cover="#d97706" tiltZ={0.22} />
      <Book pos={[7.46, 1.2, 1.13]} size={[0.34, 0.34, 0.06]} cover="#4338ca" tiltZ={0.22} />
      {/* Geometric Marble Bookend */}
      <Box position={[7.46, 1.1, 1.3]} size={[0.26, 0.22, 0.12]} color="#e2e8f0" roughness={0.2} />

      {/* Right Bay: Enterprise Systems & Cloud Stack */}
      <Book pos={[7.46, 1.26, 1.82]} size={[0.38, 0.42, 0.09]} cover="#065f46" foil="#fbbf24" />
      <Book pos={[7.46, 1.24, 1.93]} size={[0.36, 0.38, 0.08]} cover="#0284c7" />
      <Book pos={[7.46, 1.22, 2.03]} size={[0.35, 0.36, 0.07]} cover="#7c2d12" foil="#facc15" />
      <Book pos={[7.46, 1.26, 2.13]} size={[0.37, 0.41, 0.08]} cover="#374151" />
      <Book pos={[7.46, 1.24, 2.23]} size={[0.36, 0.38, 0.07]} cover="#1e1b4b" />
      {/* Horizontal Stack with Brass Clock */}
      <Book pos={[7.46, 0.98, 2.6]} size={[0.36, 0.07, 0.26]} cover="#78350f" />
      <Book pos={[7.46, 1.05, 2.6]} size={[0.34, 0.06, 0.24]} cover="#047857" />
      {/* Desk Clock on Stack */}
      <Cyl position={[7.46, 1.18, 2.6]} args={[0.07, 0.07, 0.05, 16]} color="#fbbf24" rotation={[Math.PI / 2, 0, 0]} />

      {/* --- SHELF 3 (Mid-Upper, y: 1.66 to 2.32) --- */}
      {/* Left Bay: Golden Trophy of Project Excellence */}
      <group position={[7.46, 1.66, 1.05]}>
        <Box position={[0, 0.04, 0]} size={[0.22, 0.06, 0.22]} color="#0f172a" metalness={0.5} roughness={0.3} />
        <Box position={[0, 0.09, 0]} size={[0.16, 0.04, 0.16]} color="#1e293b" metalness={0.5} roughness={0.3} />
        <Cyl position={[0, 0.18, 0]} args={[0.02, 0.04, 0.14, 16]} color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.2} />
        <Cyl position={[0, 0.3, 0]} args={[0.09, 0.04, 0.15, 16]} color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.3} />
        <mesh position={[0, 0.3, 0.09]}>
          <torusGeometry args={[0.05, 0.012, 8, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, -0.09]}>
          <torusGeometry args={[0.05, 0.012, 8, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.41, 0]}>
          <octahedronGeometry args={[0.04]} />
          <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      </group>
      {/* Flanking Books on Left Shelf 3 */}
      <Book pos={[7.46, 1.9, 0.55]} size={[0.34, 0.36, 0.08]} cover="#dc2626" foil="#fbbf24" />
      <Book pos={[7.46, 1.9, 0.65]} size={[0.33, 0.35, 0.07]} cover="#2563eb" />
      <Book pos={[7.46, 1.88, 1.45]} size={[0.34, 0.34, 0.07]} cover="#059669" />
      <Book pos={[7.46, 1.88, 1.54]} size={[0.34, 0.35, 0.07]} cover="#7c3aed" foil="#facc15" />

      {/* Right Bay: Modern Web Stack Rainbow Collection */}
      {[
        { c: '#4338ca', h: 0.36, z: 1.85 },
        { c: '#0284c7', h: 0.38, z: 1.94 },
        { c: '#0d9488', h: 0.35, z: 2.02 },
        { c: '#16a34a', h: 0.37, z: 2.11 },
        { c: '#ca8a04', h: 0.34, z: 2.19 },
        { c: '#ea580c', h: 0.38, z: 2.28 },
        { c: '#e11d48', h: 0.36, z: 2.37 },
        { c: '#9333ea', h: 0.39, z: 2.47 },
      ].map((b, i) => (
        <Book key={i} pos={[7.46, 1.66 + b.h / 2, b.z]} size={[0.33, b.h, 0.07]} cover={b.c} foil={i % 3 === 0 ? '#fbbf24' : undefined} />
      ))}
      {/* Stone Bookend */}
      <Box position={[7.46, 1.8, 2.65]} size={[0.24, 0.22, 0.12]} color="#334155" roughness={0.4} />

      {/* --- SHELF 4 (Top, y: 2.38 to 3.04) --- */}
      {/* Left Bay: Framed System Diploma / Excellence Award */}
      <group position={[7.46, 2.66, 1.05]}>
        <Box position={[0, 0, 0]} size={[0.04, 0.42, 0.52]} color="#fbbf24" metalness={0.7} roughness={0.3} />
        <mesh position={[-0.022, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.46, 0.36]} />
          <meshStandardMaterial color="#fefce8" roughness={0.9} />
        </mesh>
        <mesh position={[-0.024, -0.09, 0.12]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.04, 16]} />
          <meshStandardMaterial color="#d97706" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      </group>
      <Book pos={[7.46, 2.58, 0.52]} size={[0.3, 0.32, 0.06]} cover="#374151" />
      <Book pos={[7.46, 2.58, 0.6]} size={[0.3, 0.31, 0.06]} cover="#4b5563" />

      {/* Right Bay: Mini Trailing Succulent / Ivy Potted Plant on Shelf */}
      <group position={[7.46, 2.44, 2.1]}>
        <Cyl position={[0, 0.08, 0]} args={[0.1, 0.08, 0.14, 16]} color="#ea580c" />
        <Cyl position={[0, 0.14, 0]} args={[0.09, 0.09, 0.02, 16]} color="#1c140d" />
        <mesh position={[-0.06, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#22c55e" roughness={0.4} />
        </mesh>
        <mesh position={[-0.14, 0.02, 0.03]} rotation={[0, 0, 0.4]}>
          <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
          <meshStandardMaterial color="#16a34a" roughness={0.4} />
        </mesh>
        <mesh position={[-0.15, -0.12, 0.05]} rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.02, 0.14, 4, 8]} />
          <meshStandardMaterial color="#15803d" roughness={0.4} />
        </mesh>
      </group>
      <Book pos={[7.46, 2.58, 2.5]} size={[0.3, 0.32, 0.06]} cover="#1e3a8a" foil="#fbbf24" />
      <Book pos={[7.46, 2.58, 2.58]} size={[0.3, 0.31, 0.06]} cover="#0f766e" />
      <Book pos={[7.46, 2.58, 2.66]} size={[0.3, 0.3, 0.06]} cover="#701a75" />

      {/* Soft warm library illumination */}
      <pointLight position={[6.8, 3.0, 1.7]} intensity={3.5} distance={4.5} color="#fed7aa" />
    </group>
  );
}

function DoorMailbox({ onOpenGardenGame }: { onOpenGardenGame?: () => void }) {
  const env = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (env.current) {
      env.current.position.y = 1.85 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
      env.current.rotation.y = Math.sin(clock.elapsedTime) * 0.5;
    }
  });

  const doorSignTex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 512, 128);

    const x = 16, y = 16, w = 480, h = 96, r = 48;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪 Ra Vườn (Game Mario)', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <group>
      {/* Interactive Exit Door to Mario Garden Game */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onOpenGardenGame?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
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
        {/* Doorway Billboard */}
        {doorSignTex && (
          <Billboard position={[0, 3.1, -5.85]}>
            <mesh>
              <planeGeometry args={[1.8, 0.45]} />
              <meshBasicMaterial map={doorSignTex} transparent />
            </mesh>
          </Billboard>
        )}
      </group>

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
  projects: ProjectBookshelf,
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

function StationLabel({ def, active }: { def: StationDef; active: boolean }) {
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 512, 128);

    const x = 20, y = 20, w = 472, h = 88, r = 44;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

    ctx.fillStyle = active ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = active ? 8 : 5;
    ctx.strokeStyle = def.color;
    ctx.stroke();

    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = active ? '#ffffff' : '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${def.emoji} ${def.label}`, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [def.color, def.emoji, def.label, active]);

  if (!tex) return null;
  return (
    <Billboard position={def.labelAt}>
      <mesh>
        <planeGeometry args={[active ? 1.75 : 1.55, active ? 0.44 : 0.39]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </Billboard>
  );
}

function Station({
  def,
  active,
  onOpenGardenGame,
}: {
  def: StationDef;
  active: boolean;
  onOpenGardenGame?: () => void;
}) {
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
        {def.key === 'contact' ? (
          <DoorMailbox onOpenGardenGame={onOpenGardenGame} />
        ) : (
          <Furniture />
        )}
      </group>
      <InteractRing def={def} active={active} />
      <StationLabel def={def} active={active} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* World: lights + room + duck controller + follow camera              */
/* ------------------------------------------------------------------ */

function World({
  paused,
  nearby,
  onNearbyChange,
  onArrive,
  onOpenGardenGame,
  onNearDoorChange,
  openStationKey,
  onCloseStation,
}: HouseSceneProps) {

  const duckRef = useRef<THREE.Group>(null);
  const motion = useRef({ moving: false });
  const lastNearby = useRef<StationKey | null>(null);
  const lastNearDoor = useRef(false);
  const look = useRef(new THREE.Vector3(0, 0.5, 0));
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const marker = useRef<THREE.Group>(null);
  const markerMat = useRef<THREE.MeshBasicMaterial>(null);
  const markerAge = useRef(10);

  // Cuộn chuột để quay về chế độ thường khi đang zoom cận cảnh
  const manualZoomOut = useRef(false);
  const lastDuckPos = useRef<[number, number]>([0, 0]);
  const lastClosestStation = useRef<StationKey | null>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Nếu đang cuộn trong nội dung văn bản của bảng sidePanel thì không can thiệp
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[class*="sidePanel"]')) {
        return;
      }

      if (e.deltaY > 0) {
        // Cuộn chuột xuống (zoom out) -> quay về chế độ thường!
        if (openStationKey && onCloseStation) {
          onCloseStation();
        }
        manualZoomOut.current = true;
        if (duckRef.current) {
          lastDuckPos.current = [duckRef.current.position.x, duckRef.current.position.z];
        }
      } else if (e.deltaY < 0) {
        // Cuộn chuột lên (zoom in) -> cho phép zoom cận cảnh lại
        manualZoomOut.current = false;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [openStationKey, onCloseStation]);

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (paused) return;
    const [x, z] = resolvePoint(e.point.x, e.point.z);
    input.clear();
    nav.target = [x, z];
    nav.pending = null;
    markerAge.current = 0;
    marker.current?.position.set(x, 0.03, z);
    manualZoomOut.current = false;
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const duck = duckRef.current;
    if (!duck) return;
    const p = duck.position;

    // Tự động quét và giải phóng phím kẹt do bộ gõ tiếng Việt nuốt keyup
    input.sweepStuckKeys();

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
      const d = input.dirs;
      if (d.has('up')) dz -= 1;
      if (d.has('down')) dz += 1;
      if (d.has('left')) dx -= 1;
      if (d.has('right')) dx += 1;
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

    const SPEED = 4.2;
    const [nx, nz] = resolvePoint(p.x + dx * SPEED * dt, p.z + dz * SPEED * dt, 0.38);
    p.x = nx;
    p.z = nz;

    const moving = len > 0.05;
    motion.current.moving = moving;

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

    // Door proximity check (exit to Garden Game)
    const isNearExitDoor = Math.hypot(p.x, p.z - (-5.3)) < 1.35;
    if (isNearExitDoor !== lastNearDoor.current) {
      lastNearDoor.current = isNearExitDoor;
      onNearDoorChange?.(isNearExitDoor);
    }

    // Follow camera calculation
    const portrait = state.size.width < state.size.height;
    
    // Default overview wide camera (chế độ thường)
    const defPosX = p.x * 0.5;
    const defPosY = portrait ? 13.0 : 9.4;
    const defPosZ = portrait ? p.z * 0.6 + 12.5 : p.z * 0.4 + 10.8;
    const defLookX = p.x * 0.65;
    const defLookY = 0.4;
    const defLookZ = p.z * 0.55 - 0.9;

    let targetCamPos: [number, number, number] = [defPosX, defPosY, defPosZ];
    let targetCamLook: [number, number, number] = [defLookX, defLookY, defLookZ];

    if (openStationKey && STATION_CAMERAS[openStationKey]) {
      // Station panel is open on the right: close-up framing shifted to the left
      if (manualZoomOut.current) {
        targetCamPos = [defPosX, defPosY, defPosZ];
        targetCamLook = [defLookX, defLookY, defLookZ];
      } else {
        const cam = STATION_CAMERAS[openStationKey];
        targetCamPos = portrait
          ? [cam.openPos[0], cam.openPos[1] + 1.2, cam.openPos[2] + 1.8]
          : cam.openPos;
        targetCamLook = cam.openLook;
      }
    } else {
      // Duck is moving around: dynamically zoom in as duck approaches any station area!
      let closestStation: StationKey | null = null;
      let minDist = Infinity;
      for (const s of STATIONS) {
        const d = Math.hypot(p.x - s.interact[0], p.z - s.interact[1]);
        if (d < minDist) {
          minDist = d;
          closestStation = s.key;
        }
      }

      // Khi vịt di chuyển xa vị trí vừa cuộn chuột zoom out hoặc sang góc khác, tự động khôi phục chế độ zoom
      if (manualZoomOut.current) {
        const moved = Math.hypot(p.x - lastDuckPos.current[0], p.z - lastDuckPos.current[1]);
        if (moved > 0.65 || (closestStation !== lastClosestStation.current && closestStation !== null)) {
          manualZoomOut.current = false;
        }
      }
      lastClosestStation.current = closestStation;

      const ZOOM_DIST = 2.9; // Distance threshold to trigger close-up camera zoom
      if (closestStation && minDist < ZOOM_DIST && !manualZoomOut.current) {
        const cam = STATION_CAMERAS[closestStation];
        const factor = Math.max(0, Math.min(1, (ZOOM_DIST - minDist) / 1.7));
        const t = factor * factor * (3 - 2 * factor); // Smoothstep curve

        const cPos = portrait
          ? [cam.pos[0], cam.pos[1] + 1.2, cam.pos[2] + 1.8]
          : cam.pos;
        const cLook = cam.look;

        targetCamPos = [
          defPosX + (cPos[0] - defPosX) * t,
          defPosY + (cPos[1] - defPosY) * t,
          defPosZ + (cPos[2] - defPosZ) * t,
        ];
        targetCamLook = [
          defLookX + (cLook[0] - defLookX) * t,
          defLookY + (cLook[1] - defLookY) * t,
          defLookZ + (cLook[2] - defLookZ) * t,
        ];
      }
    }

    tmpPos.set(targetCamPos[0], targetCamPos[1], targetCamPos[2]);
    tmpLook.set(targetCamLook[0], targetCamLook[1], targetCamLook[2]);

    const k = 1 - Math.exp(-dt * 3.4);
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
      <hemisphereLight args={['#fff8ed', '#593822', 1.05]} />
      <directionalLight
        position={[6, 12, 7]}
        intensity={1.75}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0002}
      />
      {/* Soft Window Rim Light */}
      <directionalLight
        position={[-7.5, 7.5, -6]}
        intensity={0.8}
        color="#fcd34d"
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
        <Station
          key={s.key}
          def={s}
          active={nearby === s.key}
          onOpenGardenGame={onOpenGardenGame}
        />
      ))}



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
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [0, 9.6, 11.4], fov: 42, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.12,
      }}
      onPointerMissed={() => {
        document.body.style.cursor = '';
      }}
    >
      <color attach="background" args={['#1c140d']} />
      <fog attach="fog" args={['#1c140d', 20, 36]} />
      <World {...props} />
    </Canvas>
  );
}
