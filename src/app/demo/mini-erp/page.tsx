import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import ErpDemoApp from '@/components/ErpDemoApp';
import { ArrowLeft, Sparkles, Home, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Live Demo Mini ERP & Quản Trị Sản Xuất | The Duck (theduck.io.vn)',
  description: 'Trải nghiệm trực tiếp hệ thống Mini ERP theo dõi tiến độ đơn hàng sản xuất, Clean Table Rule, in tem mã vạch siêu tốc và chẩn đoán điểm nghẽn với Gemini AI.',
};

export default function MiniErpDemoPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '24px 16px 60px 16px' }}>
      <div className="container" style={{ maxWidth: '1360px' }}>
        {/* Navigation Bar for Demo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
            padding: '12px 18px',
            borderRadius: '14px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--cyan-primary)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(0, 240, 255, 0.08)',
                border: '1px solid rgba(0, 240, 255, 0.25)',
              }}
            >
              <ArrowLeft size={16} />
              Quay lại Portfolio theduck.io.vn
            </Link>

            <span style={{ color: 'var(--text-muted)' }}>|</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#f8fafc' }}>
              <span style={{ fontWeight: 700 }}>Mini ERP Sản Xuất &amp; In Mã Vạch</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                PROTRACK INSPIRED
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/#contact"
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              Liên hệ tư vấn hệ thống tương tự
            </Link>
          </div>
        </div>

        {/* Full-screen ERP Application */}
        <ErpDemoApp isEmbedded={false} />

        {/* Technical Architecture Notes */}
        <div
          style={{
            marginTop: '32px',
            padding: '24px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--cyan-primary)" />
            Kiến Trúc &amp; Giải Pháp Ứng Dụng Trong Bản Demo Này
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ padding: '14px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px' }}>
              <strong style={{ color: 'var(--cyan-primary)', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                1. Quy Chuẩn Clean Table (Bảng Sạch)
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Các nút thao tác (In Tem, Chỉnh Sửa) trên từng dòng được ẩn mặc định và chỉ hiện lên khi di chuột qua. Giúp giao diện gọn gàng, giảm thiểu phân tâm khi theo dõi hàng trăm đơn hàng.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px' }}>
              <strong style={{ color: '#c084fc', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                2. Chẩn Đoán Điểm Nghẽn Bằng Gemini AI
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tích hợp SDK Gemini mới nhất sử dụng Structured JSON Output để bóc tách tiến độ, cảnh báo nguy cơ chậm tiến độ và đề xuất giải pháp điều phối ca sản xuất tức thì.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px' }}>
              <strong style={{ color: '#34d399', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                3. In Ấn Siêu Tốc Không Đơ Giao Diện
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Áp dụng giải pháp in qua thẻ Iframe ẩn thay vì gọi lệnh `window.print()` trực tiếp, giúp in hàng loạt tem mã vạch/phiếu xuất xưởng mà không gây giật lag hoặc layout lại toàn bộ cây DOM của React.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
