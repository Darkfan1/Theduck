'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { duckAudio } from '@/utils/duckAudio';
import { STATIONS, STATION_ORDER, getStation, isStationKey, type StationKey } from './stations';
import { input, nav, MOVE_KEYS, getDirection } from './controls';
import StationPanel from './StationPanel';
import MarioGardenGame from './MarioGardenGame';
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
  const [gardenGame, setGardenGame] = useState(false);
  const [nearDoor, setNearDoor] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const openRef = useRef(open);
  const nearbyRef = useRef(nearby);
  const nearDoorRef = useRef(nearDoor);
  const gardenGameRef = useRef(gardenGame);
  openRef.current = open;
  nearbyRef.current = nearby;
  nearDoorRef.current = nearDoor;
  gardenGameRef.current = gardenGame;

  const quack = useCallback(() => {
    input.quackAt = performance.now() / 1000;
    duckAudio.playDoubleQuack();
  }, []);

  const openStation = useCallback((key: StationKey) => {
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
      if (gardenGameRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const code = e.code;
      const key = (e.key || '').toLowerCase();
      const dir = getDirection(e);

      if (openRef.current) {
        if (code === 'Escape' || code === 'KeyE' || key === 'e' || key === 'escape') {
          e.preventDefault();
          closeStation();
        } else if (dir === 'right') {
          e.preventDefault();
          stepStation(1);
        } else if (dir === 'left') {
          e.preventDefault();
          stepStation(-1);
        }
        return;
      }

      if (dir) {
        e.preventDefault();
        input.onKeyDown(dir, code, key);
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

      if (code === 'KeyE' || key === 'e' || code === 'Enter' || code === 'Space' || key === ' ') {
        e.preventDefault();
        if (nearDoorRef.current && (code === 'KeyE' || key === 'e' || code === 'Enter')) {
          input.clear();
          setGardenGame(true);
          duckAudio.playJumpSound();
          return;
        }
        if (nearbyRef.current) openStation(nearbyRef.current);
        else if (code === 'Space' || key === ' ') quack();
        return;
      }
      if (code === 'KeyQ' || key === 'q') quack();
      if (code === 'KeyM' || key === 'm') setMuted(duckAudio.toggleMute());
    };

    const onUp = (e: KeyboardEvent) => {
      if (gardenGameRef.current) return;
      const dir = getDirection(e);
      if (dir) {
        input.onKeyUp(dir, e.code);
      } else if (e.code) {
        // Fallback: nếu getDirection trả null (do bộ gõ can thiệp e.key), giải phóng qua e.code
        if (e.code === 'KeyW' || e.code === 'ArrowUp') input.onKeyUp('up', e.code);
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') input.onKeyUp('down', e.code);
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.onKeyUp('left', e.code);
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') input.onKeyUp('right', e.code);
        else input.keys.delete(e.code);
      }
    };

    const onBlur = () => input.clear();
    const onVisibilityChange = () => {
      if (document.hidden) input.clear();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [closeStation, openStation, quack, stepStation]);

  const nearbyDef = nearby ? getStation(nearby) : null;

  return (
    <main className={styles.root}>
      <div className={styles.canvasWrap}>
        <HouseScene
          paused={open !== null || gardenGame}
          nearby={nearby}
          onNearbyChange={setNearby}
          onArrive={openStation}
          onOpenGardenGame={() => {
            input.clear();
            setGardenGame(true);
            duckAudio.playJumpSound();
          }}
          onNearDoorChange={setNearDoor}
          openStationKey={open}
          onCloseStation={closeStation}
        />
      </div>

      {/* Top HUD */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <button className={styles.brandDuck} onClick={quack} aria-label="Quác!">
            🦆
          </button>
          <div>
            <h1 className={styles.brandTitle}>Tôn Đông Vũ</h1>
            <p className={styles.brandSub}>
              Tem nhãn · Kỹ thuật in · Prepress · Mini ERP
            </p>
          </div>
        </div>
        <div className={styles.topActions}>
          <button
            className={`${styles.hudBtn} ${styles.hudBtnAccent}`}
            onClick={() => {
              input.clear();
              setGardenGame(true);
              duckAudio.playJumpSound();
            }}
            title="Ra cửa chơi Mini Game ngoài sân vườn"
          >
            🚪 <span className={styles.hideSm}>Mini game</span>
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

      {/* Interaction prompt */}
      {nearbyDef && !open && !gardenGame && (
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

      {/* Door / Mini game prompt */}
      {nearDoor && !open && !gardenGame && !nearbyDef && (
        <button
          className={styles.prompt}
          style={{ '--accent': '#22c55e' } as React.CSSProperties}
          onClick={() => {
            input.clear();
            setGardenGame(true);
            duckAudio.playJumpSound();
          }}
        >
          <kbd className={styles.kbd}>{isTouch ? 'Chạm' : 'E'}</kbd>
          <span>
            Bước ra ngoài <strong>🚪 Mini game</strong>
          </span>
        </button>
      )}

      {/* Station dock */}
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

      {/* Controls hint (desktop) */}
      {!isTouch && (
        <div className={styles.hint}>
          <span className={styles.hintCluster}>
            <button
              type="button"
              className={`${styles.kbd} ${styles.kbdBtn}`}
              onPointerDown={(e) => {
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
                input.setPointerDir('up', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { }
                input.setPointerDir('up', false);
              }}
              onPointerCancel={() => input.setPointerDir('up', false)}
              aria-label="Đi tới (W)"
              title="Đi tới (W hoặc ↑)"
            >
              W
            </button>
            <button
              type="button"
              className={`${styles.kbd} ${styles.kbdBtn}`}
              onPointerDown={(e) => {
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
                input.setPointerDir('left', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { }
                input.setPointerDir('left', false);
              }}
              onPointerCancel={() => input.setPointerDir('left', false)}
              aria-label="Sang trái (A)"
              title="Sang trái (A hoặc ←)"
            >
              A
            </button>
            <button
              type="button"
              className={`${styles.kbd} ${styles.kbdBtn}`}
              onPointerDown={(e) => {
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
                input.setPointerDir('down', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { }
                input.setPointerDir('down', false);
              }}
              onPointerCancel={() => input.setPointerDir('down', false)}
              aria-label="Lùi lại (S)"
              title="Lùi lại (S hoặc ↓)"
            >
              S
            </button>
            <button
              type="button"
              className={`${styles.kbd} ${styles.kbdBtn}`}
              onPointerDown={(e) => {
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
                input.setPointerDir('right', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { }
                input.setPointerDir('right', false);
              }}
              onPointerCancel={() => input.setPointerDir('right', false)}
              aria-label="Sang phải (D)"
              title="Sang phải (D hoặc →)"
            >
              D
            </button>
            <span className={styles.hintLabel}>di chuyển</span>
          </span>
          <span className={styles.hintCluster}>
            <button
              type="button"
              className={`${styles.kbd} ${styles.kbdBtn}`}
              onClick={() => {
                if (nearbyRef.current) openStation(nearbyRef.current);
              }}
              title="Xem góc này (E hoặc Enter)"
            >
              E
            </button>
            <span className={styles.hintLabel}>xem</span>
          </span>
          <span className={styles.hintCluster}>
            <button
              type="button"
              className={`${styles.kbd} ${styles.kbdBtn}`}
              onClick={quack}
              title="Kêu Quác (Q hoặc Space)"
            >
              Q
            </button>
            <span className={styles.hintLabel}>quác</span>
          </span>
          <span className={styles.hintClickNote}>
            {nearby ? '🖱️ cuộn chuột để về chế độ thường' : '🖱️ click sàn để đi tới'}
          </span>
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
        <div className={styles.welcomeBackdrop} onClick={dismissWelcome}>
          <section className={styles.welcome} onClick={(e) => e.stopPropagation()}>
            <div className={styles.welcomeDuck}>🦆</div>
            <h2 className={styles.welcomeTitle}>Chào mừng đến Nhà Vịt!</h2>
            <p className={styles.body}>
              Bạn là chú vịt. Đi dạo quanh nhà và ghé 5 góc để tìm hiểu về tôi — công việc,
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
      {gardenGame && <MarioGardenGame onClose={() => setGardenGame(false)} />}
    </main>
  );
}
