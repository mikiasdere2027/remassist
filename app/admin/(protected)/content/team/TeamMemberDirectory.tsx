'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { setTeamMemberPublished } from './actions';
import styles from '../../../admin.module.css';

export interface TeamMemberItem {
  id: string;
  name: string;
  role: string;
  initials: string;
  tag: string;
  blurb?: string | null;
  linkedin?: string | null;
  image?: string | null;
  sortOrder: number;
  published: boolean;
  createdAt?: Date | string;
}

type StatusTab = 'all' | 'published' | 'draft';
type SortKey = 'default' | 'name' | 'role' | 'recent';
type ViewMode = 'grid' | 'list';

function getDeptClass(tag: string) {
  const t = tag.toUpperCase().trim();
  if (t.includes('EXEC')) return styles.deptExec;
  if (t.includes('DESIGN')) return styles.deptDesign;
  if (t.includes('PEOPLE') || t.includes('HR')) return styles.deptPeople;
  if (t.includes('OPS') || t.includes('IT')) return styles.deptOps;
  if (t.includes('TECH')) return styles.deptTech;
  if (t.includes('REV') || t.includes('SALE') || t.includes('BDR')) return styles.deptRevenue;
  return styles.deptDefault;
}

export default function TeamMemberDirectory({
  members,
  mayEdit,
}: {
  members: TeamMemberItem[];
  mayEdit: boolean;
}) {
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
      // If clicking outside any open card menu
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.memberMoreWrap}`)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate counts
  const publishedCount = useMemo(() => members.filter((m) => m.published).length, [members]);
  const draftCount = useMemo(() => members.length - publishedCount, [members, publishedCount]);

  // Filter & sort members
  const filteredMembers = useMemo(() => {
    let result = members.filter((m) => {
      // Status tab
      if (statusTab === 'published' && !m.published) return false;
      if (statusTab === 'draft' && m.published) return false;

      // Search query (matches name, role, or department tag)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesRole = m.role.toLowerCase().includes(q);
        const matchesTag = m.tag.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesTag) return false;
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'recent') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      // Default: sortOrder
      return a.sortOrder - b.sortOrder;
    });

    return result;
  }, [members, statusTab, searchQuery, sortBy]);

  return (
    <div className={styles.teamContainer}>
      {/* ── Toolbar: Status tabs on Left, Action Tools on Right ── */}
      <div className={styles.teamToolbar}>
        {/* Left: Filter tabs */}
        <div className={styles.teamFilterPills} role="group" aria-label="Filter team by status">
          <button
            type="button"
            className={`${styles.teamFbtn} ${statusTab === 'all' ? styles.teamFbtnActive : ''}`}
            onClick={() => setStatusTab('all')}
          >
            All
            <span className={styles.teamFbtnCount}>{members.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.teamFbtn} ${statusTab === 'published' ? styles.teamFbtnActive : ''}`}
            onClick={() => setStatusTab('published')}
          >
            Published
            <span className={styles.teamFbtnCount}>{publishedCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.teamFbtn} ${statusTab === 'draft' ? styles.teamFbtnActive : ''}`}
            onClick={() => setStatusTab('draft')}
          >
            Draft
            <span className={styles.teamFbtnCount}>{draftCount}</span>
          </button>
        </div>

        {/* Right: Search box, Sort button, View Mode Switch */}
        <div className={styles.teamToolsGroup}>
          {/* Inline search box */}
          <div className={styles.teamInlineSearch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              className={styles.teamInlineSearchInput}
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.teamSearchClear}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div style={{ position: 'relative' }} ref={sortMenuRef}>
            <button
              type="button"
              className={`${styles.teamToolBtn} ${isSortOpen || sortBy !== 'default' ? styles.teamToolBtnActive : ''}`}
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-expanded={isSortOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3 16 4 4 4-4" />
                <path d="M7 20V4" />
                <path d="m21 8-4-4-4 4" />
                <path d="M17 4v16" />
              </svg>
              Sort
            </button>

            {isSortOpen && (
              <div className={styles.memberDropdown}>
                <button
                  type="button"
                  className={styles.memberDropdownItem}
                  onClick={() => {
                    setSortBy('default');
                    setIsSortOpen(false);
                  }}
                  style={sortBy === 'default' ? { fontWeight: 700, color: 'var(--brand-blue)' } : undefined}
                >
                  Homepage Order
                </button>
                <button
                  type="button"
                  className={styles.memberDropdownItem}
                  onClick={() => {
                    setSortBy('name');
                    setIsSortOpen(false);
                  }}
                  style={sortBy === 'name' ? { fontWeight: 700, color: 'var(--brand-blue)' } : undefined}
                >
                  Name (A – Z)
                </button>
                <button
                  type="button"
                  className={styles.memberDropdownItem}
                  onClick={() => {
                    setSortBy('role');
                    setIsSortOpen(false);
                  }}
                  style={sortBy === 'role' ? { fontWeight: 700, color: 'var(--brand-blue)' } : undefined}
                >
                  Role (A – Z)
                </button>
                <button
                  type="button"
                  className={styles.memberDropdownItem}
                  onClick={() => {
                    setSortBy('recent');
                    setIsSortOpen(false);
                  }}
                  style={sortBy === 'recent' ? { fontWeight: 700, color: 'var(--brand-blue)' } : undefined}
                >
                  Recently Added
                </button>
              </div>
            )}
          </div>

          {/* View toggle (Grid / List) */}
          <div className={styles.teamViewToggle} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.teamViewBtn} ${viewMode === 'grid' ? styles.teamViewBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.teamViewBtn} ${viewMode === 'list' ? styles.teamViewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                <circle cx="4" cy="18" r="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>



      {/* ── Content: Empty State OR Cards Grid OR List View ── */}
      {filteredMembers.length === 0 ? (
        <div className={styles.panel}>
          <p className={styles.empty}>
            <strong>
              {members.length === 0 ? 'No team members yet' : 'Nothing matches that filter'}
            </strong>
            {members.length === 0
              ? 'Use “+ Add member” above to introduce the first person.'
              : `There are ${members.length} members in total — reset search or filters to see them.`}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── 3-Column Card Grid (Inspiration Design) ── */
        <div className={styles.teamCardsGrid}>
          {filteredMembers.map((m) => {
            const isMenuOpen = openMenuId === m.id;
            return (
              <div className={styles.memberCardInsp} key={m.id}>
                {/* Left: Square avatar photo */}
                <div className={styles.memberPhotoSquare} aria-hidden="true">
                  {m.image ? (
                    <Image
                      src={m.image}
                      alt=""
                      width={96}
                      height={96}
                      style={{ objectFit: 'cover' }}
                      priority={m.sortOrder < 6}
                    />
                  ) : (
                    <div className={styles.memberPhotoMonogram}>{m.initials}</div>
                  )}
                </div>

                {/* Right: Info, Department tag, Status, Action menu */}
                <div className={styles.memberCardContent}>
                  <div className={styles.memberCardTop}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className={styles.memberCardName} title={m.name}>
                        {m.name}
                      </h3>
                      <p className={styles.memberCardRole} title={m.role}>
                        {m.role}
                      </p>
                    </div>

                    {/* Three-dots menu */}
                    <div className={styles.memberMoreWrap}>
                      <button
                        type="button"
                        className={styles.memberMoreBtn}
                        onClick={() => setOpenMenuId(isMenuOpen ? null : m.id)}
                        aria-label={`Options for ${m.name}`}
                        aria-expanded={isMenuOpen}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <div className={styles.memberDropdown}>
                          {mayEdit && (
                            <Link
                              href={`/admin/content/team/${m.id}`}
                              className={styles.memberDropdownItem}
                              onClick={() => setOpenMenuId(null)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                              </svg>
                              Edit member
                            </Link>
                          )}

                          {mayEdit && (
                            <form action={setTeamMemberPublished} style={{ margin: 0 }}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="published" value={m.published ? '0' : '1'} />
                              <button
                                type="submit"
                                className={styles.memberDropdownItem}
                                onClick={() => setOpenMenuId(null)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  {m.published ? (
                                    <>
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                    </>
                                  ) : (
                                    <>
                                      <polyline points="20 6 9 17 4 12" />
                                    </>
                                  )}
                                </svg>
                                {m.published ? 'Set as Draft' : 'Set as Published'}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Department pill */}
                  {m.tag ? (
                    <span className={`${styles.deptPill} ${getDeptClass(m.tag)}`}>
                      {m.tag}
                    </span>
                  ) : (
                    <span style={{ height: '24px' }} />
                  )}

                  {/* Status dot + label */}
                  <div className={styles.memberStatusRow}>
                    <span
                      className={`${styles.memberStatusDot} ${m.published ? styles.memberStatusDotPublished : styles.memberStatusDotDraft}`}
                      aria-hidden="true"
                    />
                    <span>{m.published ? 'Published' : 'Draft'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View Mode ── */
        <div className={styles.teamListCard}>
          <table className={styles.teamListTable}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                {mayEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#f1f5f9',
                          position: 'relative',
                        }}
                      >
                        {m.image ? (
                          <Image src={m.image} alt="" width={40} height={40} style={{ objectFit: 'cover' }} />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'var(--brand-blue)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '14px',
                            }}
                          >
                            {m.initials}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#000543' }}>{m.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{m.role}</td>
                  <td>
                    {m.tag && (
                      <span className={`${styles.deptPill} ${getDeptClass(m.tag)}`}>
                        {m.tag}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className={`${styles.memberStatusDot} ${m.published ? styles.memberStatusDotPublished : styles.memberStatusDotDraft}`}
                        aria-hidden="true"
                      />
                      <span>{m.published ? 'Published' : 'Draft'}</span>
                    </div>
                  </td>
                  {mayEdit && (
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        className={styles.rowLink}
                        href={`/admin/content/team/${m.id}`}
                      >
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bottom Info Banner (Matching Mockup) ── */}
      <div className={styles.teamFootBanner}>
        <div className={styles.teamFootBannerLeft}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            The homepage shows published members in this order. Reorder from a member&rsquo;s edit page.
          </span>
        </div>
        <Link className={styles.teamFootBannerLink} href="/" target="_blank" rel="noopener">
          View the public page
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
