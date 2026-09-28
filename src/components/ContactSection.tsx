'use client';

import React, { useState } from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  Send, 
  Mail, 
  Phone, 
  CheckCircle2, 
  ExternalLink,
  MessageCircle
} from 'lucide-react';

export default function ContactSection() {
  const { contact } = PORTFOLIO_DATA.personal;
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [subject, setSubject] = useState('Phần mềm Quản lý Sản xuất (MES/ERP)');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !emailOrPhone) return;
    setSubmitted(true);
  };

  return (
    <section id="contact" style={{ padding: '20px 0 80px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '980px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Thông Tin Liên Hệ &amp; Trao Đổi
          </h2>
          <p style={{ color: 'var(--text-light)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Bạn có thể liên hệ trực tiếp qua điện thoại / Zalo, gửi email hoặc để lại thông tin bài toán bên dưới. Tôi sẽ phản hồi sớm nhất.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left: Direct Contacts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Zalo Card */}
            <a
              href={contact.zalo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '20px',
                background: '#0f172a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MessageCircle size={22} color="var(--cyan-primary)" />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Zalo: {contact.phone}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nhắn tin trao đổi trực tiếp</div>
                </div>
              </div>
              <ExternalLink size={16} color="var(--text-muted)" />
            </a>

            {/* Phone Card */}
            <a
              href={`tel:${contact.phone.replace(/\s+/g, '')}`}
              style={{
                padding: '20px',
                background: '#0f172a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={22} color="var(--emerald-primary)" />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Điện thoại: {contact.phone}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trao đổi công việc trực tiếp</div>
                </div>
              </div>
              <ExternalLink size={16} color="var(--text-muted)" />
            </a>

            {/* Email Card */}
            <a
              href={`mailto:${contact.email}`}
              style={{
                padding: '20px',
                background: '#0f172a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={22} color="var(--cyan-primary)" />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Email: {contact.email}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gửi tài liệu, yêu cầu kỹ thuật</div>
                </div>
              </div>
              <ExternalLink size={16} color="var(--text-muted)" />
            </a>
          </div>

          {/* Right: Technical Message Form */}
          <div
            style={{
              padding: '28px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <CheckCircle2 size={40} color="var(--emerald-primary)" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '8px' }}>
                  Đã Gửi Thông Tin Thành Công
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Cảm ơn bạn. Tôi sẽ liên hệ lại với bạn qua thông tin đã cung cấp.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Để lại thông tin trao đổi
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '6px' }}>
                    Tên của bạn hoặc Tên Doanh nghiệp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Anh Tuấn (Xưởng In / Bao Bì)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#162032',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '6px' }}>
                    Số điện thoại / Zalo hoặc Email *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0912 345 678 hoặc email@company.com"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#162032',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '6px' }}>
                    Chủ đề quan tâm
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#162032',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Phần mềm Quản lý Sản xuất (MES/ERP)">Phần mềm Quản lý Sản xuất (MES/ERP)</option>
                    <option value="Số hóa quy trình In ấn / Tem nhãn / Bao bì">Số hóa quy trình In ấn / Tem nhãn / Bao bì</option>
                    <option value="Tool chuyên dụng nội bộ / Desktop Native">Tool chuyên dụng nội bộ / Desktop Native</option>
                    <option value="Tự động hóa tác vụ Excel & Dữ liệu">Tự động hóa tác vụ Excel &amp; Dữ liệu</option>
                    <option value="Trao đổi kỹ thuật khác">Trao đổi kỹ thuật khác</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '6px' }}>
                    Mô tả bài toán hoặc nhu cầu thực tế
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả sơ lược quy trình hiện tại, điểm nghẽn hoặc yêu cầu phần mềm mong muốn..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#162032',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '11px',
                    fontSize: '0.92rem',
                  }}
                >
                  <Send size={16} />
                  Gửi Thông Tin Trao Đổi
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
