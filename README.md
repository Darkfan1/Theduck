# 🦆 theduck.io.vn - Portfolio Cá Nhân & Hệ Thống Demo Freelancer

> Website giới thiệu hồ sơ năng lực (Profile), dịch vụ Freelance và các dự án thực chiến dành cho **Full-stack Developer & Enterprise Solutions Architect**.

---

## 🌟 1. KIẾN TRÚC HỆ THỐNG ĐỘT PHÁ (Next.js + React Vite)

Dự án được kiến trúc theo mô hình phân tách tối ưu:
1. **Next.js 15 (App Router)**: Đóng vai trò là cổng hiển thị chính (Landing page, giới thiệu kỹ năng, các gói dịch vụ Freelance, quy trình làm việc, biểu mẫu liên hệ, và tối ưu hóa SEO / Open Graph / Meta tags khi chia sẻ lên Zalo, Facebook, LinkedIn, Telegram).
2. **React 19 + Vite (`projects/mini-erp-vite`)**: Đóng vai trò là môi trường phát triển độc lập cho các dự án Demo phức tạp (ví dụ: **Mini ERP Theo Dõi Sản Xuất & In Mã Vạch ProTrack**). Khi build, ứng dụng này sẽ được xuất bản thẳng vào `public/demos/mini-erp/` để Next.js tự host mà không cần mua thêm server riêng!

---

## 🚀 2. TÍNH NĂNG NỔI BẬT

- **Thiết Kế Dark Mode Hiện Đại**: Phong cách Cyber Tech, Glassmorphism, hiệu ứng ánh sáng Neon viền thẻ, typography cao cấp (`Outfit`, `Inter`, `JetBrains Mono`).
- **Quy Chuẩn Bảng Sạch (The Clean Table Rule)**: Các nút thao tác Sửa / In Tem / Xóa trên từng dòng tự động ẩn và chỉ hiện ra khi rê chuột (`row-actions`).
- **Trợ Lý AI Gemini (Structured JSON Output)**: Chẩn đoán điểm nghẽn dây chuyền sản xuất và dự báo tiến độ chuẩn schema.
- **In Tem Mã Vạch Siêu Tốc (Iframe Thermal Print Fix)**: In tem nhãn ngay lập tức mà không gây đơ hoặc giật lag cây DOM React.
- **Form Liên Hệ & Hiệu Ứng Confetti**: Tương tác trực quan, chọn mức ngân sách và loại dự án kèm pháo hoa chúc mừng.
- **Tối Ưu SEO Toàn Diện**:
  - Hỗ trợ đầy đủ thẻ `openGraph`, `twitter:card`, `sitemap.ts`, `robots.ts`.
  - Tích hợp dữ liệu có cấu trúc `JSON-LD` (`Person` & `SoftwareApplication`).

---

## 📂 3. CẤU TRÚC THƯ MỤC

```text
d:/Theduck/
├── projects/
│   └── mini-erp-vite/        # Dự án React 19 + Vite độc lập (Mini ERP Demo)
│       ├── src/
│       ├── vite.config.ts    # Build tự động vào ../../public/demos/mini-erp
│       └── package.json
├── public/
│   └── demos/
│       └── mini-erp/         # Bản build tĩnh của Vite được Next.js phục vụ trực tiếp
├── src/
│   ├── app/
│   │   ├── demo/
│   │   │   └── mini-erp/     # Trang demo toàn màn hình trong Next.js
│   │   ├── globals.css       # Design system CSS với các biến tokens cao cấp
│   │   ├── layout.tsx        # Cấu hình SEO, Open Graph & JSON-LD
│   │   ├── page.tsx          # Trang chủ tập hợp toàn bộ components
│   │   ├── robots.ts         # Khai báo robots.txt cho Google Bot
│   │   └── sitemap.ts        # Sitemap động https://theduck.io.vn/sitemap.xml
│   ├── components/
│   │   ├── Navbar.tsx        # Thanh điều hướng kính mờ
│   │   ├── Hero.tsx          # Banner chính & Terminal HUD
│   │   ├── ErpDemoApp.tsx    # Component Mini ERP tương tác
│   │   ├── MiniErpShowcase.tsx # Section demo ERP trên trang chủ
│   │   ├── AboutSection.tsx  # Câu chuyện & 4 trụ cột kiến trúc
│   │   ├── TechStack.tsx     # Bảng kỹ năng công nghệ
│   │   ├── FeaturedProjects.tsx # Dự án & Case studies
│   │   ├── FreelanceServices.tsx# Bảng giá & 3 gói dịch vụ
│   │   ├── ProcessTimeline.tsx # Quy trình 4 bước & FAQs
│   │   ├── ContactSection.tsx# Form báo giá & kênh Zalo/Telegram
│   │   └── Footer.tsx        # Chân trang & bản quyền theduck.io.vn
│   └── data/
│       └── portfolioData.ts  # Dữ liệu nội dung, liên hệ, dự án tập trung
└── package.json
```

---

## 💻 4. HƯỚNG DẪN KHỞI CHẠY & LỆNH THỰC THI

### 4.1. Chạy Trang Chủ Portfolio (Next.js)
```bash
npm run dev
```
Truy cập tại: `http://localhost:3001`

### 4.2. Chạy Riêng Bản Demo Mini ERP (React + Vite)
```bash
npm run dev:erp
```
Truy cập tại: `http://localhost:5173`

### 4.3. Đóng Gói Toàn Diện
```bash
# Build dự án Vite Mini ERP vào thư mục public của Next.js:
npm run build:erp

# Build toàn bộ trang web Next.js:
npm run build
```

---

## 🌐 5. HƯỚNG DẪN TRỎ TÊN MIỀN `theduck.io.vn`

### Cách 1: Triển Khai Miễn Phí Trên Vercel (Khuyên Dùng)
1. Đẩy mã nguồn dự án lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial theduck portfolio and mini erp"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/theduck.git
   git push -u origin main
   ```
2. Đăng nhập [Vercel.com](https://vercel.com) -> Bấm **Add New...** -> **Project** -> Chọn repo `theduck` vừa tạo -> Bấm **Deploy**.
3. Vào mục **Settings** -> **Domains** trong Vercel:
   - Nhập `theduck.io.vn` và `www.theduck.io.vn`.
4. Vào trang quản lý tên miền (nhà cung cấp bạn đã mua `theduck.io.vn`, ví dụ iNET, PA Việt Nam, Tenten, Mắt Bão, Cloudflare...):
   - Thêm bản ghi **A**:
     - Host / Tên: `@`
     - Loại: `A`
     - Giá trị: `76.76.21.21`
   - Thêm bản ghi **CNAME**:
     - Host / Tên: `www`
     - Loại: `CNAME`
     - Giá trị: `cname.vercel-dns.com`
5. Vercel sẽ tự động cấp chứng chỉ bảo mật SSL (HTTPS) miễn phí trong vòng 5 - 10 phút.

---

## ✏️ 6. CÁCH TÙY BIẾN THÔNG TIN CÁ NHÂN

Mọi thông tin về tiểu sử, số điện thoại, link Zalo, Telegram, bảng giá dịch vụ và các dự án đều nằm tập trung tại tệp:
👉 `src/data/portfolioData.ts`

Chỉ cần chỉnh sửa nội dung trong file này, toàn bộ giao diện website sẽ tự động cập nhật đồng bộ!
