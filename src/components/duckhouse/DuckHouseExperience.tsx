'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { duckAudio } from '@/utils/duckAudio';
import { STATIONS, STATION_ORDER, getStation, isStationKey, type StationKey } from './stations';
import { input, nav, MOVE_KEYS } from './controls';
import StationPanel from './StationPanel';
import MiniGameOverlay from './MiniGameOverlay';
import { gameManager } from './gameState';
import styles from './DuckHouse.module.css';

const HouseScene = dynamic(() => import('./HouseScene'), {
  ssr: false,
  loading: () => (
    <div className={styles.loading}>
      <div className={styles.loadingDuck}>🦆</div>
      <div>Đang mở cửa nhà vịt…</div>
    </div>
  ),
});

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 20;
    const d = Math.hypot(x, y);
    if (d > max) {
      x = (x / d) * max;
      y = (y / d) * max;
    }
    setKnob({ x, y });
    input.joyX = x / max;
    input.joyY = y / max;
  };

  const reset = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    input.joyX = 0;
    input.joyY = 0;
  };

  return (
    <div
      ref={base}
      className={styles.joystick}
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      aria-label="Cần điều khiển di chuyển"
    >
      <div className={styles.joyKnob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

export default function DuckHouseExperience() {
  const { personal } = PORTFOLIO_DATA;
  const [nearby, setNearby] = useState<StationKey | null>(null);
  const [open, setOpen] = useState<StationKey | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const [gameHighScore, setGameHighScore] = useState(gameManager.highScore);

  useEffect(() => {
    return gameManager.subscribe(() => {
      setIsPlayingGame(gameManager.isPlaying);
      setGameHighScore(gameManager.highScore);
    });
  }, []);

  const openRef = useRef(open);
  const nearbyRef = useRef(nearby);
  openRef.current = open;
  nearbyRef.current = nearby;

  const quack = useCallback(() => {
    input.quackAt = performance.now() / 1000;
    duckAudio.playDoubleQuack();
  }, []);

  const openStation = useCallback((key: StationKey) => {
    if (gameManager.isPlaying) return;
    input.keys.clear();
    input.joyX = 0;
    input.joyY = 0;
    nav.target = null;
    nav.pending = null;
    setOpen(key);
    setWelcome(false);
    duckAudio.playFeedChime();
    window.history.replaceState(null, '', `#${key}`);
  }, []);

  const closeStation = useCallback(() => {
    setOpen(null);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const stepStation = useCallback((dir: 1 | -1) => {
    const cur = openRef.current;
    if (!cur) return;
    const i = STATION_ORDER.indexOf(cur) + dir;
    if (i < 0 || i >= STATION_ORDER.length) return;
    const next = STATION_ORDER[i];
    nav.teleport = getStation(next).interact;
    duckAudio.playJumpSound();
    setOpen(next);
    window.history.replaceState(null, '', `#${next}`);
  }, []);

  const walkTo = useCallback((key: StationKey) => {
    setWelcome(false);
    nav.target = getStation(key).interact;
    nav.pending = key;
  }, []);

  const dismissWelcome = useCallback(() => {
    setWelcome(false);
    try {
      sessionStorage.setItem('duckhouse-welcomed', '1');
    } catch {
      /* ignore */
    }
  }, []);

  // Initial setup: touch detection, deep link, welcome card
  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
    const hash = window.location.hash.replace('#', '');
    if (isStationKey(hash)) {
      nav.teleport = getStation(hash).interact;
      setOpen(hash);
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem('duckhouse-welcomed') === '1';
    } catch {
      /* ignore */
    }
    setWelcome(!seen);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const code = e.code;

      if (openRef.current) {
        if (code === 'Escape' || code === 'KeyE') {
          e.preventDefault();
          closeStation();
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          stepStation(1);
        } else if (code === 'ArrowLeft' || code === 'KeyA') {
          stepStation(-1);
        }
        return;
      }

      if (MOVE_KEYS.includes(code)) {
        e.preventDefault();
        input.keys.add(code);
        setWelcome((w) => {
          if (w) {
            try {
              sessionStorage.setItem('duckhouse-welcomed', '1');
            } catch {
              /* ignore */
            }
          }
          return false;
        });
        return;
      }

      if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
        e.preventDefault();
        if (nearbyRef.current) openStation(nearbyRef.current);
        else if (code === 'Space') quack();
        return;
      }
      if (code === 'KeyQ') quack();
      if (code === 'KeyM') setMuted(duckAudio.toggleMute());
    };
    const onUp = (e: KeyboardEvent) => input.keys.delete(e.code);
    const onBlur = () => input.keys.clear();

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [closeStation, openStation, quack, stepStation]);

  const nearbyDef = nearby ? getStation(nearby) : null;

  return (
    <main className={styles.root}>
      <div className={styles.canvasWrap}>
        <HouseScene
          paused={open !== null}
          nearby={isPlayingGame ? null : nearby}
          onNearbyChange={setNearby}
          onArrive={isPlayingGame ? () => {} : openStation}
          onStartMiniGame={() => gameManager.start()}
        />
      </div>

      {/* Top HUD */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <button className={styles.brandDuck} onClick={quack} aria-label="Quác!">
            🦆
          </button>
          <div>
            <h1 className={styles.brandTitle}>Nhà Vịt của {personal.fullName}</h1>
            <p className={styles.brandSub}>The Duck · Phần mềm MES / ERP cho xưởng sản xuất</p>
          </div>
        </div>
        <div className={styles.topActions}>
          <button
            className={`${styles.hudBtn} ${styles.hudBtnGame}`}
            onClick={() => gameManager.start()}
            title="Chơi Mini Game: Vịt Bắt Bug & Nhặt Bắp"
          >
            🎮 <span>Bắt Bug {gameHighScore > 0 ? `(🏆 ${gameHighScore})` : ''}</span>
          </button>
          <button
            className={styles.hudBtn}
            onClick={() => setMuted(duckAudio.toggleMute())}
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            title="Âm thanh (M)"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <a
            className={`${styles.hudBtn} ${styles.hudBtnAccent}`}
            href={personal.contact.zalo}
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 <span className={styles.hideSm}>Zalo {personal.contact.phone}</span>
          </a>
        </div>
      </header>

      {/* Mini Game HUD & Modal */}
      <MiniGameOverlay />

      {/* Interaction prompt */}
      {nearbyDef && !open && !isPlayingGame && (
        <button
          className={styles.prompt}
          style={{ '--accent': nearbyDef.color } as React.CSSProperties}
          onClick={() => openStation(nearbyDef.key)}
        >
          <kbd className={styles.kbd}>{isTouch ? 'Chạm' : 'E'}</kbd>
          <span>
            Xem <strong>{nearbyDef.emoji} {nearbyDef.label}</strong>
          </span>
        </button>
      )}

      {/* Station dock */}
      {!isPlayingGame && (
        <nav className={styles.dock} aria-label="Các góc trong nhà vịt">
          {STATIONS.map((s) => (
            <button
              key={s.key}
              className={`${styles.dockItem} ${nearby === s.key || open === s.key ? styles.dockItemActive : ''}`}
              style={{ '--accent': s.color } as React.CSSProperties}
              onClick={() => (open ? openStation(s.key) : walkTo(s.key))}
              title={`${s.place} — ${s.label}`}
            >
              <span className={styles.dockEmoji}>{s.emoji}</span>
              <span className={styles.dockLabel}>{s.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Controls hint (desktop) */}
      {!isTouch && !isPlayingGame && (
        <div className={styles.hint}>
          <span><kbd className={styles.kbd}>W</kbd><kbd className={styles.kbd}>A</kbd><kbd className={styles.kbd}>S</kbd><kbd className={styles.kbd}>D</kbd> đi</span>
          <span><kbd className={styles.kbd}>E</kbd> xem</span>
          <span><kbd className={styles.kbd}>Q</kbd> quác</span>
          <span>🖱️ click sàn để đi tới</span>
        </div>
      )}

      {/* Mobile controls */}
      {isTouch && !open && (
        <>
          <Joystick />
          <button className={styles.quackBtn} onClick={quack} aria-label="Quác">
            🦆
          </button>
        </>
      )}

      {/* Welcome card */}
      {welcome && !open && (
        <div className={styles.panelBackdrop} onClick={dismissWelcome}>
          <section className={styles.welcome} onClick={(e) => e.stopPropagation()}>
            <div className={styles.welcomeDuck}>🦆</div>
            <h2 className={styles.welcomeTitle}>Chào mừng đến Nhà Vịt!</h2>
            <p className={styles.body}>
              Bạn là chú vịt Vũ. Đi dạo quanh nhà và ghé 5 góc để tìm hiểu về tôi — công việc,
              kỹ năng, dự án và cách liên hệ.
            </p>
            <div className={styles.welcomeControls}>
              {isTouch ? (
                <>
                  <div>🕹️ Kéo cần điều khiển để đi</div>
                  <div>👆 Chạm vào đồ vật để đi tới & xem</div>
                </>
              ) : (
                <>
                  <div><kbd className={styles.kbd}>WASD</kbd> / <kbd className={styles.kbd}>← ↑ → ↓</kbd> di chuyển</div>
                  <div><kbd className={styles.kbd}>E</kbd> xem nội dung khi đứng trong vòng sáng</div>
                  <div>🖱️ Hoặc click vào đồ vật để tự đi tới</div>
                </>
              )}
            </div>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                dismissWelcome();
                quack();
              }}
            >
              Bắt đầu khám phá →
            </button>
          </section>
        </div>
      )}

      {open && <StationPanel stationKey={open} onClose={closeStation} onStep={stepStation} />}
    </main>
  );
}
