'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import styles from '../../../admin.module.css';

/**
 * The rich-text editor, for blog bodies and FAQ answers.
 *
 * TipTap (ProseMirror underneath) powers the toolbar above a contenteditable:
 * text marks, headings, lists, links, alignment, colour and images. Everything
 * the toolbar does is already in the extension set below, so the button
 * handlers are one-line chain calls rather than bespoke DOM surgery.
 *
 * The serialized HTML rides the surrounding <form> through a hidden textarea
 * named `body` by default — the same field name the post actions already read,
 * so saving, server-side sanitation and the publish gate all stay where they
 * were. `name` changes it; the FAQ passes `answer`.
 *
 * `variant` is the toolbar, and it exists because the two allowlists in
 * lib/content/sanitize.ts are not the same. An FAQ answer may not contain a
 * heading, an image, a code block, colour or alignment, so offering those
 * buttons on an answer would mean an editor formats something, saves, and finds
 * the formatting gone with no explanation. The narrow toolbar is that allowlist
 * made visible. It is not a permission: the server cleans either way.
 *
 * `ariaLabel` names the contenteditable. A visible <label htmlFor> cannot: the
 * editable region is a div TipTap creates, not a form control with an id this
 * component controls, and a label pointing at nothing is worse than no label
 * because it looks associated in the markup and is not. The posts screens name
 * theirs with a panel heading instead — both are fine, and a caller doing that
 * should leave this unset rather than say the same thing twice.
 *
 * `onChange` is for the one caller that keeps the answer in React state rather
 * than reading it off the form (the Add question screen, which posts through a
 * server action instead of a <form action>). It fires with the same HTML the
 * hidden field carries. To clear the editor, remount it with a changed `key` —
 * TipTap owns its document, so resetting the parent's state does not touch it.
 *
 * SSR: `immediatelyRender: false` keeps the first server render from emitting
 * the editor's own HTML and producing a hydration mismatch; the editor mounts
 * client-side and populates the hidden field from its initial `content`.
 */
