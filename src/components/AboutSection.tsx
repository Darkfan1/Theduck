'use client';

import React from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { TabKey } from './Navbar';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Layers, 
  Package, 
  FileSpreadsheet, 
  Cpu, 
  Printer, 
  ArrowRight,
  ExternalLink,
  Warehouse,
  Factory,
  Wrench,
  CheckCircle2,
  Code2,
  Monitor,
  Tag,
  Palette
} from 'lucide-react';

interface AboutSectionProps {
  onSelectTab?: (tab: TabKey) => void;
}

export default function AboutSection({ onSelectTab }: AboutSectionProps) {
  const { personal } = PORTFOLIO_DATA;

  const careerStages = [
    {
      stage: '01',
      period: '3 Năm Đầu',
      role: 'Quản lý kho & Quản trị vật tư',
      desc: 'Hình thành nền tảng về kỷ luật số liệu, định mức nguyên vật liệu (BOM), kiểm soát tồn kho và dòng chảy hàng hóa. Hiểu sâu sắc giá trị của từng con số tồn kho và sự thất thoát trên sàn xưởng nếu số liệu không chuẩn xác.'
    },
    {
      stage: '02',
      period: 'Giai Đoạn Kỹ Thuật',
      role: 'Kỹ thuật & Mỹ thuật công nghiệp in ấn',
      desc: 'Đi sâu vào thiết kế bao bì nhựa, bao bì carton, tem nhãn cuộn/tờ, bình trang, xử lý file in và kỹ thuật trục in. Nắm vững đặc tính máy móc, khổ màng, khổ giấy — nền tảng để phần mềm tính giá & bình file không xa rời thực tế.'
    },
    {
      stage: '03',
      period: 'Giai Đoạn Quản Trị',
      role: 'Quản trị sản xuất & Điều hành xưởng',
      desc: 'Trực tiếp điều hành chuỗi vận hành: từ đơn hàng, nguyên vật liệu, lệnh sản xuất (LSX), con người, máy móc, QA/QC đến xuất kho giao hàng. Nhìn nhận doanh nghiệp từ góc nhìn tổng thể liên hoàn, nắm bắt chính xác nơi phát sinh nút thắt cổ chai.'
    },
    {
      stage: '04',
      period: 'Hiện Tại',
      role: 'Kiến trúc phần mềm thực chiến & Mini ERP may đo',
      desc: 'Nhận ra bài toán doanh nghiệp nghẽn do quy trình và sự phân tán của các file Excel rời rạc. Tự tay thiết kế và xây dựng các ứng dụng, tool chuyên dụng và hệ thống Mini ERP may đo tinh gọn, sát thực tế sản xuất.'
    }
  ];

  const solutions = [
    {
      title: 'Tư Vấn & Cung Cấp Tem Nhãn Đa Ngành',
      desc: 'Cung cấp tem cuộn dán máy tự động, tem tờ bế demi, decal giấy Fasson/Lintec, nhựa PP/PE/PVC, xi bạc, tem vỡ, keo đông lạnh/chịu nhiệt/hóa chất.',
      icon: <Tag size={18} color="var(--cyan-primary)" />
    },
    {
      title: 'Đào Tạo Thiết Kế Kỹ Thuật In Thực Chiến',
      desc: 'Đào tạo 1-1 cho designer: Trapping chống lé trắng, Overprint, chuẩn màu Pantone/CMYK, bù trừ co giãn trục Flexo, chuẩn hóa khuôn bế & ép kim.',
      icon: <Palette size={18} color="var(--cyan-primary)" />
    },
    {
      title: 'Đào Tạo Xuất Film Chế Bản Prepress & CTP',
      desc: 'Chuyển giao quy trình bình trang Signa Station/Preps, làm chủ RIP xưởng in, bù dot gain hạt trượt, tram AM/FM chống moiré, xuất bản CTP/CTF.',
      icon: <Printer size={18} color="var(--cyan-primary)" />
    },
    {
      title: 'Phát Triển Mini ERP May Đo Theo Yêu Cầu',
      desc: 'Phần mềm may đo cho xưởng in & sản xuất: Báo giá tem nhãn tự động 3 giây, tự tính barem khổ decal tối ưu, bóc tách lệnh in & BOM vật tư realtime.',
      icon: <Layers size={18} color="var(--cyan-primary)" />
    },
    {
      title: 'Web App & Desktop App (Tauri v2 Native)',
      desc: 'Ứng dụng chuyên biệt cho xưởng và văn phòng, in tem siêu tốc qua iframe, quét barcode/QR tức thì, chạy desktop siêu nhẹ (<75MB RAM).',
      icon: <Monitor size={18} color="var(--cyan-primary)" />
    },
    {
      title: 'Tự Động Hóa Thay Thế Excel Rời Rạc',
      desc: 'Số hóa và thay thế việc nhập liệu thủ công bằng nhiều file Excel rời rạc, chống sai lệch số liệu tồn kho decal, khuôn bế và đơn hàng.',
      icon: <Cpu size={18} color="var(--cyan-primary)" />
    }
  ];

  return (
    <section id="about" style={{ padding: '8px 0 60px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '840px' }}>

        {/* ========================================================= */}
        {/* HEADER: ĐƠN GIẢN, GỌN GÀNG, KHIÊM TỐN */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
              {personal.fullName}
            </h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Đồng Nai, Việt Nam • Onsite &amp; Remote
            </span>
          </div>

          <div style={{ fontSize: '0.92rem', color: 'var(--cyan-primary)', fontWeight: 500, marginBottom: '14px' }}>
            {personal.title}
          </div>

          <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 18px 0' }}>
            {personal.shortBio}
          </p>

          {/* Nút hành động nhỏ gọn */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => onSelectTab ? onSelectTab('projects') : undefined}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            >
              Trải nghiệm Demo Mini ERP
              <ArrowRight size={14} />
            </button>

            <a
              href={personal.contact.zalo}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            >
              <MessageCircle size={14} />
              Zalo: {personal.contact.phone}
            </a>

            <button
              onClick={() => onSelectTab ? onSelectTab('experience') : undefined}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', background: 'transparent' }}
            >
              Xem kinh nghiệm thực chiến
            </button>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.07)', marginBottom: '32px' }} />

        {/* ========================================================= */}
        {/* PHẦN 1: HÀNH TRÌNH TỪ SÀN XƯỞNG ĐẾN CÔNG NGHỆ */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.12rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
            Hành trình từ sàn xưởng đến công nghệ
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {careerStages.map((stg) => (
              <div
                key={stg.stage}
                style={{
                  padding: '16px 18px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
                    {stg.stage}. {stg.role}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {stg.period}
                  </span>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                  {stg.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 2: TRIẾT LÝ LÀM VIỆC */}
        {/* ========================================================= */}
        <div
          style={{
            padding: '20px 22px',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '6px',
            marginBottom: '36px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
            Triết lý làm việc
          </h2>

          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 16px 0' }}>
            “Tôi không tiếp cận bài toán chỉ từ góc độ lập trình viên. Tôi bắt đầu từ câu hỏi: <em>Doanh nghiệp đang gặp vấn đề gì và quy trình thực tế đang vận hành như thế nào?</em> Sau đó mới tìm cách dùng công nghệ để giải quyết nó một cách đơn giản, phù hợp và có tính ứng dụng cao.”
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '10px',
            }}
          >
            {[
              {
                step: '01',
                title: 'Hiểu đúng vấn đề',
                desc: 'Đi từ thực tế vận hành và người làm trực tiếp để tìm đúng nguyên nhân gốc rễ.'
              },
              {
                step: '02',
                title: 'Thiết kế đúng quy trình',
                desc: 'Loại bỏ thao tác thừa, chuẩn hóa đường đi của thông tin trước khi viết code.'
              },
              {
                step: '03',
                title: 'Xây dựng đúng công cụ',
                desc: 'Giao diện trực quan, tốc độ xử lý nhanh, thao tác gọn và giải quyết đúng việc.'
              }
            ].map((p, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  background: '#162032',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                    {p.step}.
                  </span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#ffffff' }}>
                    {p.title}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 3: CÁC BÀI TOÁN TÔI CÓ THỂ GIÚP DOANH NGHIỆP */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.12rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
            Các giải pháp tôi có thể hỗ trợ doanh nghiệp
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            {solutions.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px 18px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.icon}
                  <h3 style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600, margin: 0 }}>
                    {item.title}
                  </h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.84rem',
              color: 'var(--text-light)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--cyan-primary)' }}>Lưu ý:</strong> Tôi đặc biệt quan tâm và có thế mạnh với những bài toán đặc thù mà phần mềm đóng gói sẵn khó đáp ứng do mỗi doanh nghiệp sản xuất - in ấn có quy trình riêng biệt.
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 4: BẢN THỬ NGHIỆM DEMO MINI ERP */}
        {/* ========================================================= */}
        <div
          style={{
            padding: '20px 22px',
            background: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '6px',
            marginBottom: '36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ maxWidth: '580px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              Hệ thống Mini ERP Quản trị Sản xuất ProTrack (Bản Demo)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Trải nghiệm thực tế hệ thống theo dõi tiến độ đơn hàng sản xuất: Clean Table Rule, in tem barcode trực tiếp qua iframe không giật lag và chẩn đoán tiến độ đơn hàng.
            </p>
          </div>

          <button
            onClick={() => onSelectTab ? onSelectTab('projects') : undefined}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.84rem', whiteSpace: 'nowrap' }}
          >
            Mở xem Live Demo →
          </button>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 5: ĐỒNG HÀNH & KẾT NỐI */}
        {/* ========================================================= */}
        <div
          style={{
            padding: '22px 24px',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '6px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            Đồng hành &amp; Kết nối
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.65, margin: '0 0 16px 0' }}>
            Nếu bạn có một vấn đề thực tế và đang nghĩ: <em>“Giá mà có một phần mềm làm được việc này…”</em> — hãy liên hệ với tôi để cùng trao đổi và tìm giải pháp phù hợp nhất.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              fontSize: '0.86rem',
            }}
          >
            <a
              href={personal.contact.zalo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--cyan-primary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <MessageCircle size={15} />
              Zalo: {personal.contact.phone}
            </a>

            <span style={{ color: 'var(--border-light)' }}>•</span>

            <a
              href={`tel:${personal.contact.phone.replace(/\s+/g, '')}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#f8fafc',
                textDecoration: 'none',
              }}
            >
              <Phone size={14} color="var(--text-muted)" />
              {personal.contact.phone}
            </a>

            <span style={{ color: 'var(--border-light)' }}>•</span>

            <a
              href={`mailto:${personal.contact.email}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#f8fafc',
                textDecoration: 'none',
              }}
            >
              <Mail size={14} color="var(--text-muted)" />
              {personal.contact.email}
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
