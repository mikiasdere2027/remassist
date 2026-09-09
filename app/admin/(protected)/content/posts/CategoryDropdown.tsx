'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './CategoryDropdown.module.css';

export default function CategoryDropdown({
  id,
  name,
  value,
  onChange,
  categories,
  canEdit = true,
  placeholder = 'Choose a category…',
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (nextCategory: string) => void;
  categories: string[];
  canEdit?: boolean;
  placeholder?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [customList, setCustomList] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Merge default categories, dynamically added ones, and the current value
  const allCategories = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (item: string) => {
      const trimmed = item.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        list.push(trimmed);
      }
    };

    categories.forEach(add);
    customList.forEach(add);
    if (value) add(value);

    return list;
  }, [categories, customList, value]);

  // Compute fixed position and check for screen space (flip above if needed)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 280;
    const popoverWidth = 380;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const top = placeAbove
      ? Math.max(8, rect.top - popoverHeight - 8)
      : Math.min(window.innerHeight - popoverHeight - 8, rect.bottom + 8);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setCoords({ top, left, placeAbove });
  };

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
        setIsCreatingNew(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsCreatingNew(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus the input when entering new category mode
  useEffect(() => {
    if (isCreatingNew) {
      inputRef.current?.focus();
    }
  }, [isCreatingNew]);

  const handleSelect = (cat: string) => {
    if (!canEdit) return;
    onChange(cat);
    setIsOpen(false);
    setIsCreatingNew(false);
  };

  const handleAddNew = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;

    setCustomList((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    onChange(trimmed);
    setNewCatInput('');
    setIsCreatingNew(false);
    setIsOpen(false);
  };

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNew();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCreatingNew(false);
      setNewCatInput('');
    }
  };

  return (
    <div className={styles.categoryDropdownWrap}>
      {/* Hidden input to maintain native form action compatibility */}
      <input type="hidden" id={id} name={name} value={value} />

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => canEdit && setIsOpen((prev) => !prev)}
        disabled={!canEdit}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={`${styles.valueText} ${!value ? styles.placeholder : ''}`}>
          {value || placeholder}
        </span>

        <span className={styles.chevron} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Popover Dropdown via React Portal */}
      {mounted && isOpen && createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
          role="dialog"
          aria-label="Category Selection"
        >
          {/* Top or Bottom Notch Pointer */}
          <div
            className={`${styles.notch} ${coords.placeAbove ? styles.notchAbove : ''}`}
            aria-hidden="true"
          />

          {/* Grid of Categories */}
          <div className={styles.grid}>
            {allCategories.map((cat) => {
              const isSelected = cat.toLowerCase() === value.trim().toLowerCase();
              const isLong = cat.length > 20;

              return (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.tile} ${isSelected ? styles.tileSelected : ''} ${isLong ? styles.tileFullWidth : ''}`}
                  onClick={() => handleSelect(cat)}
                  aria-pressed={isSelected}
                >
                  <span>{cat}</span>
                  {isSelected && (
                    <svg
                      className={styles.checkIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* "+ New category..." button or inline form */}
            {canEdit && (
              <>
                {isCreatingNew ? (
                  <div className={styles.newCategoryForm}>
                    <input
                      ref={inputRef}
                      type="text"
                      className={styles.newCategoryInput}
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      onKeyDown={handleNewKeyDown}
                      placeholder="Category name…"
                      maxLength={80}
                      aria-label="New category name"
                    />
                    <button
                      type="button"
                      className={styles.newCategoryAddBtn}
                      onClick={handleAddNew}
                      disabled={!newCatInput.trim()}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className={styles.newCategoryCancelBtn}
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewCatInput('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.newCategoryBtn}
                    onClick={() => setIsCreatingNew(true)}
                  >
                    + New category…
                  </button>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
