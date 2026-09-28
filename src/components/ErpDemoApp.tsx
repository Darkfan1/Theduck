'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Printer, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Edit3, 
  Trash2, 
  RefreshCw,
  QrCode,
  TrendingUp,
  Cpu,
  X,
  ExternalLink
} from 'lucide-react';

interface OrderItem {
  id: string;
  code: string;
  customer: string;
  product: string;
  quantity: number;
  stage: 'Cắt' | 'In/Thêu' | 'May Ráp' | 'KCS' | 'Đóng Gói' | 'Hoàn Thành';
  progress: number;
  deadline: string;
  status: 'normal' | 'urgent' | 'completed';
}

const INITIAL_ORDERS: OrderItem[] = [
  { id: '1', code: 'DH-2026-081', customer: 'Tập Đoàn Dệt May Á Châu', product: 'Áo Polo Thể Thao Cao Cấp (Vải Poly)', quantity: 2500, stage: 'May Ráp', progress: 65, deadline: '2026-10-02', status: 'normal' },
  { id: '2', code: 'DH-2026-082', customer: 'Chuỗi Coffee The Mill', product: 'Tạp Dề Đồng Phục In Logo Nhiệt', quantity: 800, stage: 'In/Thêu', progress: 40, deadline: '2026-09-30', status: 'urgent' },
  { id: '3', code: 'DH-2026-083', customer: 'Logistics Toàn Cầu VN', product: 'Áo Khoác Gió Phản Quang Bảo Hộ', quantity: 1200, stage: 'KCS', progress: 90, deadline: '2026-10-05', status: 'normal' },
  { id: '4', code: 'DH-2026-084', customer: 'Sự Kiện Marathon Quốc Tế', product: 'Áo Finisher Thoáng Khí Quick-Dry', quantity: 5000, stage: 'Đóng Gói', progress: 98, deadline: '2026-09-29', status: 'urgent' },
  { id: '5', code: 'DH-2026-085', customer: 'Nội Thất Gỗ Xanh', product: 'Đồng Phục Sơ Mi Công Sở Thêu Tên', quantity: 450, stage: 'Hoàn Thành', progress: 100, deadline: '2026-09-28', status: 'completed' },
  { id: '6', code: 'DH-2026-086', customer: 'Hệ Thống Trường Liên Cấp', product: 'Bộ Thể Thao Học Sinh Thu Đông', quantity: 3200, stage: 'Cắt', progress: 20, deadline: '2026-10-15', status: 'normal' },
];

