'use client';

import React from 'react';

export interface DocTip {
  key: string;
  icon: string;
  category: {
    vi: string;
    en: string;
  };
  title: {
    vi: string;
    en: string;
  };
  content: {
    vi: string;
    en: string;
  };
  deepTip?: {
    vi: string;
    en: string;
  };
}

export const getLocalizedText = (lang: 'vi' | 'en') => ({
  tipsTitle: lang === 'vi' ? 'Mẹo hữu ích' : 'User Tips',
  proTipTitle: lang === 'vi' ? 'Mẹo chuyên sâu' : 'Pro Tip',
  allTipsTitle: lang === 'vi' ? 'Tất cả mẹo sử dụng' : 'All User Tips',
  closeBtn: lang === 'vi' ? 'Đóng' : 'Close',
  nextTip: lang === 'vi' ? 'Mẹo tiếp theo' : 'Next tip',
  prevTip: lang === 'vi' ? 'Mẹo trước đó' : 'Previous tip',
  showAll: lang === 'vi' ? 'Xem tất cả' : 'View all',
  deepTipHint: lang === 'vi' ? 'Nhấn để xem mẹo chuyên sâu' : 'Click to see pro tip',
  noTips: lang === 'vi' ? 'Không có mẹo nào.' : 'No tips available.',
  categoryAll: lang === 'vi' ? 'Tất cả' : 'All',
  categorySecurity: lang === 'vi' ? 'Bảo mật & Xem thử' : 'Security & Preview',
  categoryVersion: lang === 'vi' ? 'Kiểm soát phiên bản' : 'Version Control',
  categoryUX: lang === 'vi' ? 'Trải nghiệm người dùng' : 'User Experience',
  categoryProductivity: lang === 'vi' ? 'Hiệu suất làm việc' : 'Productivity',
  categoryQuick: lang === 'vi' ? 'Tiện ích nhanh' : 'Quick Actions',
  categoryAdvanced: lang === 'vi' ? 'Soạn thảo nâng cao' : 'Advanced Editing'
});

export function TipIcon({ name, size = 18, ...props }: { name: string; size?: number; [key: string]: any }) {
  switch (name) {
    case 'shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      );
    case 'history':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <polyline points="3 3 3 8 8 8"/>
          <line x1="12" y1="7" x2="12" y2="12"/>
          <line x1="12" y1="12" x2="16" y2="14"/>
        </svg>
      );
    case 'sync':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M21 2v6h-6"/>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M3 22v-6h6"/>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
      );
    case 'keyboard':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
          <line x1="6" y1="8" x2="6" y2="8"/>
          <line x1="10" y1="8" x2="10" y2="8"/>
          <line x1="14" y1="8" x2="14" y2="8"/>
          <line x1="18" y1="8" x2="18" y2="8"/>
          <line x1="6" y1="12" x2="6" y2="12"/>
          <line x1="10" y1="12" x2="10" y2="12"/>
          <line x1="14" y1="12" x2="14" y2="12"/>
          <line x1="18" y1="12" x2="18" y2="12"/>
          <line x1="7" y1="16" x2="17" y2="16"/>
        </svg>
      );
    case 'copy':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      );
    case 'print':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
      );
    case 'beaker':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <line x1="6" y1="3" x2="18" y2="3"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
          <path d="M18 21H6L12 9l6 12z"/>
        </svg>
      );
    case 'moon':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      );
    case 'flowchart':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="3" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="8.5" y="16" width="7" height="5" rx="1"/>
          <path d="M6.5 8v4.5a1.5 1.5 0 0 0 1.5 1.5h4"/>
          <path d="M17.5 8v4.5a1.5 1.5 0 0 1-1.5 1.5h-4"/>
          <line x1="12" y1="14" x2="12" y2="16"/>
        </svg>
      );
    case 'code':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      );
    case 'alert':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      );
    case 'flash':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      );
    case 'git-merge':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <circle cx="18" cy="18" r="3"/>
          <circle cx="6" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/>
          <path d="M18 15V9a4 4 0 0 0-4-4H9"/>
          <line x1="6" y1="9" x2="6" y2="15"/>
        </svg>
      );
    case 'sidebar':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
      );
    case 'handshake':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case 'rotate-ccw':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M3 2v6h6"/>
          <path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>
        </svg>
      );
    case 'sparkles':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M9.66 16.04a4 4 0 0 1-1.16-2.54 4 4 0 1 1 7 0 4 4 0 0 1-1.16 2.54"/>
        </svg>
      );
    case 'film':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
          <line x1="7" y1="2" x2="7" y2="22"/>
          <line x1="17" y1="2" x2="17" y2="22"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
        </svg>
      );
    case 'undo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <polyline points="9 14 4 9 9 4"/>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
        </svg>
      );
    case 'scroll-sync':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M8 3v18M16 3v18M3 8h18M3 16h18"/>
        </svg>
      );
    case 'merge':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M12 22v-8"/>
          <path d="M5 12V2h14v10"/>
          <path d="M12 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
        </svg>
      );
    case 'monitor':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      );
    case 'settings-shield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      );
    case 'bulb':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12.5 2.5a5.5 5.5 0 0 0-5 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
          <path d="M9 18h6M10 22h4"/>
        </svg>
      );
    case 'list':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      );
    default:
      return null;
  }
}

