'use client';

import React from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  User, 
  Briefcase, 
  Cpu, 
  Layers, 
  Phone,
  Send,
  MessageCircle
} from 'lucide-react';

export type TabKey = 'overview' | 'experience' | 'skills' | 'projects' | 'contact';

interface NavbarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export default function Navbar({ activeTab, onSelectTab }: NavbarProps) {
  const { personal } = PORTFOLIO_DATA;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'overview', label: 'Tổng quan', icon: <User size={15} /> },
    { key: 'experience', label: 'Kinh nghiệm', icon: <Briefcase size={15} /> },
    { key: 'skills', label: 'Kỹ năng', icon: <Cpu size={15} /> },
    { key: 'projects', label: 'Dự án (Demo ERP)', icon: <Layers size={15} /> },
    { key: 'contact', label: 'Liên hệ', icon: <Send size={15} /> },
  ];

  const handleTabClick = (tab: TabKey) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#090d16',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', gap: '16px' }}>
        
        {/* Left: Brand Identity */}
        <button
          onClick={() => handleTabClick('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.15rem',
            }}
          >
            🦆
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {personal.fullName}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Đồng hành &amp; Chia sẻ
            </div>
          </div>
        </button>

        {/* Center: Clean 5 Tabs (Desktop) */}
        <nav
          style={{
            display: 'none',
            gap: '4px',
            alignItems: 'center',
            background: '#0f172a',
            padding: '3px 4px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
          className="desktop-nav"
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabClick(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  background: isActive ? '#1e293b' : 'transparent',
                  color: isActive ? '#f8fafc' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.84rem',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Direct Contact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href={personal.contact.zalo}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              padding: '7px 14px',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <MessageCircle size={15} />
            <span>Zalo: {personal.contact.phone}</span>
          </a>
        </div>
      </div>

      {/* Mobile Horizontal Tab Bar */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '4px',
          padding: '6px 12px',
          background: '#0c1017',
          borderTop: '1px solid var(--border-subtle)',
        }}
        className="mobile-tab-bar"
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTabClick(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '4px',
                background: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.8rem',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
