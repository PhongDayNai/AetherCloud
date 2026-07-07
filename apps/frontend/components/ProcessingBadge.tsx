'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCloud } from '../context/CloudContext';
import styles from './ProcessingBadge.module.css';

export default function ProcessingBadge(): React.JSX.Element | null {
  const { stats, usage, language } = useCloud();
  const processingCount = Number(usage?.processingCount || stats?.storage?.processingCount || 0);

  const [yPosition, setYPosition] = useState(200); // Vị trí dọc mặc định
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const elementStartYRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    elementStartYRef.current = yPosition;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartYRef.current = e.touches[0].clientY;
    elementStartYRef.current = yPosition;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartYRef.current;
      let newY = elementStartYRef.current + deltaY;
      
      // Giới hạn trong khung hình
      const minPageY = 20;
      const maxPageY = window.innerHeight - 60;
      if (newY < minPageY) newY = minPageY;
      if (newY > maxPageY) newY = maxPageY;
      
      setYPosition(newY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const deltaY = e.touches[0].clientY - dragStartYRef.current;
      let newY = elementStartYRef.current + deltaY;
      
      // Giới hạn trong khung hình
      const minPageY = 20;
      const maxPageY = window.innerHeight - 60;
      if (newY < minPageY) newY = minPageY;
      if (newY > maxPageY) newY = maxPageY;
      
      setYPosition(newY);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  const badgeText1 = language === 'vi' ? 'tệp đang xử lý' : 'files processing';
  const badgeText2 = language === 'vi' ? 'đang tối ưu trong nền...' : 'optimizing in background...';

  // Không hiển thị nếu không có tệp tin nào đang xử lý
  if (processingCount <= 0) return null;

  return (
    <div 
      className={`${styles.processingStickyBadge} ${isDragging ? styles.dragging : ''}`}
      style={{ top: `${yPosition}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className={styles.badgeContent}>
        <div className={styles.doubleRingLoader}>
          <div className={styles.ring1} />
          <div className={styles.ring2} />
        </div>
        <span className={styles.badgeNumber}>{processingCount}</span>
        <div className={styles.badgeTextContainer}>
          <span className={styles.badgeText1}>{badgeText1}</span>
          <span className={styles.badgeText2}>{badgeText2}</span>
        </div>
      </div>
    </div>
  );
}
