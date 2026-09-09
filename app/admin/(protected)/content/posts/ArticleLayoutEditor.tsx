'use client';

import { useState, type ReactNode } from 'react';
import { parseArticleLayout, serializeArticleLayout, type ArticleLayout } from '@/lib/blog/article-layout';
import ConfirmDialog from '../../ConfirmDialog';
import styles from '../../../admin.module.css';

type FaqOption = { id: string; question: string };

/** Every block the article can carry, in the order the left sidebar lists them. */
type BlockId = 'overview' | 'checklist' | 'quote' | 'kpis' | 'cta' | 'faq' | 'existingFaqIds' | 'sources' | 'tags' | 'author';

/** How many accordion panels may stay open at once — one: opening another closes it. */
const MAX_OPEN = 1;

/** An empty slice for each block, written the first time it is added. */
const BLANKS: Record<BlockId, Partial<ArticleLayout>> = {
  overview: { overview: { title: 'At a glance', items: [] } },
  checklist: { checklist: { title: '', items: [] } },
  quote: { quote: { text: '', attribution: '' } },
  kpis: { kpis: [] },
  cta: { cta: { title: '' } },
  faq: { faq: [] },
  existingFaqIds: { existingFaqIds: [] },
  sources: { sources: [] },
  tags: { tags: [] },
  author: { author: {} },
};

/** Whether a block carries real content — what counts as "added" on load, and whether removing needs confirming. */
function hasContent(layout: ArticleLayout, id: BlockId): boolean {
  switch (id) {
    case 'overview':
      return Boolean(layout.overview?.items?.length || (layout.overview?.title && layout.overview.title !== 'At a glance'));
    case 'checklist':
      return Boolean(layout.checklist?.items?.length || layout.checklist?.title);
    case 'quote':
      return Boolean(layout.quote?.text?.trim());
    case 'kpis':
      return Boolean((layout.kpis ?? []).length);
    case 'cta':
      return Boolean(layout.cta && (layout.cta.title.trim() || layout.cta.text?.trim()));
    case 'faq':
      return Boolean((layout.faq ?? []).length);
    case 'existingFaqIds':
      return Boolean((layout.existingFaqIds ?? []).length);
    case 'sources':
      return Boolean((layout.sources ?? []).length);
    case 'tags':
      return Boolean((layout.tags ?? []).length);
    case 'author':
      return Boolean(layout.author && (layout.author.role?.trim() || layout.author.bio?.trim()));
  }
}

const ICONS: Record<BlockId, ReactNode> = {
  overview: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1.3" /><circle cx="4" cy="12" r="1.3" /><circle cx="4" cy="18" r="1.3" /></svg>),
  checklist: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6" /><path d="M12 17h.01" /></svg>),
  quote: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 11H6.5a1.5 1.5 0 0 1 0-3" /><path d="M10 7c0 4-1.2 6.5-4 7.5" /><path d="M19 11h-3.5a1.5 1.5 0 0 1 0-3" /><path d="M19 7c0 4-1.2 6.5-4 7.5" /></svg>),
  kpis: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M22 20H2" /></svg>),
  cta: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>),
  faq: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9 9h6" /><path d="M9 13h4" /></svg>),
  existingFaqIds: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M12 8v6M9 11h6" /></svg>),
  sources: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>),
  tags: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.6 13.4 13 21l-9.6-9.6L4 3h9z" /><circle cx="7.5" cy="7.5" r="1.4" /></svg>),
  author: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4" /><path d="M4 20v-1.4A4.6 4.6 0 0 1 8.6 14h6.8a4.6 4.6 0 0 1 4.6 4.6V20" /></svg>),
};

const BLOCKS: ReadonlyArray<{ id: BlockId; title: string; sub: string }> = [
  { id: 'overview', title: 'Short overview', sub: 'The "At a glance" box at the top of the article.' },
  { id: 'checklist', title: 'Highlighted question box', sub: 'For guidance such as "Questions to answer before you shortlist".' },
  { id: 'quote', title: 'Pull quote', sub: 'A featured quote. Use the Body editor’s Quote button for in-line ones.' },
  { id: 'kpis', title: 'Numeric KPIs', sub: 'Value and explanation. Example: 62% — Share of the true cost…' },
  { id: 'cta', title: 'CTA', sub: 'The dark "Want this mapped to your team?" panel.' },
  { id: 'faq', title: 'Article FAQs', sub: 'Write new article-only questions here.' },
  { id: 'existingFaqIds', title: 'Existing FAQ entries', sub: 'Reuse published FAQs; edits to the central FAQ update this article too.' },
  { id: 'sources', title: 'Sources & further reading', sub: 'A source label and optional URL.' },
  { id: 'tags', title: 'Filed under', sub: 'One category or tag per line.' },
  { id: 'author', title: 'Team author overview', sub: 'The selected Team member provides the photo and name; these fields complete the author card.' },
];

const PlusIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>);
const MinusIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>);export default function ArticleLayoutEditor({ value, canEdit, faqOptions = [], onChange }: {
  value: string;
  canEdit: boolean;
  faqOptions?: FaqOption[];
  onChange?: (value: string) => void;
}) {
  const [layout, setLayout] = useState<ArticleLayout>(() => parseArticleLayout(value) || {});
  const [added, setAdded] = useState<BlockId[]>(() => BLOCKS.filter((b) => hasContent(layout, b.id)).map((b) => b.id));
  const [expanded, setExpanded] = useState<BlockId[]>(() => added.slice(0, MAX_OPEN));
  const [confirming, setConfirming] = useState<BlockId | null>(null);

  const serialize = (next: ArticleLayout) => onChange?.(serializeArticleLayout(next));

  const update = (patch: Partial<ArticleLayout>) => setLayout((old) => {
    const next = { ...old, ...patch };
    serialize(next);
    return next;
  });

  const lines = (items: string[] | undefined) => (items ?? []).join('\n');
  const setLines = (key: 'overview' | 'checklist', title: string, value: string) =>
    update({ [key]: { title, items: value.split('\n').map((x) => x.trim()).filter(Boolean) } });

  /** Open a panel, closing the one that is open. */
  const openBlock = (id: BlockId) =>
    setExpanded((prev) => (prev.includes(id) ? prev : [...prev, id].slice(-MAX_OPEN)));

  const togglePanel = (id: BlockId) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-MAX_OPEN),
    );

  const addBlock = (id: BlockId) => {
    update(BLANKS[id]);
    setAdded((prev) => (prev.includes(id) ? prev : [...prev, id]));
    openBlock(id);
  };

  const removeBlock = (id: BlockId) => {
    setAdded((prev) => prev.filter((x) => x !== id));
    setExpanded((prev) => prev.filter((x) => x !== id));
    setLayout((old) => {
      const next = { ...old };
      delete next[id];
      serialize(next);
      return next;
    });
  };

  /** Removing a block that has content asks first; an empty one just goes. */
  const requestRemove = (id: BlockId) => {
    if (hasContent(layout, id)) setConfirming(id);
    else removeBlock(id);
  };
  const renderBlock = (id: BlockId): ReactNode => {
    switch (id) {
      case 'overview':
        return (<>
          <Field label="Heading" value={layout.overview?.title ?? 'At a glance'} onChange={(t) => update({ overview: { title: t, items: layout.overview?.items ?? [] } })} disabled={!canEdit} />
          <Text label="Overview items" value={lines(layout.overview?.items)} onChange={(v) => setLines('overview', layout.overview?.title ?? 'At a glance', v)} disabled={!canEdit} />
        </>);
      case 'checklist':
        return (<>
          <Field label="Heading" value={layout.checklist?.title ?? ''} onChange={(t) => update({ checklist: { title: t, items: layout.checklist?.items ?? [] } })} disabled={!canEdit} />
          <Text label="Questions" value={lines(layout.checklist?.items)} onChange={(v) => setLines('checklist', layout.checklist?.title ?? '', v)} disabled={!canEdit} />
        </>);
      case 'quote':
        return (<>
          <Text label="Quote" rows={3} value={layout.quote?.text ?? ''} onChange={(text) => update({ quote: { text, attribution: layout.quote?.attribution ?? '' } })} disabled={!canEdit} />
          <Field label="Attribution" value={layout.quote?.attribution ?? ''} onChange={(a) => update({ quote: { text: layout.quote?.text ?? '', attribution: a } })} disabled={!canEdit} />
        </>);
      case 'kpis':
        return (
          <RepeatList
            rows={layout.kpis ?? []}
            add={() => update({ kpis: [...(layout.kpis ?? []), { value: '', label: '' }] })}
            remove={(i) => update({ kpis: removeAt(layout.kpis ?? [], i) })}
            empty="Nothing here yet — use “Add” to create the first one."
            disabled={!canEdit}
            render={(item, index) => (
              <div className={styles.blogFieldRow}>
                <Field label="Value" value={item.value} onChange={(value) => update({ kpis: replaceAt(layout.kpis ?? [], index, { ...item, value }) })} disabled={!canEdit} />
                <Field label="Explanation" value={item.label} onChange={(label) => update({ kpis: replaceAt(layout.kpis ?? [], index, { ...item, label }) })} disabled={!canEdit} />
              </div>
            )}
          />
        );
      case 'cta': {
        /* Non-null so a spread keeps title required — spreading the maybe-undefined
           layout.cta directly would make title optional in the update and fail the type. */
        const cta = layout.cta ?? { title: '' };
        return (<>
          <Field label="Heading" value={cta.title} onChange={(t) => update({ cta: { ...cta, title: t } })} disabled={!canEdit} />
          <Text label="Short description" value={cta.text ?? ''} onChange={(text) => update({ cta: { ...cta, text } })} disabled={!canEdit} />
          <div className={styles.blogFieldRow}>
            <Field label="Primary button" value={cta.primaryLabel ?? ''} onChange={(primaryLabel) => update({ cta: { ...cta, primaryLabel } })} disabled={!canEdit} />
            <Field label="Primary URL" value={cta.primaryHref ?? ''} onChange={(primaryHref) => update({ cta: { ...cta, primaryHref } })} disabled={!canEdit} />
          </div>
          <div className={styles.blogFieldRow}>
            <Field label="Secondary button" value={cta.secondaryLabel ?? ''} onChange={(secondaryLabel) => update({ cta: { ...cta, secondaryLabel } })} disabled={!canEdit} />
            <Field label="Secondary URL" value={cta.secondaryHref ?? ''} onChange={(secondaryHref) => update({ cta: { ...cta, secondaryHref } })} disabled={!canEdit} />
          </div>
        </>);
      }
      case 'faq':
        return (
          <RepeatList
            rows={layout.faq ?? []}
            add={() => update({ faq: [...(layout.faq ?? []), { question: '', answer: '' }] })}
            remove={(i) => update({ faq: removeAt(layout.faq ?? [], i) })}
            empty="Nothing here yet — use “Add” to create the first one."
            disabled={!canEdit}
            render={(item, index) => (<>
              <Field label="Question" value={item.question} onChange={(question) => update({ faq: replaceAt(layout.faq ?? [], index, { ...item, question }) })} disabled={!canEdit} />
              <Text label="Answer" value={item.answer} onChange={(answer) => update({ faq: replaceAt(layout.faq ?? [], index, { ...item, answer }) })} disabled={!canEdit} />
            </>)}
          />
        );
      case 'existingFaqIds':
        return (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Published FAQs</label>
            <select className={styles.control} multiple value={layout.existingFaqIds ?? []} onChange={(e) => update({ existingFaqIds: [...e.target.selectedOptions].map((o) => o.value) })} disabled={!canEdit} aria-label="Existing FAQ entries">
              {faqOptions.map((faq) => <option key={faq.id} value={faq.id}>{faq.question}</option>)}
            </select>
          </div>
        );
      case 'sources':
        return (
          <RepeatList
            rows={layout.sources ?? []}
            add={() => update({ sources: [...(layout.sources ?? []), { label: '', href: '' }] })}
            remove={(i) => update({ sources: removeAt(layout.sources ?? [], i) })}
            empty="Nothing here yet — use “Add” to create the first one."
            disabled={!canEdit}
            render={(item, index) => (
              <div className={styles.blogFieldRow}>
                <Field label="Source" value={item.label} onChange={(label) => update({ sources: replaceAt(layout.sources ?? [], index, { ...item, label }) })} disabled={!canEdit} />
                <Field label="URL" value={item.href ?? ''} onChange={(href) => update({ sources: replaceAt(layout.sources ?? [], index, { ...item, href }) })} disabled={!canEdit} />
              </div>
            )}
          />
        );
      case 'tags':
        return (
          <Text label="Categories" value={lines(layout.tags)} onChange={(tags) => update({ tags: tags.split('\n').map((x) => x.trim()).filter(Boolean) })} disabled={!canEdit} />
        );
      case 'author':
        return (<>
          <Field label="Role on this article" value={layout.author?.role ?? ''} onChange={(role) => update({ author: { ...layout.author, role } })} disabled={!canEdit} />
          <Text label="Short overview" value={layout.author?.bio ?? ''} onChange={(bio) => update({ author: { ...layout.author, bio } })} disabled={!canEdit} />
          <div className={styles.blogFieldRow}>
            <Field label="Link label" value={layout.author?.moreLabel ?? 'More from this author'} onChange={(moreLabel) => update({ author: { ...layout.author, moreLabel } })} disabled={!canEdit} />
            <Field label="Link URL" value={layout.author?.moreHref ?? '/blog'} onChange={(moreHref) => update({ author: { ...layout.author, moreHref } })} disabled={!canEdit} />
          </div>
        </>);
    }
  };
  return (
    <div className={styles.articleBlocksShell}>
      <input type="hidden" name="articleLayout" value={serializeArticleLayout(layout)} />

      <aside className={styles.articleBlocksSide} aria-label="Article blocks">
        {BLOCKS.map((b) => {
          const present = added.includes(b.id);
          const filled = hasContent(layout, b.id);
          return (
            <div key={b.id} className={`${styles.articleTabRow} ${present ? styles.articleTabRowOn : ''}`}>
              <button
                type="button"
                className={styles.articleTabMain}
                onClick={() => (present ? openBlock(b.id) : addBlock(b.id))}
                disabled={!canEdit}
                title={present ? b.sub : `Add ${b.title}`}
              >
                <span className={styles.articleTabIcon} aria-hidden="true">{ICONS[b.id]}</span>
                <span className={styles.articleTabLabel}>{b.title}</span>
                {present && filled && <span className={styles.articleTabDot} aria-label="Has content" title="Has content" />}
              </button>
              <button
                type="button"
                className={styles.articleTabToggle}
                onClick={() => (present ? requestRemove(b.id) : addBlock(b.id))}
                disabled={!canEdit}
                aria-label={present ? `Remove ${b.title}` : `Add ${b.title}`}
              >
                {present ? <MinusIcon /> : <PlusIcon />}
              </button>
            </div>
          );
        })}
        </aside>

      <div className={styles.articleBlocksMain}>
        {added.length === 0 ? (
          <p className={styles.panelNote}>
            No blocks added yet. Use + on a block to add its form here.
          </p>
        ) : (
          <>
            <p className={styles.panelNote}>
              One block stays open at a time — opening another closes the current one.
            </p>
            <div className={styles.articleAccordion}>
              {added.map((id) => {
                const meta = BLOCKS.find((b) => b.id === id);
                const open = expanded.includes(id);
                if (!meta) return null;
                return (
                  <section key={id} className={`${styles.articlePanel} ${open ? styles.articlePanelOpen : ''}`}>
                    <button
                      type="button"
                      className={styles.articlePanelHead}
                      onClick={() => togglePanel(id)}
                      aria-expanded={open}
                      aria-controls={`article-panel-${id}`}
                    >
                      <span className={styles.articlePanelIcon} aria-hidden="true">{ICONS[id]}</span>
                      <span className={styles.articlePanelTitle}>{meta.title}</span>
                      {hasContent(layout, id) && <span className={styles.articlePanelFilled} title="Has content" aria-label="Has content" />}
                      <svg className={styles.articlePanelChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {open && (
                      <div className={styles.articlePanelBody} id={`article-panel-${id}`}>
                        {renderBlock(id)}
                        {canEdit && (
                          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => requestRemove(id)}>
                            Remove block
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="Remove this block?"
          confirmLabel="Remove block"
          onConfirm={() => { removeBlock(confirming); setConfirming(null); }}
          onCancel={() => setConfirming(null)}
        >
          <p>
            This block has content in the article. Removing it clears that content — you can
            re-add the block and refill it later.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <div className={styles.field}><label className={styles.fieldLabel}>{label}</label><input className={styles.control} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} /></div>;
}

function Text({ label, value, onChange, disabled, rows = 5 }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; rows?: number }) {
  return <div className={styles.field}><label className={styles.fieldLabel}>{label}</label><textarea className={styles.textarea} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} /></div>;
}

function Remove({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={onClick} disabled={disabled}>Remove</button>;
}

function RepeatList<T>({ rows, add, remove, empty, disabled, render }: {
  rows: T[];
  add: () => void;
  remove: (index: number) => void;
  empty: string;
  disabled: boolean;
  render: (row: T, index: number) => ReactNode;
}) {
  return (
    <>
      {rows.length === 0 ? (
        <p className={styles.panelNote}>{empty}</p>
      ) : (
        rows.map((row, index) => (
          <div className={styles.articleRow} key={index}>
            {render(row, index)}
            <Remove onClick={() => remove(index)} disabled={disabled} />
          </div>
        ))
      )}
      <div>
        <button className={`${styles.btn} ${styles.btnGhost}`} type="button" onClick={add} disabled={disabled}>Add</button>
      </div>
    </>
  );
}

function replaceAt<T>(items: T[], index: number, next: T): T[] {
  return items.map((item, i) => (i === index ? next : item));
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}