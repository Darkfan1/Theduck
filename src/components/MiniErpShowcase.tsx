'use client';

import React from 'react';
import Link from 'next/link';
import ErpDemoApp from './ErpDemoApp';
import { 
  ExternalLink, 
  Layers, 
  Printer, 
  BrainCircuit,
  Zap
} from 'lucide-react';

export default function MiniErpShowcase() {
  return (
    <section id="demo-erp" style={{ padding: '20px 0 60px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Section Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  marginBottom: '4px',
                }}
              >
                Hệ Thống Mini ERP Quản Lý Sản Xuất (Bản Demo)
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                Mô phỏng quy trình theo dõi lệnh sản xuất, kiểm soát tiến độ công đoạn, in tem mã vạch và phân tích dữ liệu.
              </p>
            </div>

            <Link
              href="/demo/mini-erp"
              target="_blank"
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            >
              <span>Mở toàn màn hình</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {/* Feature Highlights Technical Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Zap size={18} color="var(--cyan-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '2px' }}>
                Quy Chuẩn Bảng Sạch (Clean Table)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Bảng biểu tinh gọn, thao tác nhanh, hỗ trợ tải hàng ngàn dòng mượt mà.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <BrainCircuit size={18} color="#c084fc" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '2px' }}>
                Tích Hợp AI Phân Tích Điểm Nghẽn
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Tự động phát hiện nguy cơ trễ hạn trên từng chuyền may / in.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Printer size={18} color="var(--emerald-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '2px' }}>
                In Tem Mã Vạch Iframe
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                In trực tiếp qua máy in nhiệt cầm tay / để bàn không đơ trình duyệt.
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Interactive ERP App */}
        <ErpDemoApp isEmbedded={true} />
      </div>
    </section>
  );
}
