'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/errors';
import { faqApi, swapped, type FaqAdminGroup, type FaqGroupInput } from '@/lib/api/faq';
import { FaqNotice, useFaqAction } from './useFaqAction';
import styles from '../../../admin.module.css';

/** Form fields → the API's input; empty optional text becomes null. */
function readGroup(form: FormData): FaqGroupInput {
  const text = (k: string) => String(form.get(k) ?? '').trim();
  return {
    title: text('title'),
    slug: text('slug').toLowerCase(),
    blurb: text('blurb') || null,
    linkHref: text('linkHref') || null,
    linkLabel: text('linkLabel') || null,
  };
}

/**
 * The sections view of the FAQ list: title, anchor, blurb and source link per
 * section, its position on the page, and adding or removing a section. A
 * section that still holds questions (drafts included) cannot be removed —
 * the backend refuses it; move the questions first.
 */
export default function SectionsEditor({
  groups,
  backHref,
}: {
  groups: FaqAdminGroup[];
  backHref: string;
}) {
  const { busy, message, run } = useFaqAction();
  /** Field errors, keyed by section id ('new' for the add form). */
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [adding, setAdding] = useState(false);

  async function withFieldErrors(key: string, call: () => Promise<unknown>) {
    setErrors((e) => ({ ...e, [key]: {} }));
    try {
      await call();
    } catch (err) {
      if (err instanceof ApiError) setErrors((e) => ({ ...e, [key]: err.fieldErrors() }));
      throw err;
    }
  }

  function save(e: FormEvent<HTMLFormElement>, g: FaqAdminGroup) {
    e.preventDefault();
    const input = readGroup(new FormData(e.currentTarget));
    void run(async () => {
      await withFieldErrors(g.id, () => faqApi.updateGroup(g.id, input));
      return `Saved “${input.title}”.`;
    });
  }

  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const input = readGroup(new FormData(formEl));
    void run(async () => {
      await withFieldErrors('new', () => faqApi.createGroup(input));
      formEl.reset();
      setAdding(false);
      return `Added the section “${input.title}”. It shows on the page once it holds a live question.`;
    });
  }

  const move = (g: FaqAdminGroup, direction: 'up' | 'down') => {
    const ids = swapped(
      groups.map((x) => x.id),
      g.id,
      direction,
    );
    if (!ids) return;
    void run(async () => {
      await faqApi.reorderGroups(ids);
      return 'Section order updated.';
    });
  };

  const remove = (g: FaqAdminGroup) => {
    if (!window.confirm(`Remove the empty section “${g.title}”?`)) return;
    void run(async () => {
      await faqApi.deleteGroup(g.id);
      return `Removed the section “${g.title}”.`;
    });
  };

  return (
    <>
      <FaqNotice message={message} />
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Sections</h2>
            <p className={styles.panelSub}>
              {groups.length} sections, in the order the public page renders them. An anchor is
              part of a URL — changing one breaks any link pointing at it.
            </p>
          </div>
          {!adding && (
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="button"
              onClick={() => setAdding(true)}
            >
              Add section
            </button>
          )}
        </div>

        {adding && (
          <form className={`${styles.sectionCell} ${styles.faqSectionCell}`} onSubmit={create}>
            <GroupFields id="new" errors={errors.new} />
            <div className={styles.faqSectionActions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
                Add section
              </button>
              <button
                className={styles.rowLink}
                type="button"
                onClick={() => setAdding(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className={styles.sectionGrid}>
          {groups.map((g, i) => (
            <form
              className={`${styles.sectionCell} ${styles.faqSectionCell}`}
              onSubmit={(e) => save(e, g)}
              key={`${g.id}:${g.title}:${g.slug}:${g.blurb}:${g.linkHref}:${g.linkLabel}`}
            >
              <GroupFields id={g.id} group={g} errors={errors[g.id]} />
              <div className={styles.faqSectionActions}>
                {/* Named for a screen reader: six buttons all reading "Save"
                    is six identical announcements. */}
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="submit"
                  disabled={busy}
                  aria-label={`Save section: ${g.title}`}
                >
                  Save
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="button"
                  disabled={busy || i === 0}
                  onClick={() => move(g, 'up')}
                  aria-label={`Move section up: ${g.title}`}
                >
                  ↑
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  type="button"
                  disabled={busy || i === groups.length - 1}
                  onClick={() => move(g, 'down')}
                  aria-label={`Move section down: ${g.title}`}
                >
                  ↓
                </button>
                <span className={styles.panelNote}>
                  {g.itemCount === 0
                    ? 'No questions'
                    : `${g.publishedCount} live of ${g.itemCount}`}
                </span>
                {g.itemCount === 0 && (
                  <button
                    className={`${styles.rowLink} ${styles.rowLinkDanger}`}
                    type="button"
                    disabled={busy}
                    onClick={() => remove(g)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>
          ))}
        </div>
        <div className={styles.panelFoot}>
          <span>A section holding no live questions renders nothing on the public page.</span>
          <Link className={styles.rowLink} href={backHref}>
            Back to the questions
          </Link>
        </div>
      </div>
    </>
  );
}

function GroupFields({
  id,
  group,
  errors = {},
}: {
  id: string;
  group?: FaqAdminGroup;
  errors?: Record<string, string>;
}) {
  const field = (
    name: keyof FaqGroupInput,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className={`${styles.field} ${styles.sectionField}`}>
      <label className={styles.fieldLabel} htmlFor={`${name}-${id}`}>
        {label}
      </label>
      <input
        className={styles.control}
        id={`${name}-${id}`}
        name={name}
        defaultValue={group?.[name] ?? ''}
        aria-invalid={errors[name] ? true : undefined}
        {...extra}
      />
      {errors[name] && <span className={styles.faqFieldError}>{errors[name]}</span>}
    </div>
  );

  return (
    <>
      <div className={styles.faqSectionRow}>
        {field('title', 'Title', { required: true, maxLength: 120 })}
        {field('slug', 'Anchor', {
          required: true,
          maxLength: 60,
          pattern: '[a-z][a-z\\-]*[a-z]',
          title: 'Lowercase letters and hyphens only — it is part of a URL',
        })}
      </div>
      <div className={styles.faqSectionRow}>{field('blurb', 'Blurb', { maxLength: 300 })}</div>
      <div className={styles.faqSectionRow}>
        {field('linkLabel', 'Link label', { maxLength: 60, placeholder: 'Pricing page →' })}
        {field('linkHref', 'Link address', { maxLength: 500, placeholder: '/pricing' })}
      </div>
    </>
  );
}
