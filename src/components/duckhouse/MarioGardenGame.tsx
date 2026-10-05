'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { duckAudio } from '@/utils/duckAudio';
import styles from './MarioGardenGame.module.css';

interface MarioGardenGameProps {
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'brick' | 'question' | 'empty' | 'pipe';
  bounce: number;
}

interface CornItem {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

interface Enemy {
  id: number;
  type: 'caterpillar' | 'ladybug'; // sâu hoặc bọ rùa
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  minX: number;
  maxX: number;
  squashed: boolean;
  squashTimer: number;
  walkFrame: number;
}

interface MushroomSpring {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  bounce: number;
}

interface MovingPlatform {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  vx: number;
}

interface LevelConfig {
  id: number;
  name: string;
  theme: 'garden' | 'sunset' | 'night';
  stageWidth: number;
  flagX: number;
  flagY: number;
  duckStartX: number;
  duckStartY: number;
  blocks: Block[];
  coins: CornItem[];
  enemies: Enemy[];
  mushrooms: MushroomSpring[];
  movingPlatforms: MovingPlatform[];
}

const LEVELS: LevelConfig[] = [
  // =========================================================================
  // MÀN 1: SÂN VƯỜN NẮNG ẤM (Sunny Garden)
  // =========================================================================
  {
    id: 1,
    name: 'Màn 1: Sân Vườn Nắng Ấm',
    theme: 'garden',
    stageWidth: 3200,
    flagX: 2950,
    flagY: 150,
    duckStartX: 80,
    duckStartY: 350,
    blocks: [
      // Ground 1 (x: 0 -> 900)
      { x: 0, y: 440, w: 900, h: 160, type: 'brick', bounce: 0 },
      // Question block cluster 1
      { x: 260, y: 300, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 300, y: 300, w: 40, h: 40, type: 'brick', bounce: 0 },
      { x: 340, y: 300, w: 40, h: 40, type: 'question', bounce: 0 }, // Ô dấu ? được chỉnh thoáng rộng rãi
      { x: 300, y: 180, w: 40, h: 40, type: 'question', bounce: 0 }, // Ô trên cao
      // Pipe 1 (Dời sang x: 450 để ô 340 có 70px khoảng trống rộng rãi cho vịt nhảy)
      { x: 450, y: 370, w: 60, h: 70, type: 'pipe', bounce: 0 },

      // Bục nổi vượt hố Pit 1
      { x: 960, y: 360, w: 80, h: 30, type: 'brick', bounce: 0 },
      { x: 1100, y: 310, w: 80, h: 30, type: 'brick', bounce: 0 },
      { x: 1140, y: 190, w: 40, h: 40, type: 'question', bounce: 0 },

      // Ground 2 (x: 1240 -> 2100)
      { x: 1240, y: 440, w: 860, h: 160, type: 'brick', bounce: 0 },
      // Pipe 2
      { x: 1480, y: 350, w: 60, h: 90, type: 'pipe', bounce: 0 },
      // Bậc thang gạch
      { x: 1680, y: 380, w: 60, h: 60, type: 'brick', bounce: 0 },
      { x: 1740, y: 320, w: 60, h: 120, type: 'brick', bounce: 0 },
      { x: 1800, y: 260, w: 60, h: 180, type: 'brick', bounce: 0 },
      { x: 1900, y: 200, w: 50, h: 40, type: 'question', bounce: 0 },

      // Cầu mây lơ lửng
      { x: 2180, y: 320, w: 90, h: 25, type: 'brick', bounce: 0 },
      { x: 2330, y: 260, w: 90, h: 25, type: 'brick', bounce: 0 },
      { x: 2480, y: 320, w: 90, h: 25, type: 'brick', bounce: 0 },

      // Đất về đích (x: 2600 -> 3200)
      { x: 2600, y: 440, w: 600, h: 160, type: 'brick', bounce: 0 },
      // Bậc thang về đích
      { x: 2780, y: 390, w: 50, h: 50, type: 'brick', bounce: 0 },
      { x: 2830, y: 340, w: 50, h: 100, type: 'brick', bounce: 0 },
      { x: 2880, y: 290, w: 50, h: 150, type: 'brick', bounce: 0 },
    ],
    coins: [
      { id: 1, x: 220, y: 390, collected: false },
      { id: 2, x: 300, y: 130, collected: false },
      { id: 3, x: 550, y: 390, collected: false },
      { id: 4, x: 1000, y: 310, collected: false },
      { id: 5, x: 1140, y: 140, collected: false },
      { id: 6, x: 1380, y: 390, collected: false },
      { id: 7, x: 1600, y: 390, collected: false },
      { id: 8, x: 1900, y: 150, collected: false },
      { id: 9, x: 2220, y: 270, collected: false },
      { id: 10, x: 2370, y: 210, collected: false },
      { id: 11, x: 2520, y: 270, collected: false },
      { id: 12, x: 2720, y: 390, collected: false },
    ],
    enemies: [
      {
        id: 1,
        type: 'caterpillar',
        x: 580,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.2,
        minX: 520,
        maxX: 720,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 2,
        type: 'ladybug',
        x: 750,
        y: 405,
        w: 36,
        h: 30,
        vx: -1.7,
        minX: 650,
        maxX: 880,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 3,
        type: 'caterpillar',
        x: 1300,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.3,
        minX: 1250,
        maxX: 1460,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 4,
        type: 'ladybug',
        x: 1620,
        y: 405,
        w: 36,
        h: 30,
        vx: 1.8,
        minX: 1550,
        maxX: 1670,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 5,
        type: 'caterpillar',
        x: 2340,
        y: 228,
        w: 38,
        h: 32,
        vx: 1.0,
        minX: 2330,
        maxX: 2410,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
    ],
    mushrooms: [],
    movingPlatforms: [],
  },

  // =========================================================================
  // MÀN 2: THUNG LŨNG HOÀNG HÔN & NẤM BẬT NHẢY (Sunset Valley)
  // =========================================================================
  {
    id: 2,
    name: 'Màn 2: Thung Lũng Hoàng Hôn',
    theme: 'sunset',
    stageWidth: 3600,
    flagX: 3350,
    flagY: 150,
    duckStartX: 80,
    duckStartY: 350,
    blocks: [
      // Ground 1 (x: 0 -> 760)
      { x: 0, y: 440, w: 760, h: 160, type: 'brick', bounce: 0 },
      // Question block cluster
      { x: 260, y: 310, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 300, y: 310, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 340, y: 310, w: 40, h: 40, type: 'question', bounce: 0 },
      // Pipe
      { x: 460, y: 360, w: 60, h: 80, type: 'pipe', bounce: 0 },
      // Vách đá cao bên cạnh nấm bật
      { x: 680, y: 270, w: 80, h: 170, type: 'brick', bounce: 0 },
      { x: 700, y: 150, w: 40, h: 40, type: 'question', bounce: 0 },

      // Bục cố định giữa hố 1
      { x: 920, y: 360, w: 80, h: 30, type: 'brick', bounce: 0 },

      // Ground 2 (x: 1280 -> 1950)
      { x: 1280, y: 440, w: 670, h: 160, type: 'brick', bounce: 0 },
      { x: 1440, y: 340, w: 60, h: 100, type: 'pipe', bounce: 0 },
      { x: 1580, y: 290, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 1620, y: 290, w: 40, h: 40, type: 'brick', bounce: 0 },
      { x: 1660, y: 290, w: 40, h: 40, type: 'question', bounce: 0 },
      // Vách đá vươn cao
      { x: 1880, y: 260, w: 70, h: 180, type: 'brick', bounce: 0 },

      // Ground 3 (x: 2450 -> 3050)
      { x: 2450, y: 440, w: 600, h: 160, type: 'brick', bounce: 0 },
      { x: 2600, y: 360, w: 60, h: 80, type: 'pipe', bounce: 0 },
      { x: 2720, y: 300, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 2840, y: 380, w: 50, h: 60, type: 'brick', bounce: 0 },
      { x: 2890, y: 320, w: 50, h: 120, type: 'brick', bounce: 0 },
      { x: 2940, y: 260, w: 50, h: 180, type: 'brick', bounce: 0 },

      // Đảo đích (x: 3150 -> 3550)
      { x: 3150, y: 440, w: 400, h: 160, type: 'brick', bounce: 0 },
      { x: 3240, y: 380, w: 45, h: 60, type: 'brick', bounce: 0 },
      { x: 3285, y: 320, w: 45, h: 120, type: 'brick', bounce: 0 },
    ],
    mushrooms: [
      // 1. Nấm lò xo bật lên vách đá cao
      { id: 1, x: 590, y: 395, w: 54, h: 45, bounce: 0 },
      // 2. Nấm lò xo vượt hố lớn
      { id: 2, x: 1800, y: 395, w: 54, h: 45, bounce: 0 },
      // 3. Nấm lò xo trước đoạn về đích
      { id: 3, x: 3030, y: 395, w: 54, h: 45, bounce: 0 },
    ],
    movingPlatforms: [
      // Bục di chuyển qua hố 1
      { id: 1, x: 1040, y: 320, w: 85, h: 24, minX: 1020, maxX: 1240, vx: 2.2 },
      // Bục di chuyển qua hố 2
      { id: 2, x: 2060, y: 310, w: 85, h: 24, minX: 2020, maxX: 2380, vx: -2.4 },
    ],
    coins: [
      { id: 1, x: 200, y: 390, collected: false },
      { id: 2, x: 300, y: 250, collected: false },
      { id: 3, x: 600, y: 200, collected: false },
      { id: 4, x: 720, y: 100, collected: false },
      { id: 5, x: 960, y: 310, collected: false },
      { id: 6, x: 1140, y: 270, collected: false },
      { id: 7, x: 1360, y: 390, collected: false },
      { id: 8, x: 1620, y: 230, collected: false },
      { id: 9, x: 1810, y: 180, collected: false },
      { id: 10, x: 2200, y: 250, collected: false },
      { id: 11, x: 2520, y: 390, collected: false },
      { id: 12, x: 2720, y: 240, collected: false },
      { id: 13, x: 3040, y: 180, collected: false },
      { id: 14, x: 3200, y: 380, collected: false },
    ],
    enemies: [
      {
        id: 1,
        type: 'caterpillar',
        x: 360,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.4,
        minX: 280,
        maxX: 440,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 2,
        type: 'ladybug',
        x: 690,
        y: 235,
        w: 36,
        h: 30,
        vx: -1.8,
        minX: 680,
        maxX: 750,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 3,
        type: 'caterpillar',
        x: 1350,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.5,
        minX: 1290,
        maxX: 1420,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 4,
        type: 'ladybug',
        x: 1720,
        y: 405,
        w: 36,
        h: 30,
        vx: 2.1,
        minX: 1660,
        maxX: 1840,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 5,
        type: 'caterpillar',
        x: 2520,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.6,
        minX: 2460,
        maxX: 2580,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 6,
        type: 'ladybug',
        x: 2750,
        y: 405,
        w: 36,
        h: 30,
        vx: -2.0,
        minX: 2680,
        maxX: 2820,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
    ],
  },

  // =========================================================================
  // MÀN 3: ĐỒI ĐÊM SAO & ĐOM ĐÓM LUNG LINH (Starry Night Heights)
  // =========================================================================
  {
    id: 3,
    name: 'Màn 3: Đồi Đêm Sao Lung Linh',
    theme: 'night',
    stageWidth: 3900,
    flagX: 3650,
    flagY: 150,
    duckStartX: 80,
    duckStartY: 350,
    blocks: [
      // Đảo đêm 1 (x: 0 -> 650)
      { x: 0, y: 440, w: 650, h: 160, type: 'brick', bounce: 0 },
      { x: 240, y: 300, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 280, y: 300, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 320, y: 300, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 440, y: 360, w: 60, h: 80, type: 'pipe', bounce: 0 },

      // Bục mây sao lơ lửng thử thách cú nhảy kép (Double Jump)
      { x: 740, y: 360, w: 85, h: 26, type: 'brick', bounce: 0 },
      { x: 910, y: 300, w: 85, h: 26, type: 'brick', bounce: 0 },
      { x: 1080, y: 240, w: 85, h: 26, type: 'brick', bounce: 0 },
      { x: 1100, y: 120, w: 40, h: 40, type: 'question', bounce: 0 },

      // Đảo đêm 2 (x: 1250 -> 1880)
      { x: 1250, y: 440, w: 630, h: 160, type: 'brick', bounce: 0 },
      { x: 1400, y: 340, w: 60, h: 100, type: 'pipe', bounce: 0 },
      { x: 1540, y: 290, w: 40, h: 40, type: 'question', bounce: 0 },
      { x: 1580, y: 290, w: 40, h: 40, type: 'brick', bounce: 0 },
      { x: 1620, y: 290, w: 40, h: 40, type: 'question', bounce: 0 },
      // Vực thẳm mây sao
      { x: 1800, y: 280, w: 80, h: 160, type: 'brick', bounce: 0 },

      // Đảo đêm 3 (x: 2380 -> 2950)
      { x: 2380, y: 440, w: 570, h: 160, type: 'brick', bounce: 0 },
      { x: 2520, y: 360, w: 60, h: 80, type: 'pipe', bounce: 0 },
      { x: 2660, y: 290, w: 40, h: 40, type: 'question', bounce: 0 },
      // Bậc thang kim tự tháp vũ trụ
      { x: 2780, y: 390, w: 50, h: 50, type: 'brick', bounce: 0 },
      { x: 2830, y: 330, w: 50, h: 110, type: 'brick', bounce: 0 },
      { x: 2880, y: 270, w: 50, h: 170, type: 'brick', bounce: 0 },

      // Cầu sao trên không (Yêu cầu vỗ cánh bay)
      { x: 3080, y: 290, w: 85, h: 25, type: 'brick', bounce: 0 },
      { x: 3260, y: 250, w: 85, h: 25, type: 'brick', bounce: 0 },
      { x: 3280, y: 130, w: 40, h: 40, type: 'question', bounce: 0 },

      // Đảo khải hoàn đỉnh vinh quang (x: 3450 -> 3880)
      { x: 3450, y: 440, w: 430, h: 160, type: 'brick', bounce: 0 },
      { x: 3530, y: 380, w: 50, h: 60, type: 'brick', bounce: 0 },
      { x: 3580, y: 320, w: 50, h: 120, type: 'brick', bounce: 0 },
    ],
    mushrooms: [
      { id: 1, x: 570, y: 395, w: 54, h: 45, bounce: 0 },
      { id: 2, x: 1720, y: 395, w: 54, h: 45, bounce: 0 },
      { id: 3, x: 2960, y: 395, w: 54, h: 45, bounce: 0 },
    ],
    movingPlatforms: [
      { id: 1, x: 1960, y: 330, w: 90, h: 25, minX: 1920, maxX: 2300, vx: 2.6 },
    ],
    coins: [
      { id: 1, x: 200, y: 390, collected: false },
      { id: 2, x: 280, y: 240, collected: false },
      { id: 3, x: 580, y: 180, collected: false },
      { id: 4, x: 780, y: 310, collected: false },
      { id: 5, x: 950, y: 250, collected: false },
      { id: 6, x: 1120, y: 70, collected: false },
      { id: 7, x: 1340, y: 390, collected: false },
      { id: 8, x: 1580, y: 230, collected: false },
      { id: 9, x: 1730, y: 160, collected: false },
      { id: 10, x: 2100, y: 270, collected: false },
      { id: 11, x: 2460, y: 390, collected: false },
      { id: 12, x: 2660, y: 230, collected: false },
      { id: 13, x: 3120, y: 230, collected: false },
      { id: 14, x: 3300, y: 80, collected: false },
      { id: 15, x: 3500, y: 390, collected: false },
    ],
    enemies: [
      {
        id: 1,
        type: 'caterpillar',
        x: 340,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.5,
        minX: 240,
        maxX: 420,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 2,
        type: 'ladybug',
        x: 520,
        y: 405,
        w: 36,
        h: 30,
        vx: -2.0,
        minX: 470,
        maxX: 610,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 3,
        type: 'caterpillar',
        x: 1340,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.6,
        minX: 1270,
        maxX: 1390,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 4,
        type: 'ladybug',
        x: 1680,
        y: 405,
        w: 36,
        h: 30,
        vx: 2.2,
        minX: 1610,
        maxX: 1780,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 5,
        type: 'caterpillar',
        x: 2460,
        y: 405,
        w: 38,
        h: 32,
        vx: 1.7,
        minX: 2400,
        maxX: 2510,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 6,
        type: 'ladybug',
        x: 2620,
        y: 405,
        w: 36,
        h: 30,
        vx: -2.2,
        minX: 2560,
        maxX: 2740,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
      {
        id: 7,
        type: 'ladybug',
        x: 3520,
        y: 405,
        w: 36,
        h: 30,
        vx: -2.4,
        minX: 3460,
        maxX: 3620,
        squashed: false,
        squashTimer: 0,
        walkFrame: 0,
      },
    ],
  },
];

export default function MarioGardenGame({ onClose }: MarioGardenGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [bugsStomped, setBugsStomped] = useState(0);
  const [progress, setProgress] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // References for continuous 60fps loop
  const stateRef = useRef({
    currentLevel: 1,
    lives: 3,
    score: 0,
    bugsStomped: 0,
    gameOver: false,
    victory: false,
    cameraX: 0,
    keys: { left: false, right: false, jump: false },
    jumpPressed: false,
    duck: {
      x: 80,
      y: 350,
      w: 42,
      h: 46,
      vx: 0,
      vy: 0,
      isGrounded: false,
      jumpCount: 0, // 0: on ground, 1: single jump, 2: double jump (vỗ cánh)
      flapping: false,
      flapTimer: 0,
      facing: 'right' as 'left' | 'right',
      walkFrame: 0,
      invulnerableTimer: 0,
    },
    particles: [] as Particle[],
    blocks: [] as Block[],
    coins: [] as CornItem[],
    enemies: [] as Enemy[],
    mushrooms: [] as MushroomSpring[],
    movingPlatforms: [] as MovingPlatform[],
    flagX: 2950,
    flagY: 150,
    stageWidth: 3200,
    theme: 'garden' as 'garden' | 'sunset' | 'night',
  });

  // Sound toggle
  const [muted, setMuted] = useState(duckAudio.getMuted());
  const toggleMute = () => {
    setMuted(duckAudio.toggleMute());
  };

  // Build / Reset a specific level stage
  const initStage = useCallback((targetLevel = currentLevel) => {
    const s = stateRef.current;
    const cfg = LEVELS.find((l) => l.id === targetLevel) || LEVELS[0];

    s.currentLevel = cfg.id;
    setCurrentLevel(cfg.id);

    s.lives = 3;
    setLives(3);
    s.gameOver = false;
    setGameOver(false);
    s.victory = false;
    setVictory(false);
    s.cameraX = 0;
    setProgress(0);

    s.duck = {
      x: cfg.duckStartX,
      y: cfg.duckStartY,
      w: 42,
      h: 46,
      vx: 0,
      vy: 0,
      isGrounded: false,
      jumpCount: 0,
      flapping: false,
      flapTimer: 0,
      facing: 'right',
      walkFrame: 0,
      invulnerableTimer: 0,
    };

    s.particles = [];
    s.blocks = cfg.blocks.map((b) => ({ ...b, bounce: 0 }));
    s.coins = cfg.coins.map((c) => ({ ...c, collected: false }));
    s.enemies = cfg.enemies.map((e) => ({ ...e, squashed: false, squashTimer: 0, walkFrame: 0 }));
    s.mushrooms = cfg.mushrooms.map((m) => ({ ...m, bounce: 0 }));
    s.movingPlatforms = cfg.movingPlatforms.map((mp) => ({ ...mp }));
    s.flagX = cfg.flagX;
    s.flagY = cfg.flagY;
    s.stageWidth = cfg.stageWidth;
    s.theme = cfg.theme;
  }, []);

  // Jump to specific level
  const selectLevel = useCallback((levelId: number) => {
    duckAudio.playJumpSound();
    initStage(levelId);
  }, [initStage]);

  // Initial mount: load Level 1 exactly once
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      initStage(1);
    }
  }, [initStage]);

  // Helper: spawn particle
  const addParticle = (p: Particle) => {
    stateRef.current.particles.push(p);
  };

  // Helper: pop question block with corn, points & sound
  const popQuestionBlock = (b: Block) => {
    if (b.type !== 'question') return;
    const s = stateRef.current;
    b.type = 'empty';
    b.bounce = 12;
    s.score += 50;
    setScore(s.score);
    duckAudio.playCoinSound();

    // Flying golden corn particle
    addParticle({
      x: b.x + b.w / 2,
      y: b.y - 12,
      vx: 0,
      vy: -6,
      life: 0,
      maxLife: 32,
      color: '#fbbf24',
      size: 15,
      text: '🌽 +50',
    });

    // Golden sparkle stars
    for (let i = 0; i < 6; i++) {
      addParticle({
        x: b.x + b.w / 2,
        y: b.y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 2,
        life: 0,
        maxLife: 20,
        color: '#fef08a',
        size: 4 + Math.random() * 3,
      });
    }
  };

  // Perform Jump / Double Jump
  const handleJump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || s.victory) return;
    const duck = s.duck;

