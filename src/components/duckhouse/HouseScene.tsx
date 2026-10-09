'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, RoundedBox, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { duckAudio } from '@/utils/duckAudio';
import {
  STATIONS,
  EXTRA_COLLIDERS,
  ROOM_BOUNDS,
  getStation,
  type StationDef,
  type StationKey,
} from './stations';
import { input, nav } from './controls';
import { Duck, type DuckSpot, type SleepPose, type DuckMotion } from './DuckModel';
import styles from './DuckHouse.module.css';

import {
  type TimePhase,
  type TimeConfig,
  TIME_CONFIGS,
  getRealtimePhase,
} from './timeConfig';

export * from './timeConfig';

export interface HouseSceneProps {
  paused: boolean;
  nearby: StationKey | null;
  onNearbyChange: (key: StationKey | null) => void;
  onArrive: (key: StationKey) => void;
  onOpenGardenGame?: () => void;
  onNearDoorChange?: (near: boolean) => void;
  openStationKey?: StationKey | null;
  onCloseStation?: () => void;
  timePhase?: TimePhase;
  currentTime?: Date;
  onSleepChange?: (sleeping: boolean) => void;
  gardenGameOpen?: boolean;
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
    // Góc 01 · Phòng khách & Sofa (khung cảnh dạt sang nửa bên trái, thu nhỏ cảnh vật hợp lý)
    pos: [-4.2, 3.8, 0.4],
    look: [-4.5, 1.2, -3.2],
    openPos: [-4.7, 2.75, 1.7],
    openLook: [-3.3, 1.25, -4.5],
  },
  experience: {
    // Góc 02 · Xưởng in bao bì (khung cảnh dạt sang nửa bên trái)
    pos: [-3.8, 3.6, 5.4],
    look: [-5.8, 1.2, 2.0],
    openPos: [-4.6, 3.4, 5.2],
    openLook: [-4.2, 1.1, 1.8],
  },
  skills: {
    // Góc 03 · Bàn lab công nghệ quay vào tường bên phải (khung cảnh dạt sang nửa bên trái)
    pos: [3.0, 3.4, -1.8],
    look: [6.6, 1.3, -3.2],
    openPos: [3.2, 3.1, -1.6],
    openLook: [7.2, 1.2, -3.0],
  },
  projects: {
    // Góc 04 · Kệ sách dự án (khung cảnh dạt sang nửa bên trái)
    pos: [3.8, 3.8, 5.2],
    look: [6.5, 1.6, 1.8],
    openPos: [4.0, 3.6, 5.0],
    openLook: [7.2, 1.5, 1.8],
  },
  contact: {
    // Góc 05 · Bàn console điện thoại & lời nhắn bên phải cửa chính (khung cảnh dạt sang nửa bên trái)
    pos: [1.4, 3.1, -1.8],
    look: [1.5, 1.3, -5.1],
    openPos: [0.9, 2.9, -1.8],
    openLook: [2.1, 1.2, -5.1],
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
  clearcoat?: number;
  clearcoatRoughness?: number;
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
  clearcoat = 0,
  clearcoatRoughness = 0.2,
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
      {clearcoat > 0 ? (
        <meshPhysicalMaterial
          color={color}
          emissive={emissive ?? '#000000'}
          emissiveIntensity={emissiveIntensity}
          roughness={roughness}
          metalness={metalness}
          clearcoat={clearcoat}
          clearcoatRoughness={clearcoatRoughness}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          emissive={emissive ?? '#000000'}
          emissiveIntensity={emissiveIntensity}
          roughness={roughness}
          metalness={metalness}
        />
      )}
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
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

function Cyl({
  position,
  args,
  color,
  rotation,
  emissive,
  emissiveIntensity = 0,
  metalness,
  roughness,
  clearcoat = 0,
  clearcoatRoughness = 0.2,
}: CylProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[args[0], args[1], args[2], args[3] ?? 24]} />
      {clearcoat > 0 ? (
        <meshPhysicalMaterial
          color={color}
          emissive={emissive ?? '#000000'}
          emissiveIntensity={emissiveIntensity}
          metalness={metalness ?? 0}
          roughness={roughness ?? 0.7}
          clearcoat={clearcoat}
          clearcoatRoughness={clearcoatRoughness}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          emissive={emissive ?? '#000000'}
          emissiveIntensity={emissiveIntensity}
          metalness={metalness ?? 0}
          roughness={roughness ?? 0.7}
        />
      )}
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

function ShutterPanel({
  side,
  isNight,
}: {
  side: 'left' | 'right';
  isNight: boolean;
}) {
  const width = 0.81;
  const height = 1.22;
  const pivotX = side === 'left' ? -0.8 : 0.8;
  // Cửa sổ mở ra ngoài (về hướng -Z, ngoài trời):
  // Cánh trái quay mở ra ngoài: góc dương (+rot)
  // Cánh phải quay mở ra ngoài: góc âm (-rot)
  const rotY = isNight ? 0 : side === 'left' ? Math.PI * 0.48 : -Math.PI * 0.48;
  const panelCenterX = side === 'left' ? width / 2 : -width / 2;
  const slats = useMemo(() => Array.from({ length: 9 }, (_, i) => -0.42 + i * 0.1), []);

  return (
    <group position={[pivotX, 0, -0.16]} rotation={[0, rotY, 0]}>
      <group position={[panelCenterX, 0, 0]}>
        {/* Khung gỗ cánh cửa chớp */}
        <Box position={[0, 0, 0]} size={[width, height, 0.04]} color="#3e2723" roughness={0.7} />
        {/* Tấm nền nan chớp */}
        <Box position={[0, 0, 0.004]} size={[width - 0.1, height - 0.1, 0.02]} color="#4e342e" roughness={0.8} />
        {/* Nan chớp gỗ đón gió và ánh sáng */}
        {slats.map((sy, idx) => (
          <mesh key={idx} position={[0, sy, 0.012]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[width - 0.12, 0.065, 0.012]} />
            <meshStandardMaterial color="#5d4037" roughness={0.8} />
          </mesh>
        ))}
        {/* Bản lề & góc gia cố kim loại vàng đồng */}
        {[
          [-width / 2 + 0.06, height / 2 - 0.06],
          [width / 2 - 0.06, height / 2 - 0.06],
          [-width / 2 + 0.06, -height / 2 + 0.06],
          [width / 2 - 0.06, -height / 2 + 0.06],
        ].map(([bx, by], i) => (
          <mesh key={i} position={[bx, by, 0.022]}>
            <planeGeometry args={[0.045, 0.045]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        {/* Chốt khóa đồng khi đóng kín ban đêm */}
        {isNight && side === 'left' && (
          <group position={[width / 2 - 0.02, 0, 0.026]}>
            <Box position={[0, 0, 0]} size={[0.09, 0.04, 0.025]} color="#fbbf24" metalness={0.85} roughness={0.25} />
            <mesh position={[0.035, 0, 0.016]}>
              <sphereGeometry args={[0.024, 12, 12]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

function WindowFrame({ x, timeConfig }: { x: number; timeConfig: TimeConfig }) {
  const stars = useMemo(
    () => [
      { x: -0.5, y: 0.38, s: 0.02 },
      { x: -0.2, y: 0.44, s: 0.024 },
      { x: 0.35, y: 0.28, s: 0.018 },
      { x: 0.55, y: 0.42, s: 0.022 },
      { x: -0.4, y: -0.15, s: 0.018 },
      { x: 0.45, y: -0.2, s: 0.02 },
    ],
    []
  );

  return (
    <group position={[x, 2.3, -6.0]}>
      {/* 1. Nẹp viền gỗ mặt trong nhà (Interior Architrave / Casing) */}
      <Box position={[0, 0.68, 0.03]} size={[1.86, 0.08, 0.06]} color="#fffaf0" />
      <Box position={[-0.88, 0, 0.03]} size={[0.08, 1.36, 0.06]} color="#fffaf0" />
      <Box position={[0.88, 0, 0.03]} size={[0.08, 1.36, 0.06]} color="#fffaf0" />
      {/* Bậu cửa sổ trong phòng nhô ra đẹp mắt */}
      <Box position={[0, -0.72, 0.08]} size={[2.0, 0.08, 0.22]} color="#e9d5b5" />

      {/* 2. Bốn vách hộc cửa sổ (Window reveal / jambs) tạo chiều sâu khoét vào tường */}
      <Box position={[-0.84, 0, -0.15]} size={[0.04, 1.3, 0.32]} color="#fffaf0" />
      <Box position={[0.84, 0, -0.15]} size={[0.04, 1.3, 0.32]} color="#fffaf0" />
      <Box position={[0, 0.64, -0.15]} size={[1.68, 0.04, 0.32]} color="#fffaf0" />
      <Box position={[0, -0.64, -0.15]} size={[1.68, 0.04, 0.32]} color="#f0e6d6" />

      {/* 3. Khung kính & Nan chia ô (Window mullions) */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[1.64, 1.24]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.2}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0, -0.055]}>
        <boxGeometry args={[0.05, 1.24, 0.025]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0, -0.055]}>
        <boxGeometry args={[1.64, 0.05, 0.025]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>

      {/* 4. Hai cánh cửa chớp gỗ: Mở hướng RA NGOÀI TRỜI (hướng -Z) khi ban ngày, khép kín khi ban đêm */}
      <ShutterPanel side="left" isNight={timeConfig.isNight} />
      <ShutterPanel side="right" isNight={timeConfig.isNight} />

      {/* 5. Tấm nền bầu trời ngoài trời (Outdoor Sky plane & Atmospheric elements) */}
      <mesh position={[0, 0, -0.34]}>
        <planeGeometry args={[2.2, 1.5]} />
        <meshStandardMaterial
          color={timeConfig.skyColor}
          emissive={timeConfig.skyEmissive}
          emissiveIntensity={timeConfig.skyEmissiveIntensity}
        />
      </mesh>

      {/* Các yếu tố bầu trời bên ngoài */}
      {timeConfig.isNight ? (
        <>
          {/* Trăng khuyết lung linh ngoài trời */}
          <group position={[0.34, 0.28, -0.33]}>
            <mesh>
              <circleGeometry args={[0.16, 24]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh position={[0.06, 0.04, 0.001]}>
              <circleGeometry args={[0.14, 24]} />
              <meshBasicMaterial color={timeConfig.skyColor} />
            </mesh>
          </group>
          {/* Những vì sao lấp lánh ngoài trời */}
          {stars.map((st, i) => (
            <mesh key={i} position={[st.x, st.y, -0.33]}>
              <circleGeometry args={[st.s, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </>
      ) : (
        <>
          {/* Mặt trời ban ngày / hoàng hôn ngoài trời */}
          {timeConfig.phase === 'morning' && (
            <mesh position={[-0.45, 0.15, -0.33]}>
              <circleGeometry args={[0.18, 24]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          )}
          {timeConfig.phase === 'sunset' && (
            <mesh position={[-0.35, 0.02, -0.33]}>
              <circleGeometry args={[0.22, 24]} />
              <meshBasicMaterial color="#fb923c" />
            </mesh>
          )}
          {/* Mây trắng bồng bềnh ngoài trời */}
          <mesh position={[-0.35, 0.25, -0.33]}>
            <circleGeometry args={[0.13, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.18, 0.28, -0.33]}>
            <circleGeometry args={[0.17, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}
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
  const { diffuseTex, bumpTex } = useMemo(() => {
    if (typeof document === 'undefined') return { diffuseTex: null, bumpTex: null };

    const W = 2048;
    const H = 512;

    // Helper: Rounded rectangle path
    const drawRoundRect = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    };

    // Helper: Draw stylized carved duck crest
    const drawDuckCrest = (c: CanvasRenderingContext2D, cx: number, cy: number, scale: number) => {
      c.save();
      c.translate(cx, cy);
      c.scale(scale, scale);

      // Duck silhouette path
      c.beginPath();
      c.moveTo(-28, 12);
      c.bezierCurveTo(-28, -14, -12, -26, -2, -30);
      c.bezierCurveTo(8, -40, 24, -38, 30, -28);
      c.bezierCurveTo(36, -28, 48, -24, 52, -21); // mỏ vịt trên
      c.bezierCurveTo(50, -17, 40, -15, 32, -16); // mỏ vịt dưới
      c.bezierCurveTo(28, -6, 20, 6, 10, 11);
      c.bezierCurveTo(22, 15, 38, 14, 46, 6); // đuôi vịt
      c.bezierCurveTo(42, 19, 28, 26, 12, 27);
      c.bezierCurveTo(-4, 28, -20, 26, -28, 12);
      c.closePath();
      c.restore();
    };

    // Helper: Draw artisan carved laurel branch
    const drawLaurelBranch = (
      c: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      dir: number
    ) => {
      c.save();
      c.beginPath();
      c.moveTo(startX, startY);
      c.bezierCurveTo(
        startX + dir * 60,
        startY - 8,
        startX + dir * 130,
        startY + 4,
        startX + dir * 180,
        startY - 6
      );
      c.stroke();

      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        const lx = startX + dir * (t * 180);
        const ly = startY + (Math.sin(t * Math.PI) * -8) + (i % 2 === 0 ? 3 : -3);
        const leafAngle = (dir * 0.45) + (i % 2 === 0 ? 0.4 : -0.4);

        c.save();
        c.translate(lx, ly);
        c.rotate(leafAngle);
        c.beginPath();
        c.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
      }
      c.restore();
    };

    // Helper: Draw flanking carved flourishes (chạm trổ mộc hai bên)
    const drawSideFlourish = (
      c: CanvasRenderingContext2D,
      centerX: number,
      centerY: number,
      dir: number
    ) => {
      c.save();
      c.translate(centerX, centerY);
      c.scale(dir, 1);

      // Main curved acanthus vine
      c.beginPath();
      c.moveTo(-180, 0);
      c.bezierCurveTo(-120, -35, -40, -45, 40, -15);
      c.bezierCurveTo(100, 8, 140, 2, 170, -20);
      c.stroke();

      // Lower counter-curve
      c.beginPath();
      c.moveTo(-140, 10);
      c.bezierCurveTo(-80, 35, 10, 40, 90, 15);
      c.bezierCurveTo(130, 2, 150, 18, 160, 28);
      c.stroke();

      // Leaf buds along vine
      const buds = [
        { x: -90, y: -25, a: -0.6, s: 13 },
        { x: -20, y: -30, a: -0.3, s: 15 },
        { x: 50, y: -8, a: 0.4, s: 14 },
        { x: 120, y: 4, a: -0.5, s: 12 },
        { x: -40, y: 25, a: 0.5, s: 13 },
        { x: 40, y: 22, a: 0.2, s: 14 },
      ];
      buds.forEach(({ x, y, a, s }) => {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.beginPath();
        c.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
      });

      c.restore();
    };

    /* ------------------------------------------------------------- */
    /* 1. DIFFUSE TEXTURE CANVAS (Mặt gỗ tự nhiên + Chữ điêu khắc)   */
    /* ------------------------------------------------------------- */
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { diffuseTex: null, bumpTex: null };

    // A. Base rich warm wood plank gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#2e1509');
    bgGrad.addColorStop(0.12, '#3e2010');
    bgGrad.addColorStop(0.35, '#522c17');
    bgGrad.addColorStop(0.68, '#462413');
    bgGrad.addColorStop(0.88, '#391a0b');
    bgGrad.addColorStop(1, '#251006');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // B. Natural undulating wood grain streaks
    for (let i = 0; i < 200; i++) {
      const yBase = (i / 200) * H;
      const freq1 = 0.0022 + ((i * 19) % 11) * 0.0003;
      const freq2 = 0.0065 + ((i * 31) % 13) * 0.0004;
      const amp1 = 5 + (i % 8) * 2.5;
      const amp2 = 2.5 + (i % 5);
      const phase = (i * 57) % 200;

      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const y = yBase + Math.sin(x * freq1 + phase) * amp1 + Math.cos(x * freq2 + phase * 0.6) * amp2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const isDark = i % 3 !== 0;
      const alpha = 0.035 + (i % 6) * 0.015;
      ctx.strokeStyle = isDark ? `rgba(18, 8, 3, ${alpha})` : `rgba(180, 110, 58, ${alpha * 0.8})`;
      ctx.lineWidth = 1 + (i % 4) * 0.8;
      ctx.stroke();
    }

    // Natural wood knots
    const drawKnot = (kx: number, ky: number, maxR: number) => {
      for (let r = 8; r <= maxR; r += 7) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 1.8, r * 0.75, 0.08, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(22, 9, 4, ${0.12 - (r / maxR) * 0.08})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    };
    drawKnot(1740, 190, 85);
    drawKnot(310, 340, 65);

    // Perimeter antique patina vignette
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1150);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(14, 5, 2, 0.68)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    // C. Carved Double Border Grooves (Rãnh soi gỗ bo viền kép)
    const padOuter = 26;
    const rOuter = 26;
    // Recessed dark groove shadow (up-left)
    ctx.save();
    ctx.shadowColor = 'rgba(8, 3, 1, 0.95)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetX = -3;
    ctx.shadowOffsetY = -3;
    drawRoundRect(ctx, padOuter, padOuter, W - padOuter * 2, H - padOuter * 2, rOuter);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#150702';
    ctx.stroke();
    ctx.restore();

    // Groove highlight rim (down-right)
    drawRoundRect(ctx, padOuter + 2, padOuter + 2, W - (padOuter + 2) * 2, H - (padOuter + 2) * 2, rOuter);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 235, 175, 0.35)';
    ctx.stroke();

    // Inlaid gold fillet
    drawRoundRect(ctx, padOuter, padOuter, W - padOuter * 2, H - padOuter * 2, rOuter);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.75)';
    ctx.stroke();

    // Inner fine carved groove
    const padInner = 46;
    const rInner = 16;
    drawRoundRect(ctx, padInner, padInner, W - padInner * 2, H - padInner * 2, rInner);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.stroke();

    // D. Flanking Carved Craftsman Flourishes (Hoa văn mộc nghệ thuật hai bên)
    const flourishY = 285;
    // Left flourish
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
    drawSideFlourish(ctx, 380, flourishY, 1);
    // Right flourish (mirrored)
    drawSideFlourish(ctx, W - 380, flourishY, -1);

    // E. Carved Duck Crest (Huy hiệu chú vịt chạm khắc ở giữa trên)
    const crestX = W / 2;
    const crestY = 96;

    // Laurel branches flanking duck crest
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.75)';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
    drawLaurelBranch(ctx, crestX - 55, crestY, -1);
    drawLaurelBranch(ctx, crestX + 55, crestY, 1);

    // Duck Crest: Shadow pass (recessed depth)
    ctx.save();
    ctx.shadowColor = 'rgba(8, 3, 1, 0.98)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = -3;
    ctx.shadowOffsetY = -4;
    drawDuckCrest(ctx, crestX, crestY, 1.05);
    ctx.fillStyle = '#140602';
    ctx.fill();
    ctx.restore();

    // Duck Crest: Lower-right rim highlight
    ctx.save();
    drawDuckCrest(ctx, crestX + 2, crestY + 3, 1.05);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.fill();
    ctx.restore();

    // Duck Crest: Burnt groove stroke
    ctx.save();
    drawDuckCrest(ctx, crestX, crestY, 1.05);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#220d04';
    ctx.stroke();
    ctx.restore();

    // Duck Crest: Radiant gold leaf fill
    ctx.save();
    const crestGold = ctx.createLinearGradient(0, crestY - 35, 0, crestY + 35);
    crestGold.addColorStop(0, '#fffbeb');
    crestGold.addColorStop(0.2, '#fde047');
    crestGold.addColorStop(0.55, '#eab308');
    crestGold.addColorStop(0.85, '#ca8a04');
    crestGold.addColorStop(1, '#854d0e');
    ctx.fillStyle = crestGold;
    drawDuckCrest(ctx, crestX, crestY, 1.05);
    ctx.fill();

    // Wing feather & eye detail
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(crestX + 19, crestY - 26, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1e0c03';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(crestX - 6, crestY + 4);
    ctx.bezierCurveTo(crestX + 10, crestY + 1, crestX + 24, crestY + 4, crestX + 34, crestY + 10);
    ctx.stroke();
    ctx.restore();

    // F. MAIN CARVED LETTERING: "Nhà của Vịt" (Điêu khắc trực tiếp vào thớ gỗ)
    const text = 'Nhà của Vịt';
    const textY = 276;
    const fontPrimary = 'bold 172px "Georgia", "Times New Roman", serif';

    // Pass 1: Deep Chisel Cavity Shadow (Rãnh khoét sâu chìm vào gỗ)
    ctx.save();
    ctx.font = fontPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(4, 2, 1, 0.98)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = -7;
    ctx.fillStyle = '#120502';
    ctx.fillText(text, crestX, textY);
    ctx.restore();

    // Pass 2: Lower-Right Chisel Lip Specular Highlight (Mép vát rãnh đục bắt sáng)
    ctx.save();
    ctx.font = fontPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 248, 197, 0.65)';
    ctx.fillText(text, crestX + 4, textY + 5);
    ctx.restore();

    // Pass 3: Dark Burnt Chiseled Groove Wall (Thành rãnh gỗ đục cháy sém)
    ctx.save();
    ctx.font = fontPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1e0a03';
    ctx.strokeText(text, crestX, textY);
    ctx.restore();

    // Pass 4: Radiant Gold Leaf Inlay (Thếp vàng hoàng gia lấp lánh trong lòng rãnh chữ)
    ctx.save();
    const textGold = ctx.createLinearGradient(0, textY - 88, 0, textY + 88);
    textGold.addColorStop(0, '#ffffff');    // Ánh kim rực sáng đỉnh chữ
    textGold.addColorStop(0.12, '#fef08a'); // Vàng kim chói lọi
    textGold.addColorStop(0.38, '#facc15'); // Vàng ròng nguyên chất
    textGold.addColorStop(0.68, '#eab308'); // Vàng hoàng kim đậm
    textGold.addColorStop(0.88, '#ca8a04'); // Vàng hổ phách cổ
    textGold.addColorStop(1, '#78350f');    // Đồng thau chìm sâu đáy rãnh
    ctx.fillStyle = textGold;
    ctx.font = fontPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, crestX, textY);

    // Pass 5: Crisp Chisel Center Ridge (Sống dao khắc chữ sắc sảo)
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = 'rgba(255, 255, 245, 0.85)';
    ctx.strokeText(text, crestX, textY);
    ctx.restore();

    // G. Carved Subtitle / Artisan Hallmark below (Họa tiết & Tiêu đề mộc)
    const subY = 432;
    ctx.save();
    ctx.font = 'bold 32px "Georgia", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Subtitle shadow
    ctx.fillStyle = 'rgba(10, 4, 1, 0.88)';
    ctx.fillText('✦  THE DUCK CRAFT HOUSE  •  EST. 2004  ✦', crestX - 1.5, subY - 1.5);
    // Subtitle gold
    ctx.fillStyle = 'rgba(253, 224, 71, 0.9)';
    ctx.fillText('✦  THE DUCK CRAFT HOUSE  •  EST. 2004  ✦', crestX, subY);
    ctx.restore();

    /* ------------------------------------------------------------- */
    /* 2. SYNCHRONIZED 3D BUMP MAP (Bản đồ độ sâu 3D điêu khắc)     */
    /* ------------------------------------------------------------- */
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = W;
    bumpCanvas.height = H;
    const bCtx = bumpCanvas.getContext('2d');
    if (!bCtx) return { diffuseTex: null, bumpTex: null };

    // Neutral baseline surface (mid grey = 128)
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, W, H);

    // Wood grain height noise
    for (let i = 0; i < 120; i++) {
      const yBase = (i / 120) * H;
      const freq = 0.003 + (i % 7) * 0.0004;
      bCtx.beginPath();
      for (let x = 0; x <= W; x += 32) {
        const y = yBase + Math.sin(x * freq) * 3;
        if (x === 0) bCtx.moveTo(x, y);
        else bCtx.lineTo(x, y);
      }
      bCtx.strokeStyle = i % 2 === 0 ? 'rgba(110, 110, 110, 0.15)' : 'rgba(146, 146, 146, 0.15)';
      bCtx.lineWidth = 2;
      bCtx.stroke();
    }

    // Bump Border: Inward depression (#252525) and raised lip (#e0e0e0)
    drawRoundRect(bCtx, padOuter, padOuter, W - padOuter * 2, H - padOuter * 2, rOuter);
    bCtx.lineWidth = 6;
    bCtx.strokeStyle = '#252525';
    bCtx.stroke();

    drawRoundRect(bCtx, padOuter + 2, padOuter + 2, W - (padOuter + 2) * 2, H - (padOuter + 2) * 2, rOuter);
    bCtx.lineWidth = 3;
    bCtx.strokeStyle = '#e0e0e0';
    bCtx.stroke();

    // Bump Duck Crest
    bCtx.save();
    drawDuckCrest(bCtx, crestX - 3, crestY - 4, 1.05);
    bCtx.fillStyle = '#181818';
    bCtx.fill();
    drawDuckCrest(bCtx, crestX + 2, crestY + 3, 1.05);
    bCtx.fillStyle = '#e8e8e8';
    bCtx.fill();
    drawDuckCrest(bCtx, crestX, crestY, 1.05);
    bCtx.fillStyle = '#404040';
    bCtx.fill();
    bCtx.restore();

    // Bump Text "Nhà của Vịt"
    bCtx.save();
    bCtx.font = fontPrimary;
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';

    // Deep chiseled groove (offset -5, -7)
    bCtx.fillStyle = '#101010';
    bCtx.fillText(text, crestX - 5, textY - 7);

    // Highlight ridge (offset +4, +5)
    bCtx.fillStyle = '#f5f5f5';
    bCtx.fillText(text, crestX + 4, textY + 5);

    // Carved letter floor
    bCtx.fillStyle = '#3c3c3c';
    bCtx.fillText(text, crestX, textY);
    bCtx.restore();

    // Create Three.js Textures
    const diffuse = new THREE.CanvasTexture(canvas);
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.needsUpdate = true;

    const bump = new THREE.CanvasTexture(bumpCanvas);
    bump.needsUpdate = true;

    return { diffuseTex: diffuse, bumpTex: bump };
  }, []);

  if (!diffuseTex || !bumpTex) return null;

  return (
    <group position={[0, 2.92, -5.9]}>
      {/* Tấm gỗ bảng hiệu nguyên khối chiều ngang 1.70m bằng chiều ngang cửa chính */}
      <Box position={[0, 0, 0]} size={[1.70, 0.44, 0.05]} color="#381c0c" roughness={0.75} />

      {/* Khung phào chỉ gỗ 4 cạnh bo viền nổi bật (chiều ngang 1.70m) */}
      <Box position={[0, 0.205, 0.02]} size={[1.70, 0.035, 0.05]} color="#2c1408" roughness={0.7} />
      <Box position={[0, -0.205, 0.02]} size={[1.70, 0.035, 0.05]} color="#2c1408" roughness={0.7} />
      <Box position={[-0.832, 0, 0.02]} size={[0.035, 0.38, 0.05]} color="#2c1408" roughness={0.7} />
      <Box position={[0.832, 0, 0.02]} size={[0.035, 0.38, 0.05]} color="#2c1408" roughness={0.7} />

      {/* 2 Quai pass gắn kim loại đồng cổ cố định trên đỉnh biển (Antique Brass Mounting Straps) */}
      <Box position={[-0.52, 0.25, 0.015]} size={[0.04, 0.09, 0.02]} color="#ca8a04" metalness={0.85} roughness={0.25} />
      <Box position={[0.52, 0.25, 0.015]} size={[0.04, 0.09, 0.02]} color="#ca8a04" metalness={0.85} roughness={0.25} />
      <mesh position={[-0.52, 0.27, 0.028]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.52, 0.27, 0.028]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 4 Đinh tán đồng bán cầu cổ điển cố định 4 góc biển hiệu (Antique Brass Corner Studs) */}
      <mesh position={[-0.78, 0.16, 0.032]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.78, 0.16, 0.032]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.78, -0.16, 0.032]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.78, -0.16, 0.032]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Mặt gỗ điêu khắc chữ "Nhà của Vịt" thếp vàng & vân gỗ tự nhiên với 3D Bump Map */}
      <mesh position={[0, 0, 0.028]}>
        <planeGeometry args={[1.64, 0.40]} />
        <meshStandardMaterial
          map={diffuseTex}
          bumpMap={bumpTex}
          bumpScale={0.035}
          roughness={0.48}
          metalness={0.14}
        />
      </mesh>

      {/* Ánh sáng điểm rọi dịu nhẹ làm nổi bật chữ chạm khắc & lấp lánh nhũ vàng */}
      <pointLight position={[0, 0.30, 0.22]} intensity={0.85} color="#fef3c7" distance={2.8} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cozy Room Decor & Ambiance Details                                  */
/* ------------------------------------------------------------------ */

function useWindowSunlightTexture(timeConfig: TimeConfig) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 512);

    const isSunset = timeConfig.phase === 'sunset';
    const isMorning = timeConfig.phase === 'morning';

    // Tone colors tailored to each time phase
    const colHalo = isSunset
      ? 'rgba(251, 146, 60, '
      : isMorning
        ? 'rgba(254, 215, 170, '
        : 'rgba(255, 240, 180, ';

    const colPane = isSunset
      ? 'rgba(253, 186, 116, '
      : isMorning
        ? 'rgba(255, 237, 190, '
        : 'rgba(255, 250, 220, ';

    // 1. Broad soft ambient glow on floor (vầng sáng tỏa êm dịu, tan biến tự nhiên vào vân gỗ sàn)
    const haloGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
    haloGrad.addColorStop(0, colHalo + '0.28)');
    haloGrad.addColorStop(0.45, colHalo + '0.14)');
    haloGrad.addColorStop(0.8, colHalo + '0.03)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vệt nắng 4 ô kính cửa sổ: 4 mảng sáng mềm mại, tự nhiên, liền mạch (KHÔNG PHẢI 4 chấm tròn)
    // Các ô kính trải đều theo phối cảnh xiên:
    // Thanh đố cửa (mullion) tạo khe bóng mờ mềm mại ở trục X=256 và Y=256
    const panes = [
      // Top-Left (gần tường)
      { x: 92, y: 72, w: 148, h: 168, r: 14 },
      // Top-Right (gần tường)
      { x: 272, y: 72, w: 148, h: 168, r: 14 },
      // Bottom-Left (vươn ra phía sàn phòng)
      { x: 80, y: 272, w: 160, h: 172, r: 18 },
      // Bottom-Right (vươn ra phía sàn phòng)
      { x: 272, y: 272, w: 160, h: 172, r: 18 },
    ];

    panes.forEach((p) => {
      ctx.save();
      // Gradient nhẹ nhàng từ trên xuống dưới (độ sáng đồng đều, êm dịu, không bị đốm tâm)
      const grad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      grad.addColorStop(0, colPane + '0.55)');
      grad.addColorStop(0.5, colPane + '0.45)');
      grad.addColorStop(1, colPane + '0.35)');

      ctx.fillStyle = grad;
      // Bóng nhòe quang học tự nhiên (optical penumbra)
      ctx.shadowColor = colPane + '0.35)';
      ctx.shadowBlur = 16;

      ctx.beginPath();
      const r = p.r;
      ctx.moveTo(p.x + r, p.y);
      ctx.lineTo(p.x + p.w - r, p.y);
      ctx.quadraticCurveTo(p.x + p.w, p.y, p.x + p.w, p.y + r);
      ctx.lineTo(p.x + p.w, p.y + p.h - r);
      ctx.quadraticCurveTo(p.x + p.w, p.y + p.h, p.x + p.w - r, p.y + p.h);
      ctx.lineTo(p.x + r, p.y + p.h);
      ctx.quadraticCurveTo(p.x, p.y + p.h, p.x, p.y + p.h - r);
      ctx.lineTo(p.x, p.y + r);
      ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
      ctx.closePath();
      ctx.fill();

      // Vệt bóng nan chớp thanh mảnh mềm mại
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      const slatCount = 3;
      const step = p.h / (slatCount + 1);
      for (let s = 1; s <= slatCount; s++) {
        const sy = p.y + s * step;
        ctx.fillRect(p.x + 8, sy - 2, p.w - 16, 4);
      }

      ctx.restore();
    });

    // 3. Feathering mask: Đảm bảo toàn bộ 4 cạnh của canvas mờ dần về 0 alpha, tuyệt đối không bị viền hình vuông
    ctx.globalCompositeOperation = 'destination-in';
    const edgeFade = ctx.createRadialGradient(256, 256, 175, 256, 256, 252);
    edgeFade.addColorStop(0, 'rgba(0, 0, 0, 1)');
    edgeFade.addColorStop(0.85, 'rgba(0, 0, 0, 0.85)');
    edgeFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = edgeFade;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, [timeConfig.phase]);
}

function useWindowBeamTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 128, 256);

    // Dọc từ trên xuống (Y: 0 là đỉnh cửa sổ, 256 là đáy chạm sàn):
    // - Đỉnh (cửa sổ): mờ dần vào (0 -> 0.7 ở top 12%)
    // - Giữa không trung: luồng sáng mịn màng (0.85 - 1.0)
    // - Đáy tiếp cận sàn: MỜ DẦN HOÀN TOÀN VỀ 0.0 (tuyệt đối không cắt ngang mặt sàn thành đường viền!)
    const vGrad = ctx.createLinearGradient(0, 0, 0, 256);
    vGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0.7)');
    vGrad.addColorStop(0.35, 'rgba(255, 255, 255, 1.0)');
    vGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.75)');
    vGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.2)');
    vGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)'); // 0% opacity ở đáy

    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, 128, 256);

    // Ngang: làm mềm 2 bên sườn của luồng sáng (cosine curve để không có cạnh gắt 2 bên)
    ctx.globalCompositeOperation = 'destination-in';
    const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
    hGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    hGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.7)');
    hGrad.addColorStop(0.5, 'rgba(0, 0, 0, 1)');
    hGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.7)');
    hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, 128, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function WindowBeam({
  x,
  zFloor,
  timeConfig,
}: {
  x: number;
  zFloor: number;
  timeConfig: TimeConfig;
}) {
  if (timeConfig.isNight) return null;

  const sunTex = useWindowSunlightTexture(timeConfig);
  const beamTex = useWindowBeamTexture();
  const floorMeshRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    return Array.from({ length: 18 }, () => ({
      rx: (Math.random() - 0.5) * 1.5,
      ry: 0.2 + Math.random() * 2.0,
      rz: (Math.random() - 0.5) * 1.8,
      speed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      size: 0.02 + Math.random() * 0.025,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (floorMeshRef.current) {
      const mat = floorMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        // Ánh nắng thở nhẹ nhàng tự nhiên theo bầu khí quyển
        mat.opacity = timeConfig.floorPatchOpacity + Math.sin(t * 0.8) * 0.012;
      }
    }
    if (dustRef.current) {
      dustRef.current.children.forEach((c, idx) => {
        const p = particles[idx];
        if (p) {
          c.position.y = 0.2 + ((p.ry + t * 0.12 * p.speed) % 2.1);
          c.position.x = p.rx + Math.sin(t * p.speed + p.phase) * 0.06;
        }
      });
    }
  });

  return (
    <group position={[x, 0, 0]}>
      {/* Vệt nắng tự nhiên chiếu từ cửa sổ xuống sàn gỗ: 4 mảng sáng mềm mại, viền nhòe tự nhiên */}
      {sunTex && (
        <mesh
          ref={floorMeshRef}
          position={[0, 0.005, zFloor]}
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={[2.5, 2.7]} />
          <meshBasicMaterial
            map={sunTex}
            transparent
            opacity={timeConfig.floorPatchOpacity * 0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Volumetric sunbeam shaft: mềm mại, mờ dần về 0 ở đáy nên KHÔNG BAO GIỜ bị cắt viền trên mặt sàn */}
      <mesh
        position={[0, 1.18, (zFloor - 5.8) / 2]}
        rotation={[-Math.atan2(zFloor - (-5.8), 2.3), 0, 0]}
      >
        <cylinderGeometry args={[0.72, 1.25, 3.8, 32, 1, true]} />
        <meshBasicMaterial
          map={beamTex ?? undefined}
          color={timeConfig.beamColor}
          transparent
          opacity={timeConfig.beamOpacity * 0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Floating dust motes / stardust */}
      <group ref={dustRef} position={[0, 0, (zFloor - 5.8) / 2]}>
        {particles.map((p, i) => (
          <mesh key={i} position={[p.rx, p.ry, p.rz]}>
            <sphereGeometry args={[p.size, 8, 8]} />
            <meshBasicMaterial
              color={timeConfig.dustColor}
              transparent
              opacity={timeConfig.isNight ? 0.65 : 0.45}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function AtmosphericDust({ isNight }: { isNight?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 75;

  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = 0.6 + Math.random() * 3.2;
      pos[i * 3 + 2] = -4.8 + Math.random() * 9.6;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, ph];
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime() * 0.35;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx + 1] += Math.sin(t + phases[i]) * 0.0012;
      arr[idx + 0] += Math.cos(t * 0.8 + phases[i]) * 0.0006;
      if (arr[idx + 1] > 3.9) arr[idx + 1] = 0.6;
      if (arr[idx + 1] < 0.5) arr[idx + 1] = 3.8;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.042}
        color={isNight ? '#bae6fd' : '#fef08a'}
        transparent
        opacity={isNight ? 0.35 : 0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function WallClock({ position, time }: { position: V3; time?: Date }) {
  const secondHand = useRef<THREE.Mesh>(null);
  const minuteHand = useRef<THREE.Mesh>(null);
  const hourHand = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const d = time ?? new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;

    if (secondHand.current) secondHand.current.rotation.z = -s * (Math.PI / 30);
    if (minuteHand.current) minuteHand.current.rotation.z = -m * (Math.PI / 30);
    if (hourHand.current) hourHand.current.rotation.z = -h * (Math.PI / 6);
  });

  return (
    <group position={position}>
      {/* Outer wood bezel */}
      <Cyl position={[0, 0, 0]} args={[0.38, 0.38, 0.06, 32]} color="#78350f" rotation={[Math.PI / 2, 0, 0]} />
      {/* Dial face */}
      <mesh position={[0, 0, 0.035]}>
        <circleGeometry args={[0.33, 32]} />
        <meshStandardMaterial color="#fffef0" roughness={0.8} />
      </mesh>
      {/* 12 Hour ticks */}
      {Array.from({ length: 12 }, (_, i) => {
        const ang = (i * Math.PI) / 6;
        const isMajor = i % 3 === 0;
        return (
          <mesh
            key={i}
            position={[Math.sin(ang) * 0.27, Math.cos(ang) * 0.27, 0.04]}
            rotation={[0, 0, -ang]}
          >
            <planeGeometry args={[isMajor ? 0.024 : 0.012, isMajor ? 0.06 : 0.035]} />
            <meshBasicMaterial color={isMajor ? '#1e293b' : '#64748b'} />
          </mesh>
        );
      })}
      {/* Center cap */}
      <mesh position={[0, 0, 0.052]}>
        <circleGeometry args={[0.028, 16]} />
        <meshBasicMaterial color="#ea580c" />
      </mesh>
      {/* Hour hand */}
      <mesh ref={hourHand} position={[0, 0, 0.041]}>
        <planeGeometry args={[0.026, 0.16]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Minute hand */}
      <mesh ref={minuteHand} position={[0, 0, 0.044]}>
        <planeGeometry args={[0.02, 0.22]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Second hand */}
      <mesh ref={secondHand} position={[0, 0, 0.047]}>
        <planeGeometry args={[0.01, 0.26]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function BuntingGarland() {
  const flags = useMemo(() => {
    const colors = ['#f43f5e', '#fbbf24', '#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#4ade80', '#f472b6'];
    const count = 22;
    return Array.from({ length: count }, (_, i) => {
      const u = (i - count / 2) / (count / 2); // -1 to 1
      const x = u * 7.2;
      // Scalloped festive sag in 2 waves
      const wave = Math.sin(Math.abs(u) * Math.PI);
      const sag = wave * 0.16;
      const y = 3.80 - sag;
      const z = -5.92;
      return { x, y, z, color: colors[i % colors.length] };
    });
  }, []);

  return (
    <group>
      {flags.map((f, i) => (
        <group key={i} position={[f.x, f.y, f.z]}>
          <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.13, 0.24, 3]} />
            <meshStandardMaterial color={f.color} side={THREE.DoubleSide} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PegboardMemo({ position }: { position: V3 }) {
  return (
    <group position={position}>
      {/* Wood frame */}
      <Box position={[0, 0, 0]} size={[1.3, 0.9, 0.04]} color="#8d6e63" />
      {/* Cork face */}
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#d4b28c" roughness={0.9} />
      </mesh>
      {/* Yellow sticky note */}
      <mesh position={[-0.32, 0.16, 0.026]} rotation={[0, 0, 0.08]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
      {/* Sky blue project note */}
      <mesh position={[-0.04, 0.14, 0.026]} rotation={[0, 0, -0.05]}>
        <planeGeometry args={[0.24, 0.18]} />
        <meshBasicMaterial color="#7dd3fc" />
      </mesh>
      {/* CMYK color swatch strip */}
      <group position={[0.34, 0.1, 0.026]} rotation={[0, 0, 0.04]}>
        <mesh>
          <planeGeometry args={[0.18, 0.44]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {['#00b4d8', '#f43f5e', '#facc15', '#0f172a'].map((col, idx) => (
          <mesh key={col} position={[0, 0.14 - idx * 0.09, 0.002]}>
            <planeGeometry args={[0.12, 0.07]} />
            <meshBasicMaterial color={col} />
          </mesh>
        ))}
      </group>
      {/* Polaroid style mini photo */}
      <group position={[-0.2, -0.18, 0.026]} rotation={[0, 0, -0.06]}>
        <mesh>
          <planeGeometry args={[0.28, 0.32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.03, 0.002]}>
          <planeGeometry args={[0.22, 0.2]} />
          <meshBasicMaterial color="#fcd34d" />
        </mesh>
      </group>
      {/* Pins */}
      {[
        [-0.32, 0.26],
        [-0.04, 0.22],
        [0.34, 0.31],
        [-0.2, -0.03],
      ].map(([px, py], i) => (
        <mesh key={i} position={[px, py, 0.032]}>
          <circleGeometry args={[0.016, 12]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#ef4444' : '#2563eb'} />
        </mesh>
      ))}
    </group>
  );
}

function WelcomeDoormat() {
  const fringes = useMemo(() => Array.from({ length: 14 }, (_, i) => -0.42 + i * 0.065), []);
  return (
    <group position={[0, 0.012, -4.9]}>
      {/* Soft contact shadow */}
      <mesh position={[0, -0.004, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.76, 1.04]} />
        <meshBasicMaterial color="#1a110a" transparent opacity={0.25} />
      </mesh>
      {/* Base woven mat */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1.7, 0.98]} />
        <meshStandardMaterial color="#f7ecd7" roughness={0.9} />
      </mesh>
      {/* Inner border */}
      <mesh position={[0, 0.001, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.52, 0.8]} />
        <meshStandardMaterial color="#c2410c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.4, 0.68]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.9} />
      </mesh>
      {/* Cute Duck Footprint in center */}
      <group position={[0, 0.003, 0]}>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.07, 16]} />
          <meshStandardMaterial color="#ea580c" />
        </mesh>
        {[-0.28, 0, 0.28].map((ang, i) => (
          <mesh
            key={i}
            position={[Math.sin(ang) * 0.13, 0, -Math.cos(ang) * 0.13]}
            rotation-x={-Math.PI / 2}
          >
            <circleGeometry args={[0.045, 12]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
        ))}
      </group>
      {/* Fringes */}
      {fringes.map((z, i) => (
        <React.Fragment key={i}>
          <Box position={[-0.88, 0.004, z]} size={[0.06, 0.006, 0.04]} color="#e2d4bc" />
          <Box position={[0.88, 0.004, z]} size={[0.06, 0.006, 0.04]} color="#e2d4bc" />
        </React.Fragment>
      ))}
    </group>
  );
}

function DuckSlippers({ position, rotation }: { position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      {[-0.14, 0.14].map((ox, i) => (
        <group key={i} position={[ox, 0, 0]}>
          <Box position={[0, 0.02, 0]} size={[0.18, 0.03, 0.32]} color="#fed7aa" />
          <mesh position={[0, 0.07, -0.05]} castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color="#facc15" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.06, -0.17]}>
            <boxGeometry args={[0.07, 0.025, 0.06]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
          <mesh position={[-0.04, 0.09, -0.14]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.04, 0.09, -0.14]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CuttingMat({ position }: { position: V3 }) {
  const gridLinesX = useMemo(() => [-0.3, -0.15, 0, 0.15, 0.3], []);
  const gridLinesZ = useMemo(() => [-0.2, -0.1, 0, 0.1, 0.2], []);
  return (
    <group position={position} rotation={[0, 0.12, 0]}>
      <Box position={[0, 0.008, 0]} size={[0.85, 0.012, 0.58]} color="#1b4332" roughness={0.6} />
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.78, 0.5]} />
        <meshBasicMaterial color="#2d6a4f" />
      </mesh>
      {gridLinesX.map((gx) => (
        <mesh key={gx} position={[gx, 0.016, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.004, 0.5]} />
          <meshBasicMaterial color="#74c69d" />
        </mesh>
      ))}
      {gridLinesZ.map((gz) => (
        <mesh key={gz} position={[0, 0.016, gz]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.78, 0.004]} />
          <meshBasicMaterial color="#74c69d" />
        </mesh>
      ))}
      <Box position={[-0.05, 0.022, 0.18]} size={[0.62, 0.008, 0.04]} color="#cbd5e1" metalness={0.7} roughness={0.3} />
      <group position={[0.22, 0.024, -0.06]} rotation={[0, 0.45, 0]}>
        <Cyl position={[0, 0, 0]} args={[0.012, 0.012, 0.22, 8]} color="#facc15" rotation={[Math.PI / 2, 0, 0]} />
        <Box position={[0, 0, -0.13]} size={[0.004, 0.02, 0.05]} color="#f1f5f9" metalness={0.9} roughness={0.1} />
      </group>
    </group>
  );
}

function PrintTestStrips({ position }: { position: V3 }) {
  const cmyk = ['#00b4d8', '#f72585', '#ffd60a', '#1e293b'];
  return (
    <group position={position} rotation={[0, -0.25, 0]}>
      <mesh position={[0, 0.008, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.75, 0.22]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {cmyk.map((col, idx) => (
        <mesh key={col} position={[-0.26 + idx * 0.12, 0.01, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.09, 0.14]} />
          <meshBasicMaterial color={col} />
        </mesh>
      ))}
      <mesh position={[0.26, 0.01, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.035, 0.045, 16]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

function OpenedCartonBox({ position, rotation }: { position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Box position={[0, 0.18, 0]} size={[0.65, 0.36, 0.55]} color="#c99e69" />
      <mesh position={[0, 0.36, 0.27]} rotation={[-0.45, 0, 0]}>
        <planeGeometry args={[0.63, 0.18]} />
        <meshStandardMaterial color="#b88c55" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.36, -0.27]} rotation={[0.45, 0, 0]}>
        <planeGeometry args={[0.63, 0.18]} />
        <meshStandardMaterial color="#b88c55" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.32, 0.36, 0]} rotation={[0, 0, -0.45]}>
        <planeGeometry args={[0.18, 0.53]} />
        <meshStandardMaterial color="#b88c55" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.32, 0.36, 0]} rotation={[0, 0, 0.45]}>
        <planeGeometry args={[0.18, 0.53]} />
        <meshStandardMaterial color="#b88c55" side={THREE.DoubleSide} />
      </mesh>
      <Cyl position={[-0.12, 0.3, 0.02]} args={[0.08, 0.08, 0.34, 16]} color="#38bdf8" />
      <Cyl position={[0.12, 0.32, -0.04]} args={[0.085, 0.085, 0.36, 16]} color="#fbbf24" />
    </group>
  );
}

function PowerStrip({ position }: { position: V3 }) {
  return (
    <group position={position} rotation={[0, 0.1, 0]}>
      <Box position={[0, 0.02, 0]} size={[0.18, 0.04, 0.52]} color="#f8fafc" roughness={0.7} />
      {[-0.16, -0.05, 0.06, 0.17].map((z, i) => (
        <group key={i} position={[0, 0.041, z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.035, 12]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {i === 1 && (
            <group position={[0, 0.04, 0]}>
              <Box position={[0, 0, 0]} size={[0.08, 0.06, 0.06]} color="#1e293b" />
            </group>
          )}
        </group>
      ))}
      <Box position={[0, 0.042, -0.22]} size={[0.06, 0.015, 0.04]} color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} />
      <mesh position={[0.2, 0.01, 0.28]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.35, 0.02]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

function WasteBasket({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Cyl position={[0, 0.2, 0]} args={[0.18, 0.14, 0.4, 20]} color="#475569" />
      <Cyl position={[0, 0.02, 0]} args={[0.14, 0.14, 0.04, 20]} color="#334155" />
      <mesh position={[-0.04, 0.22, 0.03]}>
        <dodecahedronGeometry args={[0.05, 0]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      <mesh position={[0.04, 0.25, -0.03]}>
        <dodecahedronGeometry args={[0.055, 0]} />
        <meshStandardMaterial color="#fef08a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function PlushBeanbagLounge({
  position,
  onRelaxClick,
  isLounging,
}: {
  position: V3;
  onRelaxClick?: () => void;
  isLounging?: boolean;
}) {
  const fringes = useMemo(() => Array.from({ length: 9 }, (_, i) => -0.24 + i * 0.06), []);

  return (
    <group
      position={position}
      rotation={[0, -0.45, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onRelaxClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* Soft contact shadow on the floor */}
      <mesh position={[0, 0.004, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.2, 36]} />
        <meshBasicMaterial color="#1a110a" transparent opacity={0.28} />
      </mesh>

      {/* --- Main Plump Pouf Base (fluffy, squashed organically against floor) --- */}
      <mesh position={[0, 0.22, 0.06]} scale={[1.42, 0.48, 1.32]} castShadow receiveShadow>
        <sphereGeometry args={[0.78, 28, 20]} />
        <meshStandardMaterial color="#c2593f" roughness={0.95} />
      </mesh>

      {/* Lower welt / piping seam trim */}
      <mesh position={[0, 0.16, 0.06]} rotation-x={Math.PI / 2} scale={[1.44, 1.34, 1]}>
        <torusGeometry args={[0.76, 0.018, 8, 36]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>

      {/* --- Ergonomic Sunken Seating Cavity --- */}
      <mesh position={[0, 0.28, 0.14]} scale={[1.12, 0.22, 0.98]} receiveShadow>
        <sphereGeometry args={[0.64, 24, 16]} />
        <meshStandardMaterial color="#ab472e" roughness={0.98} />
      </mesh>

      {/* --- Tall Plump Backrest Bulge (leaning naturally) --- */}
      <mesh
        position={[0.02, 0.54, -0.28]}
        rotation={[-0.34, 0.08, -0.06]}
        scale={[1.2, 0.88, 0.8]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.64, 24, 20]} />
        <meshStandardMaterial color="#c2593f" roughness={0.95} />
      </mesh>

      {/* Upper backrest piping contour */}
      <mesh
        position={[0.02, 0.54, -0.28]}
        rotation={[-0.34, 0.08, -0.06]}
        scale={[1.22, 0.9, 0.82]}
      >
        <torusGeometry args={[0.63, 0.016, 8, 32]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>

      {/* --- Top Leather Pull Handle with Brass Rivets --- */}
      <group position={[0.02, 0.95, -0.4]} rotation={[-0.2, 0, 0]}>
        {/* Leather strap */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.13, 0.022, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#4a2c17" roughness={0.65} />
        </mesh>
        {/* Left brass rivet */}
        <mesh position={[-0.13, 0, 0]}>
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Right brass rivet */}
        <mesh position={[0.13, 0, 0]}>
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* --- Cozy Knitted Waffle Throw Blanket draped over side --- */}
      <group position={[0.44, 0.34, 0.06]} rotation={[0.1, 0.3, -0.35]}>
        {/* Blanket fold on seat & edge */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.44, 0.045, 0.68]} />
          <meshStandardMaterial color="#faf8f5" roughness={0.9} />
        </mesh>
        {/* Blanket draping down to floor */}
        <mesh position={[0.22, -0.18, 0]} rotation={[0, 0, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.038, 0.68]} />
          <meshStandardMaterial color="#faf8f5" roughness={0.9} />
        </mesh>
        {/* Blanket hem fringe tassels */}
        {fringes.map((fz, idx) => (
          <mesh key={idx} position={[0.38, -0.32, fz]}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 6]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* --- Tufted Round Velvet Lumbar Cushion --- */}
      <group position={[-0.18, 0.4, 0.09]} rotation={[0.22, 0.28, -0.15]}>
        {/* Cushion disc */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.13, 24]} />
          <meshStandardMaterial color="#2a9d8f" roughness={0.7} />
        </mesh>
        {/* Rounded cushion torus rim */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.27, 0.05, 12, 24]} />
          <meshStandardMaterial color="#2a9d8f" roughness={0.7} />
        </mesh>
        {/* Center Tufted Button */}
        <mesh position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color="#fef08a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function ChillOrangeJuiceTable({ position }: { position: V3 }) {
  return (
    <group
      position={position}
      scale={1.48}
      onClick={(e) => {
        e.stopPropagation();
        duckAudio.playFeedChime();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* Contact shadow on floor */}
      <mesh position={[0, 0.003, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.32, 24]} />
        <meshBasicMaterial color="#1a110a" transparent opacity={0.25} />
      </mesh>

      {/* --- Round Mid-Century Tabletop --- */}
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.035, 32]} />
        <meshStandardMaterial color="#fefae0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.224, 0.224, 0.028, 32]} />
        <meshStandardMaterial color="#d4a373" roughness={0.6} />
      </mesh>

      {/* --- 3 Splayed Wooden Legs with Brass Tips --- */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => {
        const r = 0.14;
        const lx = Math.cos(angle) * r;
        const lz = Math.sin(angle) * r;
        return (
          <group key={i} position={[lx, 0.16, lz]}>
            <mesh
              rotation={[Math.sin(angle) * 0.16, 0, -Math.cos(angle) * 0.16]}
              castShadow
            >
              <cylinderGeometry args={[0.014, 0.018, 0.32, 12]} />
              <meshStandardMaterial color="#8c5c36" roughness={0.7} />
            </mesh>
            <mesh position={[Math.cos(angle) * 0.025, -0.145, Math.sin(angle) * 0.025]}>
              <cylinderGeometry args={[0.017, 0.019, 0.035, 12]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* --- Rattan / Cork Coaster --- */}
      <mesh position={[0.01, 0.34, 0.01]}>
        <cylinderGeometry args={[0.09, 0.09, 0.008, 24]} />
        <meshStandardMaterial color="#cca677" roughness={0.9} />
      </mesh>

      {/* --- Glass of Fresh Orange Juice (Hero Chilled Beverage) --- */}
      <group position={[0.01, 0.344, 0.01]} scale={1.2}>
        {/* Outer glass tumbler */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.054, 0.044, 0.16, 24, 1, true]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.38}
            roughness={0.04}
            metalness={0.08}
            transmission={0.9}
            ior={1.48}
            thickness={0.05}
          />
        </mesh>
        {/* Solid glass bottom base */}
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.045, 0.044, 0.02, 24]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            roughness={0.05}
            transmission={0.85}
          />
        </mesh>

        {/* Orange Juice Liquid (Glowing vibrant citrus) */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.051, 0.044, 0.12, 24]} />
          <meshStandardMaterial
            color="#ff8800"
            emissive="#ea580c"
            emissiveIntensity={0.55}
            roughness={0.25}
          />
        </mesh>

        {/* Floating Ice Cubes */}
        <group position={[0, 0.122, 0]}>
          <mesh position={[-0.018, 0, 0.01]} rotation={[0.2, 0.4, 0.1]}>
            <boxGeometry args={[0.024, 0.024, 0.024]} />
            <meshPhysicalMaterial
              color="#e0f2fe"
              transmission={0.9}
              roughness={0.08}
              transparent
              opacity={0.75}
            />
          </mesh>
          <mesh position={[0.018, 0.004, -0.012]} rotation={[-0.1, 0.7, 0.2]}>
            <boxGeometry args={[0.022, 0.022, 0.022]} />
            <meshPhysicalMaterial
              color="#e0f2fe"
              transmission={0.9}
              roughness={0.08}
              transparent
              opacity={0.75}
            />
          </mesh>
        </group>

        {/* Fresh Orange Slice Wedge on the Rim */}
        <group position={[0.048, 0.155, 0]} rotation={[0, 0, 0.45]}>
          <mesh>
            <cylinderGeometry args={[0.042, 0.042, 0.008, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.046, 0.046, 0.007, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
        </group>

        {/* Fresh Mint Leaves Garnish */}
        <group position={[-0.038, 0.14, 0.015]} rotation={[0.2, 0.5, -0.3]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.5} />
          </mesh>
          <mesh position={[0.01, 0.01, 0]} rotation={[0, 0, 0.4]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.5} />
          </mesh>
        </group>

        {/* Striped Chill Drinking Straw */}
        <group position={[-0.012, 0.14, -0.01]} rotation={[-0.25, 0.35, -0.3]}>
          <mesh position={[0, 0.045, 0]} castShadow>
            <cylinderGeometry args={[0.007, 0.007, 0.16, 12]} />
            <meshStandardMaterial color="#06b6d4" roughness={0.3} />
          </mesh>
          {[0, 0.03, 0.06, 0.09, 0.12].map((sy, idx) => (
            <mesh key={idx} position={[0, sy - 0.02, 0]}>
              <cylinderGeometry args={[0.0073, 0.0073, 0.01, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function FloorBookStack({ position }: { position: V3 }) {
  return (
    <group position={position} rotation={[0, 0.35, 0]}>
      <Box position={[0, 0.04, 0]} size={[0.42, 0.08, 0.32]} color="#0369a1" />
      <Box position={[0.02, 0.11, -0.02]} size={[0.38, 0.06, 0.3]} color="#d97706" />
      <Box position={[-0.01, 0.16, 0.01]} size={[0.35, 0.05, 0.28]} color="#15803d" />
    </group>
  );
}

const ROOMBA_OBSTACLES = [
  // Living room sofa & coffee table
  { x: -5.0, z: -4.8, r: 1.35 },
  { x: -5.0, z: -3.4, r: 0.95 },
  { x: -7.2, z: -5.2, r: 0.45 },
  // Print workshop
  { x: -6.8, z: 1.8, r: 1.45 },
  { x: -7.0, z: 3.8, r: 0.95 },
  { x: -5.9, z: 3.5, r: 0.65 },
  { x: -7.2, z: 0.2, r: 0.5 },
  // Tech lab desk & server rack (desk rotated to right wall)
  { x: 6.8, z: -3.2, r: 1.35 },
  { x: 7.0, z: -5.2, r: 0.75 },
  // Projects bookshelf & reading corner
  { x: 7.4, z: 1.7, r: 0.95 },
  { x: 4.8, z: 3.4, r: 1.25 },
  { x: 4.05, z: 3.3, r: 0.45 },
  { x: 3.65, z: 4.1, r: 0.65 },
  // Contact vintage phone console table (right side of entrance door)
  { x: 1.5, z: -5.1, r: 0.65 },
  // Potted plants
  { x: -7.1, z: 4.8, r: 0.7 },
  { x: 7.1, z: 4.8, r: 0.7 },
];

const ROOMBA_WALLS = {
  minX: -7.3,
  maxX: 7.3,
  minZ: -5.3,
  maxZ: 5.3,
};

function normAngle(a: number) {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function angleDifference(target: number, current: number) {
  return normAngle(target - current);
}

function LittleRoomba({
  duckRef,
  duckSpotRef,
}: {
  duckRef?: React.RefObject<THREE.Group | null>;
  duckSpotRef?: React.RefObject<DuckSpot>;
}) {
  const grp = useRef<THREE.Group>(null);
  const duckPlush = useRef<THREE.Group>(null);
  const brushL = useRef<THREE.Group>(null);
  const brushR = useRef<THREE.Group>(null);

  // Autonomous Roomba physics & navigation state
  const sim = useRef({
    x: 0,
    z: 2.2,
    heading: -1.2,
    targetHeading: -1.2,
    mode: 'DRIVE' as 'DRIVE' | 'TURN' | 'BACKUP',
    timer: 0,
    bumpCooldown: 0,
    duckWobble: 0,
    brushAngle: 0,
  });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = sim.current;

    s.bumpCooldown = Math.max(0, s.bumpCooldown - dt);
    s.duckWobble = Math.max(0, s.duckWobble - dt * 2.8);
    s.brushAngle += dt * 18;

    if (s.mode === 'DRIVE') {
      // Gentle natural wandering curve
      const organicCurve = Math.sin(state.clock.elapsedTime * 0.45) * 0.14 * dt;
      s.heading = normAngle(s.heading + organicCurve);
      s.targetHeading = s.heading;

      const speed = 1.05; // 1.05 m/s
      const nextX = s.x + Math.sin(s.heading) * speed * dt;
      const nextZ = s.z + Math.cos(s.heading) * speed * dt;

      // Front bumper sensor point
      const bumperX = s.x + Math.sin(s.heading) * 0.42;
      const bumperZ = s.z + Math.cos(s.heading) * 0.42;

      let bumped = false;
      let hitDuck = false;
      let normX = 0;
      let normZ = 0;

      // 1. Check wall collisions
      if (bumperX < ROOMBA_WALLS.minX) {
        bumped = true;
        normX = 1;
        normZ = 0;
      } else if (bumperX > ROOMBA_WALLS.maxX) {
        bumped = true;
        normX = -1;
        normZ = 0;
      } else if (bumperZ < ROOMBA_WALLS.minZ) {
        bumped = true;
        normX = 0;
        normZ = 1;
      } else if (bumperZ > ROOMBA_WALLS.maxZ) {
        bumped = true;
        normX = 0;
        normZ = -1;
      }

      // 2. Check furniture collisions
      if (!bumped) {
        for (const obs of ROOMBA_OBSTACLES) {
          const d = Math.hypot(bumperX - obs.x, bumperZ - obs.z);
          if (d < obs.r) {
            bumped = true;
            const dist = Math.max(0.001, Math.hypot(s.x - obs.x, s.z - obs.z));
            normX = (s.x - obs.x) / dist;
            normZ = (s.z - obs.z) / dist;
            break;
          }
        }
      }

      // 3. Check duck collision on floor
      if (!bumped && duckRef?.current && duckSpotRef?.current === 'floor') {
        const duckX = duckRef.current.position.x;
        const duckZ = duckRef.current.position.z;
        const d = Math.hypot(nextX - duckX, nextZ - duckZ);
        if (d < 0.75) {
          bumped = true;
          hitDuck = true;
          const dist = Math.max(0.001, d);
          normX = (s.x - duckX) / dist;
          normZ = (s.z - duckZ) / dist;
        }
      }

      if (bumped && s.bumpCooldown <= 0) {
        s.bumpCooldown = 0.35;
        s.duckWobble = 1.6;
        if (hitDuck) {
          duckAudio.playQuack(1.35); // Vui nhộn: chú vịt con trên máy kêu quác khi đụng trúng vịt chính!
        }
        // Calculate new heading away from obstacle
        const normAngleVal = Math.atan2(normX, normZ);
        const deflection = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.9);
        s.targetHeading = normAngle(normAngleVal + deflection);
        s.mode = 'BACKUP';
        s.timer = 0.18; // lùi lại 0.18s
      } else if (!bumped) {
        s.x = nextX;
        s.z = nextZ;
      }
    } else if (s.mode === 'BACKUP') {
      const backupSpeed = 0.45;
      s.x -= Math.sin(s.heading) * backupSpeed * dt;
      s.z -= Math.cos(s.heading) * backupSpeed * dt;
      s.timer -= dt;
      if (s.timer <= 0) {
        s.mode = 'TURN';
        s.timer = 1.0;
      }
    } else if (s.mode === 'TURN') {
      const diff = angleDifference(s.targetHeading, s.heading);
      const step = Math.sign(diff) * Math.min(Math.abs(diff), 5.2 * dt);
      s.heading = normAngle(s.heading + step);
      s.timer -= dt;
      if (Math.abs(diff) < 0.08 || s.timer <= 0) {
        s.mode = 'DRIVE';
      }
    }

    // Keep clamped inside room bounds
    s.x = Math.max(ROOMBA_WALLS.minX, Math.min(ROOMBA_WALLS.maxX, s.x));
    s.z = Math.max(ROOMBA_WALLS.minZ, Math.min(ROOMBA_WALLS.maxZ, s.z));

    if (grp.current) {
      grp.current.position.x = s.x;
      grp.current.position.z = s.z;
      grp.current.rotation.y = s.heading;
    }

    if (duckPlush.current) {
      const drivingBob = s.mode === 'DRIVE' ? Math.sin(state.clock.elapsedTime * 9) * 0.03 : 0;
      const bumpRoll = Math.sin(state.clock.elapsedTime * 22) * s.duckWobble * 0.22;
      duckPlush.current.rotation.z = bumpRoll;
      duckPlush.current.position.y = 0.12 + drivingBob;
    }

    if (brushL.current) brushL.current.rotation.y = s.brushAngle;
    if (brushR.current) brushR.current.rotation.y = -s.brushAngle;
  });

  return (
    <group
      ref={grp}
      position={[0, 0.05, 2.2]}
      onClick={(e) => {
        e.stopPropagation();
        duckAudio.playQuack(1.4);
        sim.current.duckWobble = 2.0;
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* Soft shadow on floor under Roomba */}
      <mesh position={[0, -0.04, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color="#0f0c08" transparent opacity={0.3} />
      </mesh>

      {/* Main disc chassis */}
      <Cyl position={[0, 0.035, 0]} args={[0.32, 0.32, 0.07, 32]} color="#f8fafc" />
      {/* Dark bumper perimeter strip */}
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.332, 0.332, 0.042, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Top LiDAR laser turret */}
      <Cyl position={[0, 0.08, -0.06]} args={[0.09, 0.09, 0.04, 20]} color="#1e293b" />
      <mesh position={[0, 0.102, -0.06]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* Front Glowing Power & Status LED indicator */}
      <mesh position={[0, 0.105, 0.12]}>
        <circleGeometry args={[0.02, 12]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>

      {/* Dual front spinning side-brushes */}
      {[0.22, -0.22].map((bx, i) => (
        <group
          key={i}
          ref={i === 0 ? brushL : brushR}
          position={[bx, -0.02, 0.2]}
        >
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((bAngle, bi) => (
            <mesh key={bi} rotation={[0, bAngle, 0]} position={[0.035, 0, 0]}>
              <boxGeometry args={[0.07, 0.005, 0.008]} />
              <meshStandardMaterial color="#475569" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tiny Rubber Duck passenger riding the Roomba */}
      <group ref={duckPlush} position={[0, 0.12, 0.06]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial color={DUCK_YELLOW} />
        </mesh>
        <mesh position={[0, 0.13, 0.03]} castShadow>
          <sphereGeometry args={[0.055, 14, 14]} />
          <meshStandardMaterial color={DUCK_YELLOW} />
        </mesh>
        <mesh position={[0, 0.125, 0.09]}>
          <boxGeometry args={[0.04, 0.02, 0.04]} />
          <meshStandardMaterial color={BEAK} />
        </mesh>
        <mesh position={[-0.022, 0.14, 0.075]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.022, 0.14, 0.075]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>
    </group>
  );
}

function Room({
  onFloorClick,
  timeConfig,
  currentTime,
  onRelaxClick,
  isLounging,
  duckRef,
  duckSpotRef,
}: {
  onFloorClick: (e: ThreeEvent<MouseEvent>) => void;
  timeConfig: TimeConfig;
  currentTime?: Date;
  onRelaxClick?: () => void;
  isLounging?: boolean;
  duckRef?: React.RefObject<THREE.Group | null>;
  duckSpotRef?: React.RefObject<DuckSpot>;
}) {
  // Sàn gỗ sồi cao cấp kiến trúc Bắc Âu (Luxury Scandinavian Satin Oak Parquet)
  const floorTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#b77943';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankH = 64;
    const plankW = 256;
    const oakPalettes = [
      '#c4864f', '#bb7d46', '#ae703a', '#c78d57', '#b3743e', '#bf824c', '#a86a35', '#cb925d',
    ];

    for (let row = 0; row < 16; row++) {
      const y = row * plankH;
      const offset = (row % 3) * 85;
      for (let col = -1; col < 6; col++) {
        const x = col * plankW + (row % 2 === 0 ? 0 : plankW / 2) - offset;
        const paletteIdx = Math.abs((row * 7 + col * 13) % oakPalettes.length);
        ctx.fillStyle = oakPalettes[paletteIdx];
        ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);

        // Vân gỗ hữu cơ tự nhiên
        ctx.strokeStyle = 'rgba(70, 36, 12, 0.08)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          const gy = y + 10 + g * 12;
          ctx.beginPath();
          ctx.moveTo(x + 2, gy);
          ctx.bezierCurveTo(
            x + plankW * 0.33, gy + (g % 2 === 0 ? 2 : -2),
            x + plankW * 0.66, gy + (g % 2 === 0 ? -2 : 2),
            x + plankW - 2, gy
          );
          ctx.stroke();
        }

        // Vát cạnh phản quang ánh sáng (bevel highlight)
        ctx.strokeStyle = 'rgba(255, 235, 205, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + plankH - 2);
        ctx.lineTo(x + 1, y + 1);
        ctx.lineTo(x + plankW - 2, y + 1);
        ctx.stroke();

        // Rãnh chỉ ghép mộng bóng tối (groove shadow)
        ctx.strokeStyle = 'rgba(48, 22, 7, 0.38)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + plankH - 1);
        ctx.lineTo(x + plankW - 1, y + plankH - 1);
        ctx.lineTo(x + plankW - 1, y + 1);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  // Thảm dệt thổ cẩm Bắc Âu cao cấp với hoa văn Aztec/Nordic & viền tua rua
  const rugTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = 256;
    const cy = 256;
    const r = 246;

    // Nền len lông cừu dệt mộc
    ctx.fillStyle = '#f8ede3';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    const bands = [
      { r: 242, w: 6, color: '#c59b6c' },
      { r: 228, w: 14, color: '#e07a5f' },
      { r: 202, w: 5, color: '#3d405b' },
      { r: 184, w: 18, color: '#81b29a' },
      { r: 154, w: 6, color: '#f2cc8f' },
      { r: 136, w: 16, color: '#e07a5f' },
      { r: 106, w: 5, color: '#3d405b' },
      { r: 82, w: 20, color: '#81b29a' },
      { r: 50, w: 10, color: '#c59b6c' },
      { r: 26, w: 26, color: '#e07a5f' },
    ];

    for (const b of bands) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.w;
      ctx.beginPath();
      ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hoa văn dệt nan kim & họa tiết hình học
    const numSpokes = 48;
    for (let i = 0; i < numSpokes; i++) {
      const angle = (i / numSpokes) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      ctx.strokeStyle = '#3d405b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + cos * 218, cy + sin * 218);
      ctx.lineTo(cx + cos * 238, cy + sin * 238);
      ctx.stroke();

      if (i % 2 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + cos * 170, cy + sin * 170, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Vân sớ sợi vải dệt
    ctx.fillStyle = 'rgba(60, 40, 20, 0.04)';
    for (let y = 0; y < 512; y += 4) {
      ctx.fillRect(0, y, 512, 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group>
      {/* Floor - Luxury Scandinavian Satin Oak Parquet */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[16, 12]} />
        <meshPhysicalMaterial
          map={floorTexture ?? undefined}
          color="#cf9461"
          roughness={0.52}
          clearcoat={0.22}
          clearcoatRoughness={0.42}
          reflectivity={0.5}
        />
      </mesh>

      {/* Rug with soft contact shadow and woven wool fabric sheen */}
      <mesh position={[0, 0.003, 1]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.68, 64]} />
        <meshBasicMaterial color="#1c140d" transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, 0.006, 1]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[2.62, 64]} />
        <meshPhysicalMaterial
          map={rugTexture ?? undefined}
          roughness={0.92}
          sheen={0.88}
          sheenColor="#fff2e0"
          sheenRoughness={0.4}
        />
      </mesh>

      {/* Architectural Wood Skirting Boards / Len chân tường */}
      <Box position={[0, 0.05, -5.98]} size={[16.2, 0.1, 0.04]} color="#7c4a24" roughness={0.6} />
      <Box position={[-7.98, 0.05, 0]} size={[0.04, 0.1, 12.2]} color="#7c4a24" roughness={0.6} />
      <Box position={[7.98, 0.05, 0]} size={[0.04, 0.1, 12.2]} color="#7c4a24" roughness={0.6} />

      {/* Walls */}
      {/* Back Wall with real window openings allowing shutters to open outwards */}
      <Box position={[0, 0.8, -6.15]} size={[16.6, 1.6, 0.3]} color="#f4e4c6" />
      <Box position={[0, 3.5, -6.15]} size={[16.6, 1.0, 0.3]} color="#f4e4c6" />
      <Box position={[-5.95, 2.3, -6.15]} size={[4.7, 1.4, 0.3]} color="#f4e4c6" />
      <Box position={[0.15, 2.3, -6.15]} size={[3.9, 1.4, 0.3]} color="#f4e4c6" />
      <Box position={[6.1, 2.3, -6.15]} size={[4.4, 1.4, 0.3]} color="#f4e4c6" />
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

      <WindowFrame x={-2.7} timeConfig={timeConfig} />
      <WindowFrame x={3.0} timeConfig={timeConfig} />

      {/* Atmospheric Window beams from both windows (Sunbeam / Moonbeam) */}
      <WindowBeam x={-2.7} zFloor={-2.6} timeConfig={timeConfig} />
      <WindowBeam x={3.0} zFloor={-2.6} timeConfig={timeConfig} />

      {/* Wall sign */}
      <WallSign />

      {/* Wall Clock with real-time ticking hands */}
      <WallClock position={[-1.35, 2.75, -5.96]} time={currentTime} />

      {/* Bunting Garland across roof beam */}
      <BuntingGarland />

      {/* Pegboard memo & CMYK color cards on back wall */}
      <PegboardMemo position={[6.0, 2.45, -5.96]} />

      {/* Cozy Plush Beanbag Lounge & books in projects reading area */}
      <PlushBeanbagLounge
        position={[4.8, 0, 3.4]}
        onRelaxClick={onRelaxClick}
        isLounging={isLounging}
      />
      {/* Chic side table with a fresh glass of chilled orange juice */}
      <ChillOrangeJuiceTable position={[3.75, 0, 4.1]} />
      <FloorBookStack position={[4.05, 0.06, 3.3]} />

      {/* Autonomous little Roomba vacuum with duck passenger patrolling floor */}
      <LittleRoomba duckRef={duckRef} duckSpotRef={duckSpotRef} />

      <RealisticPlant position={[-7.1, 0, 4.8]} rotation={[0, 0.35, 0]} />
      <RealisticPlant position={[7.1, 0, 4.8]} rotation={[0, -0.25, 0]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Furniture per station                                               */
/* ------------------------------------------------------------------ */

function SofaArtwork() {
  const dandelionLightRef = useRef<THREE.PointLight>(null);
  const particlesRef = useRef<THREE.Group>(null);
  const artworkMeshRef = useRef<THREE.Mesh>(null);
  const bloomMeshRef = useRef<THREE.Mesh>(null);
  const bloomMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const auraMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/artwork-sofa.jpg?v=4');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }, []);

  // Tạo texture phát quang tự nhiên của hoa bồ công anh: các sợi tơ ánh sáng tỏa tia hữu cơ kết hợp vầng hào quang mềm
  const bloomTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = 256;
    const cy = 256;

    // 1. Quầng sáng aura tán xạ tự nhiên, tâm phát quang rực rỡ ôm trọn đóa hoa
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 240);
    grad.addColorStop(0, 'rgba(255, 255, 245, 0.72)');
    grad.addColorStop(0.18, 'rgba(255, 250, 215, 0.60)');
    grad.addColorStop(0.42, 'rgba(254, 240, 138, 0.35)');
    grad.addColorStop(0.70, 'rgba(253, 224, 71, 0.14)');
    grad.addColorStop(0.92, 'rgba(250, 204, 21, 0.03)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. 64 sợi tơ ánh sáng bồ công anh tỏa tia tự nhiên, cường độ sáng rực
    ctx.lineCap = 'round';
    const numRays = 64;
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2 + ((i * 17) % 9) * 0.035;
      const length = 55 + ((i * 37) % 125) + (i % 3 === 0 ? 32 : 0);
      const alpha = 0.45 + (i % 5) * 0.11;

      const rayGrad = ctx.createLinearGradient(
        cx,
        cy,
        cx + Math.cos(angle) * length,
        cy + Math.sin(angle) * length
      );
      rayGrad.addColorStop(0, `rgba(255, 255, 250, ${alpha})`);
      rayGrad.addColorStop(0.55, `rgba(254, 240, 138, ${alpha * 0.8})`);
      rayGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

      ctx.strokeStyle = rayGrad;
      ctx.lineWidth = i % 2 === 0 ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.stroke();

      // Đốm bông li ti ở đầu mút như hạt giống bồ công anh
      if (i % 2 === 0) {
        const tipX = cx + Math.cos(angle) * (length * 0.94);
        const tipY = cy + Math.sin(angle) * (length * 0.94);
        const tipR = 2.4 + (i % 3);
        const tipGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, tipR);
        tipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        tipGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = tipGrad;
        ctx.beginPath();
        ctx.arc(tipX, tipY, tipR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Quầng sáng phụ lan tỏa rộng tự nhiên ra xung quanh
  const auraTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 248, 200, 0.42)');
    grad.addColorStop(0.35, 'rgba(254, 240, 138, 0.22)');
    grad.addColorStop(0.7, 'rgba(253, 224, 71, 0.07)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Proportions: exact aspect ratio matching user-attached artwork (898 x 434, ~2.069:1)
  const canvasW = 3.90;
  const canvasH = 1.885;
  const frameT = 0.07;
  const frameW = canvasW + frameT * 2; // 4.04m
  const frameH = canvasH + frameT * 2; // 2.025m

  // 16 sợi tơ bụi sáng bồ công anh li ti bay lượn nhẹ nhàng từ đóa hoa
  const spores = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      rx: (Math.random() - 0.5) * 0.36,
      ry: (Math.random() - 0.5) * 0.26,
      rz: 0.12 + Math.random() * 0.65,
      speedX: (Math.random() - 0.38) * 0.12,
      speedY: 0.08 + Math.random() * 0.18,
      speedZ: 0.06 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      size: 0.005 + Math.random() * 0.006,
      seed: i,
    }));
  }, []);

  // Animation: Nhịp thở ánh sáng êm dịu, lúc mạnh lúc yếu mượt mà (không bao giờ bị chớp tắt hay che khuất)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const breath = Math.sin(t * 1.5) * 0.5 + 0.5; // Dao động êm ái tuần hoàn từ 0.0 (lúc yếu) đến 1.0 (lúc mạnh)

    // 1. Nguồn sáng điểm biến thiên mượt mà: lúc mạnh (6.8), lúc yếu (3.5)
    if (dandelionLightRef.current) {
      dandelionLightRef.current.intensity = 3.5 + breath * 3.3;
      dandelionLightRef.current.distance = 868 + breath * 2.0;
    }

    // 2. Kích thước và độ sáng của vầng tơ phát quang bồ công anh thở nhẹ theo nhịp
    if (bloomMeshRef.current) {
      const s = 0.94 + breath * 0.12;
      bloomMeshRef.current.scale.set(s, s, 1);
    }
    if (bloomMatRef.current) {
      bloomMatRef.current.opacity = 0.35 + breath * 0.38;
    }

    // 3. Quầng sáng lan tỏa xung quanh biến thiên đồng điệu
    if (auraMatRef.current) {
      auraMatRef.current.opacity = 0.22 + breath * 0.28;
    }

    // 4. Các sợi tơ li ti bay lơ lửng nhẹ nhàng thoát ra từ đóa hoa về phía phòng khách (+Z)
    // Giữ quỹ đạo bay ra phòng, không bay thẳng lên khuôn mặt cô gái
    if (particlesRef.current) {
      particlesRef.current.children.forEach((c, idx) => {
        const s = spores[idx];
        if (!s) return;
        const progress = ((t * s.speedY * 0.7 + s.seed * 0.5) % 3.0) / 3.0; // 0 to 1 cycle
        c.position.x = 0.09 + s.rx + progress * s.speedX * 1.6;
        c.position.y = 0.09 + s.ry + Math.sin(t * 1.2 + s.phase) * 0.04 - progress * 0.14;
        c.position.z = 0.05 + progress * s.rz * 1.5;
        const scale = Math.sin(progress * Math.PI) * s.size;
        c.scale.setScalar(Math.max(0.012, scale));
      });
    }
  });

  return (
    <group position={[-5.73, 2.32, -5.96]}>
      {/* Khung đế sau tường */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial color="#1a110b" roughness={0.9} />
      </mesh>

      {/* Tác phẩm tranh cô gái nguyên bản 100% sắc nét, rực rỡ (cố định ở z=0.02, không bị z-clipping) */}
      <mesh ref={artworkMeshRef} position={[0, 0, 0.02]}>
        <planeGeometry args={[canvasW, canvasH]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#1e1b4b" />
        )}
      </mesh>

      {/* Ánh sáng ấm áp tự nhiên tỏa ra từ chính đóa hoa bồ công anh: nhịp thở mượt mà, lúc mạnh lúc yếu */}
      <pointLight
        ref={dandelionLightRef}
        position={[0.00, -0.09, 0.20]}
        intensity={5.0}
        distance={9.5}
        decay={1.3}
        color="#fff4b8"
      />

      {/* Quầng sáng lan tỏa rộng nhẹ nhàng quanh hoa bồ công anh (nằm ở z=0.024 trước mặt tranh) */}
      {auraTexture && (
        <mesh position={[0.00, -0.09, 0.024]}>
          <planeGeometry args={[0.78, 0.78]} />
          <meshBasicMaterial
            ref={auraMatRef}
            map={auraTexture}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Ánh sáng phát quang của chính hoa bồ công anh: khớp chính xác vị trí bông hoa, z=0.026 trước mặt tranh */}
      {bloomTexture && (
        <mesh ref={bloomMeshRef} position={[0.00, -0.09, 0.026]}>
          <planeGeometry args={[0.48, 0.48]} />
          <meshBasicMaterial
            ref={bloomMatRef}
            map={bloomTexture}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Sợi tơ phát sáng bay lơ lửng lung linh từ đóa hoa vào phòng khách */}
      <group ref={particlesRef}>
        {spores.map((s, idx) => (
          <mesh key={idx} position={[0.00, -0.09, 0.08]}>
            <circleGeometry args={[1, 8]} />
            <meshBasicMaterial
              color={idx % 2 === 0 ? '#ffffff' : '#fef08a'}
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Khung tranh gỗ óc chó 3D dày dặn viền phào chỉ */}
      <Box position={[0, (canvasH + frameT) / 2, 0.035]} size={[frameW, frameT, 0.07]} color="#231710" roughness={0.7} />
      <Box position={[0, -(canvasH + frameT) / 2, 0.035]} size={[frameW, frameT, 0.07]} color="#231710" roughness={0.7} />
      <Box position={[-(canvasW + frameT) / 2, 0, 0.035]} size={[frameT, canvasH, 0.07]} color="#231710" roughness={0.7} />
      <Box position={[(canvasW + frameT) / 2, 0, 0.035]} size={[frameT, canvasH, 0.07]} color="#231710" roughness={0.7} />

      {/* Viền nẹp dát vàng cổ điển */}
      <mesh position={[0, canvasH / 2, 0.025]}>
        <planeGeometry args={[canvasW, 0.014]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -canvasH / 2, 0.025]}>
        <planeGeometry args={[canvasW, 0.014]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[-canvasW / 2, 0, 0.025]}>
        <planeGeometry args={[0.014, canvasH]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[canvasW / 2, 0, 0.025]}>
        <planeGeometry args={[0.014, canvasH]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function LivingRoom({
  timeConfig,
  isDimmed = false,
  onSofaClick,
}: {
  timeConfig?: TimeConfig;
  isDimmed?: boolean;
  onSofaClick?: () => void;
}) {
  return (
    <group>
      {/* Clickable Luxury Burgundy Sofa (Đỏ Đô) */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSofaClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        {/* 4 Chân ghế gỗ sồi tối màu bịt đồng thau cao cấp */}
        {[
          [-6.28, -4.42],
          [-3.72, -4.42],
          [-6.28, -5.36],
          [-3.72, -5.36],
        ].map(([lx, lz], i) => (
          <group key={i} position={[lx, 0, lz]}>
            <Cyl position={[0, 0.05, 0]} args={[0.03, 0.042, 0.1]} color="#24140e" roughness={0.6} />
            <Cyl position={[0, 0.015, 0]} args={[0.033, 0.036, 0.03]} color="#d4af37" metalness={0.85} roughness={0.25} />
          </group>
        ))}

        {/* Khung đế sofa bọc vải nhung đỏ đô */}
        <Box position={[-5, 0.22, -4.9]} size={[2.72, 0.24, 1.08]} color="#58111a" roughness={0.8} />

        {/* Tay vịn trái & phải liền khối, bo tròn mềm mại */}
        <Box position={[-6.28, 0.39, -4.9]} size={[0.28, 0.58, 1.12]} color="#58111a" roughness={0.76} />
        <Box position={[-3.72, 0.39, -4.9]} size={[0.28, 0.58, 1.12]} color="#58111a" roughness={0.76} />
        {/* Đệm kê tay bo tròn êm ái trên tay vịn */}
        <Box position={[-6.28, 0.69, -4.9]} size={[0.26, 0.06, 1.08]} color="#6b1424" roughness={0.72} />
        <Box position={[-3.72, 0.69, -4.9]} size={[0.26, 0.06, 1.08]} color="#6b1424" roughness={0.72} />

        {/* Tựa lưng sau sofa bọc nhung đỏ đô */}
        <Box position={[-5, 0.78, -5.34]} size={[2.32, 0.68, 0.24]} color="#58111a" roughness={0.8} />

        {/* 2 Đệm ngồi nhung đỏ đô êm ái, căng mọng */}
        <Box position={[-5.58, 0.42, -4.82]} size={[1.12, 0.18, 0.86]} color="#721727" roughness={0.7} />
        <Box position={[-4.42, 0.42, -4.82]} size={[1.12, 0.18, 0.86]} color="#721727" roughness={0.7} />

        {/* 2 Đệm tựa lưng nhung đỏ đô */}
        <Box position={[-5.58, 0.76, -5.18]} size={[1.10, 0.44, 0.16]} color="#6b1424" roughness={0.72} />
        <Box position={[-4.42, 0.76, -5.18]} size={[1.10, 0.44, 0.16]} color="#6b1424" roughness={0.72} />

        {/* Gối tựa trang trí: lụa vàng champagne & nhung đỏ đô sang trọng */}
        <Box position={[-6.04, 0.58, -4.82]} size={[0.12, 0.32, 0.32]} rotation={[0, 0.2, -0.22]} color="#d4af37" roughness={0.35} clearcoat={0.35} />
        <Box position={[-3.96, 0.58, -4.82]} size={[0.12, 0.32, 0.32]} rotation={[0, -0.2, 0.22]} color="#7a162e" roughness={0.6} />

        {/* Chú vịt nhồi bông nhỏ xinh ngồi ngay ngắn trên đệm sofa */}
        <mesh position={[-4.3, 0.58, -4.75]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshPhysicalMaterial color={DUCK_YELLOW} roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.2} />
        </mesh>
        <mesh position={[-4.3, 0.76, -4.70]} castShadow>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshPhysicalMaterial color={DUCK_YELLOW} roughness={0.38} clearcoat={0.35} clearcoatRoughness={0.2} />
        </mesh>
        <mesh position={[-4.3, 0.74, -4.59]}>
          <boxGeometry args={[0.065, 0.025, 0.065]} />
          <meshPhysicalMaterial color={BEAK} roughness={0.25} clearcoat={0.5} />
        </mesh>
      </group>
      {/* Coffee table (Click to view About Station) */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          nav.target = [-5, -2.1];
          nav.pending = 'overview';
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <Box position={[-5, 0.45, -3.4]} size={[1.4, 0.08, 0.7]} color="#5a3820" roughness={0.32} clearcoat={0.4} clearcoatRoughness={0.18} />
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
        {/* Plate with cookies */}
        <group position={[-5.0, 0.5, -3.4]}>
          <Cyl position={[0, 0.01, 0]} args={[0.11, 0.09, 0.02, 20]} color="#ffffff" />
          <Cyl position={[-0.03, 0.025, 0]} args={[0.038, 0.038, 0.015, 12]} color="#b45309" />
          <Cyl position={[0.035, 0.025, 0.02]} args={[0.035, 0.035, 0.015, 12]} color="#92400e" />
        </group>
      </group>
      {/* Fluffy duck slippers next to sofa */}
      <DuckSlippers position={[-3.6, 0.03, -3.7]} rotation={[0, 0.25, 0]} />
      {/* Grand Masterpiece Picture Frame over Sofa */}
      <SofaArtwork />
      {/* Floor lamp */}
      <Cyl position={[-7.2, 0.03, -5.2]} args={[0.25, 0.25, 0.06]} color="#3d2b1f" />
      <Cyl position={[-7.2, 0.9, -5.2]} args={[0.03, 0.03, 1.8]} color="#3d2b1f" />
      <mesh position={[-7.2, 1.9, -5.2]}>
        <coneGeometry args={[0.38, 0.45, 24, 1, true]} />
        <meshStandardMaterial
          color="#ffe8b0"
          emissive="#ffb347"
          emissiveIntensity={
            timeConfig
              ? (isDimmed ? 0.45 : timeConfig.floorLampEmissiveIntensity)
              : 0.9
          }
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight
        position={[-7.2, 1.7, -5]}
        intensity={
          timeConfig
            ? (isDimmed ? 1.8 : timeConfig.floorLampIntensity)
            : 5
        }
        distance={9}
        color="#ffaa3b"
      />
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
      {/* Open carton box with rolls */}
      <OpenedCartonBox position={[-5.9, 0.18, 3.5]} rotation={[0, 0.2, 0]} />
      {/* Cutting mat with ruler and hobby knife */}
      <CuttingMat position={[-4.85, 0.012, 1.45]} />
      {/* CMYK color calibration sheet on floor */}
      <PrintTestStrips position={[-4.8, 0.011, 2.3]} />
    </group>
  );
}

function CodeScreen({
  position,
  color,
  rotation = [0, 0, 0],
}: {
  position: V3;
  color: string;
  rotation?: V3;
}) {
  const lines = [0.6, 0.85, 0.45, 0.7, 0.55];
  return (
    <group position={position} rotation={rotation}>
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

function TechLab({
  onChairClick,
  onDeskClick,
}: {
  onChairClick?: () => void;
  onDeskClick?: () => void;
}) {
  const orb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (orb.current) {
      orb.current.position.y = 1.95 + Math.sin(clock.elapsedTime * 2) * 0.1;
      orb.current.rotation.y = clock.elapsedTime;
    }
  });
  return (
    <group>
      {/* Click vào cụm bàn làm việc & máy tính (bàn, màn hình, phím chuột, AI orb) để xem bảng Kỹ Năng */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onDeskClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        {/* Desk rotated facing right wall (+X) */}
        <Box position={[7.35, 0.8, -3.2]} size={[1.1, 0.08, 2.4]} color="#7c584c" roughness={0.35} clearcoat={0.35} clearcoatRoughness={0.2} />
        {[
          [6.9, -4.25],
          [7.8, -4.25],
          [6.9, -2.15],
          [7.8, -2.15],
        ].map(([x, z]) => (
          <Box key={`${x}${z}`} position={[x, 0.38, z]} size={[0.08, 0.76, 0.08]} color="#5d4037" />
        ))}
        {/* Dual monitors placed against right wall facing room center (-X) */}
        <CodeScreen position={[7.75, 1.35, -3.7]} rotation={[0, -Math.PI / 2 + 0.1, 0]} color="#38bdf8" />
        <CodeScreen position={[7.75, 1.35, -2.7]} rotation={[0, -Math.PI / 2 - 0.1, 0]} color="#a78bfa" />
        <Box position={[7.75, 0.95, -3.7]} size={[0.06, 0.25, 0.06]} color="#374151" />
        <Box position={[7.75, 0.95, -2.7]} size={[0.06, 0.25, 0.06]} color="#374151" />
        {/* Keyboard & Mouse oriented facing the right wall */}
        <Box position={[7.15, 0.86, -3.2]} size={[0.28, 0.03, 0.85]} color="#e5e7eb" />
        <Box position={[7.15, 0.86, -2.55]} size={[0.22, 0.03, 0.15]} color="#e5e7eb" />
        {/* Coffee mug */}
        <Cyl position={[7.25, 0.92, -4.1]} args={[0.07, 0.06, 0.16]} color="#ef4444" roughness={0.2} clearcoat={0.6} />
        {/* AI orb (Gemini) */}
        <mesh ref={orb} position={[7.3, 1.95, -4.1]}>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={1.8} flatShading />
        </mesh>
      </group>

      {/* Ergonomic Office Chair facing right wall (+X) - Click để vịt ngồi vào ghế chơi game */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onChairClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <Box position={[6.2, 0.5, -3.2]} size={[0.65, 0.1, 0.7]} color="#264653" />
        <Box position={[5.85, 0.85, -3.2]} size={[0.08, 0.6, 0.7]} color="#264653" />
        <Cyl position={[6.2, 0.25, -3.2]} args={[0.04, 0.04, 0.45]} color="#111827" />
        <Cyl position={[6.2, 0.03, -3.2]} args={[0.32, 0.32, 0.05]} color="#111827" />
      </group>
      <pointLight position={[6.8, 1.7, -3.2]} intensity={6.5} distance={6.5} color="#93c5fd" />
      {/* Server rack in the corner */}
      <Box position={[7.2, 0.9, -5.2]} size={[0.8, 1.8, 0.8]} color="#1f2937" metalness={0.3} roughness={0.5} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <BlinkLed
          key={i}
          position={[6.9 + (i % 2) * 0.12, 0.4 + i * 0.24, -4.79]}
          color={i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#38bdf8' : '#f59e0b'}
          speed={2 + i}
          offset={i}
        />
      ))}
      {/* Power strip under tech desk */}
      <PowerStrip position={[7.4, 0.025, -2.3]} />
      {/* Office wastebasket with crumpled test notes */}
      <WasteBasket position={[6.5, 0.22, -4.2]} />
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
      <pointLight position={[6.8, 2.9, 1.7]} intensity={6.0} distance={7} color="#fed7aa" />
    </group>
  );
}

function DoorMailbox({ onOpenGardenGame }: { onOpenGardenGame?: () => void }) {
  const env = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (env.current) {
      env.current.position.y = 1.28 + Math.sin(clock.elapsedTime * 2.2) * 0.05;
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
        {/* Welcome Doormat */}
        <WelcomeDoormat />
        {/* Biển chỉ dẫn "Ra Vườn (Game Mario)" đặt thanh lịch ngang tầm mắt trên cánh cửa */}
        {doorSignTex && (
          <mesh position={[0, 2.05, -5.85]}>
            <planeGeometry args={[1.4, 0.35]} />
            <meshBasicMaterial map={doorSignTex} transparent />
          </mesh>
        )}
      </group>

      {/* Cây treo áo khoác & mũ cổ điển thanh lịch bên trái cửa chính */}
      <group position={[-1.5, 0, -5.5]}>
        {/* Chân đế ba chạc */}
        <Cyl position={[0, 0.04, 0]} args={[0.22, 0.22, 0.06]} color="#4a2c17" />
        {/* Thân trụ gỗ tiện tròn */}
        <Cyl position={[0, 1.0, 0]} args={[0.04, 0.05, 1.9]} color="#5d4037" />
        {/* Các móc treo mũ áo bằng đồng thau */}
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, idx) => (
          <group key={idx} rotation={[0, angle, 0]}>
            <mesh position={[0.1, 1.75, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <cylinderGeometry args={[0.015, 0.015, 0.16]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[0.16, 1.82, 0]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        ))}
        {/* Chiếc mũ phớt nâu treo trên một móc */}
        <mesh position={[0.14, 1.78, 0]} rotation={[0.2, 0, -0.3]}>
          <cylinderGeometry args={[0.1, 0.14, 0.08, 16]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
      </group>

      {/* Trạm Liên Hệ: Bàn console điện thoại quay số & Sổ ghi lời nhắn (bên phải cửa ra vào) */}
      <group position={[1.5, 0, -5.2]}>
        {/* Mặt bàn console gỗ óc chó bo tròn sang trọng */}
        <Box position={[0, 0.8, 0]} size={[1.1, 0.08, 0.52]} color="#5d4037" roughness={0.7} />
        <Box position={[0, 0.84, 0]} size={[1.14, 0.02, 0.54]} color="#795548" roughness={0.6} />

        {/* 4 chân bàn thanh mảnh bịt đồng vàng cao cấp */}
        {[
          [-0.46, -0.2],
          [0.46, -0.2],
          [-0.46, 0.2],
          [0.46, 0.2],
        ].map(([x, z], i) => (
          <group key={i}>
            <Box position={[x, 0.4, z]} size={[0.06, 0.76, 0.06]} color="#3e2723" roughness={0.8} />
            <Box position={[x, 0.04, z]} size={[0.068, 0.08, 0.068]} color="#fbbf24" metalness={0.85} roughness={0.25} />
          </group>
        ))}

        {/* Ngăn kệ phụ bên dưới bàn */}
        <Box position={[0, 0.24, 0]} size={[0.96, 0.03, 0.4]} color="#4e342e" roughness={0.75} />
        {/* Khay đan nhỏ đựng vật dụng trang trí */}
        <Box position={[-0.2, 0.27, 0]} size={[0.3, 0.04, 0.22]} color="#a16207" roughness={0.9} />

        {/* --- CHIẾC ĐIỆN THOẠI QUAY SỐ CỔ ĐIỂN (VINTAGE ROTARY TELEPHONE) --- */}
        <group position={[-0.22, 0.85, 0.02]}>
          {/* Thân máy điện thoại đỏ ruby sẫm vintage */}
          <Box position={[0, 0.045, 0]} size={[0.26, 0.09, 0.22]} color="#881337" roughness={0.4} />
          {/* Đĩa số quay tròn màu kem và viền kim loại vàng */}
          <mesh position={[0, 0.07, 0.06]} rotation={[-Math.PI / 4, 0, 0]}>
            <circleGeometry args={[0.065, 24]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.072, 0.062]} rotation={[-Math.PI / 4, 0, 0]}>
            <ringGeometry args={[0.045, 0.065, 24]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Càng đỡ ống nghe bằng đồng thau */}
          <Box position={[-0.07, 0.1, -0.02]} size={[0.02, 0.05, 0.02]} color="#fbbf24" metalness={0.85} roughness={0.2} />
          <Box position={[0.07, 0.1, -0.02]} size={[0.02, 0.05, 0.02]} color="#fbbf24" metalness={0.85} roughness={0.2} />
          {/* Ống nghe đặt ngang trên giá */}
          <Cyl position={[0, 0.13, -0.02]} args={[0.02, 0.02, 0.26]} rotation={[0, 0, Math.PI / 2]} color="#881337" />
          <Cyl position={[-0.12, 0.13, -0.02]} args={[0.045, 0.03, 0.04]} rotation={[0, 0, Math.PI / 2]} color="#fbbf24" metalness={0.8} />
          <Cyl position={[0.12, 0.13, -0.02]} args={[0.03, 0.045, 0.04]} rotation={[0, 0, Math.PI / 2]} color="#fbbf24" metalness={0.8} />
        </group>

        {/* --- SỔ GHI LỜI NHẮN & BÚT MÁY (GUESTBOOK / MESSAGE PAD) --- */}
        <group position={[0.2, 0.85, 0.04]}>
          {/* Bìa da nâu sậm mở sẵn */}
          <Box position={[0, 0.01, 0]} size={[0.3, 0.02, 0.24]} color="#78350f" roughness={0.7} />
          {/* Trang giấy màu kem thanh nhã */}
          <Box position={[0, 0.022, 0]} size={[0.27, 0.01, 0.21]} color="#fffbeb" roughness={0.9} />
          {/* Dải ruy băng đánh dấu trang màu vàng gold */}
          <Box position={[0, 0.03, 0]} size={[0.025, 0.006, 0.23]} color="#fbbf24" />
          {/* Lọ mực và bút máy cắm nghiêng */}
          <Cyl position={[0.16, 0.025, -0.09]} args={[0.025, 0.03, 0.04]} color="#fbbf24" metalness={0.85} roughness={0.25} />
          <mesh position={[0.16, 0.08, -0.09]} rotation={[0.3, 0, 0.35]}>
            <cylinderGeometry args={[0.006, 0.004, 0.14]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>

        {/* --- ĐÈN BÀN ẤM ÁP (COZY WARM ENTRY LAMP) --- */}
        <group position={[0.38, 0.85, -0.16]}>
          {/* Chân đèn đồng thau */}
          <Cyl position={[0, 0.015, 0]} args={[0.07, 0.07, 0.03]} color="#fbbf24" metalness={0.85} roughness={0.25} />
          <Cyl position={[0, 0.18, 0]} args={[0.014, 0.014, 0.34]} color="#fbbf24" metalness={0.85} roughness={0.25} />
          {/* Chao đèn vải ấm áp hình nón */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.08, 0.14, 0.15, 20]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.8} />
          </mesh>
          {/* Ánh sáng vàng dịu êm tỏa xuống bàn liên hệ */}
          <pointLight position={[0, 0.32, 0]} intensity={1.8} distance={2.4} color="#fde047" />
        </group>

        {/* Biểu tượng phong bì thư lơ lửng phát sáng nhận diện trạm Liên Hệ */}
        <group ref={env} position={[0, 1.28, 0]}>
          <Box position={[0, 0, 0]} size={[0.46, 0.3, 0.03]} color="#ffffff" roughness={0.5} />
          <mesh position={[0, 0.035, 0.02]} rotation={[0, 0, Math.PI]}>
            <circleGeometry args={[0.18, 3]} />
            <meshStandardMaterial color="#fbcfe8" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.02, 0.025]}>
            <circleGeometry args={[0.045, 16]} />
            <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={0.8} />
          </mesh>
        </group>
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

function useStationHaloTexture(color: string) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [color]);
}

function useStationBeamTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function InteractRing({ def, active }: { def: StationDef; active: boolean }) {
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const outerRingMat = useRef<THREE.MeshBasicMaterial>(null);
  const outerRingMesh = useRef<THREE.Mesh>(null);
  const grp = useRef<THREE.Group>(null);

  const haloTex = useStationHaloTexture(def.color);
  const beamTex = useStationBeamTexture();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = Math.sin(t * 2.5) * 0.5 + 0.5;

    if (haloMat.current) {
      haloMat.current.opacity = active ? 0.65 + pulse * 0.2 : 0.28 + pulse * 0.12;
    }
    if (ringMat.current) {
      ringMat.current.opacity = active ? 0.95 : 0.45 + pulse * 0.15;
    }
    if (beamMat.current) {
      beamMat.current.opacity = active ? 0.55 + pulse * 0.15 : 0.20 + pulse * 0.08;
    }
    if (outerRingMat.current) {
      outerRingMat.current.opacity = active ? 0.75 : 0.25 + pulse * 0.1;
    }
    if (outerRingMesh.current) {
      outerRingMesh.current.rotation.z = t * 0.4;
    }
    if (grp.current) {
      grp.current.scale.setScalar(active ? 1.08 + Math.sin(t * 5) * 0.03 : 1);
    }
  });

  return (
    <group ref={grp} position={[def.interact[0], 0.008, def.interact[1]]}>
      {/* 1. Quầng sáng hào quang mềm mại lan tỏa trên mặt sàn */}
      {haloTex && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
          <planeGeometry args={[1.7, 1.7]} />
          <meshBasicMaterial
            ref={haloMat}
            map={haloTex}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 2. Cột quầng sáng hình nón cụt hắt nhẹ nhàng lên từ nền không gian */}
      {beamTex && (
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.42, 0.62, 0.48, 32, 1, true]} />
          <meshBasicMaterial
            ref={beamMat}
            map={beamTex}
            color={def.color}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. Vòng tròn sáng chính tâm danh mục */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.003}>
        <ringGeometry args={[0.48, 0.58, 48]} />
        <meshBasicMaterial ref={ringMat} color={def.color} transparent opacity={0.5} />
      </mesh>

      {/* 4. Vòng tròn ngoài xoay nhẹ */}
      <mesh ref={outerRingMesh} rotation-x={-Math.PI / 2} position-y={0.003}>
        <ringGeometry args={[0.72, 0.76, 48]} />
        <meshBasicMaterial ref={outerRingMat} color={def.color} transparent opacity={0.3} />
      </mesh>

      {/* 5. Đĩa tâm trong suốt nhẹ */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
        <circleGeometry args={[0.48, 48]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.10} />
      </mesh>
    </group>
  );
}

function StationLabel({
  def,
  active,
  onClick,
}: {
  def: StationDef;
  active: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const { tex, planeW, planeH } = useMemo(() => {
    if (typeof document === 'undefined') return { tex: null, planeW: 1.25, planeH: 0.38 };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { tex: null, planeW: 1.25, planeH: 0.38 };

    const fontStr = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.font = fontStr;
    const text = `${def.emoji}  ${def.label}`;
    const textW = ctx.measureText(text).width;

    const padX = 36;
    const pillH = 92;
    const pillW = Math.max(240, Math.round(textW + padX * 2));
    const padMargin = 14;
    canvas.width = pillW + padMargin * 2;
    canvas.height = pillH + padMargin * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontStr;

    const x = padMargin;
    const y = padMargin;
    const w = pillW;
    const h = pillH;
    const r = h / 2;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

    // Hơi trong suốt (Semi-transparent frosted glass pill)
    ctx.fillStyle = active ? 'rgba(15, 23, 42, 0.70)' : 'rgba(15, 23, 42, 0.50)';
    ctx.fill();
    ctx.lineWidth = active ? 6 : 4;
    ctx.strokeStyle = active ? def.color : `${def.color}dd`;
    ctx.stroke();

    // Text with soft shadow for crisp legibility over transparent backdrop
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = active ? '#ffffff' : '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const baseH = active ? 0.44 : 0.38;
    const baseW = baseH * (canvas.width / canvas.height);

    return { tex: texture, planeW: baseW, planeH: baseH };
  }, [def.color, def.emoji, def.label, active]);

  if (!tex) return null;
  return (
    <Billboard position={def.labelAt}>
      <mesh
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={active ? 0.96 : 0.88}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}

function Station({
  def,
  active,
  onOpenGardenGame,
  timeConfig,
  isDimmed = false,
  onSofaClick,
  onChairClick,
  onDeskClick,
  hideLabel = false,
}: {
  def: StationDef;
  active: boolean;
  onOpenGardenGame?: () => void;
  timeConfig?: TimeConfig;
  isDimmed?: boolean;
  onSofaClick?: () => void;
  onChairClick?: () => void;
  onDeskClick?: () => void;
  hideLabel?: boolean;
}) {
  const Furniture = FURNITURE[def.key];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (def.key === 'overview') {
      onSofaClick?.();
      return;
    }
    if (def.key === 'skills') {
      onDeskClick?.();
      return;
    }
    nav.target = def.interact;
    nav.pending = def.key;
  };

  return (
    <group>
      <group
        onClick={handleClick}
        onPointerOver={(e) => {
          if (def.key !== 'overview') {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          if (def.key !== 'overview') {
            document.body.style.cursor = '';
          }
        }}
      >
        {def.key === 'contact' ? (
          <DoorMailbox onOpenGardenGame={onOpenGardenGame} />
        ) : def.key === 'overview' ? (
          <LivingRoom timeConfig={timeConfig} isDimmed={isDimmed} onSofaClick={onSofaClick} />
        ) : def.key === 'skills' ? (
          <TechLab onChairClick={onChairClick} onDeskClick={onDeskClick} />
        ) : (
          <Furniture />
        )}
      </group>
      <InteractRing def={def} active={active} />
      {!hideLabel && <StationLabel def={def} active={active} onClick={handleClick} />}
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
  timePhase,
  currentTime,
  onSleepChange,
  gardenGameOpen,
}: HouseSceneProps) {
  const duckRef = useRef<THREE.Group>(null);
  const now = currentTime ?? new Date();
  const activePhase: TimePhase = timePhase ?? getRealtimePhase(now);
  const timeConfig = TIME_CONFIGS[activePhase];

  // Trạng thái vịt ngủ & nằm thư giãn ghế lười & sofa:
  // Mặc định khi mới mở Web hoặc từ mini game quay lại: Vịt ở ghế lười!
  // Ban đêm: Vịt ngủ trên ghế lười (isSleeping = true, isLounging = false, isGaming = false)
  // Ban ngày: Vịt không ngủ! Nằm thư giãn ngắm nhà & đeo kính râm hoặc chơi game máy tính
  const isNightInitial = activePhase === 'night';
  const [isSleeping, setIsSleeping] = useState(isNightInitial);
  const [isLounging, setIsLounging] = useState(!isNightInitial);
  const [isGaming, setIsGaming] = useState(false);
  const [duckSpot, setDuckSpot] = useState<DuckSpot>('beanbag');
  const [sleepPose, setSleepPose] = useState<SleepPose>('side');
  const [bubbleMode, setBubbleMode] = useState<'thought' | 'speech'>('thought');

  const isSleepingRef = useRef(isNightInitial);
  const isLoungingRef = useRef(!isNightInitial);
  const isGamingRef = useRef(false);
  const duckSpotRef = useRef<DuckSpot>('beanbag');
  const sleepPoseRef = useRef<SleepPose>('side');
  const targetSpot = useRef<DuckSpot | null>(null);
  const targetSpotReason = useRef<'click' | 'idle_sleep' | 'idle_chill' | 'idle_game'>('click');

  isSleepingRef.current = isSleeping;
  isLoungingRef.current = isLounging;
  isGamingRef.current = isGaming;
  duckSpotRef.current = duckSpot;
  sleepPoseRef.current = sleepPose;

  const motion = useRef<DuckMotion>({
    moving: false,
    lounging: !isNightInitial,
    sleeping: isNightInitial,
    gaming: false,
    spot: 'beanbag',
    sleepPose: 'side',
  });
  const lastNearby = useRef<StationKey | null>(null);
  const lastNearDoor = useRef(false);
  const look = useRef(new THREE.Vector3(0, 0.48, -0.75));
  const tmpPos = useMemo(() => new THREE.Vector3(0, 8.4, 9.8), []);
  const tmpLook = useMemo(() => new THREE.Vector3(0, 0.48, -0.75), []);
  const marker = useRef<THREE.Group>(null);
  const markerMat = useRef<THREE.MeshBasicMaterial>(null);
  const markerAge = useRef(10);

  // Cuộn chuột để quay về chế độ thường khi đang zoom cận cảnh
  const manualZoomOut = useRef(false);
  const manualZoomStation = useRef<StationKey | null>(null);
  const manualZoomDuckPos = useRef<[number, number]>([0, 0]);
  const userZoom = useRef(1.0);
  const targetZoom = useRef(1.0);
  // Đè nút cuộn chuột (middle mouse button) để thay đổi nhẹ góc nhìn camera lên/xuống (pitch tilt)
  const userPitch = useRef(0);
  const targetPitch = useRef(0);
  const stayInOverview = useRef(false);
  const prevOpenStation = useRef<StationKey | null>(null);
  const lastDuckPos = useRef<[number, number]>([4.70, 3.62]);
  const lastClosestStation = useRef<StationKey | null>(null);
  const closedStationKey = useRef<StationKey | null>(null);

  const lastActiveTime = useRef(performance.now());

  // Refs điều khiển ánh sáng mượt mà theo trạng thái thức/ngủ
  const pendantLightRef = useRef<THREE.PointLight>(null);
  const pendantBulbMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  const curPendantIntensity = useRef(timeConfig.pendantIntensity);
  const curPendantEmissive = useRef(timeConfig.pendantEmissiveIntensity);
  const curHemiIntensity = useRef(timeConfig.hemiIntensity);
  const curDirIntensity = useRef(timeConfig.dirIntensity);

  // Cập nhật trạng thái ngủ khi chuyển pha thời gian
  useEffect(() => {
    if (activePhase === 'night') {
      setIsSleeping(true);
      isSleepingRef.current = true;
      setIsLounging(false);
      isLoungingRef.current = false;
      onSleepChange?.(true);
    } else {
      setIsSleeping(false);
      isSleepingRef.current = false;
      onSleepChange?.(false);
      if (duckSpotRef.current === 'beanbag') {
        setIsLounging(true);
        isLoungingRef.current = true;
      }
    }
  }, [activePhase, onSleepChange]);

  // Khi thoát/quay về từ Mario Garden Game: tự động đưa vịt về ghế lười mặc định
  const prevGardenGame = useRef(gardenGameOpen);
  useEffect(() => {
    if (prevGardenGame.current && !gardenGameOpen) {
      input.clear();
      nav.target = null;
      nav.pending = null;
      targetSpot.current = null;
      manualZoomOut.current = false;

      duckSpotRef.current = 'beanbag';
      setDuckSpot('beanbag');

      const isNight = timeConfig.isNight || activePhase === 'night';
      if (isNight) {
        setIsSleeping(true);
        isSleepingRef.current = true;
        setIsLounging(false);
        isLoungingRef.current = false;
        onSleepChange?.(true);
      } else {
        setIsSleeping(false);
        isSleepingRef.current = false;
        setIsLounging(true);
        isLoungingRef.current = true;
        onSleepChange?.(false);
      }

      sleepPoseRef.current = 'side';
      setSleepPose('side');

      if (duckRef.current) {
        duckRef.current.position.set(4.70, 0.20, 3.62);
        duckRef.current.rotation.set(-0.15, -0.45, 0);
      }
    }
    prevGardenGame.current = gardenGameOpen;
  }, [gardenGameOpen, timeConfig.isNight, activePhase, onSleepChange]);

  const wakeUp = useCallback(() => {
    lastActiveTime.current = performance.now();
    input.notifyInteract();
    if (isSleepingRef.current) {
      setIsSleeping(false);
      isSleepingRef.current = false;
      onSleepChange?.(false);
      duckAudio.playJumpSound();
      if (duckSpotRef.current === 'beanbag') {
        setIsLounging(true);
        isLoungingRef.current = true;
      }
    }
    if (isGamingRef.current) {
      setIsGaming(false);
      isGamingRef.current = false;
    }
  }, [onSleepChange]);

  // Khi mở bảng "Về Tôi" (overview) hoặc "Kỹ Năng" (skills): tự động đưa vịt vào vị trí tương ứng
  useEffect(() => {
    if (openStationKey === 'overview') {
      wakeUp();
      manualZoomOut.current = false;
      duckSpotRef.current = 'sofa';
      setDuckSpot('sofa');
      isLoungingRef.current = false;
      setIsLounging(false);
      isGamingRef.current = false;
      setIsGaming(false);
      targetSpot.current = null;
      nav.target = null;
      nav.pending = null;
      duckAudio.playJumpSound();
      if (duckRef.current) {
        duckRef.current.position.set(-5.3, 0.76, -4.8);
        duckRef.current.rotation.set(0, 0.15, 0);
      }
    } else if (openStationKey === 'skills') {
      wakeUp();
      manualZoomOut.current = false;
      duckSpotRef.current = 'computer';
      setDuckSpot('computer');
      setIsGaming(true);
      isGamingRef.current = true;
      isLoungingRef.current = false;
      setIsLounging(false);
      targetSpot.current = null;
      nav.target = null;
      nav.pending = null;
      duckAudio.playJumpSound();
      if (duckRef.current) {
        duckRef.current.position.set(6.25, 0.58, -3.2);
        duckRef.current.rotation.set(0, Math.PI / 2, 0);
      }
    }
  }, [openStationKey, wakeUp]);

  const handleBeanbagClick = useCallback(() => {
    wakeUp();
    manualZoomOut.current = false;
    if (duckSpotRef.current === 'beanbag') {
      input.quackAt = performance.now() / 1000;
      if (!timeConfig.isNight && isSleepingRef.current) {
        setIsSleeping(false);
        isSleepingRef.current = false;
        onSleepChange?.(false);
        setIsLounging(true);
        isLoungingRef.current = true;
        duckAudio.playJumpSound();
      }
      return;
    }
    duckSpotRef.current = 'floor';
    setDuckSpot('floor');
    isLoungingRef.current = false;
    setIsLounging(false);
    isGamingRef.current = false;
    setIsGaming(false);
    if (duckRef.current) {
      duckRef.current.position.y = 0;
      duckRef.current.rotation.x = 0;
    }
    targetSpotReason.current = 'click';
    targetSpot.current = 'beanbag';
    nav.target = [4.70, 3.66];
    nav.pending = null;
    sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
    setSleepPose(sleepPoseRef.current);
  }, [wakeUp, timeConfig.isNight, onSleepChange]);

  const handleSofaClick = useCallback(() => {
    wakeUp();
    manualZoomOut.current = false;
    if (duckSpotRef.current === 'sofa') {
      input.quackAt = performance.now() / 1000;
      onArrive('overview');
      return;
    }
    duckSpotRef.current = 'floor';
    setDuckSpot('floor');
    isLoungingRef.current = false;
    setIsLounging(false);
    isGamingRef.current = false;
    setIsGaming(false);
    if (duckRef.current) {
      duckRef.current.position.y = 0;
      duckRef.current.rotation.x = 0;
    }
    targetSpot.current = 'sofa';
    nav.target = [-5.0, -2.2];
    nav.pending = 'overview';
    sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
    setSleepPose(sleepPoseRef.current);
  }, [wakeUp, onArrive]);

  const handleChairClick = useCallback(() => {
    wakeUp();
    manualZoomOut.current = false;
    if (duckSpotRef.current === 'computer') {
      input.quackAt = performance.now() / 1000;
      return;
    }
    duckSpotRef.current = 'floor';
    setDuckSpot('floor');
    isLoungingRef.current = false;
    setIsLounging(false);
    isGamingRef.current = false;
    setIsGaming(false);
    if (duckRef.current) {
      duckRef.current.position.y = 0;
      duckRef.current.rotation.x = 0;
    }
    targetSpotReason.current = 'click';
    targetSpot.current = 'computer';
    nav.target = [5.0, -3.2];
    nav.pending = null;
  }, [wakeUp]);

  const handleDeskClick = useCallback(() => {
    wakeUp();
    manualZoomOut.current = false;
    if (duckSpotRef.current === 'computer') {
      input.quackAt = performance.now() / 1000;
      onArrive('skills');
      return;
    }
    duckSpotRef.current = 'floor';
    setDuckSpot('floor');
    isLoungingRef.current = false;
    setIsLounging(false);
    isGamingRef.current = false;
    setIsGaming(false);
    if (duckRef.current) {
      duckRef.current.position.y = 0;
      duckRef.current.rotation.x = 0;
    }
    targetSpotReason.current = 'click';
    targetSpot.current = 'computer';
    nav.target = [5.0, -3.2];
    nav.pending = 'skills';
  }, [wakeUp, onArrive]);

  useEffect(() => {
    let isMiddleDragging = false;
    let lastMiddleY = 0;

    const handleWheel = (e: WheelEvent) => {
      lastActiveTime.current = performance.now();
      input.notifyInteract();

      // Nếu đang cuộn trong nội dung văn bản của bảng sidePanel thì không can thiệp
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[class*="sidePanel"]')) {
        return;
      }

      e.preventDefault();

      const delta = e.deltaY * 0.0015;
      targetZoom.current = Math.min(1.5, Math.max(0.48, targetZoom.current + delta));

      if (e.deltaY > 0) {
        // Cuộn xuống = THU NHỎ (Zoom out lên tới 1.5 lần so với mặc định)
        manualZoomOut.current = true;
        if (lastClosestStation.current) {
          manualZoomStation.current = lastClosestStation.current;
        }
        if (duckRef.current) {
          manualZoomDuckPos.current = [duckRef.current.position.x, duckRef.current.position.z];
        }
      } else if (e.deltaY < 0) {
        // Cuộn lên = PHÓNG TO (Zoom in)
        if (targetZoom.current < 0.88) {
          manualZoomOut.current = false;
          manualZoomStation.current = null;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) { // Đè nút cuộn chuột (Middle Mouse Button)
        e.preventDefault();
        isMiddleDragging = true;
        lastMiddleY = e.clientY;
        document.body.style.cursor = 'ns-resize';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMiddleDragging) {
        e.preventDefault();
        lastActiveTime.current = performance.now();
        input.notifyInteract();
        const deltaY = e.movementY !== undefined && e.movementY !== 0 ? e.movementY : e.clientY - lastMiddleY;
        lastMiddleY = e.clientY;
        // Di chuyển chuột lên (deltaY < 0): ngẩng góc nhìn lên / nhìn trực diện hơn
        // Di chuyển chuột xuống (deltaY > 0): nhìn dốc từ trên cao xuống
        const sensitivity = 0.0035;
        targetPitch.current = clamp(targetPitch.current + deltaY * sensitivity, -0.32, 0.32);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || isMiddleDragging) {
        isMiddleDragging = false;
        document.body.style.cursor = '';
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault(); // Ngăn trình duyệt bật biểu tượng autoscroll cuộn trang của Windows
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      lastActiveTime.current = performance.now();
      input.notifyInteract();

      if (e.code === 'Escape' && !openStationKey) {
        manualZoomOut.current = true;
        if (lastClosestStation.current) {
          manualZoomStation.current = lastClosestStation.current;
        }
        if (duckRef.current) {
          manualZoomDuckPos.current = [duckRef.current.position.x, duckRef.current.position.z];
        }
        targetZoom.current = 1.0;
        targetPitch.current = 0; // Reset góc nhìn về chuẩn
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('auxclick', handleAuxClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('auxclick', handleAuxClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openStationKey]);

  useEffect(() => {
    // 1. Khi vừa mở một mục: reset mức zoom về 1.0 chuẩn của mục đó
    if (openStationKey) {
      targetZoom.current = 1.0;
      closedStationKey.current = null;
      manualZoomOut.current = false;
      manualZoomStation.current = null;
    }

    // 2. Khi người dùng tắt bảng tin (đang mở một mục -> đóng bảng):
    // Tự động chuyển camera về view toàn cảnh để người dùng dễ dàng nhìn thấy toàn bộ nhà và điều khiển vịt
    if (prevOpenStation.current && !openStationKey) {
      const closed = prevOpenStation.current;
      targetZoom.current = 1.0;
      stayInOverview.current = true;
      closedStationKey.current = closed;

      // Nếu vừa xem mục "Về Tôi" (overview) hoặc vịt đang trên ghế sofa:
      // Tự động cho vịt nhảy xuống sàn ngay trước sofa để người dùng dễ dàng điều khiển vịt đi tiếp!
      if (closed === 'overview' || duckSpotRef.current === 'sofa') {
        duckSpotRef.current = 'floor';
        setDuckSpot('floor');
        isLoungingRef.current = false;
        setIsLounging(false);
        targetSpot.current = null;
        duckAudio.playJumpSound();
        if (duckRef.current) {
          duckRef.current.position.set(-5.0, 0, -2.2);
          duckRef.current.rotation.set(0, 0, 0);
        }
      } else if (closed === 'skills' || duckSpotRef.current === 'computer') {
        duckSpotRef.current = 'floor';
        setDuckSpot('floor');
        isGamingRef.current = false;
        setIsGaming(false);
        targetSpot.current = null;
        duckAudio.playJumpSound();
        if (duckRef.current) {
          duckRef.current.position.set(5.5, 0, -3.2);
          duckRef.current.rotation.set(0, 0, 0);
        }
      }

      // Ghi nhận vị trí vịt SAU KHI vịt đã ở đúng vị trí sàn (đặc biệt quan trọng cho overview khi vịt nhảy từ sofa xuống sàn),
      // tránh việc tính moved sai lệch khiến stayInOverview bị hủy ngay lập tức ở frame đầu tiên!
      if (duckRef.current) {
        lastDuckPos.current = [duckRef.current.position.x, duckRef.current.position.z];
      }
    }

    prevOpenStation.current = openStationKey ?? null;
  }, [openStationKey]);

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (paused) return;
    wakeUp();
    lastActiveTime.current = performance.now();
    input.notifyInteract();
    targetSpot.current = null;
    if (duckSpotRef.current !== 'floor') {
      const wasOnSofa = duckSpotRef.current === 'sofa';
      const wasOnComputer = duckSpotRef.current === 'computer';
      duckSpotRef.current = 'floor';
      setDuckSpot('floor');
      isLoungingRef.current = false;
      setIsLounging(false);
      isGamingRef.current = false;
      setIsGaming(false);
      if (duckRef.current) {
        duckRef.current.position.y = 0;
        duckRef.current.rotation.x = 0;
        if (wasOnSofa) {
          duckRef.current.position.x = -5.0;
          duckRef.current.position.z = -2.2;
        } else if (wasOnComputer) {
          duckRef.current.position.x = 5.5;
          duckRef.current.position.z = -3.2;
        }
      }
    }
    const [x, z] = resolvePoint(e.point.x, e.point.z);
    input.clear();
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

    // Tự động quét và giải phóng phím kẹt do bộ gõ tiếng Việt nuốt keyup
    input.sweepStuckKeys();

    if (nav.teleport) {
      p.x = nav.teleport[0];
      p.z = nav.teleport[1];
      nav.teleport = null;
      nav.target = null;
      nav.pending = null;
      wakeUp();
      duckSpotRef.current = 'floor';
      setDuckSpot('floor');
      isLoungingRef.current = false;
      setIsLounging(false);
      isGamingRef.current = false;
      setIsGaming(false);
      p.y = 0;
      duck.rotation.x = 0;
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

    const manual = Math.hypot(dx, dz) > 0.08 || input.dirs.size > 0;
    if (manual) {
      wakeUp();
      nav.target = null;
      nav.pending = null;
      targetSpot.current = null;
      if (duckSpotRef.current !== 'floor') {
        const wasOnSofa = duckSpotRef.current === 'sofa';
        const wasOnComputer = duckSpotRef.current === 'computer';
        duckSpotRef.current = 'floor';
        setDuckSpot('floor');
        isLoungingRef.current = false;
        setIsLounging(false);
        isGamingRef.current = false;
        setIsGaming(false);
        p.y = 0;
        duck.rotation.x = 0;
        if (wasOnSofa) {
          p.x = -5.0;
          p.z = -2.2;
        } else if (wasOnComputer) {
          p.x = 5.5;
          p.z = -3.2;
        }
      }
    } else if (nav.target && !paused) {
      if (duckSpotRef.current !== 'floor') {
        wakeUp();
        duckSpotRef.current = 'floor';
        setDuckSpot('floor');
        isLoungingRef.current = false;
        setIsLounging(false);
        isGamingRef.current = false;
        setIsGaming(false);
        p.y = 0;
        duck.rotation.x = 0;
      }
      if (nav.pending === 'overview' && targetSpot.current !== 'sofa') {
        targetSpot.current = 'sofa';
      } else if (nav.pending === 'skills' && targetSpot.current !== 'computer') {
        targetSpot.current = 'computer';
      }
      const tx = nav.target[0] - p.x;
      const tz = nav.target[1] - p.z;
      const d = Math.hypot(tx, tz);
      if (d < 0.25) {
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

    // 1. Kiểm tra tiến vào ghế lười
    if (targetSpot.current === 'beanbag') {
      const d = Math.hypot(p.x - 4.70, p.z - 3.66);
      if (d < 0.55) {
        targetSpot.current = null;
        targetSpotReason.current = 'click';
        nav.target = null;
        duckSpotRef.current = 'beanbag';
        setDuckSpot('beanbag');
        duckAudio.playJumpSound();
        setIsGaming(false);
        isGamingRef.current = false;
        if (timeConfig.isNight) {
          setIsSleeping(true);
          isSleepingRef.current = true;
          onSleepChange?.(true);
          setIsLounging(false);
          isLoungingRef.current = false;
        } else {
          // Ban ngày tuyệt đối không ngủ: Vịt nằm thư giãn / chill trên ghế lười, đeo kính râm
          setIsSleeping(false);
          isSleepingRef.current = false;
          onSleepChange?.(false);
          setIsLounging(true);
          isLoungingRef.current = true;
        }
        if (!sleepPoseRef.current) {
          sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
          setSleepPose(sleepPoseRef.current);
        }
      }
    }

    // 2. Kiểm tra tiến vào ghế sofa
    if (targetSpot.current === 'sofa') {
      const d = Math.hypot(p.x - (-5.0), p.z - (-2.2));
      if (d < 0.65) {
        targetSpot.current = null;
        nav.target = null;
        duckSpotRef.current = 'sofa';
        setDuckSpot('sofa');
        duckAudio.playJumpSound();
        onArrive('overview');
        setIsGaming(false);
        isGamingRef.current = false;
        setIsLounging(false);
        isLoungingRef.current = false;
        if (timeConfig.isNight) {
          setIsSleeping(true);
          isSleepingRef.current = true;
          onSleepChange?.(true);
        } else {
          setIsSleeping(false);
          isSleepingRef.current = false;
          onSleepChange?.(false);
        }
      }
    }

    // 3. Kiểm tra tiến vào bàn máy tính ngồi chơi game
    if (targetSpot.current === 'computer') {
      const d = Math.hypot(p.x - 5.0, p.z - (-3.2));
      if (d < 0.65) {
        targetSpot.current = null;
        targetSpotReason.current = 'click';
        nav.target = null;
        duckSpotRef.current = 'computer';
        setDuckSpot('computer');
        duckAudio.playJumpSound();
        setIsGaming(true);
        isGamingRef.current = true;
        setIsLounging(false);
        isLoungingRef.current = false;
        setIsSleeping(false);
        isSleepingRef.current = false;
        onSleepChange?.(false);
      }
    }

    // 4. Tự động tương tác khi không tương tác (idle > 10s)
    if (!openStationKey && !gardenGameOpen && !paused) {
      const idle = performance.now() - Math.max(lastActiveTime.current, input.lastInteractAt);
      const IDLE_TIMEOUT_MS = 10000;
      if (idle > IDLE_TIMEOUT_MS && !targetSpot.current) {
        if (timeConfig.isNight) {
          // Ban đêm: Vịt đi lại ghế lười để ngủ
          if (duckSpotRef.current !== 'beanbag') {
            if (duckSpotRef.current === 'sofa' || duckSpotRef.current === 'computer') {
              const wasSofa = duckSpotRef.current === 'sofa';
              duckSpotRef.current = 'floor';
              setDuckSpot('floor');
              isLoungingRef.current = false;
              setIsLounging(false);
              isGamingRef.current = false;
              setIsGaming(false);
              p.y = 0;
              duck.rotation.x = 0;
              if (wasSofa) {
                p.x = -5.0;
                p.z = -2.2;
              } else {
                p.x = 5.5;
                p.z = -3.2;
              }
            }
            targetSpotReason.current = 'idle_sleep';
            targetSpot.current = 'beanbag';
            nav.target = [4.70, 3.66];
            nav.pending = null;
            sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
            setSleepPose(sleepPoseRef.current);
          } else if (!isSleepingRef.current) {
            setIsSleeping(true);
            isSleepingRef.current = true;
            onSleepChange?.(true);
            setIsLounging(false);
            isLoungingRef.current = false;
            setIsGaming(false);
            isGamingRef.current = false;
            sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
            setSleepPose(sleepPoseRef.current);
          }
        } else {
          // Ban ngày: VỊT TUYỆT ĐỐI KHÔNG NGỦ!
          // Nếu không tương tác sau 10s: vịt sẽ nằm trên ghế lười chill chill HOẶC lại máy tính ngồi chơi game
          setIsSleeping(false);
          isSleepingRef.current = false;
          onSleepChange?.(false);

          if (duckSpotRef.current === 'floor') {
            // Đang ở trên sàn -> ngẫu nhiên 50/50: ra ghế lười chill HOẶC ra máy tính chơi game
            const pick = Math.random() > 0.5 ? 'beanbag' : 'computer';
            if (pick === 'beanbag') {
              targetSpotReason.current = 'idle_chill';
              targetSpot.current = 'beanbag';
              nav.target = [4.70, 3.66];
              nav.pending = null;
              sleepPoseRef.current = 'prone';
              setSleepPose('prone');
            } else {
              targetSpotReason.current = 'idle_game';
              targetSpot.current = 'computer';
              nav.target = [5.0, -3.2];
              nav.pending = null;
            }
          } else if (duckSpotRef.current === 'beanbag') {
            if (!isLoungingRef.current) {
              setIsLounging(true);
              isLoungingRef.current = true;
            }
            if (isGamingRef.current) {
              setIsGaming(false);
              isGamingRef.current = false;
            }
          } else if (duckSpotRef.current === 'computer') {
            if (!isGamingRef.current) {
              setIsGaming(true);
              isGamingRef.current = true;
            }
            if (isLoungingRef.current) {
              setIsLounging(false);
              isLoungingRef.current = false;
            }
          }
        }
      }
    }

    // 5. Định vị tư thế nằm trên ghế lười, sofa, máy tính hoặc đứng trên sàn
    if (duckSpotRef.current === 'beanbag') {
      const kL = 1 - Math.exp(-dt * 7);
      p.x = THREE.MathUtils.lerp(p.x, 4.70, kL);
      p.z = THREE.MathUtils.lerp(p.z, 3.62, kL);
      p.y = THREE.MathUtils.lerp(p.y, 0.20, kL);
      duck.rotation.y = THREE.MathUtils.lerp(duck.rotation.y, -0.45, kL);
      duck.rotation.x = THREE.MathUtils.lerp(duck.rotation.x, -0.15, kL);
    } else if (duckSpotRef.current === 'sofa') {
      const kL = 1 - Math.exp(-dt * 7);
      p.x = THREE.MathUtils.lerp(p.x, -5.3, kL);
      p.z = THREE.MathUtils.lerp(p.z, -4.8, kL);
      p.y = THREE.MathUtils.lerp(p.y, 0.52, kL);
      const targetYaw = 0.15;
      duck.rotation.y = THREE.MathUtils.lerp(duck.rotation.y, targetYaw, kL);
      duck.rotation.x = THREE.MathUtils.lerp(duck.rotation.x, 0, kL);
    } else if (duckSpotRef.current === 'computer') {
      const kL = 1 - Math.exp(-dt * 7);
      p.x = THREE.MathUtils.lerp(p.x, 6.25, kL);
      p.z = THREE.MathUtils.lerp(p.z, -3.2, kL);
      p.y = THREE.MathUtils.lerp(p.y, 0.58, kL);
      duck.rotation.y = THREE.MathUtils.lerp(duck.rotation.y, Math.PI / 2, kL);
      duck.rotation.x = THREE.MathUtils.lerp(duck.rotation.x, 0, kL);
    } else {
      p.y = THREE.MathUtils.lerp(p.y, 0, 1 - Math.exp(-dt * 12));
      duck.rotation.x = THREE.MathUtils.lerp(duck.rotation.x, 0, 1 - Math.exp(-dt * 12));
    }

    let len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
      len = 1;
    }

    const SPEED = 4.2;
    if (duckSpotRef.current === 'floor') {
      const [nx, nz] = resolvePoint(p.x + dx * SPEED * dt, p.z + dz * SPEED * dt, 0.38);
      p.x = nx;
      p.z = nz;
    }

    const moving = len > 0.05 && duckSpotRef.current === 'floor';
    motion.current.moving = moving;
    motion.current.sleeping = isSleepingRef.current && !!timeConfig.isNight;
    motion.current.lounging = isLoungingRef.current && duckSpotRef.current === 'beanbag' && !motion.current.sleeping;
    motion.current.gaming = isGamingRef.current && duckSpotRef.current === 'computer';
    motion.current.sleepPose = sleepPoseRef.current;
    motion.current.spot = duckSpotRef.current;

    // Facing: movement direction, or toward the station when reading it
    let yaw: number | null = null;
    if (moving) yaw = Math.atan2(dx, dz);
    else if (paused && lastNearby.current) {
      const c = getStation(lastNearby.current).collider;
      yaw = Math.atan2(c[0] - p.x, c[1] - p.z);
    }
    if (yaw !== null && duckSpotRef.current === 'floor') {
      duck.rotation.y = lerpAngle(duck.rotation.y, yaw, 1 - Math.exp(-dt * 12));
    }

    // Nearby detection (only notify React on change)
    // CHỈ nhận diện trạm tương tác khi vịt ĐANG ĐỨNG TRÊN SÀN (duckSpotRef.current === 'floor')
    // và KHÔNG PHẢI đang trong trạng thái chơi game máy tính hoặc nằm nghỉ ngơi!
    let best: StationKey | null = null;
    if (duckSpotRef.current === 'floor' && !isGamingRef.current) {
      let bestD = 1.35;
      for (const s of STATIONS) {
        const d = Math.hypot(p.x - s.interact[0], p.z - s.interact[1]);
        if (d < bestD) {
          bestD = d;
          best = s.key;
        }
      }
    }
    if (best !== nearby || best !== lastNearby.current) {
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

    // Default overview camera (chế độ thường - góc ấm cúng & gần gũi hơn)
    const onBeanbag = duckSpotRef.current === 'beanbag' || targetSpot.current === 'beanbag';
    const isGamingOrComputer =
      duckSpotRef.current === 'computer' ||
      targetSpot.current === 'computer' ||
      isGamingRef.current ||
      targetSpotReason.current === 'idle_game';

    const isOverviewStay = onBeanbag || isGamingOrComputer;
    const defPosX = isOverviewStay ? 0 : p.x * 0.46;
    const defPosY = portrait ? 11.8 : 8.4;
    const defPosZ = isOverviewStay
      ? (portrait ? 11.4 : 9.8)
      : (portrait ? p.z * 0.55 + 11.4 : p.z * 0.38 + 9.8);
    const defLookX = isOverviewStay ? 0 : p.x * 0.62;
    const defLookY = 0.48;
    const defLookZ = isOverviewStay ? -0.75 : p.z * 0.52 - 0.75;

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
    } else if (stayInOverview.current) {
      // VIEW TOÀN CẢNH sau khi tắt bảng tin: camera lập tức mở góc nhìn toàn cảnh rộng rãi
      targetCamPos = portrait ? [0, 11.8, 11.4] : [p.x * 0.25, 8.4, 9.8];
      targetCamLook = portrait ? [0, 0.48, -0.75] : [p.x * 0.3, 0.48, -0.75];

      // Khi người dùng bắt đầu điều khiển vịt di chuyển đủ xa (> 1.2m) hoặc click đi đến mục khác, tự động thoát chế độ giữ toàn cảnh
      const moved = Math.hypot(p.x - lastDuckPos.current[0], p.z - lastDuckPos.current[1]);
      if (moved > 1.2 || (nav.target !== null && nav.pending !== null)) {
        stayInOverview.current = false;
      }
    } else if (duckSpotRef.current === 'sofa' && !manualZoomOut.current) {
      // Góc nhìn cận cảnh ấm áp khi vịt ngủ/nghỉ ngơi trên ghế sofa!
      targetCamPos = [-4.6, portrait ? 5.2 : 3.8, portrait ? -0.4 : -1.8];
      targetCamLook = [-5.2, 0.95, -4.8];
    } else if (isOverviewStay) {
      // Khi vịt ở ghế lười HOẶC đi lại máy tính chơi game: TUYỆT ĐỐI KHÔNG ZOOM CẬN CẢNH!
      // Giữ góc nhìn toàn cảnh (overview) hoàn hảo để người dùng ngắm căn phòng và chú vịt chill/chơi game.
      targetCamPos = [0, defPosY, portrait ? 11.4 : 9.8];
      targetCamLook = [0, 0.48, -0.75];
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

      if (manualZoomOut.current) {
        // Kiểm tra xem vịt đã đi đủ xa khỏi trạm vừa thu nhỏ chưa (> 3.0m)
        // hoặc đã bắt đầu tiếp cận một trạm khác (< 2.5m)
        let isFarEnough = false;
        if (manualZoomStation.current) {
          const sDef = getStation(manualZoomStation.current);
          const d = Math.hypot(p.x - sDef.interact[0], p.z - sDef.interact[1]);
          if (d > 3.0) isFarEnough = true;
        } else {
          const moved = Math.hypot(p.x - manualZoomDuckPos.current[0], p.z - manualZoomDuckPos.current[1]);
          if (moved > 2.0) isFarEnough = true;
        }

        const approachingNewStation =
          closestStation !== null &&
          closestStation !== manualZoomStation.current &&
          minDist < 2.5;

        if (isFarEnough || approachingNewStation) {
          manualZoomOut.current = false;
          manualZoomStation.current = null;
        }
      }
      lastClosestStation.current = closestStation;

      // Nếu vừa tắt bảng thông tin của một trạm, tạm thời không tự động zoom lại vào chính trạm đó
      // cho đến khi vịt đã rời xa (> 2.8m) hoặc di chuyển lại gần một trạm khác
      if (closedStationKey.current) {
        const closedDef = getStation(closedStationKey.current);
        const distToClosed = Math.hypot(p.x - closedDef.interact[0], p.z - closedDef.interact[1]);
        if (distToClosed > 2.8 || (closestStation && closestStation !== closedStationKey.current && minDist < 2.5)) {
          closedStationKey.current = null;
        }
      }

      const ZOOM_DIST = 2.9;
      if (
        closestStation &&
        minDist < ZOOM_DIST &&
        !manualZoomOut.current &&
        closestStation !== closedStationKey.current &&
        !isGamingOrComputer
      ) {
        const cam = STATION_CAMERAS[closestStation];
        const factor = Math.max(0, Math.min(1, (ZOOM_DIST - minDist) / 1.7));
        const t = factor * factor * (3 - 2 * factor);

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

    // Mượt mà hóa độ thu phóng camera do người dùng cuộn chuột
    userZoom.current = THREE.MathUtils.lerp(
      userZoom.current,
      targetZoom.current,
      1 - Math.exp(-dt * 9)
    );

    // Mượt mà hóa độ nghiêng góc nhìn camera khi đè nút cuộn chuột và di chuyển lên xuống
    userPitch.current = THREE.MathUtils.lerp(
      userPitch.current,
      targetPitch.current,
      1 - Math.exp(-dt * 9)
    );

    const zoom = userZoom.current;
    const pitch = userPitch.current;

    const offX = targetCamPos[0] - targetCamLook[0];
    const offY = targetCamPos[1] - targetCamLook[1];
    const offZ = targetCamPos[2] - targetCamLook[2];

    const radiusYZ = Math.hypot(offY, offZ);
    const baseAngle = Math.atan2(offY, offZ);
    const newAngle = clamp(baseAngle + pitch, 0.28, 1.25);
    const newOffY = radiusYZ * Math.sin(newAngle);
    const newOffZ = radiusYZ * Math.cos(newAngle);

    tmpPos.set(
      targetCamLook[0] + offX * zoom,
      targetCamLook[1] + newOffY * zoom,
      targetCamLook[2] + newOffZ * zoom
    );
    tmpLook.set(targetCamLook[0], targetCamLook[1] - pitch * 0.7, targetCamLook[2]);

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

    // Dynamic night lighting transition (dim when sleeping, soft warm golden when awake)
    const isDimmed = timeConfig.isNight && isSleepingRef.current;
    const targetPendant = timeConfig.isNight
      ? (isDimmed ? 3.0 : 22.0)
      : timeConfig.pendantIntensity;
    const targetPendantEmissive = timeConfig.isNight
      ? (isDimmed ? 0.7 : 3.0)
      : timeConfig.pendantEmissiveIntensity;
    const targetHemi = timeConfig.isNight
      ? (isDimmed ? 0.20 : 0.45)
      : timeConfig.hemiIntensity;
    const targetDir = timeConfig.isNight
      ? (isDimmed ? 0.15 : 0.38)
      : timeConfig.dirIntensity;

    const kLight = 1 - Math.exp(-dt * 4.5);
    curPendantIntensity.current = THREE.MathUtils.lerp(curPendantIntensity.current, targetPendant, kLight);
    curPendantEmissive.current = THREE.MathUtils.lerp(curPendantEmissive.current, targetPendantEmissive, kLight);
    curHemiIntensity.current = THREE.MathUtils.lerp(curHemiIntensity.current, targetHemi, kLight);
    curDirIntensity.current = THREE.MathUtils.lerp(curDirIntensity.current, targetDir, kLight);

    if (pendantLightRef.current) pendantLightRef.current.intensity = curPendantIntensity.current;
    if (pendantBulbMatRef.current) pendantBulbMatRef.current.emissiveIntensity = curPendantEmissive.current;
    if (hemiLightRef.current) hemiLightRef.current.intensity = curHemiIntensity.current;
    if (dirLightRef.current) dirLightRef.current.intensity = curDirIntensity.current;
  });

  return (
    <>
      <hemisphereLight
        ref={hemiLightRef}
        args={[timeConfig.hemiSky, timeConfig.hemiGround, timeConfig.hemiIntensity]}
      />
      <directionalLight
        ref={dirLightRef}
        position={timeConfig.dirPos}
        intensity={timeConfig.dirIntensity}
        color={timeConfig.dirColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.00015}
        shadow-radius={3.5}
      />
      {/* Indirect GI Floor Bounce Light: Ánh sáng hắt sàn ấm áp mô phỏng Global Illumination */}
      <directionalLight
        position={[0, -3.5, 0]}
        intensity={timeConfig.isNight ? 0.08 : 0.25}
        color="#f59e0b"
      />
      {/* Soft Window Rim Light - only during day/sunset since night shutters are closed */}
      {!timeConfig.isNight && (
        <directionalLight
          position={[-7.5, 7.5, -6]}
          intensity={timeConfig.windowRimIntensity}
          color={timeConfig.windowRimColor}
        />
      )}
      {/* Ambient Atmospheric Floating Dust Motes */}
      <AtmosphericDust isNight={timeConfig.isNight} />

      {/* Real-time Contact Shadows grounding all furniture and duck */}
      <ContactShadows
        position={[0, 0.004, 0]}
        opacity={0.62}
        scale={18}
        blur={2.4}
        far={4.0}
        resolution={1024}
        color="#18110a"
      />

      {/* Pendant lamp */}
      <group position={[0, 0, 1]}>
        <Cyl position={[0, 3.8, 0]} args={[0.015, 0.015, 0.5, 6]} color="#3d2b1f" />
        <mesh position={[0, 3.45, 0]}>
          <coneGeometry args={[0.45, 0.35, 24, 1, true]} />
          <meshPhysicalMaterial
            color="#2a9d8f"
            roughness={0.32}
            clearcoat={0.45}
            clearcoatRoughness={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 3.3, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            ref={pendantBulbMatRef}
            color="#fff0b3"
            emissive="#ff9d26"
            emissiveIntensity={timeConfig.pendantEmissiveIntensity}
          />
        </mesh>
        <pointLight
          ref={pendantLightRef}
          position={[0, 3.1, 0.4]}
          intensity={timeConfig.pendantIntensity}
          distance={16}
          decay={1.6}
          color="#ffb84d"
        />
      </group>

      <Room
        onFloorClick={handleFloorClick}
        timeConfig={timeConfig}
        currentTime={now}
        onRelaxClick={handleBeanbagClick}
        isLounging={isLounging}
        duckRef={duckRef}
        duckSpotRef={duckSpotRef}
      />

      {STATIONS.map((s) => (
        <Station
          key={s.key}
          def={s}
          active={nearby === s.key}
          onOpenGardenGame={onOpenGardenGame}
          timeConfig={timeConfig}
          isDimmed={isSleeping}
          onSofaClick={handleSofaClick}
          onChairClick={handleChairClick}
          onDeskClick={handleDeskClick}
          hideLabel={s.key === 'overview' && duckSpot === 'sofa'}
        />
      ))}

      {/* Click-to-move marker */}
      <group ref={marker} position={[0, -10, 0]}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.18, 0.26, 32]} />
          <meshBasicMaterial ref={markerMat} color="#fff3c4" transparent opacity={0} />
        </mesh>
      </group>

      <group
        ref={duckRef}
        position={[4.70, 0.20, 3.62]}
        rotation={[-0.15, -0.45, 0]}
        onClick={(e) => {
          e.stopPropagation();
          wakeUp();
          input.quackAt = performance.now() / 1000;
        }}
      >
        <Duck
          motion={motion}
          sleeping={isSleeping && !!timeConfig.isNight}
          lounging={isLounging && duckSpot === 'beanbag' && (!isSleeping || !timeConfig.isNight)}
          gaming={isGaming && duckSpot === 'computer'}
          sleepPose={sleepPose}
        />

        {/* Khung truyện tranh trong suốt nhẹ ở mục "Về tôi" - có thể hiện như đang nói hoặc đang suy nghĩ */}
        {openStationKey === 'overview' && (
          <Html
            position={[0.04, 1.52, 0.08]}
            center
            zIndexRange={[70, 60]}
          >
            <div
              className={`${styles.comicBubbleWrapper} ${bubbleMode === 'thought' ? styles.comicThoughtWrapper : ''
                }`}
              onClick={(e) => {
                e.stopPropagation();
                duckAudio.playQuack();
                input.quackAt = performance.now() / 1000;
                setBubbleMode((prev) => (prev === 'thought' ? 'speech' : 'thought'));
              }}
              title="Click để đổi kiểu truyện tranh: Đang suy nghĩ 💭 / Đang nói 💬"
            >
              <div className={styles.comicBubble}>
                {bubbleMode === 'thought' ? '💭 ' : '💬 '}
                Hãy nhìn vào cặp mắt thơ ngây này đi
              </div>
              {bubbleMode === 'thought' ? (
                <div className={styles.thoughtDots}>
                  <span className={styles.thoughtDotLg} />
                  <span className={styles.thoughtDotMd} />
                  <span className={styles.thoughtDotSm} />
                </div>
              ) : (
                <div className={styles.comicBubbleTail} />
              )}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

export default function HouseScene(props: HouseSceneProps) {
  const activePhase = props.timePhase ?? getRealtimePhase(props.currentTime ?? new Date());
  const timeConfig = TIME_CONFIGS[activePhase];

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [0, 8.4, 9.8], fov: 40, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: timeConfig.isNight ? 1.05 : 1.14,
      }}
      onPointerMissed={() => {
        document.body.style.cursor = '';
      }}
    >
      <color attach="background" args={[timeConfig.isNight ? '#0b111e' : '#1c140d']} />
      <fog attach="fog" args={[timeConfig.isNight ? '#0b111e' : '#1c140d', 18, 36]} />
      <World {...props} />
    </Canvas>
  );
}
