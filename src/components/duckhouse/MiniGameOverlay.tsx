'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { gameManager } from './gameState';
import styles from './MiniGame.module.css';

interface MiniGameOverlayProps {
  onClose?: () => void;
}

export default function MiniGameOverlay({ onClose }: MiniGameOverlayProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return gameManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const isPlaying = gameManager.isPlaying;
  const score = gameManager.score;
  const highScore = gameManager.highScore;
  const timeLeft = gameManager.timeLeft;
  const combo = gameManager.combo;
  const hasSpeedBoost = gameManager.speedBoostUntil > performance.now();

  const handleStart = () => {
    gameManager.start();
  };

  const handleStop = () => {
    gameManager.stop();
    if (onClose) onClose();
  };

  // Check if game just ended
  const isEnded = !isPlaying && timeLeft === 0 && score > 0;

  useEffect(() => {
    if (isEnded) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#38bdf8', '#34d399', '#f43f5e', '#a855f7'],
      });
    }
  }, [isEnded]);

  const getRank = (sc: number) => {
    if (sc >= 350) return { title: '👑 Vua Diệt Bug & Bậc Thầy Sàn Xưởng', color: '#fbbf24' };
    if (sc >= 220) return { title: '🚀 Kiến Trúc Sư MES/ERP Thần Tốc', color: '#38bdf8' };
    if (sc >= 120) return { title: '🦆 Vịt Kỹ Sư Fix Bug Chuyên Nghiệp', color: '#34d399' };
    return { title: '🐣 Vịt Tập Sự Nhanh Nhẹn', color: '#f59e0b' };
  };

  return (
    <>
      {/* Top Floating Game HUD when Playing */}
      {isPlaying && (
        <div className={styles.gameHud}>
          {/* Timer Card */}
          <div className={`${styles.hudCard} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>
            <span className={styles.hudIcon}>⏱️</span>
            <div>
              <div className={styles.hudLabel}>THỜI GIAN</div>
              <div className={styles.hudValue}>{timeLeft}s</div>
            </div>
          </div>

          {/* Score Card */}
          <div className={styles.hudCard}>
            <span className={styles.hudIcon}>🎯</span>
            <div>
              <div className={styles.hudLabel}>ĐIỂM SỐ</div>
              <div className={styles.hudValue}>{score}</div>
            </div>
          </div>

          {/* Combo Multiplier */}
          {combo > 1 && (
            <div className={styles.comboBadge}>
              🔥 COMBO x{combo}!
            </div>
          )}

          {/* Speed Boost Indicator */}
          {hasSpeedBoost && (
            <div className={styles.boostBadge}>
              ⚡ TĂNG TỐC!
            </div>
          )}

          {/* Stop / Cancel button */}
          <button className={styles.stopBtn} onClick={handleStop} title="Dừng chơi">
            ✕ Dừng
          </button>
        </div>
      )}

      {/* Game Over Result Modal */}
      {isEnded && (
        <div className={styles.modalBackdrop}>
          <div className={styles.resultModal}>
            <div className={styles.resultDuck}>🦆🎉</div>
            <h2 className={styles.resultTitle}>Hết Giờ! Hoàn Thành Thử Thách!</h2>

            <div className={styles.rankPill} style={{ borderColor: getRank(score).color, color: getRank(score).color }}>
              {getRank(score).title}
            </div>

            <div className={styles.scoreRow}>
              <div className={styles.scoreCol}>
                <span className={styles.scoreLabel}>ĐIỂM CỦA BẠN</span>
                <span className={styles.scoreNum}>{score}</span>
              </div>
              <div className={styles.scoreDivider} />
              <div className={styles.scoreCol}>
                <span className={styles.scoreLabel}>KỶ LỤC CAO NHẤT</span>
                <span className={styles.scoreNumGold}>{highScore}</span>
              </div>
            </div>

            {score >= highScore && score > 0 && (
              <div className={styles.newRecordBadge}>
                ⭐ KỶ LỤC MỚI ĐÃ ĐƯỢC XÁC LẬP! ⭐
              </div>
            )}

            <p className={styles.resultSub}>
              Cảm ơn bạn đã đồng hành cùng Vịt Vũ dọn dẹp bug và nhặt bắp trong xưởng!
            </p>

            <div className={styles.btnRow}>
              <button className={styles.playAgainBtn} onClick={handleStart}>
                🔄 Chơi Lại Ngay
              </button>
              <button className={styles.closeBtn} onClick={handleStop}>
                🏡 Về Thăm Nhà Vịt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
