'use client';

import React from 'react';
import { PORTFOLIO_DATA } from '@/data/portfolioData';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Sliders, 
  Wrench, 
  Layers, 
  Package, 
  FileSpreadsheet, 
  Cpu, 
  Printer, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function AboutSection() {
  const { personal } = PORTFOLIO_DATA;

  const solutions = [
    {
      title: "Web App / Desktop App cho các quy trình nội bộ",
      desc: "Ứng dụng chuyên biệt cho phòng ban nội bộ, chạy mượt mà trên trình duyệt lẫn cài đặt desktop nhẹ nhàng, tối ưu thao tác hàng ngày.",
      icon: <Sliders size={20} color="var(--cyan-primary)" />
    },
    {
      title: "Tool chuyên dụng cho thiết kế, kỹ thuật và sản xuất",
      desc: "Công cụ hỗ trợ xử lý file, bình trang, tính khổ giấy/màng, quản lý thông số kỹ thuật in ấn và giảm thiểu thao tác lặp lại.",
      icon: <Wrench size={20} color="#a855f7" />
    },
    {
      title: "Mini ERP cho doanh nghiệp vừa và nhỏ",
      desc: "Giải pháp quản trị tinh gọn may đo theo quy trình thực tế của doanh nghiệp, không cồng kềnh, không tính năng thừa, dễ học và dễ áp dụng.",
      icon: <Layers size={20} color="#34d399" />
    },
    {
      title: "Công cụ quản lý đơn hàng, sản xuất, kho và giao nhận",
      desc: "Kiểm soát dòng chảy thông tin xuyên suốt từ lúc nhận đơn, lập lệnh sản xuất, theo dõi tiến độ, trừ kho nguyên liệu tới xuất kho giao hàng.",
      icon: <Package size={20} color="#38bdf8" />
    },
    {
      title: "Công cụ tính giá, báo giá và quản lý dữ liệu khách hàng",
      desc: "Tự động hóa công thức tính giá thành sản phẩm phức tạp theo cấu trúc định mức nguyên vật liệu (BOM), xuất báo giá nhanh và chuẩn xác.",
      icon: <FileSpreadsheet size={20} color="#f59e0b" />
    },
    {
      title: "Các hệ thống tự động hóa những công việc thủ công, lặp lại",
      desc: "Số hóa và thay thế việc nhập liệu thủ công bằng nhiều file Excel rời rạc, chống sai lệch số liệu và tiết kiệm hàng giờ mỗi ngày.",
      icon: <Cpu size={20} color="#ec4899" />
    },
    {
      title: "Giải pháp số hóa các quy trình đặc thù trong in ấn, tem nhãn và bao bì",
      desc: "Ứng dụng kinh nghiệm thực chiến giải quyết triệt để các bài toán in cuộn, in tờ rời, tem mã vạch, bao bì carton & bao bì nhựa.",
      icon: <Printer size={20} color="var(--cyan-primary)" />
    }
  ];

  return (
    <section id="about" style={{ padding: '20px 0 80px 0', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '980px' }}>

        {/* Technical Profile Header */}
        <div
          style={{
            padding: '32px',
            background: '#0f172a',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '40px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
            <span>HỒ SƠ NĂNG LỰC CÁ NHÂN</span>
            <span>•</span>
            <span>TÔN ĐÔNG VŨ (1982)</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
            Kỹ Thuật &amp; Vận Hành Sản Xuất — Giải Pháp Phần Mềm Doanh Nghiệp
          </h1>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-light)', lineHeight: 1.6, margin: 0 }}>
            {personal.shortBio}
          </p>
        </div>
        
        {/* ========================================================= */}
        {/* PHẦN 1: TÔI LÀ AI */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Tôi là ai
          </h2>

          <div
            style={{
              padding: '28px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '1.02rem',
              lineHeight: 1.8,
              color: 'var(--text-light)',
            }}
          >
            {personal.story.whoAmI.paragraphs.map((p, idx) => (
              <p key={idx} style={{ margin: 0 }}>
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 2: TỪ SẢN XUẤT ĐẾN CÔNG NGHỆ */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Từ sản xuất đến công nghệ
          </h2>

          <div
            style={{
              padding: '28px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '1.02rem',
              lineHeight: 1.8,
              color: 'var(--text-light)',
            }}
          >
            <p style={{ margin: 0 }}>
              Trong quá trình quản lý và vận hành thực tế, tôi nhận ra rằng rất nhiều vấn đề trong doanh nghiệp không nằm ở việc thiếu nhân sự hay thiếu phần mềm, mà nằm ở việc quy trình chưa được thiết kế đúng và thông tin chưa được kết nối hiệu quả.
            </p>

            <p style={{ margin: 0 }}>
              Đó cũng là lý do tôi bắt đầu dành nhiều thời gian hơn cho việc xây dựng các ứng dụng, công cụ quản trị và mini ERP để giải quyết những bài toán thực tế trong doanh nghiệp.
            </p>

            <p style={{ margin: 0 }}>
              Tôi đặc biệt tập trung vào các giải pháp cho ngành in ấn, tem nhãn, bao bì và sản xuất công nghiệp, nơi tôi có lợi thế lớn về kinh nghiệm thực tế.
            </p>

            <div
              style={{
                marginTop: '8px',
                padding: '20px 24px',
                borderRadius: '8px',
                background: '#162032',
                borderLeft: '4px solid var(--cyan-primary)',
              }}
            >
              <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>
                Tôi không tiếp cận một bài toán chỉ từ góc độ lập trình. Tôi bắt đầu từ câu hỏi:
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px', fontStyle: 'italic' }}>
                “Doanh nghiệp đang gặp vấn đề gì và quy trình thực tế đang vận hành như thế nào?”
              </div>
              <div style={{ color: 'var(--cyan-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                Sau đó mới tìm cách dùng công nghệ để giải quyết nó một cách đơn giản, phù hợp và có tính ứng dụng cao.
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 3: TÔI CÓ THỂ GIÚP GÌ? */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Tôi có thể giúp gì?
          </h2>

          <p style={{ color: 'var(--text-light)', fontSize: '1rem', marginBottom: '20px' }}>
            Tôi nhận phát triển các giải pháp theo nhu cầu thực tế, chẳng hạn:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {solutions.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px',
                  background: '#0f172a',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px', lineHeight: 1.4 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: '#162032',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.92rem',
              color: 'var(--text-light)',
            }}
          >
            <strong style={{ color: 'var(--cyan-primary)' }}>Lưu ý:</strong> Tôi đặc biệt quan tâm đến những bài toán mà các phần mềm phổ thông khó đáp ứng vì mỗi doanh nghiệp có một cách vận hành riêng.
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 4: TRIẾT LÝ LÀM VIỆC */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Triết lý làm việc
          </h2>

          <div
            style={{
              padding: '28px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '1.02rem',
              lineHeight: 1.8,
              color: 'var(--text-light)',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: '#ffffff', fontSize: '1.1rem' }}>
              Tôi tin rằng phần mềm tốt không nhất thiết phải phức tạp.
            </p>

            <p style={{ margin: 0 }}>
              Một công cụ tốt là công cụ mà người trực tiếp sử dụng có thể hiểu, thao tác nhanh và giải quyết được đúng vấn đề họ đang gặp phải.
            </p>

            <p style={{ margin: 0 }}>
              Hơn 20 năm đi từ sàn xưởng, kho bãi đến bàn quản trị cho tôi một góc nhìn khá đặc biệt: hiểu vấn đề từ thực tế trước khi tìm giải pháp bằng công nghệ.
            </p>

            {/* 3 Principles Flow */}
            <div style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.05em' }}>
                TÔI LUÔN GIỮ BA NGUYÊN TẮC:
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                }}
              >
                {[
                  { step: '01', title: 'Hiểu đúng vấn đề' },
                  { step: '02', title: 'Thiết kế đúng quy trình' },
                  { step: '03', title: 'Xây dựng đúng công cụ' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px 20px',
                      background: '#162032',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
                      {item.step}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#f8fafc' }}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 5: ĐỊNH HƯỚNG */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Định hướng
          </h2>

          <div
            style={{
              padding: '28px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '1.02rem',
              lineHeight: 1.8,
              color: 'var(--text-light)',
            }}
          >
            <p style={{ margin: 0 }}>
              Tôi đang phát triển con đường freelancer theo hướng kết hợp giữa kinh nghiệm vận hành sản xuất và công nghệ phần mềm, tập trung vào các giải pháp thực tế cho doanh nghiệp trong lĩnh vực in ấn, tem nhãn, bao bì và sản xuất công nghiệp.
            </p>

            <p style={{ margin: 0 }}>
              Tôi mong muốn hợp tác với những doanh nghiệp đang có những quy trình còn thủ công, dữ liệu còn phân tán hoặc đang gặp những bài toán quản trị mà phần mềm thông thường chưa giải quyết được.
            </p>

            <div
              style={{
                marginTop: '8px',
                padding: '20px 24px',
                borderRadius: '8px',
                background: '#162032',
                borderLeft: '4px solid var(--cyan-primary)',
              }}
            >
              <div style={{ color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '0.95rem' }}>
                Nếu bạn có một vấn đề thực tế và đang nghĩ:
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px', fontStyle: 'italic' }}>
                “Giá mà có một phần mềm làm được việc này…”
              </div>
              <div style={{ color: 'var(--cyan-primary)', fontWeight: 600, fontSize: '0.98rem' }}>
                Có thể đó chính là thứ tôi có thể giúp bạn xây dựng.
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PHẦN 6: HÃY GIỮ LIÊN LẠC */}
        {/* ========================================================= */}
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            Hãy giữ liên lạc
          </h2>

          <div
            style={{
              padding: '28px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p style={{ color: 'var(--text-light)', fontSize: '1.02rem', lineHeight: 1.8, marginBottom: '24px' }}>
              Nếu bạn muốn trao đổi về một dự án phần mềm, tìm kiếm giải pháp cho quy trình sản xuất – in ấn, trao đổi chuyên môn hoặc đơn giản là mở rộng mạng lưới quan hệ công việc, tôi rất vui được kết nối.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <a
                href={`mailto:${personal.contact.email}`}
                style={{
                  padding: '16px 20px',
                  background: '#162032',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <Mail size={20} color="var(--cyan-primary)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Email
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                    {personal.contact.email}
                  </div>
                </div>
              </a>

              <a
                href={`tel:${personal.contact.phone.replace(/\s+/g, '')}`}
                style={{
                  padding: '16px 20px',
                  background: '#162032',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <Phone size={20} color="var(--emerald-primary)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Điện thoại / Zalo
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                    {personal.contact.phone}
                  </div>
                </div>
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href={personal.contact.zalo}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: '0.9rem' }}
              >
                <MessageCircle size={16} />
                Nhắn Zalo: {personal.contact.phone}
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