export const docViewerTips: DocTip[] = [
  {
    key: 'tip.sandbox_toggle',
    icon: 'shield',
    category: {
      vi: 'Bảo mật & Xem thử',
      en: 'Security & Preview'
    },
    title: {
      vi: 'Chuyển chế độ xem an toàn',
      en: 'Toggle Sandbox Mode'
    },
    content: {
      vi: 'Nhấn vào biểu tượng SANDBOX MODE trên thanh công cụ phía trên để chuyển đổi nhanh giữa chế độ Chỉ đọc (Read-only) và chế độ Chỉnh sửa (Edit Mode). Chế độ xem an toàn giúp bạn đọc tài liệu thoải mái mà không sợ gõ nhầm hay làm thay đổi nội dung file gốc.',
      en: 'Click the SANDBOX MODE icon on the top toolbar to quickly switch between Read-only and Edit Mode. Sandbox mode helps you read documents comfortably without accidental keystrokes or changes to the original file.'
    },
    deepTip: {
      vi: 'Trước khi lưu tệp, hãy đổi lại về Sandbox Mode để kiểm tra hiển thị định dạng xem đã chuẩn xác và đẹp mắt chưa.',
      en: 'Before saving the file, switch back to Sandbox Mode to verify if the rendered preview is correct and looks good.'
    }
  },
  {
    key: 'tip.version_compare',
    icon: 'history',
    category: {
      vi: 'Kiểm soát phiên bản',
      en: 'Version Control'
    },
    title: {
      vi: 'Đối chiếu lịch sử phiên bản',
      en: 'Compare Version History'
    },
    content: {
      vi: 'Nhấn vào nút Phiên bản ở góc trên bên phải để xem lịch sử chỉnh sửa. Khi chọn một phiên bản cũ, màn hình sẽ tự động chia đôi để bạn so sánh trực tiếp bản đang sửa và bản lưu trữ cũ.',
      en: 'Click the Version button in the top right to view edit history. Selecting an older version automatically splits the screen to let you compare the active draft directly with the archive.'
    },
    deepTip: {
      vi: 'Hãy nhìn vào màu sắc hiển thị để nhận diện thay đổi: Phần màu đỏ thể hiện nội dung bị xóa ở bản cũ, phần màu xanh lá thể hiện nội dung được thêm mới ở bản hiện tại.',
      en: 'Pay attention to the color highlights: red indicates deleted content from the old version, and green indicates new content added in the current version.'
    }
  },
  {
    key: 'tip.sync_scroll',
    icon: 'sync',
    category: {
      vi: 'Trải nghiệm người dùng',
      en: 'User Experience'
    },
    title: {
      vi: 'Cuộn đồng bộ hai màn hình',
      en: 'Synchronized Scrolling'
    },
    content: {
      vi: 'Trong chế độ so sánh phiên bản, khi bạn cuộn trang ở bất kỳ bên nào, màn hình đối diện sẽ tự động cuộn theo tương ứng để giữ cho các dòng chữ cần đối chiếu luôn thẳng hàng và dễ đọc nhất.',
      en: 'In version comparison mode, scrolling on either side automatically scrolls the opposing panel to keep matching lines aligned and easy to read.'
    },
    deepTip: {
      vi: 'Nếu muốn cuộn độc lập một bên, bạn chỉ cần di chuyển con trỏ chuột sang bên đó và cuộn nhanh, hệ thống sẽ tự nhận diện.',
      en: 'To scroll one side independently, just move your cursor over that pane and scroll quickly; the system will detect it automatically.'
    }
  },
  {
    key: 'tip.save_shortcut',
    icon: 'keyboard',
    category: {
      vi: 'Hiệu suất làm việc',
      en: 'Productivity'
    },
    title: {
      vi: 'Phím tắt lưu tài liệu nhanh (Ctrl + S)',
      en: 'Quick Save Shortcut (Ctrl + S)'
    },
    content: {
      vi: 'Khi đang ở chế độ chỉnh sửa (Edit Mode), bạn chỉ cần nhấn tổ hợp phím Ctrl + S (hoặc Cmd + S trên macOS) để lưu nhanh tài liệu mà không cần phải rê chuột tìm nút Lưu trên thanh công cụ.',
      en: 'When in Edit Mode, simply press Ctrl + S (or Cmd + S on macOS) to quickly save the document without searching for the Save button.'
    },
    deepTip: {
      vi: 'Khi tài liệu đã được lưu thành công, hệ thống sẽ hiển thị một thông báo nhỏ màu xanh lá xác nhận ở góc màn hình.',
      en: 'Upon a successful save, a green notification banner will temporarily appear at the corner of your screen.'
    }
  },
  {
    key: 'tip.copy_raw',
    icon: 'copy',
    category: {
      vi: 'Tiện ích nhanh',
      en: 'Quick Actions'
    },
    title: {
      vi: 'Sao chép nhanh nội dung gốc',
      en: 'Copy Raw Content'
    },
    content: {
      vi: 'Để chia sẻ nhanh nội dung văn bản hoặc mã nguồn, bạn hãy nhấn nút Sao chép trên thanh công cụ. Toàn bộ nội dung gốc của tệp sẽ được chép vào bộ nhớ đệm thiết bị của bạn ngay lập tức.',
      en: 'To share text or source code quickly, click the Copy button on the toolbar. The entire raw content of the file will be copied to your clipboard instantly.'
    },
    deepTip: {
      vi: 'Nút sao chép sẽ chuyển sang trạng thái đã sao chép màu xanh lá trong vài giây để xác nhận thao tác thành công.',
      en: 'The Copy button will temporarily turn green and display a checkmark to confirm success.'
    }
  },
  {
    key: 'tip.export_pdf',
    icon: 'print',
    category: {
      vi: 'Tiện ích nhanh',
      en: 'Quick Actions'
    },
    title: {
      vi: 'Xuất bản tài liệu PDF sạch',
      en: 'Export Clean PDF'
    },
    content: {
      vi: 'Nhấn nút Xuất PDF trên thanh công cụ để mở hộp thoại in của trình duyệt. Giao diện trang in đã được tối ưu hóa đặc biệt: tự động ẩn toàn bộ các thanh công cụ, các nút bấm điều hướng và thanh bên để trang tài liệu sạch sẽ, rõ ràng nhất.',
      en: 'Click the Export PDF button to open the browser print dialog. The print layout is specially optimized: all toolbars, navigation buttons, and sidebars are hidden for a clean, professional document layout.'
    },
    deepTip: {
      vi: 'Bạn có thể chọn lưu dưới dạng file PDF trong hộp thoại in để lưu trữ ngoại tuyến tài liệu của mình với định dạng hiển thị chuẩn.',
      en: 'You can choose "Save as PDF" in the print dialog to store your document offline with standard formatting.'
    }
  },
  {
    key: 'tip.playground_preview',
    icon: 'beaker',
    category: {
      vi: 'Bảo mật & Xem thử',
      en: 'Security & Preview'
    },
    title: {
      vi: 'Thay đổi xem thử an toàn',
      en: 'Playground Preview Mode'
    },
    content: {
      vi: 'Khi bạn mở một tài liệu thuộc nhóm chia sẻ nhưng không có quyền chỉnh sửa, hệ thống sẽ chuyển sang chế độ Xem thử. Bạn vẫn có thể soạn thảo, thay đổi nội dung để xem trước hiển thị trên màn hình của mình nhưng không thể lưu đè lên file gốc.',
      en: 'Opening a shared document without edit permissions automatically starts Playground Preview Mode. You can edit the text to preview changes locally, but you cannot save them back to the original file.'
    },
    deepTip: {
      vi: 'Hãy yên tâm chỉnh sửa thử nghiệm ý tưởng vì hệ thống bảo vệ tệp gốc sẽ ngăn chặn mọi hành vi ghi đè dữ liệu ngoài ý muốn.',
      en: 'Experiment freely; the original file remains protected against accidental overwrite.'
    }
  },
  {
    key: 'tip.local_theme_toggle',
    icon: 'moon',
    category: {
      vi: 'Trải nghiệm người dùng',
      en: 'User Experience'
    },
    title: {
      vi: 'Thay đổi giao diện nhanh',
      en: 'Toggle Theme Locally'
    },
    content: {
      vi: 'Nhấn vào biểu tượng Mặt trăng / Mặt trời trên thanh công cụ góc phải để chuyển đổi nhanh giữa giao diện Sáng và Tối riêng cho trình xem DocViewer mà không làm ảnh hưởng đến chủ đề màu chung của Dashboard.',
      en: 'Click the Moon/Sun icon on the top-right toolbar to toggle between Light and Dark mode for DocViewer without affecting the overall dashboard theme.'
    },
    deepTip: {
      vi: 'Giao diện sáng/tối này sẽ tự động áp dụng đồng bộ trên tất cả các tab DocViewer khác đang mở để bảo vệ thị lực của bạn.',
      en: 'This theme choice is synchronized across all active DocViewer tabs to protect your eyesight.'
    }
  },
  {
    key: 'tip.mermaid_charts',
    icon: 'flowchart',
    category: {
      vi: 'Soạn thảo nâng cao',
      en: 'Advanced Editing'
    },
    title: {
      vi: 'Vẽ sơ đồ trực quan bằng văn bản',
      en: 'Render Mermaid Diagrams'
    },
    content: {
      vi: 'Khi viết tài liệu Markdown, bạn có thể tạo nhanh các sơ đồ quy trình, lưu đồ, hoặc sơ đồ tư duy bằng cách viết các đoạn khai báo đơn giản dạng văn bản (sử dụng khối mã Mermaid).',
      en: 'In Markdown, you can generate flowcharts, sequence diagrams, or mind maps using text-based declarations in a Mermaid code block.'
    },
    deepTip: {
      vi: 'Khi chuyển sang chế độ Sandbox hoặc xem trước, hệ thống sẽ tự động vẽ các đoạn văn bản này thành sơ đồ hình ảnh trực quan sinh động.',
      en: 'Switching to Sandbox Mode or preview automatically renders these code blocks into beautiful, interactive visual diagrams.'
    }
  },
  {
    key: 'tip.auto_syntax_highlight',
    icon: 'code',
    category: {
      vi: 'Hiệu suất làm việc',
      en: 'Productivity'
    },
    title: {
      vi: 'Tự động nhận diện cú pháp',
      en: 'Auto Syntax Highlighting'
    },
    content: {
      vi: 'DocViewer tự động nhận diện ngôn ngữ lập trình hoặc cấu hình của tệp tin để áp dụng bộ tô màu chữ phù hợp, giúp bạn đọc mã nguồn dễ dàng và nhận biết lỗi cú pháp nhanh hơn.',
      en: 'DocViewer automatically detects the programming or markup language of your file to apply syntax highlighting, making code easier to read and errors faster to spot.'
    },
    deepTip: {
      vi: 'Hệ thống hỗ trợ tô màu chuẩn cho hầu hết các ngôn ngữ phổ biến như Javascript, Python, JSON, HTML, CSS, và các file cấu hình.',
      en: 'Highlighting supports popular languages including JavaScript, Python, JSON, HTML, CSS, and configuration files.'
    }
  },
  {
    key: 'tip.unsaved_warning',
    icon: 'alert',
    category: {
      vi: 'Bảo mật & Xem thử',
      en: 'Security & Preview'
    },
    title: {
      vi: 'Cảnh báo dữ liệu chưa lưu',
      en: 'Unsaved Changes Protection'
    },
    content: {
      vi: 'Nếu bạn đã chỉnh sửa tài liệu nhưng chưa lưu mà vô tình bấm đóng tab hoặc bấm chuyển sang tệp tin khác ở thanh bên, hệ thống sẽ hiển thị cảnh báo xác nhận để ngăn chặn việc mất dữ liệu.',
      en: 'If you have unsaved changes and attempt to close the tab or switch files via the sidebar, the system will prompt you to confirm to prevent data loss.'
    },
    deepTip: {
      vi: 'Hãy chắc chắn nhấn "Hủy" trên hộp thoại nếu muốn tiếp tục chỉnh sửa và lưu lại công việc của mình.',
      en: 'Click "Cancel" on the confirm dialog if you want to keep editing and save your progress.'
    }
  },
  {
    key: 'tip.load_large_files',
    icon: 'flash',
    category: {
      vi: 'Trải nghiệm người dùng',
      en: 'User Experience'
    },
    title: {
      vi: 'Tối ưu hóa đọc tệp tin lớn',
      en: 'Large File Optimization'
    },
    content: {
      vi: 'Hệ thống tự động tối ưu hóa hiệu năng khi bạn đọc các tài liệu hoặc tệp văn bản có dung lượng cực lớn, giúp trang tải nhanh và không bao giờ bị giật lag.',
      en: 'The system automatically optimizes performance when opening large files, ensuring fast loading and stutter-free scrolling.'
    },
    deepTip: {
      vi: 'Giao diện tự động phân bổ tài liệu thông minh khi bạn cuộn trang, giúp tiết kiệm bộ nhớ thiết bị mà vẫn đảm bảo quá trình đọc liền mạch.',
      en: 'Smart window rendering loads content dynamically during scroll, saving system memory while ensuring smooth reading.'
    }
  },
  {
    key: 'tip.three_way_merge',
    icon: 'git-merge',
    category: {
      vi: 'Kiểm soát phiên bản',
      en: 'Version Control'
    },
    title: {
      vi: 'Giải quyết xung đột gộp tài liệu',
      en: 'Conflict Resolution'
    },
    content: {
      vi: 'Khi có hai người cùng chỉnh sửa một tài liệu tại một thời điểm, hệ thống sẽ mở màn hình trợ giúp đối chiếu để bạn dễ dàng lựa chọn nội dung chính xác nhất trước khi ghi đè lên máy chủ.',
      en: 'If two editors modify the same file concurrently, the system opens a merge screen so you can pick the correct changes before writing to the server.'
    },
    deepTip: {
      vi: 'Bạn có thể xem các thay đổi khác biệt và gộp nội dung lại một cách an toàn mà không sợ ghi đè hay làm mất công sức của người khác.',
      en: 'You can safely inspect differences and merge content without worrying about losing edits.'
    }
  },
  {
    key: 'tip.sidebar_nav',
    icon: 'sidebar',
    category: {
      vi: 'Tiện ích nhanh',
      en: 'Quick Actions'
    },
    title: {
      vi: 'Chuyển đổi tệp nhanh chóng',
      en: 'Sidebar File Navigation'
    },
    content: {
      vi: 'Danh sách các tài liệu liên quan trong cùng thư mục hoặc bài viết sẽ hiển thị đầy đủ ở thanh bên trái. Bạn chỉ cần click chọn để chuyển đổi qua lại giữa các file một cách nhanh chóng.',
      en: 'A list of related files in the same directory is shown in the left sidebar. Simply click on a file to switch to it instantly.'
    },
    deepTip: {
      vi: 'Bạn có thể thu gọn thanh bên này bằng biểu tượng menu ba gạch ở góc trên cùng bên trái để mở rộng 100% diện tích màn hình soạn thảo.',
      en: 'You can collapse the sidebar using the menu button at the top-left to maximize your editor workspace.'
    }
  },
  {
    key: 'tip.custom_confirm',
    icon: 'handshake',
    category: {
      vi: 'Trải nghiệm người dùng',
      en: 'User Experience'
    },
    title: {
      vi: 'Xác nhận tác vụ thông minh',
      en: 'Smart Confirm Dialogs'
    },
    content: {
      vi: 'DocViewer tích hợp hộp thoại xác nhận được thiết kế sang trọng, tự động làm mờ hậu cảnh để nhắc nhở và bảo vệ bạn trước khi thực hiện các quyết định quan trọng như hủy chỉnh sửa hoặc đặt lại dữ liệu gốc.',
      en: 'DocViewer features premium modal dialogs that dim the background to alert and protect you during critical actions, such as resetting draft content.'
    },
    deepTip: {
      vi: 'Các hành động có tính rủi ro cao sẽ đi kèm với cảnh báo màu đỏ trực quan để giúp bạn tránh bấm nhầm nút.',
      en: 'High-risk options are colored red to help you prevent accidental clicks.'
    }
  },
  {
    key: 'tip.version_rollback',
    icon: 'rotate-ccw',
    category: {
      vi: 'Kiểm soát phiên bản',
      en: 'Version Control'
    },
    title: {
      vi: 'Phục hồi phiên bản cũ',
      en: 'Rollback Version'
    },
    content: {
      vi: 'Khi xem lịch sử phiên bản của tài liệu, bạn không chỉ đối chiếu được sự khác biệt mà còn có thể khôi phục tệp tin về chính xác trạng thái cũ tại phiên bản đó.',
      en: 'When viewing version history, you can not only review differences but also roll back the file to that exact state.'
    },
    deepTip: {
      vi: 'Khi khôi phục thành công, bản nháp hiện tại của bạn sẽ không bị mất đi mà sẽ tự động được hệ thống lưu trữ dự phòng thành một phiên bản mới trong lịch sử.',
      en: 'Rolling back automatically saves your current active draft as a new history version so no work is lost.'
    }
  },
  {
    key: 'tip.auto_bracket_indent',
    icon: 'sparkles',
    category: {
      vi: 'Soạn thảo nâng cao',
      en: 'Advanced Editing'
    },
    title: {
      vi: 'Soạn thảo tài liệu thông minh',
      en: 'Smart Indentation & Brackets'
    },
    content: {
      vi: 'Trình soạn thảo tự động căn lề thụt đầu dòng thẳng hàng khi xuống dòng, giúp cấu trúc văn bản hoặc mã nguồn của bạn luôn ngay ngắn, dễ đọc và chuyên nghiệp.',
      en: 'The editor automatically indents lists and matches brackets, keeping your documents neat, organized, and professional.'
    },
    deepTip: {
      vi: 'Trình soạn thảo cũng đồng bộ các căn chỉnh chữ để con trỏ chuột và màu chữ highlight luôn khớp vị trí hiển thị chuẩn xác nhất.',
      en: 'Indentation lines are aligned to ensure your cursor and text highlighting match perfectly.'
    }
  },
  {
    key: 'tip.stage_tall_blur',
    icon: 'film',
    category: {
      vi: 'Trải nghiệm người dùng',
      en: 'User Experience'
    },
    title: {
      vi: 'Hiệu ứng viền mờ cao cấp cho video dọc',
      en: 'Portrait Video Blur Sidebars'
    },
    content: {
      vi: 'Khi bạn xem một video quay dọc trên màn hình máy tính nằm ngang, trình phát sẽ tự động làm mờ hai bên sườn để lấp đầy khoảng trống, tạo trải nghiệm xem tập trung và hiện đại hơn.',
      en: 'When playing a vertical video on a wide display, the player automatically adds blurred sidebars to fill the screen for a modern, distraction-free look.'
    },
    deepTip: {
      vi: 'Hiệu ứng này giúp loại bỏ các dải đen đơn điệu hai bên video dọc, tương tự như trải nghiệm trên các ứng dụng thông minh.',
      en: 'This removes dull black bars, matching modern mobile video player aesthetics.'
    }
  },
  {
    key: 'tip.merge_undo_redo',
    icon: 'undo',
    category: {
      vi: 'Soạn thảo nâng cao',
      en: 'Advanced Editing'
    },
    title: {
      vi: 'Hoàn tác nhanh khi trộn tài liệu (Undo/Redo)',
      en: 'Undo/Redo in Merge Editor'
    },
    content: {
      vi: 'Trong giao diện giải quyết xung đột tài liệu, nếu bạn lỡ click nhầm nút lấy dòng văn bản của bên Local hoặc Server, bạn có thể dễ dàng nhấn tổ hợp phím hoàn tác Ctrl + Z (hoặc Cmd + Z trên macOS) để quay lại bước trước đó.',
      en: 'While resolving conflicts, if you mistakenly select the wrong side (Local or Server), easily undo with Ctrl + Z (or Cmd + Z on macOS) to restore your previous state.'
    },
    deepTip: {
      vi: 'Hệ thống cũng hỗ trợ phím Ctrl + Y để làm lại hành động vừa hoàn tác, giúp bạn tự tin chỉnh sửa mà không lo làm sai.',
      en: 'The editor also supports Ctrl + Y to redo actions, letting you edit conflict resolution with confidence.'
    }
  },
  {
    key: 'tip.merge_scroll_sync',
    icon: 'scroll-sync',
    category: {
      vi: 'Trải nghiệm người dùng',
      en: 'User Experience'
    },
    title: {
      vi: 'Cuộn đồng bộ 3 màn hình xung đột',
      en: '3-Way Scroll Synchronization'
    },
    content: {
      vi: 'Giao diện gộp tài liệu hiển thị song song 3 cột (Bản trên Server, Bản kết quả gộp, Bản nháp Local). Khi bạn cuộn bất kỳ cột nào, các cột còn lại sẽ tự động cuộn theo tương ứng để các dòng tài liệu luôn được xếp thẳng hàng với nhau.',
      en: 'The merge layout shows 3 columns (Server, Merged Result, Local). Scrolling any column automatically scrolls the others to keep lines perfectly aligned.'
    },
    deepTip: {
      vi: 'Cơ chế cuộn đồng bộ mượt mà này giúp bạn dễ dàng đối chiếu sự khác biệt giữa các phiên bản mà không cần phải cuộn tay từng cột.',
      en: 'Scroll synchronization makes comparisons effortless without having to scroll each pane manually.'
    }
  },
  {
    key: 'tip.auto_merge_non_conflicting',
    icon: 'merge',
    category: {
      vi: 'Soạn thảo nâng cao',
      en: 'Advanced Editing'
    },
    title: {
      vi: 'Tự động gộp dòng không tranh chấp',
      en: 'Auto-Merge Non-Conflicting Changes'
    },
    content: {
      vi: 'Khi mở màn hình giải quyết xung đột, hệ thống sẽ tự động gộp tất cả các dòng chỉnh sửa không bị chồng chéo giữa Server và máy của bạn vào bản kết quả cuối cùng.',
      en: 'Opening the merge screen automatically merges all non-overlapping changes from both Server and Local into the final result.'
    },
    deepTip: {
      vi: 'Nhờ tính năng này, bạn chỉ cần tập trung xử lý các dòng bị tô đỏ (nơi cả hai bên cùng sửa đổi một dòng), giúp tiết kiệm phần lớn thời gian đối chiếu và gộp tài liệu.',
      en: 'This lets you focus solely on red conflict blocks (where both sides edited the exact same line), saving time.'
    }
  },
  {
    key: 'tip.merge_screen_constraint',
    icon: 'monitor',
    category: {
      vi: 'Soạn thảo nâng cao',
      en: 'Advanced Editing'
    },
    title: {
      vi: 'Chiều rộng tối thiểu để giải quyết xung đột',
      en: 'Min-Width for Merge Editor'
    },
    content: {
      vi: 'Trình trộn tài liệu 3 bên hiển thị song song nhiều thông tin nên yêu cầu màn hình thiết bị có không gian rộng rãi để hiển thị đầy đủ và rõ ràng các cột.',
      en: 'The 3-way merge editor displays complex columns side-by-side and requires a spacious viewport to display properly.'
    },
    deepTip: {
      vi: 'Nếu bạn mở tính năng này trên thiết bị di động hoặc cửa sổ trình duyệt quá nhỏ, hệ thống sẽ hiển thị nhắc nhở. Hãy xoay ngang điện thoại hoặc phóng to trình duyệt để có không gian làm việc tốt nhất.',
      en: 'If opened on a small screen or viewport, a warning is displayed. Rotate to landscape or resize your browser for the best experience.'
    }
  },
  {
    key: 'tip.default_sandbox_setting',
    icon: 'settings-shield',
    category: {
      vi: 'Bảo mật & Xem thử',
      en: 'Security & Preview'
    },
    title: {
      vi: 'Cấu hình chế độ Sandbox mặc định',
      en: 'Default Sandbox Setting'
    },
    content: {
      vi: 'Bạn có thể thiết lập trạng thái mặc định của DocViewer là luôn mở ở chế độ "Chỉ đọc" (Sandbox Mode) để bảo vệ tài liệu khỏi gõ nhầm, hoặc mở ở chế độ "Chỉnh sửa ngay".',
      en: 'You can configure the default behavior of DocViewer to open in "Read-only" (Sandbox Mode) to protect documents from typos, or "Direct Edit".'
    },
    deepTip: {
      vi: 'Lựa chọn của bạn sẽ được lưu lại và áp dụng tự động cho các lần sau mà không cần phải chuyển đổi thủ công mỗi lần mở tệp.',
      en: 'Your choice is saved and automatically applied to future files, eliminating manual toggles.'
    }
  }
];
