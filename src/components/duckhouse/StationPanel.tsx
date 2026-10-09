'use client';

import React from 'react';
import Link from 'next/link';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { getStation, STATION_ORDER, type StationKey } from './stations';
import styles from './DuckHouse.module.css';

const { personal, skills, projects } = PORTFOLIO_DATA;

const CAREER = [
  { n: '01', period: '3 năm đầu', role: 'Quản lý kho & vật tư', desc: 'Kỷ luật số liệu, định mức BOM, tồn kho và dòng chảy hàng hóa.' },
  { n: '02', period: 'Kỹ thuật', role: 'Thiết kế & kỹ thuật in', desc: 'Bao bì nhựa, carton, tem nhãn — bình trang, xử lý file, trục in.' },
  { n: '03', period: 'Quản trị', role: 'Điều hành sản xuất', desc: 'Đơn hàng → NVL → lệnh SX → máy móc, QA/QC → giao hàng.' },
  { n: '04', period: 'Hiện tại', role: 'Kiến trúc phần mềm & Mini ERP', desc: 'Thay Excel rời rạc bằng công cụ may đo, sát thực tế xưởng.' },
];

const CORE_SERVICES = [
  {
    icon: '🏷️',
    title: 'Tư Vấn & Cung Cấp Tem Nhãn',
    desc: 'Tem cuộn dán máy, bế demi, decal xi bạc, vỡ, hologram, keo đông lạnh & chịu nhiệt.',
  },
  {
    icon: '🎨',
    title: 'Đào Tạo Thiết Kế Kỹ Thuật In',
    desc: 'Trapping chống lé, Overprint, chuẩn màu Pantone/CMYK, bù co giãn trục in Flexo.',
  },
  {
    icon: '🎞️',
    title: 'Đào Tạo Xuất Film Chế Bản',
    desc: 'Bình trang Preps/Signa, làm chủ RIP xưởng in, bù trừ dot gain, tram AM/FM chống moiré.',
  },
  {
    icon: '💻',
    title: 'Phát Triển Mini ERP Theo Yêu Cầu',
    desc: 'Báo giá tem tự động 3s, BOM định mức xưởng, theo dõi tiến độ công đoạn realtime.',
  },
];

