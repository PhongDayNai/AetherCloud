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

import { TipIcon } from '../../components/Icons';
export { TipIcon };

import docViewerTipsJson from './tipsData.json';
export const docViewerTips: DocTip[] = docViewerTipsJson as DocTip[];
