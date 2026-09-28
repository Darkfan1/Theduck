'use client';

import React, { useState } from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  Workflow, 
  ChevronDown, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function ProcessTimeline() {
  const { processSteps, faqs } = PORTFOLIO_DATA;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="process" style={{ padding: '90px 0', position: 'relative' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 52px auto' }}>
          <div
            className="glass-pill"
            style={{
              marginBottom: '16px',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.05)',
            }}
          >
            <Workflow size={14} color="var(--emerald-primary)" />
            <span style={{ color: 'var(--emerald-primary)', fontWeight: 600 }}>Quy Trình Triển Khai Minh Bạch</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}
          >
            Làm Việc Rõ Ràng, <span className="text-gradient">Đúng Hạn &amp; Chuẩn Xác</span>
          </h2>

          <p style={{ color: 'var(--text-light)', fontSize: '1rem', lineHeight: 1.6 }}>
            Không để khách hàng hoang mang về tiến độ. Bạn được cập nhật liên tục từng tuần 
            với các bản thử nghiệm chạy thực tế trên môi trường demo.
          </p>
        </div>

        {/* 4 Process Steps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '70px',
          }}
        >
          {processSteps.map((step, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '28px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: 'rgba(0, 240, 255, 0.3)',
                  marginBottom: '12px',
                  lineHeight: 1,
                }}
              >
                {step.step}
              </div>

              <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '10px' }}>
                {step.title}
              </h3>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* FAQs Section */}
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            <HelpCircle size={18} color="var(--cyan-primary)" />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Câu Hỏi Thường Gặp Của Khách Hàng
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  cursor: 'pointer',
                  border: openFaq === idx ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid var(--border-subtle)',
                }}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.98rem', color: openFaq === idx ? 'var(--cyan-primary)' : '#fff' }}>
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {openFaq === idx && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