    if (duck.isGrounded) {
      // Jump 1: Normal hop
      duck.vy = -12.2;
      duck.isGrounded = false;
      duck.jumpCount = 1;
      duckAudio.playJumpSound();

      // Dust puff on ground
      for (let i = 0; i < 5; i++) {
        addParticle({
          x: duck.x + duck.w / 2 + (Math.random() - 0.5) * 20,
          y: duck.y + duck.h,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 1.5,
          life: 0,
          maxLife: 16,
          color: '#ffffff',
          size: 4 + Math.random() * 3,
        });
      }
    } else if (duck.jumpCount === 1) {
      // Jump 2: DOUBLE JUMP WITH WING FLAP (VỖ CÁNH NHẢY CAO HƠN)
      duck.vy = -13.5;
      duck.jumpCount = 2;
      duck.flapping = true;
      duck.flapTimer = 26; // frames of intense wing flap
      duckAudio.playFlapSound();

      // Cloud feather puffs under feet!
      for (let i = 0; i < 8; i++) {
        addParticle({
          x: duck.x + duck.w / 2 + (Math.random() - 0.5) * 24,
          y: duck.y + duck.h,
          vx: (Math.random() - 0.5) * 3.5,
          vy: Math.random() * 1.5,
          life: 0,
          maxLife: 22,
          color: '#fef08a',
          size: 5 + Math.random() * 4,
        });
      }
    }
  }, []);

  // Keyboard & Touch events (decoupled from level changes to prevent resets)
  const handleJumpRef = useRef(handleJump);
  handleJumpRef.current = handleJump;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = (e.key || '').toLowerCase();
      const s = stateRef.current;

      if (code === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') {
        s.keys.left = true;
      }
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') {
        s.keys.right = true;
      }
      if (
        code === 'Space' ||
        code === 'KeyW' ||
        code === 'ArrowUp' ||
        key === 'w' ||
        key === ' '
      ) {
        e.preventDefault();
        if (!s.jumpPressed) {
          s.jumpPressed = true;
          handleJumpRef.current();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = (e.key || '').toLowerCase();
      const s = stateRef.current;

      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') {
        s.keys.left = false;
      }
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') {
        s.keys.right = false;
      }
      if (
        code === 'Space' ||
        code === 'KeyW' ||
        code === 'ArrowUp' ||
        key === 'w' ||
        key === ' '
      ) {
        s.jumpPressed = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main 60fps Game Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const s = stateRef.current;
      const duck = s.duck;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1. UPDATE PHYSICS & DUCK
      if (!s.gameOver && !s.victory) {
        // Horizontal Movement
        if (s.keys.left) {
          duck.vx = -4.6;
          duck.facing = 'left';
          duck.walkFrame += 0.22;
        } else if (s.keys.right) {
          duck.vx = 4.6;
          duck.facing = 'right';
          duck.walkFrame += 0.22;
        } else {
          duck.vx *= 0.82;
          if (Math.abs(duck.vx) < 0.2) duck.vx = 0;
        }

        // Flapping countdown
        if (duck.flapTimer > 0) {
          duck.flapTimer--;
          if (duck.flapTimer <= 0) duck.flapping = false;
        }

        // Gravity
        duck.vy += 0.58;
        if (duck.vy > 14) duck.vy = 14;

        // Apply velocities
        duck.x += duck.vx;
        duck.y += duck.vy;

        // Invulnerable timer countdown
        if (duck.invulnerableTimer > 0) duck.invulnerableTimer--;

        // Block & Platform Collisions
        duck.isGrounded = false;
        for (const b of s.blocks) {
          // Bouncing block return
          if (b.bounce > 0) b.bounce *= 0.85;

          // AABB Collision test
          const prevY = duck.y - duck.vy;
          const prevX = duck.x - duck.vx;

          if (
            duck.x + duck.w > b.x &&
            duck.x < b.x + b.w &&
            duck.y + duck.h > b.y &&
            duck.y < b.y + b.h
          ) {
            // Check 1: Duck jumping UP into block (HEADBUTT)
            if (duck.vy < 0 && duck.y <= b.y + b.h && prevY >= b.y + b.h - 22) {
              duck.y = b.y + b.h;
              duck.vy = 2.5; // rebound down
              b.bounce = 12; // bump animation
              duckAudio.playBumpSound();
              if (b.type === 'question') {
                popQuestionBlock(b);
              }
            }
            // Check 2: Landing on top of block (or stomping it)
            else if (duck.vy >= 0 && prevY + duck.h <= b.y + 14) {
              duck.y = b.y - duck.h;
              duck.vy = 0;
              duck.isGrounded = true;
              duck.jumpCount = 0; // Reset double jump
              duck.flapping = false;

              // Pop question block if stomping from above as well
              if (b.type === 'question') {
                popQuestionBlock(b);
              }
            }
            // Check 3: Side collision
            else if (prevX + duck.w <= b.x + 8) {
              duck.x = b.x - duck.w;
              duck.vx = 0;
              if (b.type === 'question' && duck.vy < 0) {
                popQuestionBlock(b);
              }
            } else if (prevX >= b.x + b.w - 8) {
              duck.x = b.x + b.w;
              duck.vx = 0;
              if (b.type === 'question' && duck.vy < 0) {
                popQuestionBlock(b);
              }
            }
          }
        }

        // Bouncy Spring Mushrooms (Level 2 & 3)
        for (const m of s.mushrooms) {
          if (m.bounce > 0) m.bounce *= 0.82;
          if (
            duck.x + duck.w > m.x &&
            duck.x < m.x + m.w &&
            duck.y + duck.h >= m.y &&
            duck.y + duck.h <= m.y + 26 &&
            duck.vy >= 0
          ) {
            duck.y = m.y - duck.h;
            duck.vy = -16.5; // Mega spring jump!
            duck.isGrounded = false;
            duck.jumpCount = 0;
            duck.flapping = true;
            m.bounce = 14;
            duckAudio.playSpringSound();

            for (let i = 0; i < 8; i++) {
              addParticle({
                x: m.x + m.w / 2,
                y: m.y + 10,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 5,
                life: 0,
                maxLife: 20,
                color: '#f87171',
                size: 4 + Math.random() * 4,
              });
            }
          }
        }

        // Moving Platforms (Level 2 & 3)
        for (const mp of s.movingPlatforms) {
          mp.x += mp.vx;
          if (mp.x <= mp.minX) {
            mp.x = mp.minX;
            mp.vx = Math.abs(mp.vx);
          } else if (mp.x >= mp.maxX) {
            mp.x = mp.maxX;
            mp.vx = -Math.abs(mp.vx);
          }

          // Duck standing on moving platform
          if (
            duck.x + duck.w > mp.x &&
            duck.x < mp.x + mp.w &&
            duck.y + duck.h >= mp.y &&
            duck.y + duck.h <= mp.y + 16 &&
            duck.vy >= 0
          ) {
            duck.y = mp.y - duck.h;
            duck.vy = 0;
            duck.isGrounded = true;
            duck.jumpCount = 0;
            duck.flapping = false;
            duck.x += mp.vx; // Carry duck along smoothly!
          }
        }

        // Pit death check
        if (duck.y > 650) {
          s.lives = 0;
          setLives(0);
          s.gameOver = true;
          setGameOver(true);
          duckAudio.playQuack(0.7);
        }

        // Collect floating corn
        for (const c of s.coins) {
          if (!c.collected && Math.hypot(duck.x + duck.w / 2 - c.x, duck.y + duck.h / 2 - c.y) < 32) {
            c.collected = true;
            s.score += 100;
            setScore(s.score);
            duckAudio.playCoinSound();
            addParticle({
              x: c.x,
              y: c.y,
              vx: 0,
              vy: -3,
              life: 0,
              maxLife: 25,
              color: '#facc15',
              size: 12,
              text: '+100',
            });
          }
        }

        // Enemies logic & STOMP MECHANIC
        for (const en of s.enemies) {
          if (en.squashed) {
            en.squashTimer--;
            continue;
          }

          // Enemy patrol movement
          en.x += en.vx;
          en.walkFrame += 0.15;
          if (en.x <= en.minX) {
            en.x = en.minX;
            en.vx = Math.abs(en.vx);
          } else if (en.x >= en.maxX) {
            en.x = en.maxX;
            en.vx = -Math.abs(en.vx);
          }

          // Collision with Duck
          if (
            duck.x + duck.w > en.x + 4 &&
            duck.x < en.x + en.w - 4 &&
            duck.y + duck.h > en.y + 4 &&
            duck.y < en.y + en.h
          ) {
            // STOMP CHECK: Duck falling onto the top of enemy!
            if (duck.vy > 0 && duck.y + duck.h <= en.y + en.h * 0.65) {
              en.squashed = true;
              en.squashTimer = 35;
              duck.vy = -11.5; // High bounce!
              duck.jumpCount = 0; // Reset double jump
              duck.flapping = false;

              const pts = en.type === 'ladybug' ? 200 : 100;
              s.score += pts;
              s.bugsStomped++;
              setScore(s.score);
              setBugsStomped(s.bugsStomped);

              duckAudio.playStompSound();

              // Stomp splash particles & floating score
              addParticle({
                x: en.x + en.w / 2,
                y: en.y,
                vx: 0,
                vy: -3.5,
                life: 0,
                maxLife: 32,
                color: en.type === 'ladybug' ? '#ef4444' : '#4ade80',
                size: 14,
                text: `+${pts}`,
              });

              for (let i = 0; i < 8; i++) {
                addParticle({
                  x: en.x + en.w / 2,
                  y: en.y + 10,
                  vx: (Math.random() - 0.5) * 5,
                  vy: -Math.random() * 4,
                  life: 0,
                  maxLife: 20,
                  color: en.type === 'ladybug' ? '#ef4444' : '#84cc16',
                  size: 4 + Math.random() * 4,
                });
              }
            } else if (duck.invulnerableTimer <= 0) {
              // Duck gets hurt!
              s.lives--;
              setLives(s.lives);
              duck.invulnerableTimer = 60; // 1s invulnerability
              duck.vy = -6;
              duck.vx = duck.x < en.x ? -5 : 5;
              duckAudio.playQuack(0.85);

              if (s.lives <= 0) {
                s.gameOver = true;
                setGameOver(true);
              }
            }
          }
        }

        // Flagpole victory check
        if (duck.x >= s.flagX - 10) {
          s.victory = true;
          setVictory(true);
          s.score += 500;
          setScore(s.score);
          duckAudio.playStageClearSound();
        }

        // Smooth Camera follow
        const targetCamX = Math.max(0, Math.min(duck.x - vw * 0.35, s.stageWidth - vw));
        s.cameraX += (targetCamX - s.cameraX) * 0.12;

        // Progress bar percentage
        const pct = Math.max(0, Math.min(100, (duck.x / s.flagX) * 100));
        setProgress(pct);
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life >= p.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // =====================================================================
      // 2. RENDER GRAPHICS ACCORDING TO CURRENT LEVEL THEME
      // =====================================================================
      ctx.clearRect(0, 0, vw, vh);

      if (s.theme === 'garden') {
        // --- LEVEL 1: DAYTIME SUNNY GARDEN ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
        skyGrad.addColorStop(0, '#38bdf8');
        skyGrad.addColorStop(0.65, '#bae6fd');
        skyGrad.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, vw, vh);

        // Smiling Duck Sun
        ctx.save();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(vw - 120, 100, 52, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(vw - 120, 100, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(vw - 132, 95, 4, 0, Math.PI * 2);
        ctx.arc(vw - 108, 95, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(vw - 120, 106, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Parallax Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const cloudOffset = (Date.now() * 0.02) % 1200;
        [
          { x: 100 - cloudOffset * 0.4, y: 70, s: 1.2 },
          { x: 600 - cloudOffset * 0.4, y: 120, s: 1.0 },
          { x: 1100 - cloudOffset * 0.4, y: 80, s: 1.4 },
          { x: 1600 - cloudOffset * 0.4, y: 110, s: 1.1 },
        ].forEach((c) => {
          const cx = ((c.x % vw) + vw) % vw;
          ctx.beginPath();
          ctx.arc(cx, c.y, 28 * c.s, 0, Math.PI * 2);
          ctx.arc(cx + 25 * c.s, c.y - 12 * c.s, 34 * c.s, 0, Math.PI * 2);
          ctx.arc(cx + 55 * c.s, c.y, 26 * c.s, 0, Math.PI * 2);
          ctx.fill();
        });

        // Parallax Green Hills
        ctx.save();
        ctx.fillStyle = '#86efac';
        for (let i = 0; i < 8; i++) {
          const hillX = i * 600 - s.cameraX * 0.25;
          ctx.beginPath();
          ctx.arc(hillX + 300, 520, 360, Math.PI, 0);
          ctx.fill();
        }
        ctx.fillStyle = '#4ade80';
        for (let i = 0; i < 9; i++) {
          const hillX = i * 500 - s.cameraX * 0.45;
          ctx.beginPath();
          ctx.arc(hillX + 250, 540, 280, Math.PI, 0);
          ctx.fill();
        }
        ctx.restore();

      } else if (s.theme === 'sunset') {
        // --- LEVEL 2: GOLDEN SUNSET & TWILIGHT ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
        skyGrad.addColorStop(0, '#c2410c');
        skyGrad.addColorStop(0.35, '#ea580c');
        skyGrad.addColorStop(0.7, '#f59e0b');
        skyGrad.addColorStop(1, '#fde047');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, vw, vh);

        // Giant Golden Setting Sun
        ctx.save();
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.beginPath();
        ctx.arc(vw - 180, 260, 95, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(vw - 180, 260, 68, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Coral Sunset Clouds
        ctx.fillStyle = 'rgba(254, 205, 211, 0.7)';
        const cloudOffset = (Date.now() * 0.02) % 1200;
        [
          { x: 150 - cloudOffset * 0.4, y: 90, s: 1.3 },
          { x: 750 - cloudOffset * 0.4, y: 140, s: 1.1 },
          { x: 1300 - cloudOffset * 0.4, y: 100, s: 1.5 },
        ].forEach((c) => {
          const cx = ((c.x % vw) + vw) % vw;
          ctx.beginPath();
          ctx.arc(cx, c.y, 28 * c.s, 0, Math.PI * 2);
          ctx.arc(cx + 25 * c.s, c.y - 12 * c.s, 34 * c.s, 0, Math.PI * 2);
          ctx.arc(cx + 55 * c.s, c.y, 26 * c.s, 0, Math.PI * 2);
          ctx.fill();
        });

        // Twilight Purple Hills
        ctx.save();
        ctx.fillStyle = '#9333ea';
        for (let i = 0; i < 8; i++) {
          const hillX = i * 600 - s.cameraX * 0.25;
          ctx.beginPath();
          ctx.arc(hillX + 300, 520, 360, Math.PI, 0);
          ctx.fill();
        }
        ctx.fillStyle = '#c026d3';
        for (let i = 0; i < 9; i++) {
          const hillX = i * 500 - s.cameraX * 0.45;
          ctx.beginPath();
          ctx.arc(hillX + 250, 540, 280, Math.PI, 0);
          ctx.fill();
        }
        ctx.restore();

      } else {
        // --- LEVEL 3: STARRY NIGHT & MOONLIGHT ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(0.5, '#1e1b4b');
        skyGrad.addColorStop(1, '#312e81');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, vw, vh);

        // Glowing Crescent Moon
        ctx.save();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(vw - 140, 110, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(vw - 125, 102, 38, 0, Math.PI * 2);
        ctx.fill();
        // Moon glow
        ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
        ctx.beginPath();
        ctx.arc(vw - 140, 110, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Twinkling Stars
        const time = Date.now() * 0.003;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 38; i++) {
          const sx = ((i * 137.5) % vw);
          const sy = ((i * 83.3) % 240) + 20;
          const alpha = 0.35 + Math.sin(time + i) * 0.35;
          ctx.globalAlpha = Math.max(0.1, alpha);
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 3 === 0 ? 2.5 : 1.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Floating Glowing Fireflies
        for (let i = 0; i < 8; i++) {
          const fx = ((i * 240 + Math.sin(time * 0.8 + i) * 40 - s.cameraX * 0.3) % vw + vw) % vw;
          const fy = 200 + Math.cos(time + i * 1.5) * 50;
          ctx.fillStyle = '#a3e635';
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Deep Night Silhouettes
        ctx.save();
        ctx.fillStyle = '#1e293b';
        for (let i = 0; i < 8; i++) {
          const hillX = i * 600 - s.cameraX * 0.25;
          ctx.beginPath();
          ctx.arc(hillX + 300, 520, 360, Math.PI, 0);
          ctx.fill();
        }
        ctx.fillStyle = '#334155';
        for (let i = 0; i < 9; i++) {
          const hillX = i * 500 - s.cameraX * 0.45;
          ctx.beginPath();
          ctx.arc(hillX + 250, 540, 280, Math.PI, 0);
          ctx.fill();
        }
        ctx.restore();
      }

      // =====================================================================
      // Camera Transform for In-Game World Elements
      // =====================================================================
      ctx.save();
      ctx.translate(-s.cameraX, 0);

      // Render Blocks & Platforms
      for (const b of s.blocks) {
        const by = b.y - b.bounce;

        if (b.type === 'pipe') {
          // Pipes (color matched to theme)
          const pipeDark = s.theme === 'night' ? '#0f766e' : s.theme === 'sunset' ? '#9a3412' : '#15803d';
          const pipeLight = s.theme === 'night' ? '#14b8a6' : s.theme === 'sunset' ? '#ea580c' : '#22c55e';
          const pipeCollar = s.theme === 'night' ? '#115e59' : s.theme === 'sunset' ? '#7c2d12' : '#166534';
          const pipeRim = s.theme === 'night' ? '#2dd4bf' : s.theme === 'sunset' ? '#fb923c' : '#4ade80';

          ctx.fillStyle = pipeDark;
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.fillStyle = pipeLight;
          ctx.fillRect(b.x + 4, by, b.w - 8, b.h);
          // Pipe rim collar
          ctx.fillStyle = pipeCollar;
          ctx.fillRect(b.x - 4, by, b.w + 8, 22);
          ctx.fillStyle = pipeRim;
          ctx.fillRect(b.x - 2, by + 2, b.w + 4, 18);
        } else if (b.type === 'question') {
          // Question Mark Block (Classic / Sunset / Night Theme)
          const qBorder = s.theme === 'night' ? '#7e22ce' : '#d97706';
          const qBody = s.theme === 'night' ? '#a855f7' : '#f59e0b';
          const qText = s.theme === 'night' ? '#fde047' : '#fef08a';

          ctx.fillStyle = qBorder;
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.fillStyle = qBody;
          ctx.fillRect(b.x + 2, by + 2, b.w - 4, b.h - 4);
          ctx.fillStyle = qText;
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', b.x + b.w / 2, by + b.h / 2);
        } else if (b.type === 'empty') {
          // Empty Bronze Block
          ctx.fillStyle = '#78350f';
          ctx.fillRect(b.x, by, b.w, b.h);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(b.x + 3, by + 3, b.w - 6, b.h - 6);
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, by + b.h / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Standard Brick / Grass Ground Block
          const topColor = s.theme === 'night' ? '#06b6d4' : s.theme === 'sunset' ? '#ca8a04' : '#15803d';
          const dirtColor = s.theme === 'night' ? '#1e293b' : s.theme === 'sunset' ? '#7c2d12' : '#78350f';
          const dotColor = s.theme === 'night' ? '#0f172a' : s.theme === 'sunset' ? '#431407' : '#451a03';

          ctx.fillStyle = topColor;
          ctx.fillRect(b.x, by, b.w, 14); // grass/moss top
          ctx.fillStyle = dirtColor;
          ctx.fillRect(b.x, by + 14, b.w, b.h - 14); // earth dirt
          // Dirt texture details
          ctx.fillStyle = dotColor;
          for (let dx = 8; dx < b.w; dx += 32) {
            ctx.fillRect(b.x + dx, by + 28, 12, 10);
            ctx.fillRect(b.x + dx + 14, by + 56, 10, 8);
          }
        }
      }

      // Render Bouncy Spring Mushrooms
      for (const m of s.mushrooms) {
        const my = m.y - m.bounce;
        // Cream stem
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(m.x + 16, my + 18, m.w - 32, m.h - 18);
        // Red mushroom cap
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(m.x + m.w / 2, my + 16, m.w / 2, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        // White dots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.x + m.w / 2 - 12, my + 14, 4, 0, Math.PI * 2);
        ctx.arc(m.x + m.w / 2, my + 10, 5, 0, Math.PI * 2);
        ctx.arc(m.x + m.w / 2 + 12, my + 14, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Moving Platforms
      for (const mp of s.movingPlatforms) {
        ctx.fillStyle = s.theme === 'night' ? '#3b82f6' : '#d97706';
        ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
        ctx.fillStyle = s.theme === 'night' ? '#60a5fa' : '#f59e0b';
        ctx.fillRect(mp.x + 3, mp.y + 3, mp.w - 6, mp.h - 6);
        // Metallic edge rivets
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mp.x + 8, mp.y + mp.h / 2, 3, 0, Math.PI * 2);
        ctx.arc(mp.x + mp.w - 8, mp.y + mp.h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Collectible Corn (Bắp vàng)
      for (const c of s.coins) {
        if (c.collected) continue;
        const bob = Math.sin(Date.now() * 0.006 + c.id) * 5;
        ctx.save();
        ctx.translate(c.x, c.y + bob);
        // Yellow corn cob
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Green leaves at bottom
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(-7, 6);
        ctx.quadraticCurveTo(0, 16, 7, 6);
        ctx.fill();
        ctx.restore();
      }

      // Render Enemies
      for (const en of s.enemies) {
        ctx.save();
        ctx.translate(en.x + en.w / 2, en.y + en.h / 2);

        if (en.squashed) {
          // Squashed pancake animation
          ctx.scale(1.4, 0.25);
        }

        if (en.type === 'caterpillar') {
          // CON SÂU (Cute Segmented Green Caterpillar)
          const dir = en.vx > 0 ? 1 : -1;
          ctx.scale(dir, 1);

          // 3 body segments
          ctx.fillStyle = '#65a30d';
          ctx.beginPath();
          ctx.arc(-10, 2, 9, 0, Math.PI * 2);
          ctx.arc(-2, 0, 10, 0, Math.PI * 2);
          ctx.arc(7, -1, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#84cc16';
          ctx.beginPath();
          ctx.arc(-10, 2, 7, 0, Math.PI * 2);
          ctx.arc(-2, 0, 8, 0, Math.PI * 2);
          ctx.arc(7, -1, 8, 0, Math.PI * 2);
          ctx.fill();

          // Caterpillar Head
          ctx.fillStyle = '#a3e635';
          ctx.beginPath();
          ctx.arc(14, -3, 11, 0, Math.PI * 2);
          ctx.fill();

          // Antennae with purple tips
          ctx.strokeStyle = '#365314';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(15, -12);
          ctx.lineTo(18, -18);
          ctx.moveTo(11, -12);
          ctx.lineTo(11, -19);
          ctx.stroke();

          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(18, -19, 3, 0, Math.PI * 2);
          ctx.arc(11, -20, 3, 0, Math.PI * 2);
          ctx.fill();

          // Eyes & blushing cheeks
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(18, -4, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(14, 1, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // BỌ RÙA (Cute Red Spotted Ladybug)
          const dir = en.vx > 0 ? 1 : -1;
          ctx.scale(dir, 1);

          // Black head
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(12, 1, 7, 0, Math.PI * 2);
          ctx.fill();

          // White eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(14, -1, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(15, -1, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Red dome shell
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(-2, 0, 14, 0, Math.PI * 2);
          ctx.fill();

          // Black polka dots
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-6, -4, 3, 0, Math.PI * 2);
          ctx.arc(-2, 4, 3.5, 0, Math.PI * 2);
          ctx.arc(3, -5, 2.5, 0, Math.PI * 2);
          ctx.arc(-8, 3, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Crawling legs
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          const legWiggle = Math.sin(en.walkFrame * 3) * 3;
          ctx.beginPath();
          ctx.moveTo(-10, 10);
          ctx.lineTo(-12 + legWiggle, 16);
          ctx.moveTo(0, 10);
          ctx.lineTo(0 - legWiggle, 16);
          ctx.moveTo(8, 10);
          ctx.lineTo(10 + legWiggle, 16);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render Flagpole at Finish
      const fx = s.flagX;
      const fy = s.flagY;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(fx - 4, fy, 8, 290); // pole
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(fx, fy, 10, 0, Math.PI * 2);
      ctx.fill(); // gold ball top

      // Triangular Red Flag waving
      const flagWave = Math.sin(Date.now() * 0.008) * 6;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(fx + 4, fy + 10);
      ctx.lineTo(fx + 55 + flagWave, fy + 35);
      ctx.lineTo(fx + 4, fy + 60);
      ctx.closePath();
      ctx.fill();

      // Render Duck (The Cute Mario Duck)
      ctx.save();
      ctx.translate(duck.x + duck.w / 2, duck.y + duck.h / 2);

      // Flashing if invulnerable
      if (duck.invulnerableTimer > 0 && Math.floor(duck.invulnerableTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }

      // Direction flip
      if (duck.facing === 'left') {
        ctx.scale(-1, 1);
      }

      // Walk waddle angle
      const waddle = Math.sin(duck.walkFrame * 2) * 0.12;
      ctx.rotate(waddle);

      // Duck Body (Golden Yellow)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(-2, 6, 17, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing (flapping animation on double jump)
      ctx.save();
      if (duck.flapping) {
        const flapAngle = Math.sin(Date.now() * 0.04) * 0.6;
        ctx.rotate(flapAngle);
      }
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-6, 6, 11, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Duck Head
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(6, -8, 14, 0, Math.PI * 2);
      ctx.fill();

      // Cute Blue Mario Cap
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(6, -15, 12, Math.PI, 0); // Cap dome
      ctx.fill();
      // Cap visor/brim
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.ellipse(14, -14, 9, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Big Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(11, -10, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(12.5, -10, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(13.5, -11, 1, 0, Math.PI * 2);
      ctx.fill();

      // Orange Beak
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(14, -7);
      ctx.quadraticCurveTo(24, -4, 21, 0);
      ctx.lineTo(13, -2);
      ctx.closePath();
      ctx.fill();

      // Orange Feet
      ctx.fillStyle = '#ea580c';
      const footWiggle = Math.sin(duck.walkFrame * 2) * 4;
      ctx.fillRect(-8, 19, 9, 4 + footWiggle);
      ctx.fillRect(3, 19, 9, 4 - footWiggle);

      ctx.restore();

      // Render Particles (corn, dust, float scores)
      for (const p of s.particles) {
        ctx.save();
        if (p.text) {
          ctx.fillStyle = p.color;
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(p.text, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore(); // Restore world camera

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const currentLevelObj = LEVELS.find((l) => l.id === currentLevel) || LEVELS[0];

  return (
    <div className={styles.gardenOverlay}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Top HUD */}
      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <div className={styles.hudCard}>
            <span className={styles.lives}>
              {'❤️'.repeat(lives)}
              {'🖤'.repeat(Math.max(0, 3 - lives))}
            </span>
          </div>
          <div className={styles.hudCard}>
            <span>🏆 Điểm:</span>
            <span className={styles.scoreValue}>{score}</span>
          </div>
          <div className={styles.hudCard}>
            <span>🐛 Đã đạp:</span>
            <span className={styles.bugsCount}>{bugsStomped}</span>
          </div>
        </div>

        <div className={styles.hudCenter}>
          {/* Level Selector Pills */}
          <div className={styles.levelSelector}>
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                className={`${styles.levelBtn} ${currentLevel === lvl.id ? styles.levelBtnActive : ''}`}
                onClick={() => selectLevel(lvl.id)}
                title={`Chuyển tới ${lvl.name}`}
              >
                {lvl.id === 1 ? '🌿 Màn 1' : lvl.id === 2 ? '🍄 Màn 2' : '🌌 Màn 3'}
              </button>
            ))}
          </div>

          <div className={styles.hudCard}>
            <span>🦆</span>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>🚩</span>
          </div>
        </div>

        <div className={styles.hudRight}>
          <button
            className={styles.hudBtn}
            onClick={toggleMute}
            title="Bật/Tắt âm thanh"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className={`${styles.hudBtn} ${styles.hudBtnExit}`}
            onClick={onClose}
            title="Quay về nhà vịt (Escape)"
          >
            🏠 Về nhà vịt
          </button>
        </div>
      </div>

      {/* Controls Hint */}
      {!isTouch && !gameOver && !victory && (
        <div className={styles.controlsHint}>
          <span><kbd className={styles.kbd}>A / D</kbd> hoặc <kbd className={styles.kbd}>← / →</kbd> Chạy</span>
          <span><kbd className={styles.kbd}>Space / W</kbd> Nhảy 1 lần</span>
          <span><kbd className={styles.kbd}>Nhấn thêm lần nữa</kbd> 🪶 Vỗ cánh nhảy cao!</span>
          <span><kbd className={styles.kbd}>Nhảy đạp lên đầu</kbd> Diệt sâu & bọ rùa!</span>
          <span><kbd className={styles.kbd}>Cộc đầu / Dẫm lên ô [?]</kbd> Ăn bắp vàng!</span>
        </div>
      )}

      {/* Mobile Controls */}
      {isTouch && !gameOver && !victory && (
        <div className={styles.mobileControls}>
          <div className={styles.mobileLeft}>
            <button
              type="button"
              className={styles.mobileBtn}
              onPointerDown={() => { stateRef.current.keys.left = true; }}
              onPointerUp={() => { stateRef.current.keys.left = false; }}
              onPointerCancel={() => { stateRef.current.keys.left = false; }}
            >
              ◀
            </button>
            <button
              type="button"
              className={styles.mobileBtn}
              onPointerDown={() => { stateRef.current.keys.right = true; }}
              onPointerUp={() => { stateRef.current.keys.right = false; }}
              onPointerCancel={() => { stateRef.current.keys.right = false; }}
            >
              ▶
            </button>
          </div>
          <div className={styles.mobileRight}>
            <button
              type="button"
              className={`${styles.mobileBtn} ${styles.mobileBtnJump}`}
              onPointerDown={handleJump}
            >
              🪶 NHẢY
            </button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {victory && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <span className={styles.modalEmoji}>🎉</span>
            <h2 className={styles.modalTitle}>
              {currentLevel === 3
                ? '👑 ĐẠI THẮNG TOÀN DIỆN!'
                : `Hoàn Thành ${currentLevelObj.name}!`}
            </h2>
            <p className={styles.modalBody}>
              {currentLevel === 3
                ? 'Vịt Vũ đã xuất sắc vượt qua toàn bộ 3 màn chơi và dọn sạch sâu bọ trong vương quốc!'
                : `Vịt Vũ đã chinh phục xuất sắc màn chơi với ${score} điểm và đạp sạch sâu bọ!`}
            </p>
            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Tổng Điểm</div>
                <div className={styles.statNumber}>{score}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Sâu / Bọ Đã Đạp</div>
                <div className={styles.statNumber}>{bugsStomped}</div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                🏠 Về phòng
              </button>
              {currentLevel < 3 ? (
                <button
                  className={styles.btnNextLevel}
                  onClick={() => selectLevel(currentLevel + 1)}
                >
                  ▶ Sang Màn {currentLevel + 1} →
                </button>
              ) : (
                <button
                  className={styles.btnPrimary}
                  onClick={() => selectLevel(1)}
                >
                  🔄 Chơi lại từ Màn 1
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <span className={styles.modalEmoji}>💫</span>
            <h2 className={styles.modalTitle}>Vịt Vũ Bị Chóng Mặt!</h2>
            <p className={styles.modalBody}>
              Hãy cẩn thận hơn khi đối đầu với sâu bọ và nhớ dùng cú nhảy kép vỗ cánh nhé!
            </p>
            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Điểm Số</div>
                <div className={styles.statNumber}>{score}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Sâu / Bọ Đã Đạp</div>
                <div className={styles.statNumber}>{bugsStomped}</div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                🏠 Về phòng
              </button>
              <button className={styles.btnPrimary} onClick={() => initStage(currentLevel)}>
                🔄 Thử lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
