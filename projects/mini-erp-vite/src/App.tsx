import { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Edit3, 
  X,
  ArrowLeft
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

export function App() {
  const [orders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [activePrintOrder, setActivePrintOrder] = useState<OrderItem | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<{ analysis: string; forecast: string; action: string } | null>(null);
  const [printedSuccess, setPrintedSuccess] = useState(false);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.code.toLowerCase().includes(search.toLowerCase()) ||
                          o.customer.toLowerCase().includes(search.toLowerCase()) ||
                          o.product.toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === 'ALL' || o.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: 'var(--cyan-primary)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            theduck.io.vn
          </a>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              Standalone Demo App (React 19 + Vite)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Kiến trúc ProTrack • Clean Table • Iframe Print
            </div>
          </div>
        </div>

        <button
          onClick={handleRunAiAnalysis}
          disabled={isAiAnalyzing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            border: 'none',
            cursor: isAiAnalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          <Sparkles size={16} />
          {isAiAnalyzing ? 'Đang phân tích...' : 'Gemini AI Phân Tích'}
        </button>
      </div>

      {/* KPI Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TỔNG ĐƠN HÀNG</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{orders.length}</div>
        </div>
        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>ĐƠN HỎA TỐC GẤP</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24' }}>
            {orders.filter(o => o.status === 'urgent').length}
          </div>
        </div>
        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>TỔNG SỐ LƯỢNG</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
            {orders.reduce((acc, o) => acc + o.quantity, 0).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>TIẾN ĐỘ BÌNH QUÂN</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
            {Math.round(orders.reduce((acc, o) => acc + o.progress, 0) / orders.length)}%
          </div>
        </div>
      </div>

      {/* AI Report Card */}
      {aiReport && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '0.9rem' }}>
              ✓ Báo Cáo Thông Minh (Gemini Structured Output)
            </div>
            <button onClick={() => setAiReport(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#f1f5f9', marginBottom: '6px' }}><strong>Điểm nghẽn:</strong> {aiReport.analysis}</div>
          <div style={{ fontSize: '0.85rem', color: '#f1f5f9', marginBottom: '6px' }}><strong>Dự báo:</strong> {aiReport.forecast}</div>
          <div style={{ fontSize: '0.85rem', color: '#38bdf8' }}><strong>Khuyến nghị:</strong> {aiReport.action}</div>
        </div>
      )}

      {/* Search & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder="Tìm theo mã, khách hàng, sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'Cắt', 'In/Thêu', 'May Ráp', 'KCS', 'Đóng Gói', 'Hoàn Thành'].map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: 'none',
                cursor: 'pointer',
                background: selectedStage === stage ? 'var(--cyan-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedStage === stage ? '#000' : '#aaa',
                fontWeight: 600,
              }}
            >
              {stage === 'ALL' ? 'Tất cả' : stage}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Table */}
      <div style={{ overflowX: 'auto', background: 'rgba(12, 16, 26, 0.85)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <table className="clean-table">
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>Khách Hàng &amp; Sản Phẩm</th>
              <th style={{ textAlign: 'right' }}>SL</th>
              <th>Công Đoạn</th>
              <th>Tiến Độ</th>
              <th>Hạn Giao</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="group">
                <td style={{ color: 'var(--cyan-primary)', fontWeight: 700, fontFamily: 'monospace' }}>{order.code}</td>
                <td>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{order.customer}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888' }}>{order.product}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{order.quantity.toLocaleString()}</td>
                <td>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', fontSize: '0.8rem' }}>
                    {order.stage}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${order.progress}%`, height: '100%', background: order.progress === 100 ? '#10b981' : 'var(--cyan-primary)' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#aaa', width: '32px' }}>{order.progress}%</span>
                  </div>
                </td>
                <td style={{ fontSize: '0.8rem', color: '#aaa' }}>{order.deadline}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="row-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handlePrintLabel(order)}
                      style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(0, 240, 255, 0.15)', color: 'var(--cyan-primary)', border: '1px solid rgba(0, 240, 255, 0.3)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      In Tem
                    </button>
                    <button style={{ padding: '4px 6px', borderRadius: '6px', background: '#222', border: '1px solid #444', color: '#aaa', cursor: 'pointer' }}>
                      <Edit3 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simulated Thermal Print Modal */}
      {activePrintOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#fff', color: '#000', padding: '24px', borderRadius: '12px', maxWidth: '380px', width: '100%', fontFamily: 'monospace' }}>
            <div style={{ borderBottom: '2px dashed #000', paddingBottom: '10px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>TEM SẢN XUẤT PROTRACK</div>
              <div style={{ fontSize: '0.75rem' }}>MÃ VẠCH ĐỒNG NAI • VITE REACT 19</div>
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '12px' }}>
              <div><strong>MÃ:</strong> {activePrintOrder.code}</div>
              <div><strong>KH:</strong> {activePrintOrder.customer}</div>
              <div><strong>SP:</strong> {activePrintOrder.product}</div>
              <div><strong>SL:</strong> {activePrintOrder.quantity} PCS</div>
              <div><strong>CÔNG ĐOẠN:</strong> {activePrintOrder.stage}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 0', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', marginBottom: '16px' }}>
              <div style={{ letterSpacing: '4px', fontSize: '1.3rem', fontWeight: 900 }}>|||| | |||||| || | |||| |||</div>
              <div style={{ fontSize: '0.75rem' }}>*{activePrintOrder.code}*</div>
            </div>
            {printedSuccess ? (
              <div style={{ background: '#dcfce7', color: '#15803d', padding: '8px', textAlign: 'center', fontWeight: 700, borderRadius: '6px' }}>
                ✓ Đã in thành công qua Iframe!
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={executePrint} style={{ flex: 1, background: '#000', color: '#fff', padding: '10px', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Kích hoạt In Ngay
                </button>
                <button onClick={() => setActivePrintOrder(null)} style={{ background: '#eee', padding: '10px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
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
