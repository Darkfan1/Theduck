'use client';

import React from 'react';
import Link from 'next/link';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  ArrowRight, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Layers, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

import { TabKey } from './Navbar';

export default function Hero({ onNavigateTab }: { onNavigateTab?: (tab: TabKey) => void }) {
  return (
    <section
      style={{
        position: 'relative',
        paddingTop: '150px',
        paddingBottom: '90px',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '48px',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Heading & CTAs */}
          <div>
            {/* Top Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div
                className="glass-pill"
                style={{
                  borderColor: 'rgba(0, 240, 255, 0.3)',
                  boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
                }}
              >
                <span className="pulse-indicator"></span>
                <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>{PORTFOLIO_DATA.personal.status}</span>
              </div>

              <div
                className="glass-pill"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Tôn Đông Vũ</span>
                <span style={{ color: 'var(--cyan-primary)' }}>•</span>
                <span>20+ Năm Ngành Sản Xuất &amp; In Ấn</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.18,
                marginBottom: '20px',
              }}
            >
              Tôn Đông Vũ —{' '}
              <span className="text-gradient">Giải Pháp Phần Mềm</span>{' '}
              Doanh Nghiệp &amp; Vận Hành Sản Xuất
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)',
                color: 'var(--text-light)',
                maxWidth: '640px',
                marginBottom: '36px',
                lineHeight: 1.6,
              }}
            >
              Hơn 20 năm đi từ sàn xưởng, kho bãi đến bàn quản trị điều hành trong ngành in ấn, bao bì &amp; tem nhãn. Kết hợp sâu sắc giữa thực tế sản xuất và công nghệ để xây dựng những công cụ tinh gọn, giải quyết đúng bài toán doanh nghiệp.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '44px' }}>
              <button
                onClick={() => onNavigateTab ? onNavigateTab('projects') : undefined}
                className="btn-primary"
              >
                <Sparkles size={18} />
                Trải nghiệm Demo Mini ERP
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => onNavigateTab ? onNavigateTab('contact') : undefined}
                className="btn-secondary"
              >
                Trao đổi dự án Freelance
              </button>
            </div>

            {/* Key Trust Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '16px',
                paddingTop: '24px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {PORTFOLIO_DATA.personal.metrics.map((m, idx) => (
                <div key={idx}>
                  <div
                    style={{
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      color: idx === 0 ? 'var(--cyan-primary)' : idx === 2 ? '#34d399' : 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {m.value}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Futuristic Interactive System HUD */}
          <div>
            <div
              className="glass-panel"
              style={{
                padding: '24px',
                border: '1px solid rgba(0, 240, 255, 0.25)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(0, 240, 255, 0.1)',
                position: 'relative',
              }}
            >
              {/* Header bar of the HUD */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
                  <span
                    style={{
                      marginLeft: '10px',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    theduck-engine // v2.6.0
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: 'var(--emerald-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <Activity size={14} />
                  <span>SYSTEM_HEALTHY</span>
                </div>
              </div>

              {/* Realtime KPI Grid inside HUD */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    background: 'rgba(10, 15, 26, 0.8)',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <Zap size={14} color="var(--cyan-primary)" />
                    <span>RENDER SPEED</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    &lt; 0.28s
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Next.js SSR + Edge Cache</div>
                </div>

                <div
                  style={{
                    background: 'rgba(10, 15, 26, 0.8)',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <Cpu size={14} color="#a855f7" />
                    <span>DESKTOP MEMORY</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    ~68 MB
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#a855f7' }}>Tauri v2 Native Rust</div>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div
                style={{
                  background: '#04060a',
                  borderRadius: '10px',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  lineHeight: '1.6',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ color: '#64748b' }}>// Enterprise Architecture Blueprint</div>
                <div>
                  <span style={{ color: '#f43f5e' }}>const</span> <span style={{ color: '#38bdf8' }}>theDuck</span> = <span style={{ color: '#f43f5e' }}>new</span> <span style={{ color: '#facc15' }}>Architect</span>({'{'}
                </div>
                <div style={{ paddingLeft: '16px' }}>
                  <span>realtimeCloud:</span> <span style={{ color: '#4ade80' }}>&quot;Firestore Optimized&quot;</span>,
                </div>
                <div style={{ paddingLeft: '16px' }}>
                  <span>tableRendering:</span> <span style={{ color: '#4ade80' }}>&quot;Clean Table Rule&quot;</span>,
                </div>
                <div style={{ paddingLeft: '16px' }}>
                  <span>desktopShell:</span> <span style={{ color: '#4ade80' }}>&quot;Tauri v2 Multi-Window&quot;</span>,
                </div>
                <div style={{ paddingLeft: '16px' }}>
                  <span>aiIntegration:</span> <span style={{ color: '#c084fc' }}>GoogleGemini</span>({'{'} structuredOutput: <span style={{ color: '#f43f5e' }}>true</span> {'}'}),
                </div>
                <div>{'}'});</div>
                <div style={{ color: '#10b981', marginTop: '6px' }}>
                  ✓ Ready to accelerate your business operations.
                </div>
              </div>

              {/* Quick interactive demo trigger */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0, 240, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cyan-primary)',
                    }}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Mini ERP &amp; Quản Trị Sản Xuất
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Clean Table • Barcode • Iframe Print • Gemini AI
                    </div>
                  </div>
                </div>

                <Link
                  href="/demo/mini-erp"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--cyan-primary)',
                    textDecoration: 'none',
                  }}
                >
                  Khám phá
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
