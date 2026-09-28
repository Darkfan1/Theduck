'use client';

import React from 'react';
import { TabKey } from './Navbar';
import { 
  User, 
  Briefcase, 
  Cpu, 
  Layers, 
  Send, 
  Sparkles 
} from 'lucide-react';

interface TabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export default function TabBar({ activeTab, onSelectTab }: TabBarProps) {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'overview', label: 'Tổng quan', icon: <User size={18} /> },
    { key: 'experience', label: 'Kinh nghiệm', icon: <Briefcase size={18} /> },
    { key: 'skills', label: 'Kỹ năng', icon: <Cpu size={18} /> },
    { key: 'projects', label: 'Dự án', icon: <Layers size={18} />, badge: 'Demo ERP' },
    { key: 'contact', label: 'Liên hệ', icon: <Send size={18} /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        marginBottom: '40px',
        position: 'sticky',
        top: '84px',
        zIndex: 40,
      }}
    >
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(10, 15, 26, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 240, 255, 0.1)',
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onSelectTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-pill)',
                background: isActive ? 'linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)' : 'transparent',
                color: isActive ? '#06080d' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 500,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isActive ? '0 4px 15px rgba(0, 240, 255, 0.35)' : 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {t.icon}
              </span>
              <span>{t.label}</span>
              {t.badge && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 240, 255, 0.15)',
                    color: isActive ? '#000' : 'var(--cyan-primary)',
                    fontWeight: 700,
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
