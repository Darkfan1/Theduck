import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://theduck.io.vn'),
  title: 'Tôn Đông Vũ (The Duck) | Giải Pháp Phần Mềm Doanh Nghiệp & Vận Hành Sản Xuất',
  description: 'Portfolio của Tôn Đông Vũ - Hơn 20 năm kinh nghiệm trong ngành sản xuất công nghiệp, bao bì, in ấn & tem nhãn. Chuyên gia tư vấn và phát triển giải pháp phần mềm quản trị doanh nghiệp (MES/ERP), Web App và Desktop App thực chiến.',
  keywords: [
    'Tôn Đông Vũ',
    'Ton Dong Vu',
    'theduck',
    'theduck.io.vn',
    'freelancer developer viet nam',
    'phần mềm in ấn bao bì',
    'lập trình erp xưởng',
    'phần mềm mes sản xuất',
    'quản trị sản xuất tem nhãn',
    'react 19',
    'nextjs 15',
    'tauri v2',
    'clean table rule'
  ],
  authors: [{ name: 'Tôn Đông Vũ', url: 'https://theduck.io.vn' }],
  creator: 'Tôn Đông Vũ',
  publisher: 'Tôn Đông Vũ',
  openGraph: {
    title: 'Tôn Đông Vũ | Giải Pháp Phần Mềm Doanh Nghiệp & Vận Hành Sản Xuất',
    description: 'Hơn 20 năm kinh nghiệm sản xuất, in ấn và bao bì. Kết hợp thực tế sàn xưởng và công nghệ phần mềm để tạo nên các công cụ quản trị tinh gọn, hiệu quả.',
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
    birthDate: '1982',
    url: 'https://theduck.io.vn',
    email: 'thewind2608@gmail.com',
    telephone: '+84939839934',
    jobTitle: 'Chuyên Gia Vận Hành Sản Xuất & Kiến Trúc Phần Mềm Doanh Nghiệp',
    description: 'Hơn 20 năm kinh nghiệm ngành in ấn, bao bì, tem nhãn kết hợp công nghệ phần mềm thực chiến.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="grid-overlay" />
        {children}
      </body>
    </html>
  );
}
