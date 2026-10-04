'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TabKey } from './Navbar';
import { duckAudio } from '@/utils/duckAudio';
import { 
  Home, 
  Factory, 
  Cpu, 
  Package, 
  Send, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Wheat, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  ArrowRight
} from 'lucide-react';

interface DuckFarmWorldProps {
  activeTab: TabKey;
  onSelectStation: (station: TabKey) => void;
}

interface DuckActor {
  id: string;
  name: string;
  role: string;
  x: number; // percentage
  y: number; // percentage
  scale: number;
  facing: 'left' | 'right';
  isSwimming?: boolean;
}

export default function DuckFarmWorld({ activeTab, onSelectStation }: DuckFarmWorldProps) {
  const [isNight, setIsNight] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredStation, setHoveredStation] = useState<TabKey | null>(null);
  
  // Interactive state
  const [activeSpeech, setActiveSpeech] = useState<{ duckId: string; text: string } | null>(null);
  const [quackCount, setQuackCount] = useState(0);
  const [feedCount, setFeedCount] = useState(0);
  const [grains, setGrains] = useState<{ id: number; x: number; y: number }[]>([]);
  const [jumpingDuckId, setJumpingDuckId] = useState<string | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Duck actors stationed across the farm
  const ducks: DuckActor[] = [
    { id: 'duck-chief', name: 'Vũ Vịt Trưởng', role: 'Chủ Trang Trại & Kiến Trúc Sư', x: 26, y: 72, scale: 1.15, facing: 'right' },
    { id: 'duck-mechanic', name: 'Vịt Kỹ Thuật', role: 'Vận Hành Xưởng & In Ấn', x: 44, y: 64, scale: 0.95, facing: 'left' },
    { id: 'duck-coder', name: 'Vịt Lập Trình', role: 'Chuyên Gia Next.js & Tauri', x: 62, y: 68, scale: 1.0, facing: 'right' },
    { id: 'duck-shipper', name: 'Vịt Thủ Kho', role: 'Quản Lý BOM & Mini ERP', x: 79, y: 74, scale: 0.9, facing: 'left' },
    { id: 'duck-swimmer', name: 'Vịt Bơi Lội', role: 'Thư Giãn Bờ Hồ & Zalo', x: 88, y: 44, scale: 0.85, facing: 'left', isSwimming: true },
    { id: 'duck-baby', name: 'Vịt Con', role: 'Học Việc Nhanh Nhẹn', x: 12, y: 78, scale: 0.7, facing: 'right' },
  ];

  const duckQuotes = [
    "Quác! Tôi là Vịt Vũ — 20 năm từ thủ kho, xưởng in đến kiến trúc phần mềm!",
    "Hiểu đúng vấn đề → Thiết kế đúng quy trình → Xây dựng đúng công cụ!",
    "Phần mềm xịn là người ở xưởng mở lên thao tác được ngay, không rườm rà!",
    "Tauri v2 + Next.js 15: Chạy desktop siêu mượt, nhẹ tênh dưới 70MB RAM!",
    "Cần số hóa xưởng in ấn, bao bì, tem nhãn? Bạn đến đúng địa chỉ rồi đó!",
    "Mini ERP may đo: Không tính năng rác, dữ liệu chạy thời gian thực!",
    "Quác quác quác! Cho xin vài hạt bắp đi sếp ơi 🌾!",
    "Bấm vào Hồ Vịt để nhắn tin Zalo hoặc gọi trực tiếp cho Vũ nhé!",
  ];

  const stations: {
    key: TabKey;
    number: string;
    name: string;
    tagline: string;
    subtext: string;
    icon: React.ReactNode;
    color: string;
    accentBg: string;
  }[] = [
    {
      key: 'overview',
      number: '01',
      name: 'Nhà Chính Của Vịt',
      tagline: 'Về Tôi & Triết Lý',
      subtext: 'Hành trình 20 năm từ sàn xưởng đến công nghệ',
      icon: <Home size={18} />,
      color: '#f59e0b',
      accentBg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      key: 'experience',
      number: '02',
      name: 'Xưởng Sản Xuất Vịt',
      tagline: '20 Năm Thực Chiến',
      subtext: 'Kho vận, in ấn bao bì, tem nhãn & điều hành xưởng',
      icon: <Factory size={18} />,
      color: '#38bdf8',
      accentBg: 'rgba(56, 189, 248, 0.12)',
    },
    {
      key: 'skills',
      number: '03',
      name: 'Phòng Lab Công Nghệ',
      tagline: 'Kỹ Năng & AI',
      subtext: 'Next.js 15, Tauri v2, Gemini AI & Clean Table',
      icon: <Cpu size={18} />,
      color: '#a855f7',
      accentBg: 'rgba(168, 85, 247, 0.12)',
    },
    {
      key: 'projects',
      number: '04',
      name: 'Kho Demo & Mini ERP',
      tagline: 'Sản Phẩm May Đo',
      subtext: 'Hệ thống quản trị xưởng sản xuất trực tiếp',
      icon: <Package size={18} />,
      color: '#10b981',
      accentBg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      key: 'contact',
      number: '05',
      name: 'Hồ Vịt & Bến Thư Tín',
      tagline: 'Liên Hệ & Zalo',
      subtext: 'Zalo 0939 839 934 • Tư vấn & Hợp tác dự án',
      icon: <Send size={18} />,
      color: '#ec4899',
      accentBg: 'rgba(236, 72, 153, 0.12)',
    },
  ];

  const handleDuckClick = (duckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duckAudio.playDoubleQuack();
    setJumpingDuckId(duckId);
    setTimeout(() => setJumpingDuckId(null), 500);

    const randomQuote = duckQuotes[Math.floor(Math.random() * duckQuotes.length)];
    setActiveSpeech({ duckId, text: randomQuote });

    const newQuackCount = quackCount + 1;
    setQuackCount(newQuackCount);

    if (newQuackCount % 5 === 0) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.4 },
        colors: ['#fbbf24', '#38bdf8', '#10b981', '#f43f5e'],
      });
    }

    setTimeout(() => {
      setActiveSpeech((current) => (current?.duckId === duckId ? null : current));
    }, 4500);
  };

  const handleFeedDucks = (e: React.MouseEvent) => {
    e.stopPropagation();
    duckAudio.playFeedChime();
    const newFeedCount = feedCount + 1;
    setFeedCount(newFeedCount);

    // Drop grains at random grass spots
    const newGrains = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 65,
      y: 60 + Math.random() * 25,
    }));
    setGrains((prev) => [...prev.slice(-10), ...newGrains]);

    // Show floating hearts over nearby ducks
    const newHearts = ducks.slice(0, 3).map((d, i) => ({
      id: Date.now() + i,
      x: d.x,
      y: d.y - 6,
    }));
    setHearts((prev) => [...prev.slice(-6), ...newHearts]);

    // Clean up grains and hearts after delay
    setTimeout(() => {
      setGrains((prev) => prev.slice(newGrains.length));
      setHearts((prev) => prev.slice(newHearts.length));
    }, 3000);

    // Cute duck reactions
    setJumpingDuckId('duck-chief');
    setTimeout(() => setJumpingDuckId('duck-baby'), 200);
    setTimeout(() => setJumpingDuckId(null), 600);
  };

  const handleToggleSound = () => {
    const muted = duckAudio.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      duckAudio.playQuack();
    }
  };

  const handleStationClick = (tab: TabKey) => {
    duckAudio.playJumpSound();
    onSelectStation(tab);

    // Smooth scroll down to content area with slight offset for navbar
    const contentTarget = document.getElementById('farm-station-content');
    if (contentTarget) {
      contentTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section 
      style={{ 
        position: 'relative', 
        paddingBottom: '24px', 
        overflow: 'hidden',
        borderBottom: '1px solid var(--border-subtle)',
      }}
      className={isNight ? 'farm-night' : 'farm-day'}
    >
      {/* Top Banner & Interactive Bar */}
      <div className="container" style={{ paddingTop: '20px', paddingBottom: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          {/* Farm Title & Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isNight ? '#1e293b' : '#fef3c7',
                border: isNight ? '1px solid #334155' : '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                animation: 'duckWaddle 3s infinite ease-in-out',
              }}
              onClick={(e) => handleDuckClick('duck-chief', e)}
              title="Nhấp vào để nghe tiếng Quác!"
            >
              🦆
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  Nông Trại Vịt Tôn Đông Vũ
                </h1>
                <span 
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="pulse-indicator" style={{ width: '6px', height: '6px' }}></span>
                  Đang mở cửa
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: isNight ? '#94a3b8' : '#cbd5e1' }}>
                Khám phá ngôi nhà &amp; các trạm vận hành của The Duck. Nhấp vào công trình để đến từng trang!
              </p>
            </div>
          </div>

          {/* Interactive Controls Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Feed Ducks Button */}
            <button
              onClick={handleFeedDucks}
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '8px',
                background: isNight ? 'rgba(30, 41, 59, 0.8)' : 'rgba(254, 243, 199, 0.15)',
                borderColor: '#f59e0b',
                color: '#fbbf24',
              }}
              title="Rải bắp cho đàn vịt ăn"
            >
              <Wheat size={14} color="#f59e0b" />
              <span>Cho Vịt Ăn 🌾 ({feedCount})</span>
            </button>

            {/* Quack Counter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                padding: '6px 10px',
                borderRadius: '8px',
                background: isNight ? '#0f172a' : 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: '#38bdf8',
                fontWeight: 600,
              }}
              title="Tổng số tiếng Quác đã kích hoạt"
            >
              <span>🦆</span>
              <span>{quackCount} Quacks</span>
            </div>

            {/* Day / Night Toggle */}
            <button
              onClick={() => setIsNight(!isNight)}
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.78rem',
                borderRadius: '8px',
                background: isNight ? '#1e293b' : 'rgba(255, 255, 255, 0.08)',
              }}
              title={isNight ? "Chuyển sang Ban Ngày" : "Chuyển sang Ban Đêm"}
            >
              {isNight ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#38bdf8" />}
              <span>{isNight ? 'Ban Ngày' : 'Ban Đêm'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.78rem',
                borderRadius: '8px',
                background: isNight ? '#1e293b' : 'rgba(255, 255, 255, 0.08)',
              }}
              title={isMuted ? "Bật âm thanh quác" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX size={14} color="#94a3b8" /> : <Volume2 size={14} color="#34d399" />}
              <span>{isMuted ? 'Tắt Quác' : 'Bật Quác'}</span>
            </button>

            {/* Collapse / Expand Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.78rem',
                borderRadius: '8px',
              }}
              title={isExpanded ? "Thu gọn bản đồ" : "Mở rộng bản đồ nông trại"}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{isExpanded ? 'Thu Gọn' : 'Mở Bản Đồ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Animated Visual Farm Scene */}
      {isExpanded && (
        <div className="container" style={{ position: 'relative', marginTop: '6px', marginBottom: '16px' }}>
          <div 
            style={{
              position: 'relative',
              width: '100%',
              height: '380px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
              border: isNight ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(245, 158, 11, 0.3)',
              userSelect: 'none',
            }}
          >
            {/* SVG Interactive Farm Canvas */}
            <svg 
              viewBox="0 0 1000 400" 
              style={{ width: '100%', height: '100%', display: 'block' }}
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {/* Sky gradients */}
                <linearGradient id="skyDay" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="65%" stopColor="#bae6fd" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>

                <linearGradient id="skyNight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="50%" stopColor="#0c192c" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Hills & Grass gradients */}
                <linearGradient id="hillBackDay" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>

                <linearGradient id="hillBackNight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#143e26" />
                  <stop offset="100%" stopColor="#0b2416" />
                </linearGradient>

                <linearGradient id="hillFrontDay" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#86efac" />
                  <stop offset="60%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#166534" />
                </linearGradient>

                <linearGradient id="hillFrontNight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#19482d" />
                  <stop offset="60%" stopColor="#0f301d" />
                  <stop offset="100%" stopColor="#081c11" />
                </linearGradient>

                {/* Pond water gradient */}
                <linearGradient id="pondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>

                {/* Cobblestone trail */}
                <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.7" />
                </linearGradient>

                {/* Filter for glowing lights at night */}
                <filter id="nightGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Sky background */}
              <rect width="1000" height="400" fill={isNight ? 'url(#skyNight)' : 'url(#skyDay)'} />

              {/* Day: Sun & Fluffy Clouds / Night: Moon & Stars */}
              {!isNight ? (
                <g>
                  {/* Golden Sun with soft aura */}
                  <circle cx="160" cy="70" r="42" fill="#fbbf24" opacity="0.9" />
                  <circle cx="160" cy="70" r="58" fill="#fef08a" opacity="0.3" />
                  <circle cx="160" cy="70" r="80" fill="#fef08a" opacity="0.12" />

                  {/* Birds flying */}
                  <path d="M 280 60 Q 288 52 296 60 Q 304 52 312 60" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 330 75 Q 336 68 342 75 Q 348 68 354 75" fill="none" stroke="#0284c7" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />

                  {/* Floating Clouds */}
                  <g opacity="0.85" style={{ animation: 'duckFloat 12s infinite ease-in-out' }}>
                    <path d="M 450 70 q 20 -25 45 -10 q 25 -30 60 -15 q 35 -15 50 15 q 30 5 30 30 q -10 25 -40 25 l -130 0 q -25 -5 -25 -25 q 0 -15 10 -20 z" fill="#ffffff" />
                  </g>
                  <g opacity="0.75" style={{ animation: 'duckFloat 15s infinite ease-in-out', animationDelay: '-6s' }}>
                    <path d="M 720 85 q 15 -18 35 -8 q 20 -20 45 -10 q 25 -10 38 12 q 20 4 20 22 q -8 18 -30 18 l -95 0 q -18 -4 -18 -18 q 0 -10 5 -16 z" fill="#ffffff" />
                  </g>
                </g>
              ) : (
                <g>
                  {/* Crescent / Glowing Moon */}
                  <circle cx="150" cy="70" r="32" fill="#fef08a" filter="url(#nightGlow)" />
                  <circle cx="162" cy="62" r="26" fill="#0c192c" />

                  {/* Twinkling Stars */}
                  {[[240, 45], [320, 80], [420, 35], [510, 75], [630, 40], [750, 65], [840, 30], [920, 85], [100, 110], [580, 110]].map(([sx, sy], idx) => (
                    <circle 
                      key={idx} 
                      cx={sx} 
                      cy={sy} 
                      r={idx % 2 === 0 ? 2 : 1.4} 
                      fill="#ffffff" 
                      opacity={0.5 + (idx % 4) * 0.15} 
                      style={{ animation: `fireflyGlow ${2 + (idx % 3)}s infinite ease-in-out`, animationDelay: `${idx * 0.3}s` }}
                    />
                  ))}
                </g>
              )}

              {/* Background Rolling Hills */}
              <path 
                d="M 0 230 Q 250 150 500 210 T 1000 190 L 1000 400 L 0 400 Z" 
                fill={isNight ? 'url(#hillBackNight)' : 'url(#hillBackDay)'} 
              />

              {/* Foreground Rolling Hills & Pastures */}
              <path 
                d="M 0 260 Q 220 220 480 270 Q 750 210 1000 250 L 1000 400 L 0 400 Z" 
                fill={isNight ? 'url(#hillFrontNight)' : 'url(#hillFrontDay)'} 
              />

              {/* Winding Cobblestone / Dirt Trail connecting the 5 stations */}
              <path 
                d="M 0 350 Q 150 360 220 320 T 380 320 T 560 310 T 730 320 Q 860 330 1000 370" 
                fill="none" 
                stroke="#d97706" 
                strokeWidth="28" 
                strokeLinecap="round" 
                opacity={isNight ? 0.35 : 0.65} 
              />
              <path 
                d="M 0 350 Q 150 360 220 320 T 380 320 T 560 310 T 730 320 Q 860 330 1000 370" 
                fill="none" 
                stroke="#fde68a" 
                strokeWidth="18" 
                strokeDasharray="6 14" 
                strokeLinecap="round" 
                opacity={isNight ? 0.25 : 0.8} 
              />

              {/* Wooden Fences along pasture */}
              <g opacity={isNight ? 0.4 : 0.85}>
                {[60, 110, 160, 480, 520, 560, 680, 720].map((fx, i) => (
                  <g key={i}>
                    <rect x={fx} y="275" width="6" height="30" rx="2" fill="#78350f" />
                    {i % 2 === 0 && <rect x={fx} y="282" width="55" height="4" fill="#92400e" />}
                    {i % 2 === 0 && <rect x={fx} y="294" width="55" height="4" fill="#92400e" />}
                  </g>
                ))}
              </g>

              {/* ======================================================== */}
              {/* STATION 1: NHÀ CHÍNH CỦA VỊT (Overview / About) */}
              {/* ======================================================== */}
              <g 
                className="duck-clickable"
                onClick={() => handleStationClick('overview')}
                onMouseEnter={() => setHoveredStation('overview')}
                onMouseLeave={() => setHoveredStation(null)}
                transform="translate(140, 180)"
              >
                {/* Highlight Halo when active/hovered */}
                {(activeTab === 'overview' || hoveredStation === 'overview') && (
                  <ellipse cx="65" cy="115" rx="85" ry="30" fill="#f59e0b" opacity="0.35" filter="url(#nightGlow)" />
                )}

                {/* Chimney with animated smoke */}
                <rect x="22" y="15" width="16" height="32" fill="#991b1b" />
                <rect x="20" y="12" width="20" height="5" fill="#7f1d1d" />
                {/* Smoke puffs */}
                <circle cx="30" cy="5" r="7" fill="#e2e8f0" opacity="0.8" style={{ animation: 'smokeRise 3s infinite ease-out' }} />
                <circle cx="34" cy="-10" r="10" fill="#cbd5e1" opacity="0.6" style={{ animation: 'smokeRise 3s infinite ease-out', animationDelay: '1.2s' }} />

                {/* Barn House Body */}
                <path d="M 15 50 L 65 15 L 115 50 L 115 120 L 15 120 Z" fill="#b91c1c" />
                <polygon points="10,50 65,10 120,50" fill="#7f1d1d" stroke="#fef08a" strokeWidth="2" />
                
                {/* Barn White cross trims */}
                <path d="M 25 58 L 105 115" stroke="#f8fafc" strokeWidth="2.5" opacity="0.7" />
                <path d="M 105 58 L 25 115" stroke="#f8fafc" strokeWidth="2.5" opacity="0.7" />
                <rect x="25" y="58" width="80" height="57" fill="none" stroke="#f8fafc" strokeWidth="2.5" opacity="0.7" />

                {/* Roof Weather Vane with spinning duck */}
                <line x1="65" y1="10" x2="65" y2="-6" stroke="#fbbf24" strokeWidth="2.5" />
                <g transform="translate(65, -8)">
                  <polygon points="-8,-4 0,0 -8,4" fill="#fbbf24" />
                  <circle cx="2" cy="0" r="4" fill="#f59e0b" />
                  <ellipse cx="6" cy="2" rx="4" ry="2.5" fill="#fbbf24" />
                </g>

                {/* Cozy Glowing Window */}
                <rect x="48" y="32" width="34" height="24" rx="4" fill={isNight ? "#fbbf24" : "#fef08a"} stroke="#78350f" strokeWidth="2" filter={isNight ? "url(#nightGlow)" : undefined} />
                <line x1="65" y1="32" x2="65" y2="56" stroke="#78350f" strokeWidth="1.5" />
                <line x1="48" y1="44" x2="82" y2="44" stroke="#78350f" strokeWidth="1.5" />

                {/* Door & Entrance */}
                <rect x="52" y="80" width="26" height="40" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="2" />
                <circle cx="73" cy="102" r="2.5" fill="#fbbf24" />

                {/* Station Label Sign */}
                <g transform="translate(65, 138)">
                  <rect x="-60" y="-12" width="120" height="24" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontWeight="700" fontFamily="var(--font-display)">
                    🏡 01. NHÀ CHÍNH VỊT
                  </text>
                </g>
              </g>

              {/* ======================================================== */}
              {/* STATION 2: XƯỞNG SẢN XUẤT VÀ MÁY IN (Experience / MES) */}
              {/* ======================================================== */}
              <g 
                className="duck-clickable"
                onClick={() => handleStationClick('experience')}
                onMouseEnter={() => setHoveredStation('experience')}
                onMouseLeave={() => setHoveredStation(null)}
                transform="translate(340, 160)"
              >
                {/* Halo */}
                {(activeTab === 'experience' || hoveredStation === 'experience') && (
                  <ellipse cx="75" cy="135" rx="90" ry="32" fill="#38bdf8" opacity="0.35" filter="url(#nightGlow)" />
                )}

                {/* Factory Industrial Brick Stack */}
                <rect x="110" y="10" width="22" height="60" fill="#78350f" />
                <rect x="108" y="8" width="26" height="6" fill="#451a03" />
                <circle cx="121" cy="0" r="9" fill="#94a3b8" opacity="0.75" style={{ animation: 'smokeRise 2.5s infinite ease-out' }} />

                {/* Sawtooth Factory Roof & Wall */}
                <path d="M 10 70 L 45 40 L 45 70 L 80 40 L 80 70 L 115 40 L 115 140 L 10 140 Z" fill="#334155" stroke="#1e293b" strokeWidth="2" />
                
                {/* Rotating Engineering Gear */}
                <g transform="translate(65, 85)" style={{ transformOrigin: '65px 85px', animation: 'cogSpin 8s infinite linear' }}>
                  <circle cx="0" cy="0" r="14" fill="#64748b" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="0" cy="0" r="5" fill="#1e293b" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <rect key={deg} x="-3" y="-18" width="6" height="5" fill="#38bdf8" transform={`rotate(${deg})`} />
                  ))}
                </g>

                {/* Factory Windows with cyan glow */}
                <rect x="22" y="90" width="26" height="18" rx="2" fill={isNight ? "#0284c7" : "#38bdf8"} opacity="0.85" />
                <rect x="90" y="90" width="20" height="35" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />

                {/* Stack of Carton & Label Rolls outside factory */}
                <rect x="122" y="118" width="16" height="14" rx="1" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                <rect x="132" y="108" width="14" height="12" rx="1" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                <ellipse cx="145" cy="130" rx="8" ry="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />

                {/* Station Label Sign */}
                <g transform="translate(75, 158)">
                  <rect x="-65" y="-12" width="130" height="24" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontWeight="700" fontFamily="var(--font-display)">
                    🏭 02. XƯỞNG SẢN XUẤT
                  </text>
                </g>
              </g>

              {/* ======================================================== */}
              {/* STATION 3: PHÒNG LAB CÔNG NGHỆ & AI (Skills / Tech Stack) */}
              {/* ======================================================== */}
              <g 
                className="duck-clickable"
                onClick={() => handleStationClick('skills')}
                onMouseEnter={() => setHoveredStation('skills')}
                onMouseLeave={() => setHoveredStation(null)}
                transform="translate(530, 160)"
              >
                {/* Halo */}
                {(activeTab === 'skills' || hoveredStation === 'skills') && (
                  <ellipse cx="65" cy="135" rx="85" ry="32" fill="#a855f7" opacity="0.35" filter="url(#nightGlow)" />
                )}

                {/* Antenna with Pulsing AI Waves */}
                <line x1="65" y1="20" x2="65" y2="45" stroke="#a855f7" strokeWidth="2.5" />
                <circle cx="65" cy="18" r="4" fill="#c084fc" />
                <circle cx="65" cy="18" r="12" fill="none" stroke="#a855f7" strokeWidth="1.5" style={{ animation: 'signalPulse 2s infinite ease-out' }} />
                <circle cx="65" cy="18" r="22" fill="none" stroke="#c084fc" strokeWidth="1.5" style={{ animation: 'signalPulse 2s infinite ease-out', animationDelay: '0.8s' }} />

                {/* Futuristic Tech Dome / Lab Building */}
                <path d="M 20 135 L 20 65 Q 65 35 110 65 L 110 135 Z" fill="#1e1b4b" stroke="#a855f7" strokeWidth="2" />
                
                {/* Solar Panel Rooftop Grid */}
                <polygon points="35,62 65,46 95,62" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />

                {/* Holographic Glowing Code Screen */}
                <rect x="35" y="75" width="60" height="34" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
                <text x="42" y="88" fill="#38bdf8" fontSize="6.5" fontFamily="var(--font-mono)">Next.js 15</text>
                <text x="42" y="97" fill="#a855f7" fontSize="6.5" fontFamily="var(--font-mono)">Tauri v2 ⚡</text>
                <text x="42" y="105" fill="#34d399" fontSize="6.5" fontFamily="var(--font-mono)">Gemini AI ✨</text>

                {/* Neon Cyan Circuit Traces */}
                <path d="M 28 115 L 42 115 L 48 128 L 85 128" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
                <circle cx="85" cy="128" r="2" fill="#38bdf8" />

                {/* Station Label Sign */}
                <g transform="translate(65, 158)">
                  <rect x="-65" y="-12" width="130" height="24" rx="6" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontWeight="700" fontFamily="var(--font-display)">
                    ⚡ 03. PHÒNG LAB TECH &amp; AI
                  </text>
                </g>
              </g>

              {/* ======================================================== */}
              {/* STATION 4: KHO DEMO VÀ MINI ERP (Projects / Live Demo) */}
              {/* ======================================================== */}
              <g 
                className="duck-clickable"
                onClick={() => handleStationClick('projects')}
                onMouseEnter={() => setHoveredStation('projects')}
                onMouseLeave={() => setHoveredStation(null)}
                transform="translate(710, 170)"
              >
                {/* Halo */}
                {(activeTab === 'projects' || hoveredStation === 'projects') && (
                  <ellipse cx="65" cy="125" rx="85" ry="32" fill="#10b981" opacity="0.35" filter="url(#nightGlow)" />
                )}

                {/* Modern Warehouse Body */}
                <path d="M 10 45 L 65 25 L 120 45 L 120 125 L 10 125 Z" fill="#064e3b" stroke="#059669" strokeWidth="2" />
                <polygon points="8,45 65,22 122,45" fill="#047857" />

                {/* Large Logistics Loading Bay */}
                <rect x="25" y="65" width="55" height="60" rx="3" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                {/* Shutter lines */}
                {[75, 85, 95, 105, 115].map((sy) => (
                  <line key={sy} x1="25" y1={sy} x2="80" y2={sy} stroke="#334155" strokeWidth="1" />
                ))}

                {/* Mini ERP Dashboard Interactive Screen */}
                <rect x="32" y="72" width="40" height="28" rx="2" fill="#022c22" stroke="#34d399" strokeWidth="1.2" />
                <circle cx="37" cy="78" r="2" fill="#34d399" />
                <rect x="42" y="76" width="24" height="4" rx="1" fill="#6ee7b7" />
                <rect x="37" y="84" width="30" height="3" rx="1" fill="#34d399" opacity="0.7" />
                <rect x="37" y="90" width="20" height="3" rx="1" fill="#34d399" opacity="0.7" />

                {/* Pallet with barcode packages */}
                <rect x="90" y="95" width="24" height="8" fill="#d97706" />
                <rect x="92" y="82" width="20" height="14" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                <line x1="96" y1="88" x2="108" y2="88" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="1 2" />

                {/* Station Label Sign */}
                <g transform="translate(65, 148)">
                  <rect x="-65" y="-12" width="130" height="24" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontWeight="700" fontFamily="var(--font-display)">
                    📦 04. KHO DEMO &amp; ERP
                  </text>
                </g>
              </g>

              {/* ======================================================== */}
              {/* STATION 5: HỒ VỊT VÀ BẾN THƯ TÍN (Contact / Zalo) */}
              {/* ======================================================== */}
              <g 
                className="duck-clickable"
                onClick={() => handleStationClick('contact')}
                onMouseEnter={() => setHoveredStation('contact')}
                onMouseLeave={() => setHoveredStation(null)}
                transform="translate(850, 190)"
              >
                {/* Halo */}
                {(activeTab === 'contact' || hoveredStation === 'contact') && (
                  <ellipse cx="60" cy="100" rx="75" ry="40" fill="#ec4899" opacity="0.35" filter="url(#nightGlow)" />
                )}

                {/* Duck Pond (Water Body) */}
                <ellipse cx="60" cy="85" rx="75" ry="38" fill="url(#pondGrad)" stroke="#38bdf8" strokeWidth="2" />
                
                {/* Water Ripples */}
                <ellipse cx="45" cy="80" rx="20" ry="8" fill="none" stroke="#bae6fd" strokeWidth="1.2" opacity="0.6" style={{ animation: 'duckFloat 4s infinite ease-in-out' }} />
                <ellipse cx="85" cy="90" rx="16" ry="6" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.5" style={{ animation: 'duckFloat 5s infinite ease-in-out', animationDelay: '-2s' }} />

                {/* Water Lily Pad */}
                <ellipse cx="25" cy="92" rx="12" ry="5" fill="#15803d" />
                <circle cx="28" cy="90" r="3" fill="#f472b6" />

                {/* Wooden Pier / Dock */}
                <polygon points="50,45 80,45 76,75 46,75" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
                {/* Dock planks */}
                <line x1="50" y1="52" x2="79" y2="52" stroke="#78350f" strokeWidth="1.5" />
                <line x1="49" y1="60" x2="78" y2="60" stroke="#78350f" strokeWidth="1.5" />
                <line x1="48" y1="68" x2="77" y2="68" stroke="#78350f" strokeWidth="1.5" />

                {/* Red Mailbox on Pier */}
                <rect x="62" y="24" width="4" height="22" fill="#64748b" />
                <rect x="54" y="10" width="20" height="15" rx="5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
                {/* Raised yellow mail flag */}
                <polygon points="74,12 82,12 80,18 74,16" fill="#fbbf24" />

                {/* Station Label Sign */}
                <g transform="translate(60, 138)">
                  <rect x="-65" y="-12" width="130" height="24" rx="6" fill="#1e293b" stroke="#ec4899" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontWeight="700" fontFamily="var(--font-display)">
                    🌊 05. BẾN THƯ TÍN &amp; ZALO
                  </text>
                </g>
              </g>

              {/* Falling grain seeds from "Cho Vịt Ăn" */}
              {grains.map((g) => (
                <g key={g.id} transform={`translate(${g.x * 10}, ${g.y * 4})`} style={{ animation: 'grainFall 0.8s ease-in forwards' }}>
                  <circle cx="0" cy="0" r="3" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
                  <circle cx="4" cy="3" r="2.5" fill="#fbbf24" />
                </g>
              ))}

              {/* Floating Hearts from Happy Ducks */}
              {hearts.map((h) => (
                <g key={h.id} transform={`translate(${h.x * 10}, ${h.y * 4})`} style={{ animation: 'floatHeart 1.8s ease-out forwards' }}>
                  <text x="0" y="0" textAnchor="middle" fontSize="18" fill="#f43f5e">❤️</text>
                </g>
              ))}

              {/* ======================================================== */}
              {/* THE LIVING DUCKS (Interactive SVG Characters) */}
              {/* ======================================================== */}
              {ducks.map((duck) => {
                const isJumping = jumpingDuckId === duck.id;
                const hasSpeech = activeSpeech?.duckId === duck.id;

                return (
                  <g 
                    key={duck.id}
                    className="duck-clickable"
                    transform={`translate(${duck.x * 10}, ${duck.y * 4}) scale(${duck.scale})`}
                    onClick={(e) => handleDuckClick(duck.id, e)}
                    style={{
                      transformOrigin: 'center bottom',
                      animation: isJumping 
                        ? 'duckJump 0.5s ease-out' 
                        : duck.isSwimming 
                          ? 'duckFloat 3s infinite ease-in-out' 
                          : 'duckWaddle 2.5s infinite ease-in-out',
                      animationDelay: `${duck.id === 'duck-chief' ? 0 : 0.8}s`
                    }}
                  >
                    {/* Ripple under swimming duck */}
                    {duck.isSwimming && (
                      <ellipse cx="0" cy="12" rx="18" ry="6" fill="none" stroke="#bae6fd" strokeWidth="1.5" opacity="0.7" />
                    )}

                    {/* Duck Shadow on grass if walking */}
                    {!duck.isSwimming && (
                      <ellipse cx="0" cy="14" rx="14" ry="4" fill="rgba(0,0,0,0.25)" />
                    )}

                    {/* Duck Body */}
                    <g transform={duck.facing === 'left' ? 'scale(-1, 1)' : undefined}>
                      {/* Tail feathers */}
                      <path d="M -12 2 Q -20 0 -18 7 Q -14 10 -8 8 Z" fill="#f59e0b" />
                      
                      {/* Body Ellipse */}
                      <ellipse cx="0" cy="4" rx="15" ry="11" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                      {/* Wing */}
                      <ellipse cx="-2" cy="4" rx="9" ry="6" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />

                      {/* Head */}
                      <circle cx="10" cy="-6" r="9" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                      {/* Eye */}
                      <circle cx="13" cy="-8" r="2" fill="#0f172a" />
                      <circle cx="13.5" cy="-8.5" r="0.8" fill="#ffffff" />
                      
                      {/* Beak / Bill */}
                      <polygon points="17,-6 26,-4 17,-1" fill="#f97316" stroke="#c2410c" strokeWidth="1" />

                      {/* Duck Accessories depending on role */}
                      {duck.id === 'duck-chief' && (
                        // Farmer Hat
                        <g transform="translate(10, -15)">
                          <ellipse cx="0" cy="0" rx="12" ry="3" fill="#78350f" />
                          <rect x="-6" y="-6" width="12" height="6" rx="2" fill="#92400e" />
                          <rect x="-6" y="-2" width="12" height="2" fill="#f59e0b" />
                        </g>
                      )}

                      {duck.id === 'duck-mechanic' && (
                        // Yellow Safety Hard Hat & Wrench
                        <g transform="translate(10, -15)">
                          <ellipse cx="0" cy="1" rx="10" ry="4" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                          <path d="M -7 1 Q 0 -6 7 1 Z" fill="#facc15" />
                        </g>
                      )}

                      {duck.id === 'duck-coder' && (
                        // Cyber Glowing Cyan Goggles
                        <g transform="translate(12, -7)">
                          <rect x="-4" y="-3" width="9" height="5" rx="1.5" fill="#38bdf8" opacity="0.9" stroke="#0284c7" strokeWidth="1" />
                          <line x1="-7" y1="-1" x2="-4" y2="-1" stroke="#0284c7" strokeWidth="1" />
                        </g>
                      )}

                      {/* Orange feet if not in water */}
                      {!duck.isSwimming && (
                        <g>
                          <polygon points="-4,14 0,14 -2,17" fill="#f97316" />
                          <polygon points="4,14 8,14 6,17" fill="#f97316" />
                        </g>
                      )}
                    </g>

                    {/* Speech Bubble */}
                    {hasSpeech && (
                      <g 
                        className="speech-bubble"
                        transform="translate(0, -38)"
                      >
                        <rect 
                          x="-100" 
                          y="-32" 
                          width="200" 
                          height="36" 
                          rx="8" 
                          fill="#0f172a" 
                          stroke="#fbbf24" 
                          strokeWidth="2" 
                          filter="url(#nightGlow)"
                        />
                        <polygon points="-6,4 6,4 0,10" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                        <text 
                          x="0" 
                          y="-16" 
                          textAnchor="middle" 
                          fill="#fef08a" 
                          fontSize="8.5" 
                          fontWeight="700" 
                          fontFamily="var(--font-display)"
                        >
                          {activeSpeech.text.length > 40 ? activeSpeech.text.slice(0, 38) + '...' : activeSpeech.text}
                        </text>
                        <text 
                          x="0" 
                          y="-6" 
                          textAnchor="middle" 
                          fill="#94a3b8" 
                          fontSize="7" 
                          fontFamily="var(--font-mono)"
                        >
                          — {duck.name} ({duck.role})
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Interactive 5 Station Quick-Jump Cards Bar */}
      <div className="container" id="farm-station-content">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
        }}>
          {stations.map((st) => {
            const isActive = activeTab === st.key;
            const isHovered = hoveredStation === st.key;

            return (
              <div
                key={st.key}
                onClick={() => handleStationClick(st.key)}
                onMouseEnter={() => setHoveredStation(st.key)}
                onMouseLeave={() => setHoveredStation(null)}
                className={`farm-station-card ${isActive ? 'farm-station-active' : ''}`}
                style={{
                  background: isActive ? '#131f37' : '#0f172a',
                  border: isActive ? `2px solid ${st.color}` : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                {/* Active glow corner */}
                {isActive && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '60px',
                      height: '60px',
                      background: `radial-gradient(circle at top right, ${st.color} 0%, transparent 70%)`,
                      opacity: 0.35,
                      pointerEvents: 'none',
                    }} 
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: st.accentBg,
                    color: st.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {st.icon}
                  </div>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: isActive ? st.color : 'var(--text-muted)' 
                  }}>
                    TRẠM {st.number}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc', marginBottom: '2px' }}>
                  {st.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: st.color, fontWeight: 600, marginBottom: '6px' }}>
                  {st.tagline}
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {st.subtext}
                </p>

                {/* Visual action cue */}
                <div style={{ 
                  marginTop: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '0.72rem', 
                  fontWeight: 600,
                  color: isActive ? st.color : 'var(--text-muted)',
                }}>
                  <span>{isActive ? '● Đang xem trạm này' : 'Khám phá ngay'}</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
