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
  categorySecurity: lang === 'vi' ? 'Bảo mật' : 'Security',
  categoryVersion: lang === 'vi' ? 'Lịch sử' : 'History',
  categoryUX: lang === 'vi' ? 'Trải nghiệm' : 'Experience',
  categoryProductivity: lang === 'vi' ? 'Hiệu suất' : 'Productivity',
  categoryQuick: lang === 'vi' ? 'Tiện ích' : 'Utility',
  categoryAdvanced: lang === 'vi' ? 'Soạn thảo' : 'Editor',
  categoryMerge: lang === 'vi' ? 'Trộn file' : 'Merge Editor'
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
      vi: 'Bảo mật',
      en: 'Security'
    },
    title: {
      vi: 'Chế độ Sandbox',
      en: 'Sandbox Mode'
    },
    content: {
      vi: 'Nhấn biểu tượng SANDBOX MODE trên thanh công cụ để bật/tắt chế độ Chỉ đọc, tránh vô tính chỉnh sửa tệp.',
      en: 'Click the SANDBOX MODE icon on the toolbar to toggle Read-only and prevent accidental changes.'
    }
  },
  {
    key: 'tip.version_compare',
    icon: 'history',
    category: {
      vi: 'Lịch sử',
      en: 'History'
    },
    title: {
      vi: 'So sánh phiên bản',
      en: 'Version Compare'
    },
    content: {
      vi: 'Nhấn nút Phiên bản để xem lịch sử chỉnh sửa. Chọn một bản cũ để chia đôi màn hình đối chiếu trực tiếp.',
      en: 'Click the Version button to view edit history. Select an older version to split the screen and compare.'
    },
    deepTip: {
      vi: 'Màu đỏ thể hiện nội dung bị xóa ở bản cũ, màu xanh lá là nội dung được thêm mới.',
      en: 'Red highlights show deletions from the old version, while green shows additions.'
    }
  },
  {
    key: 'tip.sync_scroll',
    icon: 'sync',
    category: {
      vi: 'Trải nghiệm',
      en: 'Experience'
    },
    title: {
      vi: 'Cuộn đồng bộ',
      en: 'Sync Scroll'
    },
    content: {
      vi: 'Khi so sánh phiên bản, hai màn hình sẽ tự động cuộn cùng nhau để bạn dễ đối chiếu các dòng văn bản.',
      en: 'In split screen, both panels scroll together automatically to keep lines aligned.'
    },
    deepTip: {
      vi: 'Muốn cuộn độc lập một bên? Chỉ cần di chuột sang bên đó và cuộn bình thường.',
      en: 'Move your cursor to either side to scroll that pane independently.'
    }
  },
  {
    key: 'tip.save_shortcut',
    icon: 'keyboard',
    category: {
      vi: 'Hiệu suất',
      en: 'Productivity'
    },
    title: {
      vi: 'Phím tắt lưu nhanh',
      en: 'Save Shortcut'
    },
    content: {
      vi: 'Nhấn tổ hợp Ctrl + S (hoặc Cmd + S trên macOS) để lưu nhanh tài liệu mà không cần click nút Lưu.',
      en: 'Press Ctrl + S (or Cmd + S on macOS) to save your changes instantly without clicking.'
    }
  },
  {
    key: 'tip.copy_raw',
    icon: 'copy',
    category: {
      vi: 'Tiện ích',
      en: 'Utility'
    },
    title: {
      vi: 'Sao chép nhanh',
      en: 'Copy Raw'
    },
    content: {
      vi: 'Nhấn nút Sao chép trên thanh công cụ để sao chép toàn bộ nội dung gốc của tệp vào bộ nhớ đệm.',
      en: 'Click the Copy icon on the toolbar to copy the entire raw file content to your clipboard.'
    }
  },
  {
    key: 'tip.export_pdf',
    icon: 'print',
    category: {
      vi: 'Tiện ích',
      en: 'Utility'
    },
    title: {
      vi: 'Xuất file PDF',
      en: 'Export PDF'
    },
    content: {
      vi: 'Nhấn Xuất PDF để in tài liệu. Trang in được tối ưu hóa đặc biệt, tự động ẩn các thanh công cụ và sidebar.',
      en: 'Click Export PDF to print. The layout is optimized to hide all sidebars and toolbars.'
    }
  },
  {
    key: 'tip.playground_preview',
    icon: 'beaker',
    category: {
      vi: 'Xem thử',
      en: 'Preview'
    },
    title: {
      vi: 'Chế độ Xem thử',
      en: 'Playground Mode'
    },
    content: {
      vi: 'Khi không có quyền sửa file nhóm, bạn vẫn có thể soạn thảo để xem trước nhưng không thể lưu đè lên file gốc.',
      en: 'Edit shared files locally to preview changes without modifying the protected original.'
    }
  },
  {
    key: 'tip.local_theme_toggle',
    icon: 'moon',
    category: {
      vi: 'Trải nghiệm',
      en: 'Experience'
    },
    title: {
      vi: 'Đổi giao diện nhanh',
      en: 'Toggle Theme'
    },
    content: {
      vi: 'Bấm biểu tượng Mặt trăng/Mặt trời để chuyển chế độ Sáng/Tối riêng cho DocViewer mà không ảnh hưởng Dashboard.',
      en: 'Toggle Light/Dark mode for DocViewer without affecting the general dashboard theme.'
    }
  },
  {
    key: 'tip.mermaid_charts',
    icon: 'flowchart',
    category: {
      vi: 'Soạn thảo',
      en: 'Editor'
    },
    title: {
      vi: 'Vẽ sơ đồ Mermaid',
      en: 'Mermaid Diagrams'
    },
    content: {
      vi: 'Tạo sơ đồ quy trình, lưu đồ trực quan bằng cách viết mã khai báo Mermaid trong các khối code Markdown.',
      en: 'Draw flowcharts and mind maps using text-based Mermaid code blocks inside Markdown.'
    },
    deepTip: {
      vi: 'Hệ thống sẽ tự động vẽ sơ đồ trực quan khi bạn chuyển sang chế độ xem trước (Preview) hoặc Sandbox.',
      en: 'Diagrams render automatically when switching to Preview or Sandbox Mode.'
    }
  },
  {
    key: 'tip.auto_syntax_highlight',
    icon: 'code',
    category: {
      vi: 'Hiệu suất',
      en: 'Productivity'
    },
    title: {
      vi: 'Tô màu cú pháp',
      en: 'Syntax Highlight'
    },
    content: {
      vi: 'Trình xem tự động nhận diện ngôn ngữ và tô màu mã nguồn (JS, Python, HTML, CSS...), giúp bạn dễ đọc mã.',
      en: 'Code syntax is highlighted automatically based on file language to improve readability.'
    }
  },
  {
    key: 'tip.unsaved_warning',
    icon: 'alert',
    category: {
      vi: 'Bảo mật',
      en: 'Security'
    },
    title: {
      vi: 'Cảnh báo chưa lưu',
      en: 'Unsaved Guard'
    },
    content: {
      vi: 'Hệ thống sẽ hiển thị cảnh báo nếu bạn chuyển tệp hoặc đóng tab khi có những chỉnh sửa chưa được lưu.',
      en: 'Warning dialog protects your work if you close the tab or switch files with unsaved edits.'
    }
  },
  {
    key: 'tip.load_large_files',
    icon: 'flash',
    category: {
      vi: 'Hiệu suất',
      en: 'Productivity'
    },
    title: {
      vi: 'Tệp dung lượng lớn',
      en: 'Large File Loading'
    },
    content: {
      vi: 'Hệ thống tự động tối ưu hóa hiệu năng giúp mở và cuộn các tệp tin cực lớn mượt mà, không lag.',
      en: 'High-performance rendering loads and scrolls large files seamlessly without memory lag.'
    }
  },
  {
    key: 'tip.three_way_merge',
    icon: 'git-merge',
    category: {
      vi: 'Lịch sử',
      en: 'History'
    },
    title: {
      vi: 'Giải quyết xung đột',
      en: 'Conflict Merge'
    },
    content: {
      vi: 'Khi hai người cùng sửa một file, trình trộn 3 bên sẽ mở ra giúp bạn chọn nội dung chính xác để lưu.',
      en: 'If concurrent edits occur, the 3-way merge editor helps you resolve differences before saving.'
    }
  },
  {
    key: 'tip.sidebar_nav',
    icon: 'sidebar',
    category: {
      vi: 'Tiện ích',
      en: 'Utility'
    },
    title: {
      vi: 'Thu gọn thanh bên',
      en: 'Sidebar Collapse'
    },
    content: {
      vi: 'Bấm biểu tượng menu ở góc trên bên trái để thu gọn thanh bên, mở rộng 100% diện tích soạn thảo.',
      en: 'Click the top-left menu icon to collapse the sidebar and maximize your editor layout.'
    }
  },
  {
    key: 'tip.custom_confirm',
    icon: 'handshake',
    category: {
      vi: 'Trải nghiệm',
      en: 'Experience'
    },
    title: {
      vi: 'Hộp thoại xác nhận',
      en: 'Smart Dialogs'
    },
    content: {
      vi: 'Hộp thoại xác nhận được thiết kế sang trọng, tự động làm mờ hậu cảnh để bảo vệ bạn trước tác vụ quan trọng.',
      en: 'Confirm modals blur the background to prevent accidental clicks on destructive actions.'
    }
  },
  {
    key: 'tip.version_rollback',
    icon: 'rotate-ccw',
    category: {
      vi: 'Lịch sử',
      en: 'History'
    },
    title: {
      vi: 'Khôi phục phiên bản',
      en: 'Version Rollback'
    },
    content: {
      vi: 'Bạn có thể khôi phục tài liệu về bất kỳ trạng thái nào trong lịch sử chỉnh sửa của tệp tin.',
      en: 'Roll back the file to any previous version state stored in the history.'
    },
    deepTip: {
      vi: 'Phiên bản hiện tại trước khi khôi phục sẽ tự động được lưu lại thành một bản ghi mới trong lịch sử.',
      en: 'The active draft is saved as a new version before rolling back, ensuring zero data loss.'
    }
  },
  {
    key: 'tip.auto_bracket_indent',
    icon: 'sparkles',
    category: {
      vi: 'Soạn thảo',
      en: 'Editor'
    },
    title: {
      vi: 'Thụt lề tự động',
      en: 'Auto Indentation'
    },
    content: {
      vi: 'Trình soạn thảo tự động căn lề thụt đầu dòng khi xuống dòng, giúp cấu trúc văn bản luôn ngay ngắn.',
      en: 'The editor automatically indents lines on enter, keeping your document structure clean.'
    }
  },
  {
    key: 'tip.stage_tall_blur',
    icon: 'film',
    category: {
      vi: 'Trải nghiệm',
      en: 'Experience'
    },
    title: {
      vi: 'Làm mờ viền video dọc',
      en: 'Portrait Video Blur'
    },
    content: {
      vi: 'Khi xem video dọc trên máy tính, trình phát tự động làm mờ hai bên sườn để lấp đầy khoảng đen.',
      en: 'Playing vertical videos automatically blurs the sides to fill wide screen space beautifully.'
    }
  },
  {
    key: 'tip.merge_undo_redo',
    icon: 'undo',
    category: {
      vi: 'Trộn file',
      en: 'Merge Editor'
    },
    title: {
      vi: 'Hoàn tác khi trộn',
      en: 'Undo/Redo Merge'
    },
    content: {
      vi: 'Sử dụng tổ hợp Ctrl + Z / Ctrl + Y trong màn hình trộn để hoàn tác/làm lại các dòng đã chọn.',
      en: 'Press Ctrl + Z or Ctrl + Y inside the merge editor to undo or redo line selections.'
    }
  },
  {
    key: 'tip.merge_scroll_sync',
    icon: 'scroll-sync',
    category: {
      vi: 'Trải nghiệm',
      en: 'Experience'
    },
    title: {
      vi: 'Cuộn đồng bộ 3 cột',
      en: '3-Column Scroll Sync'
    },
    content: {
      vi: 'Cuộn bất kỳ cột nào trong trình trộn (Server, Kết quả, Local), hai cột còn lại sẽ cuộn theo tương ứng.',
      en: 'Scrolling any pane in the 3-way merge automatically scrolls the other two to align lines.'
    }
  },
  {
    key: 'tip.auto_merge_non_conflicting',
    icon: 'merge',
    category: {
      vi: 'Trộn file',
      en: 'Merge Editor'
    },
    title: {
      vi: 'Tự động gộp dòng',
      en: 'Auto-Merge lines'
    },
    content: {
      vi: 'Hệ thống tự động gộp các dòng chỉnh sửa không bị chồng chéo, bạn chỉ cần xử lý các dòng bị đỏ.',
      en: 'Non-overlapping edits are merged automatically, letting you focus only on red conflict lines.'
    }
  },
  {
    key: 'tip.merge_screen_constraint',
    icon: 'monitor',
    category: {
      vi: 'Trải nghiệm',
      en: 'Experience'
    },
    title: {
      vi: 'Độ rộng màn hình trộn',
      en: 'Merge Screen Width'
    },
    content: {
      vi: 'Trình trộn 3 bên hiển thị song song nhiều thông tin, yêu cầu độ rộng màn hình tối thiểu là 1024px.',
      en: 'The 3-way merge editor displays complex columns and requires a minimum width of 1024px.'
    }
  },
  {
    key: 'tip.default_sandbox_setting',
    icon: 'settings-shield',
    category: {
      vi: 'Bảo mật',
      en: 'Security'
    },
    title: {
      vi: 'Cấu hình mặc định',
      en: 'Default Sandbox'
    },
    content: {
      vi: 'Bạn có thể cài đặt mặc định mở DocViewer ở chế độ "Chỉ đọc" (Sandbox Mode) hoặc "Chỉnh sửa ngay".',
      en: 'Set your preference to always open files in Read-only (Sandbox) or Edit Mode by default.'
    }
  }
];
