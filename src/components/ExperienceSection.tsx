'use client';

import React from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Briefcase
} from 'lucide-react';

export default function ExperienceSection() {
  const { experiences } = PORTFOLIO_DATA;

  return (
    <section id="experience" style={{ padding: '20px 0 80px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '980px' }}>
        
        {/* Header */}
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
            Kinh Nghiệm Thực Chiến
          </h2>

          <p style={{ color: 'var(--text-light)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Hơn 20 năm làm việc trực tiếp tại xưởng sản xuất, kho bãi và ban điều hành; kết hợp với kiến trúc và phát triển phần mềm chuyên dụng cho doanh nghiệp.
          </p>
        </div>

        {/* Experience List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {experiences.map((exp) => (
            <div
              key={exp.id}
              style={{
                padding: '24px 28px',
                background: '#0f172a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {/* Top Bar: Role & Tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
                  {exp.role}
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#162032',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--cyan-primary)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  {exp.tag}
                </span>
              </div>

              {/* Organization & Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.organization}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} color="var(--cyan-primary)" />
                  {exp.period}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="var(--emerald-primary)" />
                  {exp.location}
                </span>
              </div>

              {/* Description */}
              <p style={{ color: 'var(--text-light)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '16px' }}>
                {exp.description}
              </p>

              {/* Key Achievements */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  CÁC NỘI DUNG VÀ KẾT QUẢ ĐÃ THỰC HIỆN:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {exp.achievements.map((ach, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.86rem', color: 'var(--text-light)' }}>
                      <CheckCircle2 size={15} color="var(--cyan-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: 1.5 }}>{ach}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technologies */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {exp.technologies.map((t, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#162032',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
