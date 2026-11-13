'use client';

/**
 * AuthorDropdown
 * Portal-based author selector matching the visual style of DatePicker and
 * CategoryDropdown — white panel with shadow, brand-blue focus ring, smooth hover.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import type { AuthorOption } from '@/lib/api/posts';
import styles from './AuthorDropdown.module.css';

interface Props {
  authors: AuthorOption[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  id?: string;
}

export function AuthorDropdown({ authors, value, onChange, disabled, id }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = authors.find((a) => a.name === value);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const panelHeight = Math.min(authors.length * 44 + 8, 320);
    const placeAbove = spaceBelow < panelHeight + 8 && r.top > panelHeight + 8;
    setPos({
      top: placeAbove
        ? r.top + window.scrollY - panelHeight - 4
        : r.bottom + window.scrollY + 4,
      left: r.left + window.scrollX,
      width: r.width,
    });
    setOpen(true);
  }, [disabled, authors.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = useCallback((name: string) => {
    onChange(name);
    setOpen(false);
    triggerRef.current?.focus();
  }, [onChange]);

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.avatarThumb} aria-hidden="true">
          {selected?.avatar ? (
            <Image src={selected.avatar} alt="" width={24} height={24} style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <span className={styles.avatarPlaceholder} />
          )}
        </span>
        <span className={`${styles.valueText} ${!selected ? styles.placeholder : ''}`}>
          {selected ? `${selected.name} — ${selected.role}` : 'Choose an author…'}
        </span>
        <svg viewBox="0 0 24 24" className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className={styles.panel}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          role="listbox"
          aria-label="Select author"
        >
          <div
            className={`${styles.option} ${styles.optionPlaceholder} ${!value ? styles.optionActive : ''}`}
            role="option"
            aria-selected={!value}
            tabIndex={0}
            onClick={() => pick('')}
            onKeyDown={(e) => e.key === 'Enter' && pick('')}
          >
            Choose an author…
          </div>
          {authors.map((a) => (
            <div
              key={a.name}
              className={`${styles.option} ${value === a.name ? styles.optionSelected : ''}`}
              role="option"
              aria-selected={value === a.name}
              tabIndex={0}
              onClick={() => pick(a.name)}
              onKeyDown={(e) => e.key === 'Enter' && pick(a.name)}
            >
              <span className={styles.optionAvatar} aria-hidden="true">
                {a.avatar ? (
                  <Image src={a.avatar} alt="" width={28} height={28} style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <span className={styles.avatarPlaceholder} />
                )}
              </span>
              <span className={styles.optionText}>
                {a.name}
                {a.role && <span className={styles.optionRole}> — {a.role}</span>}
              </span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
