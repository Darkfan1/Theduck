import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://theduck.io.vn'),
  title: 'Tôn Đông Vũ | Giải Pháp Tem Nhãn - Kỹ Thuật In - Mini ERP',
  description: 'Tư vấn giải pháp tem nhãn, cung cấp tem nhãn chất lượng cao, giá cả cạnh tranh. Đào tạo thiết kế kỹ thuật in - chế bản prepress thực chiến. Chuyển đổi số, phát triển mini ERP may đo tối ưu cho doanh nghiệp in.',
  keywords: [
    'Tôn Đông Vũ',
    'Đông Vũ',
    'theduck.io.vn',
    'freelancer developer',
    'phần mềm tem nhãn',
    'lập trình erp xưởng in',
    'phần mềm mes sản xuất',
    'quản trị sản xuất tem nhãn',
    'tem nhãn Đồng Nai',
    'Tem nhãn chuyên nghiệp',
    'phần mềm theo yêu cầu',
    'Thiết kế kỹ thuật in',
    'Cung cấp tem nhãn giá rẻ'
  ],
  authors: [{ name: 'Tôn Đông Vũ', url: 'https://theduck.io.vn' }],
  creator: 'Tôn Đông Vũ',
  publisher: 'Tôn Đông Vũ',
  openGraph: {
    title: 'Tôn Đông Vũ | Giải Pháp Tem Nhãn - Kỹ Thuật In - Mini ERP',
    description: 'Tư vấn giải pháp tem nhãn, cung cấp tem nhãn chất lượng cao, giá cả cạnh tranh. Đào tạo thiết kế kỹ thuật in - chế bản prepress thực chiến. Chuyển đổi số, phát triển mini ERP may đo tối ưu cho doanh nghiệp in.',
    url: 'https://theduck.io.vn',
    siteName: 'Tôn Đông Vũ (The Duck) Portfolio',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tôn Đông Vũ | Giải Pháp Phần Mềm Doanh Nghiệp & Vận Hành Sản Xuất',
    description: 'Hiểu đúng vấn đề → Thiết kế đúng quy trình → Xây dựng đúng công cụ.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Tôn Đông Vũ',
    alternateName: 'The Duck',
    url: 'https://theduck.io.vn',
    email: 'thewind2608@gmail.com',
    telephone: '+84939839934',
    jobTitle: 'Giải Pháp Tem Nhãn - Kỹ Thuật In - Mini ERP',
    description: 'Hơn 15 năm kinh nghiệm ngành in ấn, bao bì, tem nhãn kết hợp công nghệ phần mềm thực chiến.',
    knowsAbout: [
      'Next.js',
      'React',
      'TypeScript',
      'Tauri v2',
      'Enterprise MES/ERP',
      'Firebase Firestore Realtime',
      'Google Gemini AI',
      'Clean Table Rule'
    ],
    sameAs: [
      'https://github.com/theduck-vn',
      'https://theduck.io.vn'
    ]
  };

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦆</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Mali:ital,wght@0,600;0,700;0,800;1,700&family=Patrick+Hand&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="ambient-glow-top" />
        <div className="ambient-glow-side" />
        <div className="grid-overlay" />
        {children}
      </body>
    </html>
  );
}
