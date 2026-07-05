"use client";

import React, { useState, useEffect, useRef } from "react";

// Icon Calendar SVG
interface IconProps {
  size?: number;
  className?: string;
}

const CalendarIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronLeft: React.FC<IconProps> = ({ size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight: React.FC<IconProps> = ({ size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  lang?: "vi" | "en";
  onlyMonth?: boolean;
  minDate?: string;
  maxDate?: string;
}

export default function CustomDatePicker({ 
  value, 
  onChange, 
  lang = "vi", 
  onlyMonth = false, 
  minDate, 
  maxDate 
}: CustomDatePickerProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDateDisabled = (y: number, m: number, d: number): boolean => {
    const currentDate = new Date(y, m, d);
    
    if (minDate) {
      const minParts = minDate.split("-");
      const minD = new Date(parseInt(minParts[0], 10), parseInt(minParts[1], 10) - 1, parseInt(minParts[2], 10));
      currentDate.setHours(0, 0, 0, 0);
      minD.setHours(0, 0, 0, 0);
      if (currentDate < minD) return true;
    }
    
    if (maxDate) {
      const maxParts = maxDate.split("-");
      const maxD = new Date(parseInt(maxParts[0], 10), parseInt(maxParts[1], 10) - 1, parseInt(maxParts[2], 10));
      currentDate.setHours(0, 0, 0, 0);
      maxD.setHours(0, 0, 0, 0);
      if (currentDate > maxD) return true;
    }
    
    return false;
  };

  // Parse value (YYYY-MM-DD or YYYY-MM)
  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const parts = dateStr.split("-");
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      return new Date(year, month, 1);
    }
    if (parts.length !== 3) return new Date();
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const selectedDate = parseDate(value);
  const [viewDate, setViewDate] = useState<Date>(selectedDate);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">(onlyMonth ? "months" : "days");

  useEffect(() => {
    setViewDate(parseDate(value));
    if (onlyMonth) {
      setViewMode("months");
    }
  }, [value, onlyMonth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setViewMode(onlyMonth ? "months" : "days");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onlyMonth]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthsVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const months = lang === "vi" ? monthsVi : monthsEn;

  const shortMonthsVi = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
  const shortMonthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shortMonths = lang === "vi" ? shortMonthsVi : shortMonthsEn;

  const daysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const daysEn = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const daysHeader = lang === "vi" ? daysVi : daysEn;

  const getDaysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number): number => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const formattedDate = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleSelectMonth = (mIdx: number) => {
    if (onlyMonth) {
      const formattedMonth = String(mIdx + 1).padStart(2, "0");
      const formattedDate = `${year}-${formattedMonth}-01`;
      onChange(formattedDate);
      setIsOpen(false);
    } else {
      setViewDate(new Date(year, mIdx, 1));
      setViewMode("days");
    }
  };

  const handleSelectYear = (selectedYear: number) => {
    setViewDate(new Date(selectedYear, month, 1));
    setViewMode("months");
  };

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 5;
  const yearsList = Array.from({ length: 15 }, (_, i) => startYear + i);

  const getFormattedValue = () => {
    if (!value) return lang === "vi" ? "Chọn ngày..." : "Select date...";
    const parts = value.split("-");
    if (parts.length !== 3 && parts.length !== 2) return value;
    if (onlyMonth) {
      return `${parts[1]}/${parts[0]}`;
    }
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div style={{ position: "relative", width: "100%" }} ref={containerRef}>
      <style>{`
        .datepicker-popup {
          opacity: 0;
          transform: translateY(6px) scale(0.97);
          transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.15s;
          visibility: hidden;
          transform-origin: top left;
        }
        .datepicker-popup.show {
          opacity: 1;
          transform: translateY(0) scale(1);
          visibility: visible;
        }
      `}</style>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          backgroundColor: "var(--bg-input)",
          border: "1px solid var(--border-input)",
          borderRadius: "6px",
          padding: "9px 12px",
          color: "var(--text-primary)",
          fontSize: "13.5px",
          outline: "none",
          transition: "all 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          boxSizing: "border-box"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-input-focus)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-input)"; }}
      >
        <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
          {getFormattedValue()}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", color: "var(--accent-color)", opacity: 0.8 }}>
          <CalendarIcon size={14} />
        </span>
      </div>
      <div 
        className={`datepicker-popup ${isOpen ? 'show' : ''}`}
        style={{
          position: "absolute",
          zIndex: 99,
          marginTop: "6px",
          left: 0,
          backgroundColor: "var(--bg-popover)",
          border: "1px solid var(--border-color)",
          padding: "12px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          width: "250px",
          boxSizing: "border-box",
          pointerEvents: isOpen ? "auto" : "none"
        }}
      >
        {viewMode === "days" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <button 
                type="button"
                onClick={handlePrevMonth}
                style={{ background: "transparent", border: 0, color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-item-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <ChevronLeft size={14} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setViewMode("months")}
                  style={{ background: "transparent", border: 0, color: "var(--text-primary)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", cursor: "pointer", padding: "2px 6px", borderRadius: "4px" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-color)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                >
                  {months[month]}
                </button>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>•</span>
                <button
                  type="button"
                  onClick={() => setViewMode("years")}
                  style={{ background: "transparent", border: 0, color: "var(--text-primary)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", cursor: "pointer", padding: "2px 6px", borderRadius: "4px" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-color)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                >
                  {year}
                </button>
              </div>
              <button 
                type="button"
                onClick={handleNextMonth}
                style={{ background: "transparent", border: 0, color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-item-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Grid header (days names) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center", marginBottom: "6px" }}>
              {daysHeader.map((d) => (
                <span key={d} style={{ fontSize: "9.5px", fontWeight: "700", color: "var(--text-muted)" }}>
                  {d}
                </span>
              ))}
            </div>

            {/* Grid days */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} style={{ width: "28px", height: "28px" }} />
              ))}
              {days.map((day) => {
                const isSelected = selectedDate.getDate() === day && 
                                   selectedDate.getMonth() === month && 
                                   selectedDate.getFullYear() === year &&
                                   value !== "";
                const isToday = new Date().getDate() === day &&
                                new Date().getMonth() === month &&
                                new Date().getFullYear() === year;
                const disabled = isDateDisabled(year, month, day);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && handleSelectDay(day)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: 0,
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: disabled ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.1s ease",
                      backgroundColor: isSelected 
                        ? "var(--button-primary-bg)" 
                        : isToday 
                          ? "rgba(59, 130, 246, 0.15)" 
                          : "transparent",
                      color: isSelected 
                        ? "var(--button-primary-text)" 
                        : disabled
                          ? "var(--text-muted)"
                          : isToday 
                            ? "var(--accent-color)" 
                            : "var(--text-secondary)",
                      opacity: disabled ? 0.3 : 1
                    }}
                    onMouseEnter={(e) => { if (!isSelected && !disabled) { e.currentTarget.style.backgroundColor = "var(--bg-item-hover)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                    onMouseLeave={(e) => { if (!isSelected && !disabled) { e.currentTarget.style.backgroundColor = isToday ? "rgba(59, 130, 246, 0.15)" : "transparent"; e.currentTarget.style.color = isToday ? "var(--accent-color)" : "var(--text-secondary)"; } }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "months" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>{lang === "vi" ? "Chọn Tháng" : "Select Month"}</span>
              <button
                type="button"
                onClick={() => setViewMode("years")}
                style={{ background: "transparent", border: 0, color: "var(--accent-color)", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}
              >
                {year}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {shortMonths.map((mName, mIdx) => {
                const isCurrentSelected = month === mIdx;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => handleSelectMonth(mIdx)}
                    style={{
                      padding: "8px 0",
                      borderRadius: "8px",
                      border: 0,
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: isCurrentSelected ? "var(--button-primary-bg)" : "transparent",
                      color: isCurrentSelected ? "var(--button-primary-text)" : "var(--text-secondary)",
                      transition: "all 0.1s ease"
                    }}
                    onMouseEnter={(e) => { if (!isCurrentSelected) e.currentTarget.style.backgroundColor = "var(--bg-item-hover)"; }}
                    onMouseLeave={(e) => { if (!isCurrentSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "years" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>{lang === "vi" ? "Chọn Năm" : "Select Year"}</span>
              <button
                type="button"
                onClick={() => setViewMode(onlyMonth ? "months" : "days")}
                style={{ background: "transparent", border: 0, color: "var(--accent-color)", fontWeight: "700", fontSize: "11px", cursor: "pointer" }}
              >
                {lang === "vi" ? "Quay lại" : "Back"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
              {yearsList.map((yNum) => {
                const isCurrentSelected = year === yNum;
                return (
                  <button
                    key={yNum}
                    type="button"
                    onClick={() => handleSelectYear(yNum)}
                    style={{
                      padding: "6px 0",
                      borderRadius: "6px",
                      border: 0,
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: isCurrentSelected ? "var(--button-primary-bg)" : "transparent",
                      color: isCurrentSelected ? "var(--button-primary-text)" : "var(--text-secondary)",
                      transition: "all 0.1s ease"
                    }}
                    onMouseEnter={(e) => { if (!isCurrentSelected) e.currentTarget.style.backgroundColor = "var(--bg-item-hover)"; }}
                    onMouseLeave={(e) => { if (!isCurrentSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {yNum}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