export default function RichEditor({
  content,
  name = 'body',
  variant = 'article',
  placeholder = 'Write your article…  You can format with the toolbar above.',
  ariaLabel,
  onChange,
}: {
  content?: string;
  name?: string;
  variant?: 'article' | 'answer';
  placeholder?: string;
  ariaLabel?: string;
  onChange?: (html: string) => void;
}) {
  const hidden = useRef<HTMLTextAreaElement>(null);
  const full = variant === 'article';

  /* Held in a ref so the mount effect below does not have to list it as a
     dependency — an inline arrow from the parent is a new function on every
     render, and depending on it would re-run the effect forever. */
  const notify = useRef(onChange);
  notify.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        /* The link opens on click in the editor; the published page opens on
           its own. Having it swallow the click mid-edit is only surprising. */
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: content ?? '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.editorProse,
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML() ?? '';
      if (hidden.current) hidden.current.value = html;
      notify.current?.(html);
    },
  });

  /* Populate the hidden field once the editor has mounted and re-run if the
     content prop ever changes (edit pages pass an existing body). */
  useEffect(() => {
    if (!editor) return;
    const html = editor.getHTML();
    if (hidden.current) hidden.current.value = html;
    notify.current?.(html);
  }, [editor]);

  return (
    <div className={styles.editorOuter}>
      <div className={styles.editorBar}>
        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H10a6 6 0 0 0 0 12h3" />
          </svg>
        </button>

        {full ? (
          <>
          <span className={styles.editorSep} />

          <select
            className={styles.editorSelect}
            aria-label="Heading level"
            value={
              editor?.getAttributes('heading').level
                ? `h${editor.getAttributes('heading').level}`
                : 'p'
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'p') editor?.chain().focus().setParagraph().run();
              else editor?.chain().focus().toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
            }}
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
          </select>

          <span className={styles.editorSep} />
          </>
        ) : (
          <span className={styles.editorSep} />
        )}
        <button
          type="button"
          aria-label="Bold"
          title="Bold"
          className={editor?.isActive('bold') ? styles.editorOn : undefined}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          aria-label="Italic"
          title="Italic"
          className={editor?.isActive('italic') ? styles.editorOn : undefined}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          aria-label="Underline"
          title="Underline"
          className={editor?.isActive('underline') ? styles.editorOn : undefined}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          aria-label="Strikethrough"
          title="Strikethrough"
          className={editor?.isActive('strike') ? styles.editorOn : undefined}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </button>
        {full && (
          <>
          <button
            type="button"
            aria-label="Inline code"
            title="Inline code"
            className={editor?.isActive('code') ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </button>
          </>
        )}

        <span className={styles.editorSep} />
        <button
          type="button"
          aria-label="Bulleted list"
          title="Bulleted list"
          className={editor?.isActive('bulletList') ? styles.editorOn : undefined}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6h12M9 12h12M9 18h12" />
            <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          title="Numbered list"
          className={editor?.isActive('orderedList') ? styles.editorOn : undefined}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 6h11M10 12h11M10 18h11" />
            <path d="M4 5v3M4 8h1.5M4 17h2l1 3" fill="none" />
          </svg>
        </button>
        {full && (
          <>
          <button
            type="button"
            aria-label="Task checklist"
            title="Task checklist"
            className={editor?.isActive('taskList') ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6h12M9 12h12M9 18h12" />
              <path d="M3.5 6h1M3.5 12h1M3.5 18h1" />
              <path d="M2 12.5 2.8 13.8 4.5 11" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Quote"
            title="Quote"
            className={editor?.isActive('blockquote') ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h4v4H4zM12 8v8h8v-8h-4z" />
              <path d="M10 8l2-3M8 8H4M16 12h4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Code block"
            title="Code block"
            className={editor?.isActive('codeBlock') ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <span className={styles.editorMono}>#</span>
          </button>
          </>
        )}

        {full && (
          <>
          <span className={styles.editorSep} />

          <button
            type="button"
            aria-label="Align left"
            title="Align left"
            className={editor?.isActive({ textAlign: 'left' }) ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h14M3 12h18M3 18h10" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Align center"
            title="Align center"
            className={editor?.isActive({ textAlign: 'center' }) ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6h14M3 12h18M6 18h12" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Align right"
            title="Align right"
            className={editor?.isActive({ textAlign: 'right' }) ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 6h14M3 12h18M11 18h10" />
            </svg>
          </button>
          </>
        )}

        {full && (
          <>
          <span className={styles.editorSep} />
          <label className={styles.editorColor} title="Text colour" aria-label="Text colour">
            <input
              type="color"
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              value={editor?.getAttributes('textStyle').color ?? '#000543'}
            />
          </label>
          <button
            type="button"
            aria-label="Highlight"
            title="Highlight"
            className={editor?.isActive('highlight') ? styles.editorOn : undefined}
            onClick={() => editor?.chain().focus().toggleHighlight({ color: '#ffdf6b' }).run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 11l5-5a2 2 0 0 1 3 3l-5 5" />
              <path d="m8 12-3 3a2 2 0 0 0 3 3l4-1" />
              <path d="M3 21h6l12-12" transform="translate(0 -1)" />
            </svg>
          </button>
          </>
        )}

        <span className={styles.editorSep} />

        <button
          type="button"
          aria-label="Link"
          title="Link"
          className={editor?.isActive('link') ? styles.editorOn : undefined}
          onClick={() => {
            const prev = editor?.getAttributes('link').href as string | undefined;
            const href = window.prompt('Link URL', prev ?? 'https://');
            if (href === null) return;
            if (href === '') {
              editor?.chain().focus().unsetLink().run();
            } else {
              editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
            }
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 14a4 4 0 0 0 6 .4L19 12a4 4 0 0 0-6-6l-1.5 1" />
            <path d="M14 10a4 4 0 0 0-6-.4L5 12a4 4 0 0 0 6 6l1.5-1" />
          </svg>
        </button>
        {full && (
          <>
          <button
            type="button"
            aria-label="Add image"
            title="Add image"
            onClick={() => {
              const src = window.prompt('Image URL');
              if (src) editor?.chain().focus().setImage({ src }).run();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.6" />
              <path d="M21 16l-5-5-9 9" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Horizontal rule"
            title="Horizontal rule"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </button>
          </>
        )}
        <button
          className={styles.editorClear}
          type="button"
          aria-label="Clear formatting"
          title="Clear formatting"
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 3H4l7 7 7-7z" />
            <path d="M9 10l-2 11M15 10l2 11" transform="translate(0 -1)" />
            <path d="M3 21h18" />
          </svg>
        </button>
      </div>

      <EditorContent editor={editor} />

      <textarea ref={hidden} name={name} readOnly style={{ display: 'none' }} />
    </div>
  );
}