export default function ErpDemoApp({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [activePrintOrder, setActivePrintOrder] = useState<OrderItem | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<{ analysis: string; forecast: string; action: string } | null>(null);
  const [printedSuccess, setPrintedSuccess] = useState(false);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.code.toLowerCase().includes(search.toLowerCase()) ||
                          o.customer.toLowerCase().includes(search.toLowerCase()) ||
                          o.product.toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === 'ALL' || o.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  // Simulated AI analysis using Google Gemini Structured Output pattern
  const handleRunAiAnalysis = () => {
    setIsAiAnalyzing(true);
    setAiReport(null);
    setTimeout(() => {
      setIsAiAnalyzing(false);
      setAiReport({
        analysis: "Phát hiện nguy cơ trễ hạn tại công đoạn 'In/Thêu' đơn hàng DH-2026-082 (The Mill Coffee) do chỉ đạt 40% tiến độ nhưng hạn giao còn dưới 48 giờ.",
        forecast: "Tốc độ sản xuất dự báo: Nếu không tăng ca, đơn hàng sẽ chậm tiến độ 1.2 ngày làm ảnh hưởng lịch xuất kho.",
        action: "Đề xuất tối ưu: Ưu tiên chuyền in số 2 chuyển sang chạy ca phụ; đồng thời gộp lệnh in tem nhãn trước để rút ngắn công đoạn KCS."
      });
    }, 1200);
  };

  // Simulated Iframe Printing
  const handlePrintLabel = (order: OrderItem) => {
    setActivePrintOrder(order);
    setPrintedSuccess(false);
  };

  const executePrint = () => {
    setPrintedSuccess(true);
    setTimeout(() => {
      setActivePrintOrder(null);
      setPrintedSuccess(false);
    }, 1500);
  };

  return (
    <div
      style={{
        background: '#090d16',
        borderRadius: isEmbedded ? '16px' : '24px',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Top Application Bar */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06080d',
              fontWeight: 800,
            }}
          >
            🦆
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>ProTrack Mini ERP</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                LIVE REALTIME
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Theo Dõi Tiến Độ Xưởng &amp; In Mã Vạch Siêu Tốc
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRunAiAnalysis}
            disabled={isAiAnalyzing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: 'none',
              cursor: isAiAnalyzing ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={14} className={isAiAnalyzing ? 'animate-spin' : ''} />
            {isAiAnalyzing ? 'Gemini Đang Phân Tích...' : 'Chẩn Đoán AI Gemini'}
          </button>

          {isEmbedded && (
            <a
              href="/demo/mini-erp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--cyan-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(0, 240, 255, 0.3)',
              }}
            >
              Toàn màn hình
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          padding: '16px 20px',
          background: 'rgba(12, 17, 29, 0.8)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TỔNG ĐƠN HÀNG</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
            {orders.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>đơn</span>
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>ĐƠN HỎA TỐC GẤP</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
            {orders.filter(o => o.status === 'urgent').length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>cần ưu tiên</span>
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>TỔNG SỐ LƯỢNG SP</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {orders.reduce((acc, o) => acc + o.quantity, 0).toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>cái</span>
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>HIỆU SUẤT TRUNG BÌNH</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(orders.reduce((acc, o) => acc + o.progress, 0) / orders.length)}%
          </div>
        </div>
      </div>

      {/* AI Diagnostic Banner if generated */}
      {aiReport && (
        <div
          style={{
            margin: '16px 20px',
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 700, fontSize: '0.9rem' }}>
              <Sparkles size={16} />
              Báo Cáo Phân Tích Thông Minh (Gemini 2.5/3.1 Structured JSON Output)
            </div>
            <button
              onClick={() => setAiReport(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '6px' }}>
            <strong>Điểm nghẽn:</strong> {aiReport.analysis}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '6px' }}>
            <strong>Dự báo:</strong> {aiReport.forecast}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#38bdf8', lineHeight: 1.5 }}>
            <strong>Hành động đề xuất:</strong> {aiReport.action}
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách hàng, sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Stage Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'Cắt', 'In/Thêu', 'May Ráp', 'KCS', 'Đóng Gói', 'Hoàn Thành'].map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: selectedStage === stage ? 'var(--cyan-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedStage === stage ? '#06080d' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {stage === 'ALL' ? 'Tất cả' : stage}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Table Rule Implementation */}
      <div style={{ overflowX: 'auto' }}>
        <table className="clean-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Mã Đơn</th>
              <th>Khách Hàng &amp; Sản Phẩm</th>
              <th style={{ width: '90px', textAlign: 'right' }}>SL</th>
              <th style={{ width: '130px' }}>Công Đoạn</th>
              <th style={{ width: '150px' }}>Tiến Độ</th>
              <th style={{ width: '110px' }}>Hạn Giao</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Không tìm thấy đơn hàng nào khớp với tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="group">
                  {/* Mã Đơn */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan-primary)', fontSize: '0.85rem' }}>
                        {order.code}
                      </span>
                      {order.status === 'urgent' && (
                        <span
                          title="Đơn hỏa tốc"
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#fbbf24',
                            borderRadius: '4px',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                          }}
                        >
                          GẤP
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Khách hàng & Tên SP */}
                  <td>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{order.customer}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.product}</div>
                  </td>

                  {/* Số lượng */}
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#e2e8f0' }}>
                    {order.quantity.toLocaleString()}
                  </td>

                  {/* Công đoạn */}
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background:
                          order.stage === 'Hoàn Thành'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : order.stage === 'May Ráp'
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(168, 85, 247, 0.2)',
                        color:
                          order.stage === 'Hoàn Thành'
                            ? '#34d399'
                            : order.stage === 'May Ráp'
                            ? '#60a5fa'
                            : '#c084fc',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {order.stage}
                    </span>
                  </td>

                  {/* Tiến độ */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${order.progress}%`,
                            height: '100%',
                            background:
                              order.progress === 100
                                ? '#10b981'
                                : order.progress > 60
                                ? 'linear-gradient(90deg, #00f0ff, #3b82f6)'
                                : '#f59e0b',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', width: '32px' }}>
                        {order.progress}%
                      </span>
                    </div>
                  </td>

                  {/* Hạn Giao */}
                  <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {order.deadline}
                  </td>

                  {/* The Clean Table Rule: Action buttons hidden by default, visible on hover */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => handlePrintLabel(order)}
                        title="In Tem Mã Vạch (Iframe Fast Print)"
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          color: 'var(--cyan-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Printer size={13} />
                        In Tem
                      </button>

                      <button
                        title="Chỉnh sửa đơn hàng"
                        style={{
                          padding: '5px 6px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Note about Clean Table Rule in the demo footer */}
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(10, 14, 24, 0.95)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--cyan-primary)' }}>★ Quy chuẩn Clean Table:</span>
          <span>Rê chuột vào bất kỳ dòng nào để hiện các nút thao tác In Tem / Sửa / Xóa.</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          Next.js + React 19 Client Component
        </div>
      </div>

      {/* Simulated Thermal Print Modal */}
      {activePrintOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#000000',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              position: 'relative',
              fontFamily: 'monospace',
            }}
          >
            {/* Header of the label */}
            <div style={{ borderBottom: '2px dashed #000', paddingBottom: '12px', marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>TEM LỆNH SẢN XUẤT PROTRACK</div>
              <div style={{ fontSize: '0.8rem' }}>MÃ VẠCH ĐỒNG NAI • THE DUCK MES</div>
            </div>

            {/* Content of label */}
            <div style={{ marginBottom: '12px', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div><strong>MÃ ĐƠN:</strong> {activePrintOrder.code}</div>
              <div><strong>KHÁCH HÀNG:</strong> {activePrintOrder.customer}</div>
              <div><strong>SẢN PHẨM:</strong> {activePrintOrder.product}</div>
              <div><strong>SỐ LƯỢNG:</strong> {activePrintOrder.quantity.toLocaleString()} PCS</div>
              <div><strong>CÔNG ĐOẠN:</strong> {activePrintOrder.stage}</div>
              <div><strong>HẠN GIAO:</strong> {activePrintOrder.deadline}</div>
            </div>

            {/* Barcode simulation */}
            <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', marginBottom: '16px' }}>
              <div style={{ letterSpacing: '4px', fontSize: '1.4rem', fontWeight: 900 }}>
                |||| | |||||| || | |||| |||
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>*{activePrintOrder.code}*</div>
            </div>

            {printedSuccess ? (
              <div
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                ✓ Đã in thành công qua Iframe không giật lag DOM!
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={executePrint}
                  style={{
                    flex: 1,
                    background: '#090d16',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={16} />
                  Kích Hoạt In Siêu Tốc
                </button>
                <button
                  onClick={() => setActivePrintOrder(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
