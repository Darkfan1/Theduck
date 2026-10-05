export interface ProjectItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'ERP/MES' | 'SaaS' | 'Desktop Native' | 'AI Integration';
  description: string;
  highlights: string[];
  technologies: string[];
  demoUrl?: string;
  githubUrl?: string;
  badge?: string;
  metrics?: { label: string; value: string }[];
}

export interface ServicePackage {
  id: string;
  name: string;
  tagline: string;
  priceEstimate: string;
  timeline: string;
  features: string[];
  popular?: boolean;
  recommendedFor: string;
}

export const PORTFOLIO_DATA = {
  personal: {
    brandName: "Tôn Đông Vũ",
    nickName: "The Duck",
    fullName: "Tôn Đông Vũ",
    birthYear: 1982,
    title: "Tư Vấn Tem Nhãn · Đào Tạo Kỹ Thuật In & Prepress · Phát Triển Mini ERP",
    domain: "theduck.io.vn",
    tagline: "Thực chiến xưởng in → Chuẩn hóa kỹ thuật chế bản → Số hóa quản trị bằng Mini ERP tinh gọn.",
    shortBio: "Gần 20 năm kinh nghiệm gắn bó trực tiếp với sàn xưởng in ấn và sản xuất tem nhãn công nghiệp — từ quản trị kho vật tư, thiết kế kỹ thuật in, bình trang xuất film chế bản cho đến điều hành xưởng. Tôi đồng hành cùng doanh nghiệp qua 4 mũi nhọn cốt lõi: Tư vấn & cung ứng tem nhãn; Đào tạo thiết kế kỹ thuật in; Đào tạo xuất film chế bản (Prepress); và Phát triển phần mềm Mini ERP may đo theo quy trình thực tế.",
    status: "Sẵn sàng nhận dự án Freelance & Tư vấn",
    location: "Việt Nam (Hỗ trợ Onsite & Remote toàn quốc)",
    contact: {
      email: "thewind2608@gmail.com",
      phone: "0939 839 934",
      zalo: "https://zalo.me/0939839934",
      telegram: "https://t.me/theduck_dev",
      github: "https://github.com/theduck-vn",
    },
    metrics: [
      { label: "Năm xưởng in & tem nhãn", value: "20+" },
      { label: "Tư vấn & Cung cấp tem nhãn", value: "Đa ngành" },
      { label: "Đào tạo in & Prepress", value: "1-1 Thực chiến" },
      { label: "Mini ERP tải siêu tốc", value: "< 0.3s" },
    ],

    // Câu chuyện cá nhân chi tiết theo đúng định vị 4 công việc chính
    story: {
      whoAmI: {
        title: "Tôi là ai",
        paragraphs: [
          "Tôi là Tôn Đông Vũ, bạn có thể gọi ngắn gọn là Đông Vũ hoặc The Duck. Tôi hiện đang sinh sống, làm việc tại Đồng Nai, Việt Nam.",
          "Tôi có gần 20 năm kinh nghiệm gắn bó trực tiếp với thương mại dịch vụ và sản xuất in ấn bao bì, tem nhãn công nghiệp — đi qua toàn bộ chuỗi mắt xích thực chiến: từ quản trị kho vật tư, thiết kế kỹ thuật in ấn, bình trang xuất film chế bản đến quản lý và điều hành xưởng sản xuất.",
          "Hành trình đó mang lại cho tôi sự am hiểu sâu sắc: Từ đặc tính từng dòng decal (giấy, nhựa PP/PE, xi bạc, tem vỡ, keo đông lạnh/chịu nhiệt), kỹ thuật bù trừ co giãn trục in, chống lé trapping, quản lý màu Pantone đến quy trình RIP và xuất film/CTP đạt chuẩn xưởng.",
          "Lợi thế khác biệt lớn nhất của tôi là sự kết hợp giữa am hiểu thực tế sàn xưởng in ấn với năng lực kiến trúc phần mềm hiện đại. Thay vì các giải pháp cồng kềnh, tôi trực tiếp tư vấn cung cấp tem nhãn, chuyển giao đào tạo kỹ thuật xưởng và phát triển các hệ thống Mini ERP may đo giải quyết trúng đích bài toán của doanh nghiệp."
        ]
      },

      fromProductionToTech: {
        title: "Từ thực chiến xưởng in đến công nghệ",
        paragraphs: [
          "Trong quá trình quản lý và vận hành xưởng thực tế, tôi nhận ra rằng rất nhiều vấn đề của doanh nghiệp in ấn - tem nhãn không nằm ở máy móc hay con người, mà nằm ở việc quy trình kỹ thuật chưa được chuẩn hóa và dữ liệu bị phân tán trong hàng chục file Excel rời rạc.",
          "Sai lệch số liệu tồn kho decal, nhầm lẫn barem tính giá, lỗi file in bị lé trắng (trapping), hỏng bản kẽm do bù dot gain sai... là những thất thoát vô cùng tốn kém nhưng hoàn toàn có thể khắc phục được.",
          "Đó là lý do tôi phát triển con đường tích hợp: Vừa đào tạo chuẩn hóa kỹ thuật in & chế bản cho nhân sự xưởng, vừa xây dựng các phần mềm Mini ERP may đo để tự động hóa tính giá, quản lý lệnh in và theo dõi tiến độ sàn xưởng theo thời gian thực.",
          "Tôi bắt đầu từ câu hỏi: 'Doanh nghiệp in ấn đang gặp điểm nghẽn gì ở sàn xưởng?' — Sau đó giải quyết nó bằng kỹ thuật chuẩn và công nghệ tinh gọn, sát thực tế nhất."
        ]
      },

      whatICanHelp: {
        title: "Tôi có thể giúp gì?",
        subtitle: "4 Mũi nhọn cốt lõi và các giải pháp thực tế cho doanh nghiệp:",
        servicesList: [
          { title: "Tư Vấn & Cung Cấp Tem Nhãn", desc: "Cung cấp đa dạng tem cuộn dán máy, tem tờ bế demi, decal giấy Fasson/Lintec, nhựa PP/PE/PVC, xi bạc, tem vỡ, hologram; keo dán đông lạnh, kháng nhiệt và hóa chất cho mọi ngành nghề." },
          { title: "Đào Tạo Thiết Kế Kỹ Thuật In", desc: "Huấn luyện thực chiến 1-1 cho designer: Trapping chống lé trắng, Overprint, chuẩn màu Pantone/CMYK, bù trừ co giãn trục Flexo, chuẩn hóa khuôn bế/ép kim/UV định hình." },
          { title: "Đào Tạo Xuất Film Chế Bản (Prepress)", desc: "Chuyển giao quy trình bình trang tự động (Signa Station, Preps), làm chủ RIP xưởng in, kiểm soát đường cong bù dot gain hạt trượt, tram AM/FM chống moiré, xuất bản CTP/CTF." },
          { title: "Phát Triển Mini ERP Theo Yêu Cầu", desc: "May đo phần mềm quản trị xưởng in: Báo giá tem nhãn tự động 3 giây, tự tính barem khổ decal tối ưu, bóc tách lệnh sản xuất & BOM vật tư, theo dõi tiến độ công đoạn realtime." },
          { title: "Desktop App Native Siêu Nhẹ (Tauri v2)", desc: "Ứng dụng máy bàn chiếm <75MB RAM, in tem mã vạch siêu tốc qua iframe không đơ máy, quét barcode/QR không độ trễ, chạy ngầm khay hệ thống ổn định." },
          { title: "Số Hóa & Thay Thế Excel Rời Rạc", desc: "Cắt giảm 60% thời gian nhập liệu thủ công, triệt tiêu sai lệch số liệu tồn kho nguyên vật liệu decal, khuôn bế, trục in và đơn hàng giữa các bộ phận." }
        ],
        specialNote: "Tôi đặc biệt am hiểu và giải quyết triệt để những bài toán đặc thù của xưởng in ấn và sản xuất tem nhãn mà các phần mềm đóng gói sẵn trên thị trường không thể đáp ứng."
      },

      philosophy: {
        title: "Triết lý làm việc",
        mainQuote: "Phần mềm tốt không nhất thiết phải phức tạp. Một công cụ tốt là công cụ mà người trực tiếp tại xưởng in có thể hiểu, thao tác nhanh và giải quyết đúng bài toán họ đang gặp phải.",
        subQuote: "Gần 20 năm đi từ sàn xưởng, kho bãi đến bàn quản trị cho tôi một góc nhìn khác biệt: Hiểu bài toán thực tế trước khi dùng công nghệ giải quyết.",
        threePrinciples: [
          { step: "01", text: "Hiểu đúng vấn đề (Từ thực tế xưởng in & vật liệu)" },
          { step: "02", text: "Thiết kế đúng quy trình (Chuẩn hóa kỹ thuật in & chế bản)" },
          { step: "03", text: "Xây dựng đúng công cụ (Mini ERP tinh gọn, may đo)" }
        ]
      },

      orientation: {
        title: "Định hướng & Lời ngỏ",
        content: "Tôi hợp tác cùng các chủ doanh nghiệp in ấn, bao bì, tem nhãn và sản xuất đang có quy trình thủ công, file in hay gặp lỗi kỹ thuật, hoặc đang tìm kiếm giải pháp cung ứng tem nhãn chất lượng cao kết hợp công cụ quản trị tinh gọn.",
        callToAction: "Nếu bạn đang cần giải pháp tem nhãn tối ưu, muốn nâng cấp tay nghề in/prepress cho đội ngũ, hoặc cần một phần mềm quản lý xưởng may đo sát thực tế — hãy cùng kết nối và trao đổi."
      }
    }
  },

  skills: [
    {
      group: "Frontend & UI Engineering",
      icon: "layout",
      items: [
        { name: "Next.js 15 / React 19", level: "Expert", desc: "App Router, SSR, Server Actions, React Compiler" },
        { name: "TypeScript", level: "Expert", desc: "Type-safety nghiêm ngặt, zero any, design patterns" },
        { name: "State & Data Flow", level: "Master", desc: "Context Render Isolation, Zustand, TanStack Query" },
        { name: "Modern CSS & Tailwind", level: "Expert", desc: "Glassmorphism, Bento UI, Dark Mode, Micro-animations" },
      ]
    },
    {
      group: "Enterprise & Desktop Native",
      icon: "cpu",
      items: [
        { name: "Tauri v2 (Rust)", level: "Advanced", desc: "Ứng dụng Desktop <80MB RAM, Multi-window đối chiếu" },
        { name: "Clean Table & Super UI", level: "Master", desc: "Bảng dữ liệu hàng chục ngàn dòng không giật lag" },
        { name: "In ấn Siêu tốc (Iframe Fix)", level: "Specialist", desc: "In hóa đơn, tem mã vạch tức thì, không reload DOM" },
        { name: "Clipboard & Nén Media", level: "Advanced", desc: "Ctrl+V paste ảnh, WebWorker nén ảnh giảm 90% dung lượng" },
      ]
    },
    {
      group: "Backend & Cloud Architecture",
      icon: "database",
      items: [
        { name: "Firebase / Firestore Realtime", level: "Master", desc: "Lắng nghe 2 chiều, tối ưu reads, Deferred Background Sync" },
        { name: "Node.js / NestJS / Express", level: "Advanced", desc: "RESTful API chuẩn OpenAPI, Auth JWT, Webhooks" },
        { name: "PostgreSQL & Database Design", level: "Advanced", desc: "Đánh index tối ưu, phân quyền đa chi nhánh" },
        { name: "Cloudflare & Vercel Deploy", level: "Expert", desc: "Edge caching, CDN siêu tốc, bảo mật DDoS" },
      ]
    },
    {
      group: "AI & Tự động hóa",
      icon: "sparkles",
      items: [
        { name: "Google Gemini AI SDK", level: "Advanced", desc: "Structured JSON Output, phân tích báo cáo và dự báo tiến độ" },
        { name: "Workflow Automation", level: "Advanced", desc: "Đồng bộ đơn hàng, thông báo Zalo ZNS / Telegram Bot" },
        { name: "Barcode & QR Scanner", level: "Master", desc: "Tích hợp máy quét cầm tay, in nhiệt mã vạch xưởng sản xuất" },
      ]
    }
  ],

  projects: [
    {
      id: "mini-erp",
      title: "Hệ Thống Mini ERP & Theo Dõi Sản Xuất Thông Minh",
      subtitle: "Giải pháp quản trị sản xuất xưởng & kho vận thời gian thực (Lấy cảm hứng từ ProTrack)",
      category: "ERP/MES",
      description: "Ứng dụng quản trị toàn diện chu trình sản xuất: từ nhận đơn, xuất lệnh sản xuất, theo dõi tiến độ từng công đoạn chuyền may/in, kiểm soát tồn kho tới in tem mã vạch.",
      highlights: [
        "Áp dụng quy chuẩn Clean Table Rule: giao diện sạch bóng, thao tác nhanh",
        "Tích hợp Gemini AI phân tích điểm nghẽn dây chuyền và dự báo hạn chót giao hàng",
        "In ấn siêu tốc qua thẻ Iframe không đơ giao diện",
        "Realtime hai chiều với cơ chế ngắt lắng nghe khi chuyển tab giúp tiết kiệm chi phí Cloud",
      ],
      technologies: ["React 19", "Vite", "TypeScript", "Next.js", "Gemini AI", "Clean Table"],
      badge: "⭐ Live Demo Sẵn Sàng",
      demoUrl: "/demo/mini-erp",
      metrics: [
        { label: "Tốc độ tải", value: "< 0.3s" },
        { label: "Dung lượng bộ nhớ", value: "< 50MB" },
        { label: "Tiết kiệm thời gian nhập liệu", value: "60%" }
      ]
    },
    {
      id: "desktop-pos-terminal",
      title: "Ứng Dụng Desktop Native Kiểm Kho & In Mã Vạch",
      subtitle: "Đóng gói đa nền tảng Windows/macOS với Tauri v2",
      category: "Desktop Native",
      description: "Phần mềm máy bàn phục vụ nhân viên kho bãi và xưởng sản xuất. Hỗ trợ quét mã vạch không độ trễ, mở cửa sổ phụ đối chiếu dữ liệu song song (Ctrl + Shift + N) và chạy ngầm thanh Taskbar.",
      highlights: [
        "Chiếm chưa tới 75MB RAM khi chạy liên tục 24/7",
        "Chống đóng băng tiến trình WebView2 khi app chạy nền",
        "Thông báo native Windows WinRT Toast tức thì khi có đơn gấp",
      ],
      technologies: ["Tauri v2", "Rust", "React", "TypeScript", "WinRT"],
      badge: "Desktop Native"
    },
    {
      id: "b2b-saas-analytics",
      title: "Nền Tảng B2B Analytics & Dashboard Điều Hành",
      subtitle: "Báo cáo số liệu kinh doanh đa chi nhánh cho ban giám đốc",
      category: "SaaS",
      description: "Bảng điều khiển kinh doanh tập trung hiển thị doanh thu, dòng tiền, hiệu suất chuyền sản xuất và tỷ lệ hao hụt nguyên vật liệu theo thời gian thực.",
      highlights: [
        "Render Isolation giúp cập nhật biểu đồ không ảnh hưởng form nhập liệu",
        "Xuất file Excel chuẩn doanh nghiệp với định dạng màu và đường kẻ tự động",
        "Bộ theme linh hoạt (Bento Glass, Aubergine Studio, Rose Stage)",
      ],
      technologies: ["Next.js", "Chart.js", "ExcelJS", "Firebase Firestore"],
      badge: "High Performance"
    }
  ],

  services: [
    {
      id: "sprint-mvp",
      name: "Xây Dựng MVP Nhanh (1 - 2 Tuần)",
      tagline: "Biến ý tưởng thành sản phẩm chạy được cho Khách hàng & Nhà đầu tư",
      priceEstimate: "Tối ưu ngân sách theo tính năng",
      timeline: "7 - 14 Ngày",
      recommendedFor: "Startup, Chủ cửa hàng, Doanh nghiệp muốn kiểm chứng ý tưởng sớm",
      features: [
        "Website hoặc Web App hoàn chỉnh chuẩn SEO & Mobile responsive",
        "Tích hợp Auth, Đăng nhập, Database đám mây tốc độ cao",
        "Giao diện hiện đại (Dark/Light mode, animations cuốn hút)",
        "Bàn giao trọn gói mã nguồn + Hướng dẫn vận hành 1-1",
        "Bảo hành kỹ thuật miễn phí 3 tháng",
      ]
    },
    {
      id: "custom-erp",
      name: "Phần Mềm Quản Trị May Đo (MES / ERP / CRM)",
      tagline: "Xây dựng đúng theo từng công đoạn và thói quen thực tế của doanh nghiệp bạn",
      priceEstimate: "Báo giá theo Blueprint chi tiết",
      timeline: "3 - 6 Tuần",
      popular: true,
      recommendedFor: "Xưởng sản xuất, Doanh nghiệp thương mại, Kho vận, Phân phối",
      features: [
        "Khảo sát thực tế quy trình & thiết kế luồng dữ liệu chuẩn",
        "Áp dụng kiến trúc Clean Table: bảng biểu tải hàng ngàn dòng mượt mà",
        "Hỗ trợ in ấn siêu tốc (tem nhãn, hóa đơn xuất kho qua máy in nhiệt)",
        "Tích hợp quét mã vạch (Barcode / QR Code)",
        "Phân quyền nhân viên chặt chẽ theo phòng ban / vai trò",
        "Tối ưu chi phí đọc ghi dữ liệu đám mây (giảm 70-80% chi phí hàng tháng)",
        "Bảo hành & nâng cấp đồng hành dài hạn",
      ]
    },
    {
      id: "desktop-ai-upgrade",
      name: "Đóng Gói Desktop Native (Tauri) & Tích Hợp AI",
      tagline: "Nâng cấp hệ thống web sẵn có thành app Desktop siêu nhẹ hoặc tích hợp trợ lý AI",
      priceEstimate: "Linh hoạt theo module",
      timeline: "5 - 10 Ngày",
      recommendedFor: "Hệ thống cần chạy offline-first, chiếm ít RAM hoặc cần tự động hóa bằng AI",
      features: [
        "Chuyển đổi Web App sang Desktop app bằng Tauri v2 (<80MB RAM)",
        "Tích hợp phím tắt toàn cục, khay hệ thống (System Tray) và in ấn nền",
        "Tích hợp Gemini AI phân tích dữ liệu, tự động tóm tắt báo cáo kinh doanh",
        "Nén ảnh máy khách và tính năng paste ảnh trực tiếp từ Clipboard",
      ]
    }
  ],

  processSteps: [
    {
      step: "01",
      title: "Khảo Sát & Lên Blueprint",
      desc: "Lắng nghe bài toán thực tế, bóc tách quy trình làm việc và chốt danh sách tính năng (User Stories) rõ ràng, minh bạch."
    },
    {
      step: "02",
      title: "Thiết Kế UI/UX & Kiến Trúc",
      desc: "Dựng Wireframe và thiết kế giao diện chuẩn phong cách hiện đại. Lựa chọn kiến trúc dữ liệu tối ưu chi phí và hiệu năng."
    },
    {
      step: "03",
      title: "Phát Triển Theo Sprint Tuần",
      desc: "Lập trình cuốn chiếu, mỗi tuần đều có bản cập nhật chạy thực tế để bạn test và phản hồi trực tiếp, không bao giờ bị 'trễ hẹn bất ngờ'."
    },
    {
      step: "04",
      title: "Bàn Giao & Bảo Hành Đồng Hành",
      desc: "Deploy lên domain của bạn, bàn giao toàn bộ Source code, hướng dẫn sử dụng và bảo hành kỹ thuật, hỗ trợ mở rộng lâu dài."
    }
  ],

  faqs: [
    {
      q: "Chi phí phát triển phần mềm được tính như thế nào?",
      a: "Tôi luôn báo giá trọn gói dựa trên bảng phân tích tính năng rõ ràng (Feature Breakdown), không phát sinh phụ phí ẩn. Bạn chỉ thanh toán theo từng giai đoạn nghiệm thu (Milestone)."
    },
    {
      q: "Tôi có được sở hữu toàn bộ mã nguồn không?",
      a: "Có 100%. Sau khi hoàn thành dự án, toàn bộ source code trên GitHub/GitLab và quyền quản trị cloud sẽ được bàn giao đầy đủ cho bạn."
    },
    {
      q: "Tại sao nên chọn kiến trúc Next.js + React Vite + Tauri thay vì giải pháp có sẵn?",
      a: "Các phần mềm đóng gói sẵn thường cồng kềnh, thu phí hàng tháng đắt đỏ và không khớp quy trình riêng của bạn. Giải pháp may đo giúp tốc độ cực nhanh, không phụ thuộc bên thứ 3 và tối ưu chi phí cloud đến 80%."
    }
  ],

  experiences: [
    {
      id: "theduck-freelance",
      role: "Senior Fullstack Engineer & Solutions Architect",
      organization: "The Duck Tech (Freelance & Tư Vấn Doanh Nghiệp)",
      period: "2023 - Hiện tại",
      location: "Remote / Onsite Toàn Quốc",
      tag: "Freelance Chuyên Sâu",
      description: "Chuyên tư vấn kiến trúc, thiết kế và phát triển các hệ thống phần mềm quản lý sản xuất (MES/ERP), Web App hiệu năng cao và Desktop Native cho các xưởng sản xuất, kho vận và doanh nghiệp thương mại.",
      achievements: [
        "Thiết kế giải pháp Deferred Background Sync giúp giảm tới 85% chi phí đọc dữ liệu Firestore Realtime hàng tháng.",
        "Đóng gói ứng dụng desktop native bằng Tauri v2 siêu nhẹ (chiếm chưa tới 75MB RAM) thay thế Electron cồng kềnh.",
        "Tích hợp Google Gemini AI với Structured JSON Output để tự động phát hiện điểm nghẽn dây chuyền và dự báo tiến độ giao hàng.",
        "Hoàn thành hơn 35+ dự án với mức độ hài lòng khách hàng đạt 99.8% và bàn giao 100% mã nguồn sạch."
      ],
      technologies: ["Next.js 15", "React 19", "TypeScript", "Tauri v2", "Firestore Realtime", "Gemini AI", "Cloudflare"]
    },
    {
      id: "protrack-engineer",
      role: "Lead Frontend & System Architect",
      organization: "Hệ Thống Quản Lý Sản Xuất ProTrack (Mã Vạch Đồng Nai)",
      period: "2021 - 2023",
      location: "Đồng Nai / TP.HCM",
      tag: "Hệ Thống MES / ERP",
      description: "Phụ trách kiến trúc toàn bộ hệ thống theo dõi tiến độ đơn hàng sản xuất xưởng may, quản lý kho nguyên phụ liệu và hệ thống in tem nhãn nhiệt mã vạch tốc độ cao.",
      achievements: [
        "Sáng tạo giải pháp in tem mã vạch siêu tốc qua thẻ Iframe ẩn, loại bỏ 100% tình trạng đơ giao diện React khi in hàng loạt.",
        "Thiết lập và chuẩn hóa 'The Clean Table Rule' cho toàn bộ bảng biểu dữ liệu, nâng cao trải nghiệm người dùng vận hành.",
        "Phát triển tính năng dán ảnh trực tiếp từ Clipboard (Ctrl + V) kết hợp WebWorker nén ảnh phía máy khách, tiết kiệm 90% dung lượng Cloud Storage.",
        "Xây dựng cơ chế Multi-Window đối chiếu đơn hàng độc lập (Ctrl + Shift + N) trên ứng dụng Desktop."
      ],
      technologies: ["React", "Vite", "TypeScript", "Tailwind CSS", "Firebase", "Thermal Printer", "ExcelJS"]
    },
    {
      id: "b2b-saas-developer",
      role: "Fullstack Web Developer",
      organization: "Enterprise Cloud Platforms & B2B Solutions",
      period: "2019 - 2021",
      location: "Việt Nam",
      tag: "B2B SaaS / Web Platform",
      description: "Tham gia xây dựng các nền tảng Web App quản trị kinh doanh, phân tích dữ liệu bán hàng đa chi nhánh và tích hợp cổng thanh toán / vận chuyển tự động.",
      achievements: [
        "Tối ưu hóa kiến trúc Database PostgreSQL và chỉ mục đánh Index, giảm thời gian phản hồi truy vấn từ 2.4s xuống dưới 0.35s.",
        "Xây dựng hệ thống tự động hóa gửi thông báo cập nhật đơn hàng qua Zalo ZNS và Telegram Bot phục vụ hàng ngàn người dùng.",
        "Triển khai kiến trúc Render Isolation giúp cập nhật biểu đồ phân tích thời gian thực mà không làm ảnh hưởng form nhập liệu."
      ],
      technologies: ["Node.js", "Express", "PostgreSQL", "React", "Docker", "RESTful API", "Zalo ZNS"]
    }
  ]
};
