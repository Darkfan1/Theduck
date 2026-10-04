import { ROOM_BOUNDS, STATIONS, EXTRA_COLLIDERS } from './stations';
import { duckAudio } from '@/utils/duckAudio';

export type ItemType = 'corn' | 'bug' | 'star' | 'coffee';

export interface GameItem {
  id: string;
  type: ItemType;
  x: number;
  z: number;
  points: number;
  scale: number;
  label: string;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  x: number;
  z: number;
  time: number;
}

const ALL_COLLIDERS = [
  ...STATIONS.map((s) => s.collider),
  ...EXTRA_COLLIDERS,
];

/** Check if [x, z] is inside any furniture/wall collider */
function isPositionSafe(x: number, z: number, padding = 0.8): boolean {
  for (const [cx, cz, r] of ALL_COLLIDERS) {
    if (Math.hypot(x - cx, z - cz) < r + padding) return false;
  }
  return true;
}

/** Generate a random safe position on the floor */
export function getSafeRandomPosition(): [number, number] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = ROOM_BOUNDS.minX + 1.2 + Math.random() * (ROOM_BOUNDS.maxX - ROOM_BOUNDS.minX - 2.4);
    const z = ROOM_BOUNDS.minZ + 1.2 + Math.random() * (ROOM_BOUNDS.maxZ - ROOM_BOUNDS.minZ - 2.4);
    if (isPositionSafe(x, z)) return [x, z];
  }
  return [0, 0];
}

class MiniGameManager {
  public isPlaying = false;
  public score = 0;
  public highScore = 0;
  public timeLeft = 30;
  public combo = 1;
  public comboTimeout = 0;
  public items: GameItem[] = [];
  public floatingTexts: FloatingText[] = [];
  public speedBoostUntil = 0;

  private listeners = new Set<() => void>();
  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('duck_game_highscore');
        if (saved) this.highScore = parseInt(saved, 10) || 0;
      } catch {}
    }
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public notify() {
    this.listeners.forEach((fn) => fn());
  }

  public start() {
    this.isPlaying = true;
    this.score = 0;
    this.timeLeft = 30;
    this.combo = 1;
    this.comboTimeout = 0;
    this.speedBoostUntil = 0;
    this.items = [];
    this.floatingTexts = [];

    // Spawn initial wave: 4 corns and 2 bugs
    for (let i = 0; i < 4; i++) this.spawnItem('corn');
    for (let i = 0; i < 2; i++) this.spawnItem('bug');

    duckAudio.playJumpSound();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        this.end();
      } else {
        // Randomly spawn special items
        if (this.timeLeft % 7 === 0 && Math.random() > 0.4) {
          this.spawnItem('star');
        } else if (this.timeLeft % 10 === 0 && Math.random() > 0.5) {
          this.spawnItem('coffee');
        }
        this.notify();
      }
    }, 1000);

    this.notify();
  }

  public end() {
    this.isPlaying = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('duck_game_highscore', this.score.toString());
        } catch {}
      }
    }
    duckAudio.playFanfare();
    this.notify();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.items = [];
    this.floatingTexts = [];
    this.notify();
  }

  public spawnItem(type: ItemType) {
    const [x, z] = getSafeRandomPosition();
    let points = 10;
    let scale = 1.0;
    let label = '+10 Bắp 🌽';

    if (type === 'bug') {
      points = 25;
      scale = 1.1;
      label = '+25 Fix Bug 🐛';
    } else if (type === 'star') {
      points = 50;
      scale = 1.25;
      label = '+50 Clean Table ⭐';
    } else if (type === 'coffee') {
      points = 15;
      scale = 1.0;
      label = '+3 Giây ☕';
    }

    this.items.push({
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      x,
      z,
      points,
      scale,
      label,
    });
  }

  public collectItem(id: string, duckX: number, duckZ: number) {
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx === -1) return;

    const item = this.items[idx];
    this.items.splice(idx, 1);

    // Combo system: collecting within 2.5s increases combo
    const now = performance.now();
    if (now - this.comboTimeout < 2500) {
      this.combo = Math.min(5, this.combo + 1);
    } else {
      this.combo = 1;
    }
    this.comboTimeout = now;

    const gained = item.points * this.combo;
    this.score += gained;

    // Trigger effects & sound
    if (item.type === 'bug') {
      duckAudio.playBugCatchSound();
    } else if (item.type === 'star') {
      duckAudio.playFeedChime();
      this.speedBoostUntil = now + 6000; // 6s speed boost
    } else if (item.type === 'coffee') {
      duckAudio.playFeedChime();
      this.timeLeft = Math.min(45, this.timeLeft + 3);
    } else {
      duckAudio.playCoinSound();
    }

    // Add floating text
    const textDesc = this.combo > 1 ? `+${gained} (x${this.combo} Combo!)` : `+${gained}`;
    this.floatingTexts.push({
      id: `text-${Date.now()}-${Math.random()}`,
      text: `${item.type === 'bug' ? '🐛 ' : item.type === 'star' ? '⭐ ' : item.type === 'coffee' ? '☕ ' : '🌽 '}${textDesc}`,
      color: item.type === 'bug' ? '#38bdf8' : item.type === 'star' ? '#a855f7' : item.type === 'coffee' ? '#f43f5e' : '#fbbf24',
      x: duckX,
      z: duckZ,
      time: now,
    });

    // Respawn standard items
    if (item.type === 'corn') {
      setTimeout(() => {
        if (this.isPlaying) this.spawnItem('corn');
      }, 500);
    } else if (item.type === 'bug') {
      setTimeout(() => {
        if (this.isPlaying) this.spawnItem('bug');
      }, 800);
    }

    this.notify();
  }
}

export const gameManager = new MiniGameManager();
