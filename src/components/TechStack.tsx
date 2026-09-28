'use client';

import React from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  Layers, 
  Cpu, 
  Database, 
  Sparkles, 
  Code
} from 'lucide-react';

export default function TechStack() {
  const { skills } = PORTFOLIO_DATA;

  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'layout': return <Layers size={20} color="var(--cyan-primary)" />;
      case 'cpu': return <Cpu size={20} color="#a855f7" />;
      case 'database': return <Database size={20} color="#34d399" />;
      case 'sparkles': return <Sparkles size={20} color="#f59e0b" />;
      default: return <Code size={20} />;
    }
  };

  return (
    <section id="skills" style={{ padding: '20px 0 80px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '980px' }}>
        
        {/* Section Header */}
        <div style={{ marginBottom: '36px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Kỹ Năng &amp; Năng Lực Công Nghệ
          </h2>

          <p style={{ color: 'var(--text-light)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Tập trung vào hệ sinh thái hiện đại, hiệu năng cao và đã được kiểm chứng độ ổn định trong môi trường vận hành thực tế của doanh nghiệp.
          </p>
        </div>

        {/* 4 Skill Category Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '18px',
          }}
        >
          {skills.map((group, gIdx) => (
            <div
              key={gIdx}
              style={{
                padding: '24px',
                background: '#0f172a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    background: '#162032',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getGroupIcon(group.icon)}
                </div>
                <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>{group.group}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    style={{
                      padding: '10px 12px',
                      background: '#162032',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {item.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: 'var(--cyan-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                        }}
                      >
                        {item.level}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
