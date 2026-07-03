'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCloud } from '../context/CloudContext';

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
      className={`processingStickyBadge ${isDragging ? 'dragging' : ''}`}
      style={{ top: `${yPosition}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="badgeContent">
        <div className="doubleRingLoader">
          <div className="ring1" />
          <div className="ring2" />
        </div>
        <span className="badgeNumber">{processingCount}</span>
        <div className="badgeTextContainer">
          <span className="badgeText1">{badgeText1}</span>
          <span className="badgeText2">{badgeText2}</span>
        </div>
      </div>

      <style jsx>{`
        .processingStickyBadge {
          position: fixed;
          right: 0;
          z-index: 99999;
          background: rgba(167, 243, 208, 0.95); /* Màu xanh lá nhạt theo ảnh */
          backdrop-filter: blur(10px);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-right: none;
          border-top-left-radius: 24px;
          border-bottom-left-radius: 24px;
          height: 48px;
          padding: 0 16px 0 12px;
          box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.15);
          cursor: grab;
          user-select: none;
          touch-action: none;
          transition: transform 0.15s ease, background-color 0.2s;
          display: flex;
          align-items: center;
        }
        .processingStickyBadge:hover {
          background: rgba(167, 243, 208, 1);
          transform: translateX(-4px);
        }
        .processingStickyBadge.dragging {
          cursor: grabbing;
          background: rgba(110, 231, 183, 1);
          transform: scale(1.02) translateX(-4px);
          box-shadow: -6px 6px 20px rgba(0, 0, 0, 0.2);
        }
        .badgeContent {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .badgeNumber {
          font-size: 26px; /* Số siêu to khổng lồ nổi bật ở cột bên trái */
          font-weight: 900;
          color: #065f46;
          line-height: 1;
        }
        .badgeTextContainer {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
        }
        .badgeText1 {
          font-size: 11.5px;
          font-weight: 800;
          color: #065f46;
          line-height: 1.2;
        }
        .badgeText2 {
          font-size: 10px;
          font-weight: 600;
          color: #047857;
          line-height: 1.2;
        }

        .doubleRingLoader {
          position: relative;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .doubleRingLoader .ring1 {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #eab308;
          animation: ring1Pulse 1.6s ease-in-out infinite;
        }
        .doubleRingLoader .ring2 {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid rgba(234, 179, 8, 0.6);
          animation: ring2Pulse 1.6s ease-in-out infinite;
        }
        @keyframes ring1Pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        @keyframes ring2Pulse {
          0% { transform: scale(1.2); opacity: 1; border-color: rgba(234, 179, 8, 0.6); }
          50% { transform: scale(0.8); opacity: 0.2; border-color: rgba(234, 179, 8, 0.15); }
          100% { transform: scale(1.2); opacity: 1; border-color: rgba(234, 179, 8, 0.6); }
        }
      `}</style>
    </div>
  );
}
