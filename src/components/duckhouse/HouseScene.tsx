'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, RoundedBox } from '@react-three/drei';
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
    // Góc 01 · Phòng khách & Sofa (khung cảnh dạt sang nửa bên phải)
    pos: [-4.2, 3.8, 0.4],
    look: [-4.5, 1.2, -3.2],
    openPos: [-4.6, 2.7, 0.5],
    openLook: [-6.4, 1.1, -4.5],
  },
  experience: {
    // Góc 02 · Xưởng in bao bì (khung cảnh dạt sang nửa bên phải)
    pos: [-3.8, 3.6, 5.4],
    look: [-5.8, 1.2, 2.0],
    openPos: [-4.0, 3.4, 5.2],
    openLook: [-6.6, 1.1, 1.6],
  },
  skills: {
    // Góc 03 · Bàn lab công nghệ & Màn hình code (khung cảnh dạt sang nửa bên phải)
    pos: [3.8, 3.6, -1.0],
    look: [5.0, 1.4, -4.4],
    openPos: [3.2, 3.4, -1.0],
    openLook: [3.8, 1.3, -4.6],
  },
  projects: {
    // Góc 04 · Kệ sách dự án (khung cảnh dạt sang nửa bên phải)
    pos: [3.8, 3.8, 5.2],
    look: [6.5, 1.6, 1.8],
    openPos: [3.4, 3.6, 5.0],
    openLook: [5.2, 1.5, 1.8],
  },
  contact: {
    // Góc 05 · Hòm thư & Cửa ra vào (khung cảnh dạt sang nửa bên phải)
    pos: [1.2, 3.2, -1.6],
    look: [1.4, 1.4, -5.0],
    openPos: [0.6, 3.0, -1.6],
    openLook: [0.8, 1.3, -5.0],
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
  const rotY = isNight ? 0 : side === 'left' ? -Math.PI * 0.44 : Math.PI * 0.44;
  const panelCenterX = side === 'left' ? width / 2 : -width / 2;
  const slats = useMemo(() => Array.from({ length: 9 }, (_, i) => -0.42 + i * 0.1), []);

  return (
    <group position={[pivotX, 0, 0.08]} rotation={[0, rotY, 0]}>
      <group position={[panelCenterX, 0, 0]}>
        {/* Outer wood frame */}
        <Box position={[0, 0, 0]} size={[width, height, 0.04]} color="#3e2723" roughness={0.7} />
        {/* Recessed louver board */}
        <Box position={[0, 0, 0.006]} size={[width - 0.1, height - 0.1, 0.02]} color="#4e342e" roughness={0.8} />
        {/* Horizontal louvers (nan chớp gỗ) */}
        {slats.map((sy, idx) => (
          <mesh key={idx} position={[0, sy, 0.016]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[width - 0.12, 0.065, 0.012]} />
            <meshStandardMaterial color="#5d4037" roughness={0.8} />
          </mesh>
        ))}
        {/* Brass corner brackets */}
        {[
          [-width / 2 + 0.06, height / 2 - 0.06],
          [width / 2 - 0.06, height / 2 - 0.06],
          [-width / 2 + 0.06, -height / 2 + 0.06],
          [width / 2 - 0.06, -height / 2 + 0.06],
        ].map(([bx, by], i) => (
          <mesh key={i} position={[bx, by, 0.023]}>
            <planeGeometry args={[0.045, 0.045]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        {/* Center brass slide lock when closed at night */}
        {isNight && side === 'left' && (
          <group position={[width / 2 - 0.02, 0, 0.028]}>
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
    <group position={[x, 2.3, -5.97]}>
      <mesh>
        <boxGeometry args={[1.8, 1.4, 0.08]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      {/* Sky glass pane */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial
          color={timeConfig.skyColor}
          emissive={timeConfig.skyEmissive}
          emissiveIntensity={timeConfig.skyEmissiveIntensity}
        />
      </mesh>
      {/* Window mullions */}
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[0.06, 1.2, 0.03]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[1.6, 0.06, 0.03]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>

      {/* Sky elements based on time */}
      {timeConfig.isNight ? (
        <>
          {/* Glowing Crescent Moon */}
          <group position={[0.34, 0.28, 0.06]}>
            <mesh>
              <circleGeometry args={[0.16, 24]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh position={[0.06, 0.04, 0.001]}>
              <circleGeometry args={[0.14, 24]} />
              <meshBasicMaterial color={timeConfig.skyColor} />
            </mesh>
          </group>
          {/* Twinkling stars */}
          {stars.map((st, i) => (
            <mesh key={i} position={[st.x, st.y, 0.06]}>
              <circleGeometry args={[st.s, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </>
      ) : (
        <>
          {/* Morning / Sunset sun */}
          {timeConfig.phase === 'morning' && (
            <mesh position={[-0.45, 0.15, 0.055]}>
              <circleGeometry args={[0.18, 24]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          )}
          {timeConfig.phase === 'sunset' && (
            <mesh position={[-0.35, 0.02, 0.055]}>
              <circleGeometry args={[0.22, 24]} />
              <meshBasicMaterial color="#fb923c" />
            </mesh>
          )}
          {/* Fluffy clouds */}
          <mesh position={[-0.35, 0.25, 0.06]}>
            <circleGeometry args={[0.13, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.18, 0.28, 0.06]}>
            <circleGeometry args={[0.17, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {/* Pair of wooden shutters: closed tightly at night, opened wide in day */}
      <ShutterPanel side="left" isNight={timeConfig.isNight} />
      <ShutterPanel side="right" isNight={timeConfig.isNight} />

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

/* ------------------------------------------------------------------ */
/* Cozy Room Decor & Ambiance Details                                  */
/* ------------------------------------------------------------------ */

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

  const dustRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (dustRef.current) {
      const t = clock.elapsedTime;
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
      {/* Light pool on the floor */}
      <mesh position={[0, 0.005, zFloor]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.0, 1.8]} />
        <meshBasicMaterial
          color={timeConfig.beamFloorColor}
          transparent
          opacity={timeConfig.floorPatchOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.006, zFloor]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.4, 1.2]} />
        <meshBasicMaterial
          color={timeConfig.beamFloorColor}
          transparent
          opacity={timeConfig.floorPatchOpacity * 1.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Volumetric sunbeam / moonbeam shaft */}
      <mesh
        position={[0, 1.15, (zFloor - 5.8) / 2]}
        rotation={[Math.atan2(zFloor - (-5.8), 2.3) - Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.75, 1.1, 3.8, 16, 1, true]} />
        <meshBasicMaterial
          color={timeConfig.beamColor}
          transparent
          opacity={timeConfig.beamOpacity}
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
  // Tech lab desk & server rack
  { x: 4.8, z: -4.5, r: 1.45 },
  { x: 7.0, z: -5.2, r: 0.75 },
  // Projects bookshelf & reading corner
  { x: 7.4, z: 1.7, r: 0.95 },
  { x: 4.8, z: 3.4, r: 1.25 },
  { x: 4.05, z: 3.3, r: 0.45 },
  { x: 3.65, z: 4.1, r: 0.65 },
  // Door mailbox
  { x: 1.5, z: -5.2, r: 0.65 },
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

      {/* Rug with soft contact shadow */}
      <mesh position={[0, 0.003, 1]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.68, 48]} />
        <meshBasicMaterial color="#1c140d" transparent opacity={0.16} />
      </mesh>
      <mesh position={[0, 0.006, 1]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#f4dfc8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.008, 1]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.42, 2.52, 48]} />
        <meshStandardMaterial color="#d4a373" roughness={1} />
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
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loader = new THREE.TextureLoader();
    loader.load('/artwork-sofa.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      setTexture(tex);
    });
  }, []);

  // Proportions: exact 16:10 aspect ratio matching user artwork (1024 x 640)
  const canvasW = 3.84;
  const canvasH = 2.40;
  const frameT = 0.07;
  const frameW = canvasW + frameT * 2; // 3.98m
  const frameH = canvasH + frameT * 2; // 2.54m

  return (
    // Positioned at x=-5.73 so left edge reaches x=-7.72 (close to left wall at x=-8.0)
    // and lowered to y=2.32 so bottom edge dips naturally behind sofa backrest (lower by 0.58m)
    <group position={[-5.73, 2.32, -5.96]}>
      {/* Backing mount plate */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial color="#1a110b" roughness={0.9} />
      </mesh>

      {/* The Artwork Canvas with user-attached masterpiece - crisp, tone-correct, zero z-fighting */}
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[canvasW, canvasH]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#0f172a" />
        )}
      </mesh>

      {/* Elegant dark espresso outer frame border bars (no flickering/no z-fighting) */}
      <Box position={[0, (canvasH + frameT) / 2, 0.022]} size={[frameW, frameT, 0.035]} color="#231710" roughness={0.7} />
      <Box position={[0, -(canvasH + frameT) / 2, 0.022]} size={[frameW, frameT, 0.035]} color="#231710" roughness={0.7} />
      <Box position={[-(canvasW + frameT) / 2, 0, 0.022]} size={[frameT, canvasH, 0.035]} color="#231710" roughness={0.7} />
      <Box position={[(canvasW + frameT) / 2, 0, 0.022]} size={[frameT, canvasH, 0.035]} color="#231710" roughness={0.7} />

      {/* Subtle gold foil fillet inner border lining */}
      <mesh position={[0, canvasH / 2, 0.018]}>
        <planeGeometry args={[canvasW, 0.012]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -canvasH / 2, 0.018]}>
        <planeGeometry args={[canvasW, 0.012]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[-canvasW / 2, 0, 0.018]}>
        <planeGeometry args={[0.012, canvasH]} />
        <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[canvasW / 2, 0, 0.018]}>
        <planeGeometry args={[0.012, canvasH]} />
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
      {/* Clickable Sofa */}
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
              ? (isDimmed ? 0.35 : timeConfig.floorLampEmissiveIntensity)
              : 0.9
          }
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight
        position={[-7.2, 1.7, -5]}
        intensity={
          timeConfig
            ? (isDimmed ? 1.2 : timeConfig.floorLampIntensity)
            : 5
        }
        distance={7}
        color="#ffb347"
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
      {/* Power strip under tech desk */}
      <PowerStrip position={[3.7, 0.025, -4.4]} />
      {/* Office wastebasket with crumpled test notes */}
      <WasteBasket position={[3.35, 0.22, -4.75]} />
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
        {/* Welcome Doormat */}
        <WelcomeDoormat />
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
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 640, 160);

    const x = 20, y = 20, w = 600, h = 120, r = 60;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

    ctx.fillStyle = active ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = active ? 10 : 7;
    ctx.strokeStyle = def.color;
    ctx.stroke();

    ctx.font = 'bold 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = active ? '#ffffff' : '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${def.emoji} ${def.label}`, 320, 80);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [def.color, def.emoji, def.label, active]);

  if (!tex) return null;
  return (
    <Billboard position={def.labelAt}>
      <mesh>
        <planeGeometry args={[active ? 2.35 : 2.05, active ? 0.58 : 0.51]} />
        <meshBasicMaterial map={tex} transparent />
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
  hideLabel = false,
}: {
  def: StationDef;
  active: boolean;
  onOpenGardenGame?: () => void;
  timeConfig?: TimeConfig;
  isDimmed?: boolean;
  onSofaClick?: () => void;
  hideLabel?: boolean;
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
        onClick={def.key === 'overview' ? undefined : handleClick}
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
        ) : (
          <Furniture />
        )}
      </group>
      <InteractRing def={def} active={active} />
      {!hideLabel && <StationLabel def={def} active={active} />}
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
  // Ban đêm: Vịt ngủ trên ghế lười (isSleeping = true, isLounging = false)
  // Ban ngày: Vịt nằm thư giãn ngắm nhà & đeo kính râm (isLounging = true, isSleeping = false)
  const isNightInitial = activePhase === 'night';
  const [isSleeping, setIsSleeping] = useState(isNightInitial);
  const [isLounging, setIsLounging] = useState(!isNightInitial);
  const [duckSpot, setDuckSpot] = useState<DuckSpot>('beanbag');
  const [sleepPose, setSleepPose] = useState<SleepPose>('side');

  const isSleepingRef = useRef(isNightInitial);
  const isLoungingRef = useRef(!isNightInitial);
  const duckSpotRef = useRef<DuckSpot>('beanbag');
  const sleepPoseRef = useRef<SleepPose>('side');
  const targetSpot = useRef<DuckSpot | null>(null);

  isSleepingRef.current = isSleeping;
  isLoungingRef.current = isLounging;
  duckSpotRef.current = duckSpot;
  sleepPoseRef.current = sleepPose;

  const motion = useRef<DuckMotion>({
    moving: false,
    lounging: !isNightInitial,
    sleeping: isNightInitial,
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
  const lastDuckPos = useRef<[number, number]>([4.70, 3.62]);
  const lastClosestStation = useRef<StationKey | null>(null);

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
    }
  }, [onSleepChange]);

  // Khi mở bảng "Về Tôi" (overview): tự động cho vịt trèo lên sofa như hình!
  useEffect(() => {
    if (openStationKey === 'overview') {
      wakeUp();
      manualZoomOut.current = false;
      duckSpotRef.current = 'sofa';
      setDuckSpot('sofa');
      isLoungingRef.current = false;
      setIsLounging(false);
      targetSpot.current = null;
      nav.target = null;
      nav.pending = null;
      duckAudio.playJumpSound();
      if (duckRef.current) {
        duckRef.current.position.set(-5.3, 0.76, -4.8);
        duckRef.current.rotation.set(0, 0.15, 0);
      }
    }
  }, [openStationKey, wakeUp]);

  const handleBeanbagClick = useCallback(() => {
    wakeUp();
    manualZoomOut.current = false;
    if (duckSpotRef.current === 'beanbag') {
      input.quackAt = performance.now() / 1000;
      return;
    }
    targetSpot.current = 'beanbag';
    nav.target = [4.70, 3.66];
    nav.pending = null;
    sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
    setSleepPose(sleepPoseRef.current);
  }, [wakeUp]);

  const handleSofaClick = useCallback(() => {
    wakeUp();
    manualZoomOut.current = false;
    onArrive('overview');
    if (duckSpotRef.current === 'sofa') {
      input.quackAt = performance.now() / 1000;
      return;
    }
    targetSpot.current = 'sofa';
    nav.target = [-5.0, -2.2];
    nav.pending = null;
    sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
    setSleepPose(sleepPoseRef.current);
  }, [wakeUp, onArrive]);

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
    wakeUp();
    if (duckSpotRef.current !== 'floor') {
      const wasOnSofa = duckSpotRef.current === 'sofa';
      duckSpotRef.current = 'floor';
      setDuckSpot('floor');
      isLoungingRef.current = false;
      setIsLounging(false);
      targetSpot.current = null;
      if (duckRef.current) {
        duckRef.current.position.y = 0;
        duckRef.current.rotation.x = 0;
        if (wasOnSofa) {
          duckRef.current.position.x = -5.0;
          duckRef.current.position.z = -2.2;
        }
      }
    }
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

    const manual = Math.hypot(dx, dz) > 0.08 || input.dirs.size > 0;
    if (manual) {
      wakeUp();
      nav.target = null;
      nav.pending = null;
      targetSpot.current = null;
      if (duckSpotRef.current !== 'floor') {
        const wasOnSofa = duckSpotRef.current === 'sofa';
        duckSpotRef.current = 'floor';
        setDuckSpot('floor');
        isLoungingRef.current = false;
        setIsLounging(false);
        p.y = 0;
        duck.rotation.x = 0;
        if (wasOnSofa) {
          p.x = -5.0;
          p.z = -2.2;
        }
      }
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

    // 1. Kiểm tra tiến vào ghế lười
    if (targetSpot.current === 'beanbag') {
      const d = Math.hypot(p.x - 4.70, p.z - 3.66);
      if (d < 0.55) {
        targetSpot.current = null;
        nav.target = null;
        duckSpotRef.current = 'beanbag';
        setDuckSpot('beanbag');
        duckAudio.playJumpSound();
        if (timeConfig.isNight) {
          setIsSleeping(true);
          isSleepingRef.current = true;
          onSleepChange?.(true);
        } else {
          setIsLounging(true);
          isLoungingRef.current = true;
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
        if (timeConfig.isNight) {
          setIsSleeping(true);
          isSleepingRef.current = true;
          onSleepChange?.(true);
        }
      }
    }

    // 3. Tự động đi ngủ tại Sofa hoặc Ghế lười nếu đêm và idle > 18s
    if (timeConfig.isNight && !isSleepingRef.current) {
      const idle = performance.now() - Math.max(lastActiveTime.current, input.lastInteractAt);
      if (idle > 18000 && !targetSpot.current) {
        if (duckSpotRef.current === 'floor') {
          // Đi tới giường gần nhất: Sofa hoặc Ghế lười
          const dSofa = Math.hypot(p.x - (-5.0), p.z - (-2.2));
          const dBean = Math.hypot(p.x - 4.70, p.z - 3.66);
          const chosen: DuckSpot = dSofa <= dBean ? 'sofa' : 'beanbag';
          targetSpot.current = chosen;
          nav.target = chosen === 'sofa' ? [-5.0, -2.2] : [4.70, 3.66];
          sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
          setSleepPose(sleepPoseRef.current);
        } else {
          setIsSleeping(true);
          isSleepingRef.current = true;
          onSleepChange?.(true);
          sleepPoseRef.current = Math.random() > 0.5 ? 'side' : 'prone';
          setSleepPose(sleepPoseRef.current);
        }
      }
    }

    // 4. Định vị tư thế nằm trên ghế lười, sofa hoặc đứng trên sàn
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
      p.y = THREE.MathUtils.lerp(p.y, 0.76, kL);
      const targetYaw = 0.15;
      duck.rotation.y = THREE.MathUtils.lerp(duck.rotation.y, targetYaw, kL);
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
    motion.current.sleeping = isSleepingRef.current;
    motion.current.lounging = isLoungingRef.current && duckSpotRef.current === 'beanbag' && !isSleepingRef.current;
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
    
    // Default overview camera (chế độ thường - góc ấm cúng & gần gũi hơn)
    const onBeanbag = duckSpotRef.current === 'beanbag' || targetSpot.current === 'beanbag';
    const defPosX = onBeanbag ? 0 : p.x * 0.46;
    const defPosY = portrait ? 11.8 : 8.4;
    const defPosZ = onBeanbag
      ? (portrait ? 11.4 : 9.8)
      : (portrait ? p.z * 0.55 + 11.4 : p.z * 0.38 + 9.8);
    const defLookX = onBeanbag ? 0 : p.x * 0.62;
    const defLookY = 0.48;
    const defLookZ = onBeanbag ? -0.75 : p.z * 0.52 - 0.75;

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
    } else if (duckSpotRef.current === 'sofa' && !manualZoomOut.current) {
      // Góc nhìn cận cảnh ấm áp khi vịt ngủ/nghỉ ngơi trên ghế sofa!
      targetCamPos = [-4.6, portrait ? 5.2 : 3.8, portrait ? -0.4 : -1.8];
      targetCamLook = [-5.2, 0.95, -4.8];
    } else if (onBeanbag) {
      // Khi vịt ở ghế lười hoặc click di chuyển vào ghế lười: TUYỆT ĐỐI KHÔNG ZOOM!
      // Giữ góc nhìn toàn cảnh (overview) hoàn hảo như hình người dùng yêu cầu.
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
        const moved = Math.hypot(p.x - lastDuckPos.current[0], p.z - lastDuckPos.current[1]);
        if (moved > 0.65 || (closestStation !== lastClosestStation.current && closestStation !== null)) {
          manualZoomOut.current = false;
        }
      }
      lastClosestStation.current = closestStation;

      const ZOOM_DIST = 2.9;
      if (closestStation && minDist < ZOOM_DIST && !manualZoomOut.current) {
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

    // Dynamic night lighting transition (dim when sleeping, bright when awake)
    const isDimmed = timeConfig.isNight && isSleepingRef.current;
    const targetPendant = timeConfig.isNight
      ? (isDimmed ? 2.4 : 24.0)
      : timeConfig.pendantIntensity;
    const targetPendantEmissive = timeConfig.isNight
      ? (isDimmed ? 0.7 : 4.8)
      : timeConfig.pendantEmissiveIntensity;
    const targetHemi = timeConfig.isNight
      ? (isDimmed ? 0.18 : 0.46)
      : timeConfig.hemiIntensity;
    const targetDir = timeConfig.isNight
      ? (isDimmed ? 0.15 : 0.45)
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
        shadow-bias={-0.0002}
      />
      {/* Soft Window Rim Light - only during day/sunset since night shutters are closed */}
      {!timeConfig.isNight && (
        <directionalLight
          position={[-7.5, 7.5, -6]}
          intensity={timeConfig.windowRimIntensity}
          color={timeConfig.windowRimColor}
        />
      )}
      {/* Pendant lamp */}
      <group position={[0, 0, 1]}>
        <Cyl position={[0, 3.8, 0]} args={[0.015, 0.015, 0.5, 6]} color="#3d2b1f" />
        <mesh position={[0, 3.45, 0]}>
          <coneGeometry args={[0.45, 0.35, 24, 1, true]} />
          <meshStandardMaterial color="#2a9d8f" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 3.3, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            ref={pendantBulbMatRef}
            color="#fff3c4"
            emissive="#ffd27a"
            emissiveIntensity={timeConfig.pendantEmissiveIntensity}
          />
        </mesh>
        <pointLight
          ref={pendantLightRef}
          position={[0, 3.1, 0]}
          intensity={timeConfig.pendantIntensity}
          distance={12}
          color="#ffc977"
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
          sleeping={isSleeping}
          lounging={isLounging && duckSpot === 'beanbag' && !isSleeping}
          sleepPose={sleepPose}
        />
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
