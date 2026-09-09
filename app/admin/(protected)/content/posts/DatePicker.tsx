'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatPostDate } from '@/lib/blog/display';
import styles from './DatePicker.module.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export default function DatePicker({
  id,
  name,
  value,
  onChange,
  canEdit = true,
  placeholder = 'Select date...',
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (nextDate: string) => void;
  canEdit?: boolean;
  placeholder?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  const parsed = useMemo(() => parseIso(value), [value]);

  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      iso: formatIso(now.getFullYear(), now.getMonth(), now.getDate()),
    };
  }, []);

  const [viewYear, setViewYear] = useState(() => parsed?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState(() => parsed?.month ?? today.month);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync view month/year if value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [parsed]);

  // Compute fixed position and check for screen space (flip above if needed)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 345;
    const popoverWidth = 290;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const top = placeAbove
      ? Math.max(8, rect.top - popoverHeight - 6)
      : Math.min(window.innerHeight - popoverHeight - 8, rect.bottom + 6);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setCoords({ top, left, placeAbove });
  };

  // Re-position on open, resize, or parent scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    if (!canEdit) return;
    const iso = formatIso(year, month, day);
    onChange(iso);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    onChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    if (!canEdit) return;
    onChange(today.iso);
    setViewYear(today.year);
    setViewMonth(today.month);
    setIsOpen(false);
  };

  // Build the 6-row (42 cell) calendar grid
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      year: number;
      month: number;
      day: number;
      iso: string;
      isOutside: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Preceding month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = formatIso(prevYear, prevMonth, day);
      cells.push({
        year: prevYear,
        month: prevMonth,
        day,
        iso,
        isOutside: true,
        isToday: iso === today.iso,
        isSelected: iso === value,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const iso = formatIso(viewYear, viewMonth, day);
      cells.push({
        year: viewYear,
        month: viewMonth,
        day,
        iso,
        isOutside: false,
        isToday: iso === today.iso,
        isSelected: iso === value,
      });
    }

    // Next month days to make 35 or 42 cells
    const remaining = (cells.length > 35 ? 42 : 35) - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = formatIso(nextYear, nextMonth, day);
      cells.push({
        year: nextYear,
        month: nextMonth,
        day,
        iso,
        isOutside: true,
        isToday: iso === today.iso,
        isSelected: iso === value,
      });
    }

    return cells;
  }, [viewYear, viewMonth, today.iso, value]);

  // Year options for quick select (10 years back to 10 years forward)
  const yearOptions = useMemo(() => {
    const currentYear = today.year;
    const years: number[] = [];
    for (let y = currentYear - 8; y <= currentYear + 8; y++) {
      years.push(y);
    }
    return years;
  }, [today.year]);

  return (
    <div className={styles.datePickerWrap}>
      {/* Hidden input to maintain native form action compatibility */}
      <input type="hidden" id={id} name={name} value={value} />

      {/* Styled Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => canEdit && setIsOpen((prev) => !prev)}
        disabled={!canEdit}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={styles.calendarIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>

        <span className={`${styles.dateValue} ${!value ? styles.placeholder : ''}`}>
          {value ? formatPostDate(value) : placeholder}
        </span>

        <span className={styles.actions}>
          {canEdit && Boolean(value) && (
            <span
              role="button"
              className={styles.clearBtn}
              onClick={handleClear}
              title="Clear date"
              aria-label="Clear date"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          )}
        </span>
      </button>

      {/* Popover Calendar Modal via React Portal — completely eliminates parent container clipping/masking */}
      {mounted && isOpen && createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
          role="dialog"
          aria-label="Date Picker"
        >
          {/* Header Navigation */}
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={handlePrevMonth}
              title="Previous month"
              aria-label="Previous month"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className={styles.headerSelectors}>
              <select
                className={styles.headerSelect}
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                aria-label="Select month"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                className={styles.headerSelect}
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                aria-label="Select year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={handleNextMonth}
              title="Next month"
              aria-label="Next month"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Weekday Labels */}
          <div className={styles.weekdaysRow} aria-hidden="true">
            {WEEKDAY_NAMES.map((day) => (
              <span key={day} className={styles.weekday}>
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className={styles.daysGrid} role="grid">
            {calendarCells.map((cell) => {
              const dayClass = [
                styles.dayBtn,
                cell.isOutside ? styles.dayOutside : '',
                cell.isToday ? styles.dayToday : '',
                cell.isSelected ? styles.daySelected : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={cell.iso}
                  type="button"
                  className={dayClass}
                  onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                  aria-label={`${MONTH_NAMES[cell.month]} ${cell.day}, ${cell.year}`}
                  aria-pressed={cell.isSelected}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className={styles.calendarFooter}>
            <button
              type="button"
              className={`${styles.footerBtn} ${styles.footerBtnClear}`}
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className={`${styles.footerBtn} ${styles.footerBtnToday}`}
              onClick={handleToday}
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
