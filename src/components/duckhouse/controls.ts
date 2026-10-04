import type { StationKey } from './stations';

/**
 * Mutable input state shared between the DOM overlay and the 3D frame loop.
 * Kept outside React state so per-frame reads never trigger re-renders.
 */
export const input = {
  keys: new Set<string>(),
  joyX: 0,
  joyY: 0,
  /** performance.now()/1000 of the last quack (drives jump animation) */
  quackAt: -10,
};

export const nav: {
  target: [number, number] | null;
  pending: StationKey | null;
  teleport: [number, number] | null;
} = {
  target: null,
  pending: null,
  teleport: null,
};

export const MOVE_KEYS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
];
