'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { input } from './controls';

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const C_YELLOW = new THREE.Color('#ffc62e');
const C_YELLOW_DEEP = new THREE.Color('#f29e1c');
const C_BELLY = new THREE.Color('#fff2b0');
const BEAK = '#ff7a1a';
const BEAK_DARK = '#e85d0c';
const LEG = '#ff8a1f';
const WING = '#f8b81c';
const CAP_BLUE = '#2563eb';
const CAP_BRIM = '#1e40af';

type Vec = [number, number, number];

/* ------------------------------------------------------------------ */
/* Signed distance field of the duck (body + chest + neck + head + tail) */
/* Everything is fused with a smooth-min, so the final mesh is ONE     */
/* continuous surface – no visible joints between primitives.          */
/* ------------------------------------------------------------------ */

const BODY_C: Vec = [0, 0.47, 0];
const BODY_R: Vec = [0.42, 0.36, 0.5];
const CHEST_C: Vec = [0, 0.52, 0.2];
const CHEST_R: Vec = [0.33, 0.3, 0.32];
const TAIL_C: Vec = [0, 0.67, -0.47];
const TAIL_R: Vec = [0.13, 0.1, 0.21];
const NECK_A: Vec = [0, 0.7, 0.14];
const NECK_B: Vec = [0, 0.92, 0.22];
const NECK_R = 0.16;
const HEAD_C: Vec = [0, 1.0, 0.25];
const HEAD_R: Vec = [0.3, 0.285, 0.29];

/** Bone pivots (mesh space) */
const HEAD_PIVOT: Vec = [0, 0.8, 0.18];
const TAIL_PIVOT: Vec = [0, 0.62, -0.36];
/** Head centre relative to the head pivot – used to place face parts */
const HC: Vec = [HEAD_C[0] - HEAD_PIVOT[0], HEAD_C[1] - HEAD_PIVOT[1], HEAD_C[2] - HEAD_PIVOT[2]];
const HEAD_SURF = 0.29;

function sdEllipsoid(x: number, y: number, z: number, c: Vec, r: Vec) {
  const px = x - c[0];
  const py = y - c[1];
  const pz = z - c[2];
  const ax = px / r[0];
  const ay = py / r[1];
  const az = pz / r[2];
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = px / (r[0] * r[0]);
  const by = py / (r[1] * r[1]);
  const bz = pz / (r[2] * r[2]);
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  if (k1 < 1e-8) return -Math.min(r[0], r[1], r[2]);
  return (k0 * (k0 - 1)) / k1;
}

function sdCapsule(x: number, y: number, z: number, a: Vec, b: Vec, r: number) {
  const pax = x - a[0];
  const pay = y - a[1];
  const paz = z - a[2];
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

interface FieldParts {
  d: number;
  core: number;
  head: number;
  tail: number;
}

const parts: FieldParts = { d: 0, core: 0, head: 0, tail: 0 };

function field(x: number, y: number, z: number, out?: FieldParts) {
  const body = sdEllipsoid(x, y, z, BODY_C, BODY_R);
  const chest = sdEllipsoid(x, y, z, CHEST_C, CHEST_R);
  const tail = sdEllipsoid(x, y, z, TAIL_C, TAIL_R);
  const neck = sdCapsule(x, y, z, NECK_A, NECK_B, NECK_R);
  const head = sdEllipsoid(x, y, z, HEAD_C, HEAD_R);
  const core = smin(body, chest, 0.12);
  let d = smin(core, tail, 0.16);
  d = smin(d, neck, 0.14);
  d = smin(d, head, 0.1);
  if (out) {
    out.d = d;
    out.core = core;
    out.head = head;
    out.tail = tail;
  }
  return d;
}

/** Ray-march a dense sphere onto the SDF surface → one seamless skinned mesh. */
function buildDuckBodyGeometry() {
  const geo = new THREE.SphereGeometry(1, 160, 120);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const normals = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const cx = 0;
  const cy = 0.74;
  const cz = 0.1;
  const col = new THREE.Color();
  const eps = 0.0015;

  for (let i = 0; i < n; i++) {
    const dx = pos.getX(i);
    const dy = pos.getY(i);
    const dz = pos.getZ(i);

    // March outward from the inside until we leave the surface, then bisect.
    let lo = 0.05;
    let hi = 1.6;
    const step = 0.008;
    for (let t = 0.05 + step; t < 1.6; t += step) {
      if (field(cx + dx * t, cy + dy * t, cz + dz * t) > 0) {
        lo = t - step;
        hi = t;
        break;
      }
    }
    for (let k = 0; k < 12; k++) {
      const mid = (lo + hi) * 0.5;
      if (field(cx + dx * mid, cy + dy * mid, cz + dz * mid) > 0) hi = mid;
      else lo = mid;
    }
    const t = (lo + hi) * 0.5;
    const x = cx + dx * t;
    const y = cy + dy * t;
    const z = cz + dz * t;
    pos.setXYZ(i, x, y, z);

    // Analytic normal from the SDF gradient (no seams, perfectly smooth)
    let nx = field(x + eps, y, z) - field(x - eps, y, z);
    let ny = field(x, y + eps, z) - field(x, y - eps, z);
    let nz = field(x, y, z + eps) - field(x, y, z - eps);
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    normals[i * 3] = nx;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = nz;

    // Skin weights: soft blend between body / head / tail bones
    field(x, y, z, parts);
    const wHead = smoothstep(-0.09, 0.09, parts.core - parts.head);
    const wTail = (1 - wHead) * smoothstep(-0.07, 0.07, parts.core - parts.tail);
    const wRoot = Math.max(0, 1 - wHead - wTail);
    skinIndex.set([0, 1, 2, 0], i * 4);
    skinWeight.set([wRoot, wHead, wTail, 0], i * 4);

    // Vertex colour: yellow plumage, creamy belly, deeper tail tip, soft ground AO
    col.copy(C_YELLOW);
    const belly = smoothstep(0.02, 0.32, z) * smoothstep(0.66, 0.36, y) * (1 - wHead);
    col.lerp(C_BELLY, belly * 0.8);
    const tailTip = wTail * smoothstep(-0.45, -0.66, z);
    col.lerp(C_YELLOW_DEEP, tailTip * 0.55);
    const ao = 0.78 + 0.22 * smoothstep(0.1, 0.48, y);
    colors[i * 3] = col.r * ao;
    colors[i * 3 + 1] = col.g * ao;
    colors[i * 3 + 2] = col.b * ao;
  }

  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  geo.computeBoundingSphere();
  return geo;
}

/** Deform a sphere with a per-vertex function, then weld + smooth normals. */
function sculpt(widthSeg: number, heightSeg: number, fn: (v: THREE.Vector3) => void) {
  const g = new THREE.SphereGeometry(1, widthSeg, heightSeg);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    fn(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const merged = mergeVertices(g, 1e-5);
  g.dispose();
  merged.computeVertexNormals();
  return merged;
}

function buildBeak(lower: boolean) {
  return sculpt(48, 28, (v) => {
    const f = (v.z + 1) / 2; // 0 = back (inside head) → 1 = tip
    v.x *= 0.115 + 0.055 * f; // spoon: wider at the tip
    v.y *= (lower ? 0.032 : 0.052) * (1 - 0.3 * f);
    v.z *= lower ? 0.14 : 0.165;
    if (!lower) v.y -= 0.028 * f * f; // gentle down-curve
  });
}

function buildWing() {
  return sculpt(40, 28, (v) => {
    const taper = v.z < 0 ? 1 + v.z * 0.6 : 1; // teardrop toward the back
    v.x *= 0.07 * taper;
    v.y *= 0.19 * taper;
    v.z *= 0.3;
    v.x -= v.z * v.z * 0.25; // curve inward to hug the body
  });
}

function buildFoot() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.03);
  s.quadraticCurveTo(-0.06, -0.01, -0.08, 0.11);
  s.quadraticCurveTo(-0.06, 0.1, -0.035, 0.095);
  s.quadraticCurveTo(-0.015, 0.15, 0, 0.145);
  s.quadraticCurveTo(0.015, 0.15, 0.035, 0.095);
  s.quadraticCurveTo(0.06, 0.1, 0.08, 0.11);
  s.quadraticCurveTo(0.06, -0.01, 0, -0.03);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 4,
    curveSegments: 16,
  });
  return g;
}