function Overview() {
  return (
    <div className={styles.col} style={{ gap: '14px' }}>
      <div className={styles.profile}>
        <div className={styles.avatar}>🦆</div>
        <div>
          <div className={styles.profileName}>{personal.fullName}</div>
          <div className={styles.muted}>The Duck · Đồng Nai, Việt Nam</div>
          <span className={styles.statusPill}>
            <span className={styles.dot} /> {personal.status}
          </span>
        </div>
      </div>

      <p className={styles.lead} style={{ color: '#0284c7' }}>{personal.title}</p>
      
      <p className={styles.body}>
        {personal.shortBio}
      </p>

      {/* 4 Mũi nhọn cốt lõi */}
      <div>
        <div className={styles.sectionTitle} style={{ marginBottom: '8px' }}>
          4 Mũi Nhọn Cốt Lõi
        </div>
        <div className={styles.timeline}>
          {CORE_SERVICES.map((srv) => (
            <div key={srv.title} className={styles.card} style={{ borderLeft: '3px solid #f59e0b', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.15rem' }}>{srv.icon}</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                  {srv.title}
                </span>
              </div>
              <div className={styles.cardDesc} style={{ fontSize: '0.74rem', marginTop: '3px' }}>
                {srv.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chỉ số uy tín */}
      <div className={styles.metrics}>
        {personal.metrics.map((m) => (
          <div key={m.label} className={styles.metric}>
            <div className={styles.metricValue}>{m.value}</div>
            <div className={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Triết lý làm việc */}
      <div>
        <div className={styles.sectionTitle} style={{ marginBottom: '6px' }}>
          Triết lý làm việc
        </div>
        <div className={styles.steps}>
          {personal.story.philosophy.threePrinciples.map((p) => (
            <div key={p.step} className={styles.step}>
              <span className={styles.stepNum}>{p.step}</span>
              <span>{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      <blockquote className={styles.quote}>
        “{personal.story.philosophy.mainQuote}”
      </blockquote>
    </div>
  );
}

function Experience() {
  return (
    <div className={styles.col}>
      <p className={styles.body}>
        Hành trình đi từ kho bãi, xưởng in đến bàn quản trị — nhìn doanh nghiệp từ toàn bộ chuỗi
        vận hành chứ không chỉ một công đoạn.
      </p>
      <div className={styles.timeline}>
        {CAREER.map((c) => (
          <div key={c.n} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.stepNum}>{c.n}</span>
              <span className={styles.eyebrowSmall}>{c.period}</span>
            </div>
            <div className={styles.cardTitle}>{c.role}</div>
            <div className={styles.cardDesc}>{c.desc}</div>
          </div>
        ))}
      </div>
      <div className={styles.chips}>
        {['Bao bì nhựa', 'Bao bì carton', 'Tem nhãn', 'Kho vận & BOM', 'MES / ERP', 'Tính giá & báo giá'].map((t) => (
          <span key={t} className={styles.chip}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function Skills() {
  return (
    <div className={styles.grid2}>
      {skills.map((g) => (
        <div key={g.group} className={styles.card}>
          <div className={styles.cardTitle}>{g.group}</div>
          <div className={styles.chips}>
            {g.items.map((it) => (
              <span key={it.name} className={styles.chip} title={it.desc}>
                {it.name}
                <em className={styles.level}>{it.level}</em>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Projects() {
  return (
    <div className={styles.col}>
      <div className={styles.grid3}>
        {projects.map((p) => (
          <div key={p.id} className={styles.card}>
            {p.badge && <span className={styles.badge}>{p.badge}</span>}
            <div className={styles.cardTitle}>{p.title}</div>
            <div className={`${styles.cardDesc} ${styles.clamp3}`}>{p.description}</div>
            <div className={styles.chips}>
              {p.technologies.slice(0, 4).map((t) => (
                <span key={t} className={styles.chipSm}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.ctaRow}>
        <Link href="/demo/mini-erp" className={styles.btnPrimary}>
          ▶ Mở Live Demo Mini ERP
        </Link>
        <span className={styles.muted}>Tải &lt; 0.3s · Tiết kiệm 60% thời gian nhập liệu</span>
      </div>
    </div>
  );
}

function Contact() {
  const c = personal.contact;
  return (
    <div className={styles.grid2}>
      <div className={styles.col}>
        <blockquote className={styles.quoteBig}>
          “Giá mà có một phần mềm làm được việc này…” — có thể đó chính là thứ tôi giúp bạn xây
          dựng.
        </blockquote>
        <p className={styles.body}>
          Hợp tác cùng doanh nghiệp in ấn, tem nhãn, bao bì & sản xuất đang có quy trình thủ công
          hoặc dữ liệu phân tán.
        </p>
        <div className={styles.muted}>📍 {personal.location}</div>
      </div>
      <div className={styles.col}>
        <a href={c.zalo} target="_blank" rel="noopener noreferrer" className={styles.contactBtn} data-kind="zalo">
          <span className={styles.contactIcon}>💬</span>
          <span>
            <strong>Nhắn Zalo</strong>
            <small>{c.phone}</small>
          </span>
        </a>
        <a href={`tel:${c.phone.replace(/\s/g, '')}`} className={styles.contactBtn}>
          <span className={styles.contactIcon}>📞</span>
          <span>
            <strong>Gọi trực tiếp</strong>
            <small>{c.phone}</small>
          </span>
        </a>
        <a href={`mailto:${c.email}`} className={styles.contactBtn}>
          <span className={styles.contactIcon}>✉️</span>
          <span>
            <strong>Gửi email</strong>
            <small>{c.email}</small>
          </span>
        </a>
      </div>
    </div>
  );
}

const CONTENT: Record<StationKey, { title: string; render: () => React.ReactNode }> = {
  overview: { title: 'Xin chào, tôi là Vũ 👋', render: () => <Overview /> },
  experience: { title: '20 năm thực chiến sản xuất', render: () => <Experience /> },
  skills: { title: 'Bộ đồ nghề công nghệ', render: () => <Skills /> },
  projects: { title: 'Sản phẩm tiêu biểu', render: () => <Projects /> },
  contact: { title: 'Cùng giải bài toán của bạn', render: () => <Contact /> },
};

interface StationPanelProps {
  stationKey: StationKey;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
}

export default function StationPanel({ stationKey, onClose, onStep }: StationPanelProps) {
  const def = getStation(stationKey);
  const idx = STATION_ORDER.indexOf(stationKey);
  const prev = idx > 0 ? getStation(STATION_ORDER[idx - 1]) : null;
  const next = idx < STATION_ORDER.length - 1 ? getStation(STATION_ORDER[idx + 1]) : null;
  const content = CONTENT[stationKey];

  return (
    <div className={styles.sidePanelContainer}>
      <div className={styles.panelDismissArea} onClick={onClose} aria-label="Đóng bảng thông tin" />
      <section
        key={stationKey}
        className={styles.sidePanel}
        style={{ '--accent': def.color } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-title"
      >
        <header className={styles.panelHeader}>
          <div className={styles.panelBadge}>{def.emoji}</div>
          <div className={styles.panelHeading}>
            <div className={styles.eyebrow}>
              Góc {def.number} · {def.place}
            </div>
            <h2 id="station-title" className={styles.panelTitle}>{content.title}</h2>
          </div>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Đóng (Esc)">
            ✕
          </button>
        </header>

        <div className={styles.panelBody}>{content.render()}</div>

        <footer className={styles.panelFooter}>
          <button className={styles.navBtn} onClick={() => onStep(-1)} disabled={!prev}>
            ← {prev ? `${prev.emoji} ${prev.label}` : ''}
          </button>
          <div className={styles.dots}>
            {STATION_ORDER.map((k) => (
              <span key={k} className={`${styles.pip} ${k === stationKey ? styles.pipActive : ''}`} />
            ))}
          </div>
          <button className={styles.navBtn} onClick={() => onStep(1)} disabled={!next}>
            {next ? `${next.emoji} ${next.label}` : ''} →
          </button>
        </footer>
      </section>
    </div>
  );
}
