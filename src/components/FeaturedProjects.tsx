'use client';

import React from 'react';
import Link from 'next/link';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  ExternalLink, 
  CheckCircle2, 
  Layers
} from 'lucide-react';

export default function FeaturedProjects() {
  const { projects } = PORTFOLIO_DATA;

  return (
    <section id="projects" style={{ padding: '0 0 80px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Section Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '6px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Các Dự Án &amp; Giải Pháp Tiêu Biểu Khác
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Giải quyết các bài toán kỹ thuật từ ứng dụng máy tính để bàn (Desktop Native) đến nền tảng báo cáo dữ liệu lớn.
          </p>
        </div>

        {/* Project Cards Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {projects.filter(p => p.id !== 'mini-erp').map((proj) => (
            <div
              key={proj.id}
              className="bento-card"
              style={{
                padding: '24px 28px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
                  {proj.category}
                </span>

                <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  {proj.title}
                </h3>
              </div>

              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>
                {proj.subtitle}
              </div>

              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '14px' }}>
                {proj.description}
              </p>

              {/* Highlights list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {proj.highlights.map((h, hIdx) => (
                  <div key={hIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                    <CheckCircle2 size={14} color="var(--cyan-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Technologies tags */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {proj.technologies.map((t, tIdx) => (
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