function buildBrim() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0);
  s.quadraticCurveTo(-0.21, 0.2, 0, 0.21);
  s.quadraticCurveTo(0.21, 0.2, 0.2, 0);
  s.quadraticCurveTo(0, 0.07, -0.2, 0);
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 4,
    curveSegments: 28,
  });
}

function radialTexture(stops: [number, string][]) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, s]) => g.addColorStop(o, s));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Position + orientation of a decal/feature on the head surface */
function onHead(dir: Vec, lift = 1) {
  const d = new THREE.Vector3(...dir).normalize();
  const p = new THREE.Vector3(...HC).addScaledVector(d, HEAD_SURF * lift);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  return { position: p.toArray() as Vec, quaternion: q };
}

/* ------------------------------------------------------------------ */
/* Soft contact shadow + quack note                                    */
/* ------------------------------------------------------------------ */

function DuckBlobShadow({ duckY }: { duckY: React.RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(
    () =>
      radialTexture([
        [0, 'rgba(25,14,8,0.75)'],
        [0.4, 'rgba(25,14,8,0.4)'],
        [0.75, 'rgba(25,14,8,0.1)'],
        [1, 'rgba(25,14,8,0)'],
      ]),
    [],
  );

  useFrame(() => {
    if (!meshRef.current || !matRef.current) return;
    const h = Math.max(0, duckY.current ?? 0);
    const s = 1 + h * 0.75;
    meshRef.current.scale.set(s, s, 1);
    matRef.current.opacity = Math.max(0.08, 0.5 - h * 0.45);
  });

  if (!texture) return null;
  return (
    <mesh ref={meshRef} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.05, 1.3]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function QuackBubble() {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.font = '72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎵', 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(() => {
    if (!groupRef.current || !matRef.current) return;
    const q = performance.now() / 1000 - input.quackAt;
    if (q >= 0 && q < 0.7) {
      const p = q / 0.7;
      groupRef.current.visible = true;
      groupRef.current.position.set(Math.sin(p * Math.PI * 2.5) * 0.08, 1.5 + p * 0.5, 0.2);
      const s = Math.sin(p * Math.PI) * 0.75;
      groupRef.current.scale.set(s, s, s);
      matRef.current.opacity = Math.sin(p * Math.PI);
    } else {
      groupRef.current.visible = false;
    }
  });

  if (!texture) return null;
  return (
    <Billboard ref={groupRef} visible={false}>
      <mesh>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial ref={matRef} map={texture} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

function SleepZzzBubble({ sleeping }: { sleeping?: boolean }) {
  const zzzRef = useRef<THREE.Group>(null);
  const textures = useMemo(() => {
    if (typeof document === 'undefined') return [];
    return ['Z', 'z', '·'].map((char, i) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.font = `bold ${i === 0 ? 76 : i === 1 ? 58 : 42}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#93c5fd';
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.fillText(char, 64, 64);
      return new THREE.CanvasTexture(c);
    });
  }, []);

  const itemsRef = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    if (!zzzRef.current) return;
    zzzRef.current.visible = Boolean(sleeping);
    if (!sleeping) return;

    const t = clock.elapsedTime;
    itemsRef.current.forEach((item, idx) => {
      if (!item) return;
      const cycle = (t * 0.7 + idx * 0.45) % 1.8;
      const p = cycle / 1.8;
      const rise = p * 0.85;
      const sway = Math.sin(p * Math.PI * 2 + idx) * 0.12;
      item.position.set(0.18 + rise * 0.2 + sway, 1.35 + rise, 0.1);
      const scale = Math.sin(p * Math.PI) * (0.6 + (2 - idx) * 0.2);
      item.scale.set(scale, scale, scale);
    });
  });

  if (!textures.length) return null;
  return (
    <group ref={zzzRef} visible={false}>
      {textures.map((tex, i) => (
        <Billboard
          key={i}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
        >
          {tex && (
            <mesh>
              <planeGeometry args={[0.42, 0.42]} />
              <meshBasicMaterial map={tex} transparent depthWrite={false} />
            </mesh>
          )}
        </Billboard>
      ))}
    </group>
  );
}

function RelaxBlissBubble({ lounging, sleeping }: { lounging?: boolean; sleeping?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const visible = Boolean(lounging && !sleeping);
    groupRef.current.visible = visible;
    if (!visible) return;

    const t = clock.elapsedTime;
    const cycle = (t * 0.6) % 2.4;
    const p = cycle / 2.4;
    const rise = p * 0.6;
    const sway = Math.sin(p * Math.PI * 2) * 0.08;
    groupRef.current.position.set(0.1 + sway, 1.45 + rise, 0.15);
    const scale = Math.sin(p * Math.PI) * 0.55;
    groupRef.current.scale.set(scale, scale, scale);
  });

  if (!texture) return null;
  return (
    <Billboard ref={groupRef} visible={false}>
      <mesh>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

function GameBubble({ gaming }: { gaming?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎮', 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const visible = Boolean(gaming);
    groupRef.current.visible = visible;
    if (!visible) return;

    const t = clock.elapsedTime;
    const cycle = (t * 0.7) % 2.2;
    const p = cycle / 2.2;
    const rise = p * 0.55;
    const sway = Math.sin(p * Math.PI * 2) * 0.08;
    groupRef.current.position.set(0.1 + sway, 1.45 + rise, 0.15);
    const scale = Math.sin(p * Math.PI) * 0.55;
    groupRef.current.scale.set(scale, scale, scale);
  });

  if (!texture) return null;
  return (
    <Billboard ref={groupRef} visible={false}>
      <mesh>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

/* ------------------------------------------------------------------ */
/* Sunglasses & Cozy Blanket Accessories                               */
/* ------------------------------------------------------------------ */

function Sunglasses({ visible }: { visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);

  useFrame((_, rawDt) => {
    if (!groupRef.current) return;
    const dt = Math.min(rawDt, 0.05);
    const target = visible ? 1 : 0;
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, target, 1 - Math.exp(-dt * 12));
    groupRef.current.scale.setScalar(scaleRef.current);
    groupRef.current.visible = scaleRef.current > 0.01;
  });

  return (
    <group ref={groupRef} position={[HC[0], HC[1] + 0.062, HC[2] + 0.285]} rotation={[0.08, 0, 0]}>
      {/* Central bridge */}
      <mesh position={[0, 0.012, 0.01]}>
        <boxGeometry args={[0.06, 0.014, 0.012]} />
        <meshPhysicalMaterial color="#d97706" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Left Lens + Rim */}
      <group position={[0.11, 0, 0]} rotation={[0, 0.18, 0]}>
        <mesh>
          <boxGeometry args={[0.115, 0.075, 0.016]} />
          <meshPhysicalMaterial
            color="#0b0f19"
            roughness={0.06}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        {/* Gold frame trim */}
        <mesh scale={[1.08, 1.08, 0.5]}>
          <boxGeometry args={[0.115, 0.075, 0.016]} />
          <meshPhysicalMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Right Lens + Rim */}
      <group position={[-0.11, 0, 0]} rotation={[0, -0.18, 0]}>
        <mesh>
          <boxGeometry args={[0.115, 0.075, 0.016]} />
          <meshPhysicalMaterial
            color="#0b0f19"
            roughness={0.06}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        <mesh scale={[1.08, 1.08, 0.5]}>
          <boxGeometry args={[0.115, 0.075, 0.016]} />
          <meshPhysicalMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Temple arms */}
      <mesh position={[0.175, 0.005, -0.09]} rotation={[0, 0.16, 0]}>
        <boxGeometry args={[0.01, 0.014, 0.18]} />
        <meshPhysicalMaterial color="#1f2937" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[-0.175, 0.005, -0.09]} rotation={[0, -0.16, 0]}>
        <boxGeometry args={[0.01, 0.014, 0.18]} />
        <meshPhysicalMaterial color="#1f2937" roughness={0.2} metalness={0.6} />
      </mesh>
    </group>
  );
}

function CozyBlanket({ visible, pose }: { visible: boolean; pose?: SleepPose }) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);

  useFrame((state, rawDt) => {
    if (!groupRef.current) return;
    const dt = Math.min(rawDt, 0.05);
    const target = visible ? 1 : 0;
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, target, 1 - Math.exp(-dt * 6.5));
    const s = scaleRef.current;

    // Gentle breathing rise and fall
    const breath = visible ? Math.sin(state.clock.elapsedTime * 1.8) * 0.016 : 0;

    groupRef.current.position.y = 0.44 + breath;
    groupRef.current.scale.set(s, s * (1 + breath * 1.5), s);
    groupRef.current.visible = s > 0.01;
  });

  const isProne = pose === 'prone';

  return (
    <group
      ref={groupRef}
      position={[0, 0.44, isProne ? -0.06 : -0.02]}
      rotation={[isProne ? 0.08 : 0, 0, 0]}
    >
      {/* Main soft puffy blanket body */}
      <RoundedBox
        args={[0.88, 0.46, 0.82]}
        radius={0.16}
        smoothness={6}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#6ea4bf" // Soft cozy nordic pastel blue
          emissive="#234557"
          emissiveIntensity={0.35}
          roughness={0.9}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Turned-down plush hem / collar (cổ chăn gập bồng bềnh) */}
      <group position={[0, 0.19, 0.32]} rotation={[0.12, 0, 0]}>
        <RoundedBox args={[0.82, 0.12, 0.2]} radius={0.05} smoothness={4} castShadow>
          <meshStandardMaterial
            color="#fffdf0"
            emissive="#fed7aa"
            emissiveIntensity={0.25}
            roughness={0.85}
          />
        </RoundedBox>
        {/* Soft stitch accent stripe */}
        <mesh position={[0, 0.062, 0]}>
          <boxGeometry args={[0.76, 0.005, 0.02]} />
          <meshBasicMaterial color="#d4a373" />
        </mesh>
      </group>

      {/* Cute little sleeping star embroidery patch on the side */}
      <mesh position={[0.28, 0.22, 0.1]} rotation={[-0.4, 0.2, 0]}>
        <planeGeometry args={[0.13, 0.13]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Duck                                                                */
/* ------------------------------------------------------------------ */

export type SleepPose = 'side' | 'prone';
export type DuckSpot = 'floor' | 'beanbag' | 'sofa' | 'computer';

export interface DuckMotion {
  moving: boolean;
  sleeping?: boolean;
  lounging?: boolean;
  gaming?: boolean;
  sleepPose?: SleepPose;
  spot?: DuckSpot;
}

export function Duck({
  motion,
  sleeping = false,
  lounging = false,
  gaming = false,
  sleepPose = 'side',
}: {
  motion: React.RefObject<DuckMotion>;
  sleeping?: boolean;
  lounging?: boolean;
  gaming?: boolean;
  sleepPose?: SleepPose;
}) {
  const rig = useMemo(() => {
    const geo = buildDuckBodyGeometry();
    const mat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.36,
      metalness: 0.02,
      sheen: 1,
      sheenRoughness: 0.32,
      sheenColor: new THREE.Color('#fff9d2'),
      clearcoat: 0.52,
      clearcoatRoughness: 0.15,
      ior: 1.48,
    });
    const root = new THREE.Bone();
    const headBone = new THREE.Bone();
    headBone.position.set(...HEAD_PIVOT);
    const tailBone = new THREE.Bone();
    tailBone.position.set(...TAIL_PIVOT);
    root.add(headBone, tailBone);
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.add(root);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton([root, headBone, tailBone]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return { mesh, headBone, tailBone, geo, mat };
  }, []);

  const assets = useMemo(() => {
    return {
      beakUpper: buildBeak(false),
      beakLower: buildBeak(true),
      wing: buildWing(),
      foot: buildFoot(),
      brim: buildBrim(),
      blush: radialTexture([
        [0, 'rgba(255,110,140,0.85)'],
        [0.55, 'rgba(255,110,140,0.35)'],
        [1, 'rgba(255,110,140,0)'],
      ]),
      eyeL: onHead([0.42, 0.3, 0.86], 0.96),
      eyeR: onHead([-0.42, 0.3, 0.86], 0.96),
      cheekL: onHead([0.66, -0.06, 0.75], 1.02),
      cheekR: onHead([-0.66, -0.06, 0.75], 1.02),
    };
  }, []);

  useEffect(() => {
    return () => {
      rig.geo.dispose();
      rig.mat.dispose();
      assets.beakUpper.dispose();
      assets.beakLower.dispose();
      assets.wing.dispose();
      assets.foot.dispose();
      assets.brim.dispose();
      assets.blush?.dispose();
    };
  }, [rig, assets]);

  const inner = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const lowerBeak = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Group>(null);
  const footR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const duckY = useRef(0);
  const phase = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const moving = motion.current?.moving ?? false;
    const isSleeping = motion.current?.sleeping ?? sleeping;
    const isLounging = motion.current?.lounging ?? lounging;
    const isGaming = motion.current?.gaming ?? gaming;
    const currentSleepPose = motion.current?.sleepPose ?? sleepPose ?? 'side';
    const q = performance.now() / 1000 - input.quackAt;
    const quacking = q >= 0 && q < 0.6;
    const k = (rate: number) => 1 - Math.exp(-dt * rate); // frame-rate independent smoothing

    if (moving) phase.current += dt * 13.5;
    else {
      const rest = Math.round(phase.current / Math.PI) * Math.PI;
      phase.current = THREE.MathUtils.lerp(phase.current, rest, k(8));
    }
    const ph = phase.current;

    // Bob + quack hop + breathing
    const jp = quacking ? q / 0.6 : 1;
    const hop = quacking ? Math.sin(jp * Math.PI) * 0.55 : 0;
    let bob = 0;
    if (isSleeping) {
      bob = Math.sin(t * 1.8) * 0.016;
    } else if (isLounging) {
      bob = Math.sin(t * 1.4) * 0.012;
    } else if (isGaming) {
      bob = Math.sin(t * 5.0) * 0.012;
    } else {
      bob = moving ? Math.abs(Math.sin(ph)) * 0.06 : Math.sin(t * 2) * 0.01;
    }
    duckY.current = hop + bob;

    // Squash & stretch (breathing)
    let sy = 1;
    if (quacking) sy = 1 + Math.cos(jp * Math.PI) * 0.18;
    else if (isSleeping) sy = 1 + Math.sin(t * 1.8) * 0.035;
    else if (isLounging) sy = 1 + Math.sin(t * 1.4) * 0.025;
    else if (isGaming) sy = 1 + Math.sin(t * 4.0) * 0.018;
    else if (moving) sy = 1 + Math.sin(ph * 2) * 0.035;
    else sy = 1 + Math.sin(t * 2.2) * 0.014;
    const sxz = 1 / Math.sqrt(sy); // volume preserving

    if (inner.current) {
      if (isSleeping) {
        if (currentSleepPose === 'prone') {
          // Nằm sấp (Prone / Belly sleeper)
          inner.current.position.y = THREE.MathUtils.lerp(inner.current.position.y, -0.12 + bob, k(10));
          inner.current.rotation.x = THREE.MathUtils.lerp(inner.current.rotation.x, 0.16, k(10));
          inner.current.rotation.z = THREE.MathUtils.lerp(inner.current.rotation.z, 0, k(10));
          inner.current.position.x = THREE.MathUtils.lerp(inner.current.position.x, 0, k(10));
        } else {
          // Nằm nghiêng (Side sleeper)
          inner.current.position.y = THREE.MathUtils.lerp(inner.current.position.y, -0.08 + bob, k(10));
          inner.current.rotation.x = THREE.MathUtils.lerp(inner.current.rotation.x, 0.08, k(10));
          inner.current.rotation.z = THREE.MathUtils.lerp(inner.current.rotation.z, 1.25, k(10));
          inner.current.position.x = THREE.MathUtils.lerp(inner.current.position.x, 0, k(10));
        }
      } else if (isLounging) {
        // Nằm ngửa sâu dưới lòng đệm ghế lười, ngả lưng tựa vào thành ghế phía sau
        inner.current.position.y = THREE.MathUtils.lerp(inner.current.position.y, -0.06 + bob, k(10));
        inner.current.rotation.x = THREE.MathUtils.lerp(inner.current.rotation.x, -0.62, k(10));
        inner.current.rotation.z = THREE.MathUtils.lerp(inner.current.rotation.z, 0, k(10));
        inner.current.position.x = THREE.MathUtils.lerp(inner.current.position.x, 0, k(10));
        inner.current.position.z = THREE.MathUtils.lerp(inner.current.position.z, 0.08, k(10));
      } else if (isGaming) {
        // Ngồi vững trên ghế xoay văn phòng, hướng về phía bàn máy tính
        inner.current.position.y = THREE.MathUtils.lerp(inner.current.position.y, -0.02 + bob, k(10));
        inner.current.rotation.x = THREE.MathUtils.lerp(inner.current.rotation.x, 0.08, k(10));
        inner.current.rotation.z = THREE.MathUtils.lerp(inner.current.rotation.z, Math.sin(t * 6) * 0.03, k(10));
        inner.current.position.x = THREE.MathUtils.lerp(inner.current.position.x, 0, k(10));
        inner.current.position.z = THREE.MathUtils.lerp(inner.current.position.z, 0, k(10));
      } else {
        inner.current.position.y = duckY.current;
        inner.current.rotation.z = THREE.MathUtils.lerp(inner.current.rotation.z, moving ? Math.sin(ph) * 0.12 : 0, k(14));
        inner.current.rotation.x = THREE.MathUtils.lerp(inner.current.rotation.x, moving ? 0.06 : 0, k(6));
        inner.current.position.x = THREE.MathUtils.lerp(inner.current.position.x, moving ? Math.sin(ph) * 0.03 : 0, k(14));
        inner.current.position.z = THREE.MathUtils.lerp(inner.current.position.z, 0, k(10));
      }
      inner.current.scale.set(0.96 * sxz, 0.96 * sy, 0.96 * sxz);
    }

    // Head (bone + face-parts group share the same rotation)
    const hb = rig.headBone;
    let hx = -0.2;
    let hy = 0;
    let hz = 0;
    if (quacking) {
      hx = -0.4;
      hy = Math.sin(q * 30) * 0.08;
    } else if (isSleeping) {
      if (currentSleepPose === 'prone') {
        hx = 0.16;
        hz = 0.14;
        hy = 0.05;
      } else {
        hx = 0.04;
        hz = -0.18;
        hy = 0;
      }
    } else if (isLounging) {
      hx = 0.18;
      hz = 0;
      hy = Math.sin(t * 0.8) * 0.06;
    } else if (isGaming) {
      // Hướng đầu chăm chú nhìn vào màn hình máy tính chơi game!
      hx = -0.12 + Math.sin(t * 5) * 0.04;
      hz = Math.sin(t * 3.5) * 0.03;
      hy = Math.sin(t * 4) * 0.06;
    } else if (moving) {
      hz = -Math.sin(ph) * 0.09;
      hx = -0.2 + Math.sin(ph * 2) * 0.04;
    } else {
      const cyc = t % 6;
      if (cyc > 3.6 && cyc < 5.4) {
        hz = 0.18;
        hy = 0.25;
      } else hy = Math.sin(t * 0.8) * 0.14;
    }
    hb.rotation.x = THREE.MathUtils.lerp(hb.rotation.x, hx, k(9));
    hb.rotation.y = THREE.MathUtils.lerp(hb.rotation.y, hy, k(6));
    hb.rotation.z = THREE.MathUtils.lerp(hb.rotation.z, hz, k(9));
    if (headGroup.current) headGroup.current.rotation.copy(hb.rotation);

    // Tail wag
    const tb = rig.tailBone;
    const wag = moving ? Math.sin(ph) * 0.35 : isSleeping ? 0 : isGaming ? Math.sin(t * 18) * 0.2 : t % 4 < 0.6 ? Math.sin(t * 22) * 0.25 : 0;
    tb.rotation.y = THREE.MathUtils.lerp(tb.rotation.y, wag, k(18));
    tb.rotation.x = THREE.MathUtils.lerp(tb.rotation.x, moving ? -0.12 : -0.04, k(6));

    // Blink / Sleep / Relax
    const blink = isSleeping ? 0.05 : isLounging ? 0.55 : isGaming ? (t % 4.5 > 4.38 ? 0.1 : 1) : t % 3.6 > 3.48 ? 0.1 : 1;
    if (eyeL.current) eyeL.current.scale.y = THREE.MathUtils.lerp(eyeL.current.scale.y, blink, k(25));
    if (eyeR.current) eyeR.current.scale.y = THREE.MathUtils.lerp(eyeR.current.scale.y, blink, k(25));

    // Beak
    if (lowerBeak.current) {
      const open = quacking ? 0.4 + Math.abs(Math.sin(q * 35)) * 0.25 : 0;
      lowerBeak.current.rotation.x = THREE.MathUtils.lerp(lowerBeak.current.rotation.x, open, k(25));
    }

    // Wings
    let flapL = 0;
    let flapR = 0;
    if (quacking) {
      const fl = Math.abs(Math.sin(q * 42)) * 0.9;
      flapL = fl;
      flapR = -fl;
    } else if (isSleeping) {
      flapL = 0.02;
      flapR = -0.02;
    } else if (isLounging) {
      flapL = 0.62;
      flapR = -0.62;
    } else if (isGaming) {
      // Đôi cánh gõ phím / bấm chuột chơi game lia lịa!
      flapL = 0.22 + Math.sin(t * 14) * 0.12;
      flapR = -(0.22 + Math.cos(t * 14) * 0.12);
    } else if (moving) {
      const fl = Math.abs(Math.sin(ph * 2)) * 0.15;
      flapL = fl;
      flapR = -fl;
    } else {
      const fl = Math.abs(Math.sin(t * 2.2)) * 0.03;
      flapL = fl;
      flapR = -fl;
    }
    if (wingL.current) wingL.current.rotation.z = THREE.MathUtils.lerp(wingL.current.rotation.z, flapL, k(25));
    if (wingR.current) wingR.current.rotation.z = THREE.MathUtils.lerp(wingR.current.rotation.z, flapR, k(25));

    // Feet
    if (footL.current && footR.current) {
      if (isSleeping) {
        if (currentSleepPose === 'prone') {
          footL.current.rotation.x = THREE.MathUtils.lerp(footL.current.rotation.x, 0.45, k(12));
          footR.current.rotation.x = THREE.MathUtils.lerp(footR.current.rotation.x, 0.45, k(12));
          footL.current.position.y = THREE.MathUtils.lerp(footL.current.position.y, 0.06, k(12));
          footR.current.position.y = THREE.MathUtils.lerp(footR.current.position.y, 0.06, k(12));
        } else {
          footL.current.rotation.x = THREE.MathUtils.lerp(footL.current.rotation.x, 0.35, k(12));
          footR.current.rotation.x = THREE.MathUtils.lerp(footR.current.rotation.x, 0.35, k(12));
          footL.current.position.y = THREE.MathUtils.lerp(footL.current.position.y, 0.08, k(12));
          footR.current.position.y = THREE.MathUtils.lerp(footR.current.position.y, 0.08, k(12));
        }
        footL.current.position.x = THREE.MathUtils.lerp(footL.current.position.x, 0.15, k(15));
        footR.current.position.x = THREE.MathUtils.lerp(footR.current.position.x, -0.15, k(15));
        footL.current.position.z = THREE.MathUtils.lerp(footL.current.position.z, 0.04, k(15));
        footR.current.position.z = THREE.MathUtils.lerp(footR.current.position.z, 0.04, k(15));
        footL.current.rotation.z = THREE.MathUtils.lerp(footL.current.rotation.z, 0, k(15));
        footR.current.rotation.z = THREE.MathUtils.lerp(footR.current.rotation.z, 0, k(15));
        footL.current.rotation.y = THREE.MathUtils.lerp(footL.current.rotation.y, 0, k(15));
        footR.current.rotation.y = THREE.MathUtils.lerp(footR.current.rotation.y, 0, k(15));
      } else if (isLounging) {
        // Nằm ngửa dang rộng hai chân vui nhộn trên mặt ghế lười (man-spreading / starfish)
        footL.current.position.x = THREE.MathUtils.lerp(footL.current.position.x, 0.42, k(15));
        footR.current.position.x = THREE.MathUtils.lerp(footR.current.position.x, -0.42, k(15));
        footL.current.position.y = THREE.MathUtils.lerp(footL.current.position.y, 0.28, k(15));
        footR.current.position.y = THREE.MathUtils.lerp(footR.current.position.y, 0.28, k(15));
        footL.current.position.z = THREE.MathUtils.lerp(footL.current.position.z, 0.36, k(15));
        footR.current.position.z = THREE.MathUtils.lerp(footR.current.position.z, 0.36, k(15));

        footL.current.rotation.x = THREE.MathUtils.lerp(footL.current.rotation.x, -0.95, k(15));
        footR.current.rotation.x = THREE.MathUtils.lerp(footR.current.rotation.x, -0.95, k(15));
        footL.current.rotation.z = THREE.MathUtils.lerp(footL.current.rotation.z, 0.82, k(15));  // Dang rộng sang trái
        footR.current.rotation.z = THREE.MathUtils.lerp(footR.current.rotation.z, -0.82, k(15)); // Dang rộng sang phải
        footL.current.rotation.y = THREE.MathUtils.lerp(footL.current.rotation.y, -0.5, k(15));   // Bàn chân mở xòe ra
        footR.current.rotation.y = THREE.MathUtils.lerp(footR.current.rotation.y, 0.5, k(15));
      } else if (isGaming) {
        // Ngồi trên ghế xoay, chân đung đưa gõ nhịp
        footL.current.position.x = THREE.MathUtils.lerp(footL.current.position.x, 0.14, k(15));
        footR.current.position.x = THREE.MathUtils.lerp(footR.current.position.x, -0.14, k(15));
        footL.current.position.y = THREE.MathUtils.lerp(footL.current.position.y, 0.08 + Math.sin(t * 8) * 0.015, k(15));
        footR.current.position.y = THREE.MathUtils.lerp(footR.current.position.y, 0.08 + Math.cos(t * 8) * 0.015, k(15));
        footL.current.position.z = THREE.MathUtils.lerp(footL.current.position.z, 0.06, k(15));
        footR.current.position.z = THREE.MathUtils.lerp(footR.current.position.z, 0.06, k(15));
        footL.current.rotation.x = THREE.MathUtils.lerp(footL.current.rotation.x, 0.35, k(15));
        footR.current.rotation.x = THREE.MathUtils.lerp(footR.current.rotation.x, 0.35, k(15));
        footL.current.rotation.z = THREE.MathUtils.lerp(footL.current.rotation.z, 0, k(15));
        footR.current.rotation.z = THREE.MathUtils.lerp(footR.current.rotation.z, 0, k(15));
        footL.current.rotation.y = THREE.MathUtils.lerp(footL.current.rotation.y, 0, k(15));
        footR.current.rotation.y = THREE.MathUtils.lerp(footR.current.rotation.y, 0, k(15));
      } else {
        const sL = moving ? Math.sin(ph) : 0;
        footL.current.rotation.x = THREE.MathUtils.lerp(footL.current.rotation.x, sL * 0.6, k(20));
        footR.current.rotation.x = THREE.MathUtils.lerp(footR.current.rotation.x, -sL * 0.6, k(20));
        footL.current.position.y = THREE.MathUtils.lerp(footL.current.position.y, 0.16 + Math.max(0, sL) * 0.07, k(20));
        footR.current.position.y = THREE.MathUtils.lerp(footR.current.position.y, 0.16 + Math.max(0, -sL) * 0.07, k(20));
        footL.current.position.x = THREE.MathUtils.lerp(footL.current.position.x, 0.15, k(15));
        footR.current.position.x = THREE.MathUtils.lerp(footR.current.position.x, -0.15, k(15));
        footL.current.position.z = THREE.MathUtils.lerp(footL.current.position.z, 0.04, k(15));
        footR.current.position.z = THREE.MathUtils.lerp(footR.current.position.z, 0.04, k(15));
        footL.current.rotation.z = THREE.MathUtils.lerp(footL.current.rotation.z, 0, k(15));
        footR.current.rotation.z = THREE.MathUtils.lerp(footR.current.rotation.z, 0, k(15));
        footL.current.rotation.y = THREE.MathUtils.lerp(footL.current.rotation.y, 0, k(15));
        footR.current.rotation.y = THREE.MathUtils.lerp(footR.current.rotation.y, 0, k(15));
      }
    }
  });

  const isSleeping = motion.current?.sleeping ?? sleeping;
  const isLounging = motion.current?.lounging ?? lounging;
  const isGaming = motion.current?.gaming ?? gaming;
  const currentSleepPose = motion.current?.sleepPose ?? sleepPose ?? 'side';

  return (
    <>
      <DuckBlobShadow duckY={duckY} />
      <QuackBubble />
      <SleepZzzBubble sleeping={isSleeping} />
      <RelaxBlissBubble lounging={isLounging} sleeping={isSleeping} />
      <GameBubble gaming={isGaming} />
      <CozyBlanket visible={Boolean(isSleeping)} pose={currentSleepPose} />

      <group ref={inner} scale={0.96}>
        {/* Seamless skinned body + neck + head + tail */}
        <primitive object={rig.mesh} />

        {/* Face / accessories follow the head bone */}
        <group ref={headGroup} position={HEAD_PIVOT}>
          <Sunglasses visible={Boolean(isLounging && !isSleeping)} />
          {/* Eyes */}
          {[
            { ref: eyeL, spot: assets.eyeL },
            { ref: eyeR, spot: assets.eyeR },
          ].map(({ ref, spot }, i) => (
            <group key={i} position={spot.position} quaternion={spot.quaternion}>
              <group ref={ref}>
                <mesh scale={[1, 1.12, 0.55]}>
                  <sphereGeometry args={[0.062, 32, 24]} />
                  <meshPhysicalMaterial color="#090614" roughness={0.06} clearcoat={1.0} clearcoatRoughness={0.02} />
                </mesh>
                <mesh position={[0.018, 0.026, 0.03]}>
                  <sphereGeometry args={[0.019, 16, 12]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[-0.017, -0.02, 0.029]}>
                  <sphereGeometry args={[0.009, 12, 8]} />
                  <meshBasicMaterial color="#e6ecff" />
                </mesh>
              </group>
            </group>
          ))}

          {/* Painted blush (soft decal, no geometry seams) */}
          {assets.blush &&
            [assets.cheekL, assets.cheekR].map((spot, i) => (
              <mesh key={i} position={spot.position} quaternion={spot.quaternion}>
                <planeGeometry args={[0.13, 0.09]} />
                <meshBasicMaterial
                  map={assets.blush}
                  transparent
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                />
              </mesh>
            ))}

          {/* Upper bill – sculpted spoon shape, sunk into the face */}
          <mesh geometry={assets.beakUpper} position={[HC[0], HC[1] - 0.06, HC[2] + 0.27]} castShadow>
            <meshPhysicalMaterial color={BEAK} roughness={0.22} clearcoat={0.65} clearcoatRoughness={0.10} />
          </mesh>
          {[-0.035, 0.035].map((x) => (
            <mesh key={x} position={[HC[0] + x, HC[1] - 0.012, HC[2] + 0.35]} scale={[1, 0.5, 1.4]}>
              <sphereGeometry args={[0.011, 10, 8]} />
              <meshStandardMaterial color="#9a3412" roughness={0.8} />
            </mesh>
          ))}

          {/* Lower bill (hinged) */}
          <group ref={lowerBeak} position={[HC[0], HC[1] - 0.088, HC[2] + 0.18]}>
            <mesh geometry={assets.beakLower} position={[0, 0, 0.09]}>
              <meshPhysicalMaterial color={BEAK_DARK} roughness={0.26} clearcoat={0.55} clearcoatRoughness={0.14} />
            </mesh>
            <mesh position={[0, 0.012, 0.07]} scale={[0.75, 0.22, 1]}>
              <sphereGeometry args={[0.07, 20, 12]} />
              <meshStandardMaterial color="#fb7185" roughness={0.5} />
            </mesh>
          </group>

          {/* Dev cap, worn tilted back */}
          <group position={HC} rotation={[-0.32, 0, 0]}>
            <mesh position={[0, 0.02, 0]} castShadow>
              <sphereGeometry args={[0.305, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.25]} />
              <meshPhysicalMaterial color={CAP_BLUE} roughness={0.52} sheen={0.8} sheenColor="#93c5fd" side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={assets.brim} position={[0, 0.115, 0.2]} rotation={[Math.PI / 2 + 0.15, 0, 0]} castShadow>
              <meshPhysicalMaterial color={CAP_BRIM} roughness={0.52} sheen={0.7} sheenColor="#93c5fd" />
            </mesh>
            <mesh position={[0, 0.322, 0]}>
              <sphereGeometry args={[0.032, 16, 12]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.35} />
            </mesh>
          </group>
        </group>

        {/* Wings – teardrop shapes that hug the body */}
        <group ref={wingL} position={[0.33, 0.6, 0.12]}>
          <mesh geometry={assets.wing} position={[0.035, -0.06, -0.16]} rotation={[0.3, -0.12, 0]} castShadow>
            <meshPhysicalMaterial color={WING} roughness={0.36} sheen={1} sheenColor="#fff4b8" sheenRoughness={0.32} clearcoat={0.35} clearcoatRoughness={0.18} />
          </mesh>
        </group>
        <group ref={wingR} position={[-0.33, 0.6, 0.12]}>
          <mesh geometry={assets.wing} position={[-0.035, -0.06, -0.16]} rotation={[0.3, 0.12, 0]} scale={[-1, 1, 1]} castShadow>
            <meshPhysicalMaterial color={WING} roughness={0.36} sheen={1} sheenColor="#fff4b8" sheenRoughness={0.32} clearcoat={0.35} clearcoatRoughness={0.18} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Legs + webbed feet (rounded, bevelled) */}
        {[
          { x: 0.15, ref: footL },
          { x: -0.15, ref: footR },
        ].map(({ x, ref }) => (
          <group key={x} ref={ref} position={[x, 0.16, 0.04]}>
            <mesh position={[0, -0.06, 0]} castShadow>
              <capsuleGeometry args={[0.026, 0.1, 6, 12]} />
              <meshPhysicalMaterial color={LEG} roughness={0.32} clearcoat={0.4} clearcoatRoughness={0.18} />
            </mesh>
            <mesh geometry={assets.foot} position={[0, -0.128, -0.005]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <meshPhysicalMaterial color={LEG} roughness={0.32} clearcoat={0.45} clearcoatRoughness={0.16} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
