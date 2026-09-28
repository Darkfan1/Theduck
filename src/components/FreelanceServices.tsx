'use client';

import React from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Users, 
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function FreelanceServices() {
  const { services } = PORTFOLIO_DATA;

  return (
    <section id="services" style={{ padding: '90px 0', background: 'rgba(8, 12, 22, 0.7)', position: 'relative' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 52px auto' }}>
          <div
            className="glass-pill"
            style={{
              marginBottom: '16px',
              borderColor: 'rgba(0, 240, 255, 0.4)',
              background: 'rgba(0, 240, 255, 0.05)',
            }}
          >
            <Zap size={14} color="var(--cyan-primary)" />
            <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>Dịch Vụ Freelance &amp; Hợp Tác</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}
          >
            Giải Pháp Phần Mềm <span className="text-gradient">May Đo Theo Nhu Cầu</span>
          </h2>

          <p style={{ color: 'var(--text-light)', fontSize: '1rem', lineHeight: 1.6 }}>
            Báo giá minh bạch, cam kết đúng hạn và hỗ trợ kỹ thuật tận tâm. 
            Mỗi dòng code được viết ra đều hướng tới việc giúp doanh nghiệp bạn vận hành mượt mà hơn.
          </p>
        </div>

        {/* 3 Service Packages */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {services.map((srv) => (
            <div
              key={srv.id}
              className="glass-panel"
              style={{
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: srv.popular ? '2px solid rgba(0, 240, 255, 0.5)' : '1px solid var(--border-subtle)',
                boxShadow: srv.popular ? '0 15px 40px rgba(0, 240, 255, 0.15)' : 'var(--shadow-md)',
                position: 'relative',
              }}
            >
              {srv.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    padding: '4px 12px',
                    background: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
                    color: '#06080d',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Được chọn nhiều nhất
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '8px' }}>{srv.name}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                  {srv.tagline}
                </p>

                {/* Timeline & Target */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '14px',
                    background: 'rgba(10, 15, 26, 0.8)',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--cyan-primary)' }}>
                    <Clock size={16} />
                    <span>Thời gian hoàn thành: <strong>{srv.timeline}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <Users size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Phù hợp: {srv.recommendedFor}</span>
                  </div>
                </div>

                {/* Features List */}
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', letterSpacing: '0.05em' }}>
                  HẠNG MỤC TRIỂN KHAI:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {srv.features.map((f, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', color: 'var(--text-light)' }}>
                      <CheckCircle2 size={16} color={srv.popular ? 'var(--cyan-primary)' : '#a855f7'} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div>
                <a
                  href={`#contact?package=${srv.id}`}
                  className={srv.popular ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    padding: '12px',
                    fontSize: '0.9rem',
                  }}
                >
                  Chọn gói này &amp; Tư vấn
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
