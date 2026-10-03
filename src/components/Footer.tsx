'use client';

import React from 'react';
import Link from 'next/link';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { TabKey } from './Navbar';
import { ArrowUp, Sparkles, ExternalLink } from 'lucide-react';

interface FooterProps {
  onSelectTab?: (tab: TabKey) => void;
}

export default function Footer({ onSelectTab }: FooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabClick = (tab: TabKey) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    scrollToTop();
  };

  return (
    <footer
      style={{
        background: '#04060a',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '60px',
        paddingBottom: '40px',
        position: 'relative',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              🦆
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                {PORTFOLIO_DATA.personal.fullName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đồng hành &amp; Chia sẻ
              </div>
            </div>
          </div>

          {/* Quick Nav Links matching the 5 tabs */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => handleTabClick('overview')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Tổng quan
            </button>
            <button
              onClick={() => handleTabClick('experience')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Kinh nghiệm
            </button>
            <button
              onClick={() => handleTabClick('skills')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Kỹ năng
            </button>
            <button
              onClick={() => handleTabClick('projects')}
              style={{ background: 'none', border: 'none', color: 'var(--cyan-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Dự án (Mini ERP)
            </button>
            <button
              onClick={() => handleTabClick('contact')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Liên hệ
            </button>
          </div>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Lên đầu trang"
          >
            <ArrowUp size={18} />
          </button>
        </div>

        {/* Bottom Sub-bar */}
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            © 2026 <strong>theduck.io.vn</strong>. Kiến tạo với tâm huyết và công nghệ hàng đầu.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              Next.js 15 • React 19 • TypeScript
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
