'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { missingForPopupPublish } from '@/lib/popups/completeness';
import { POPUP_PLACEMENT_LABEL, POPUP_PLACEMENT_VALUES } from '@/lib/popups/placement';
import {
  POPUP_TEMPLATE_BLURB,
  POPUP_TEMPLATE_LABEL,
  POPUP_TEMPLATE_VALUES,
  templateNeedsImage,
  templateShowsCopy,
  type PopupTemplate,
} from '@/lib/popups/templates';
import { addPopup, savePopup } from './actions';
import { POPUP_ERR } from './messages';
import ImageField from '../posts/ImageField';
import Req from '../../RequiredMark';
import styles from '../../../admin.module.css';

/**
 * The popup editor — one component behind both New popup and Edit popup.
 *
 * Three tabs, not one long page: Campaign (the reports identity), Content
 * (what the visitor sees), and When & how long (timing). The tabs sit beside
 * the way back to the list, with Save opposite them — the same shape as the
 * posts editor. Each panel stays mounted, hidden with `display` rather than
 * unmounted, so a half-typed field survives a tab switch.
 *
 * A client component for the same reason PostForm is: the publish gate needs
 * the values while they are being typed, and the image upload has to stage a
 * file locally before the server ever sees it. The form still posts to the
 * same server actions — `action={addPopup | savePopup}` on a plain <form> —
 * so validation, the unique tracking key and the disk write are unchanged and
 * unmoved.
 *
 * Publish is gated on lib/popups/completeness.ts, the same list the action
 * enforces, so the note and the server's answer cannot disagree — and each
 * tab's pill carries its own missing count, so the field you still need is
 * findable without reading the note.
 *
 * Which fields the Content tab shows follows the chosen template, because the
 * two render different things (lib/popups/templates.ts): a corner card wants a
 * headline, a message and button wording, and its image is optional — a
 * text-only push is a valid popup. A spotlight shows none of those three, so
 * asking for them would be asking for copy nobody will ever read; it wants the
 * artwork instead, and the headline stays because it becomes the image's alt
 * text. Hiding a field also stops it being counted as missing, which is the
 * same rule the action applies, from the same list.
 */

export type PopupFormValues = {
  id: string;
  name: string;
  title: string;
  message: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
  campaign: string;
  trackingKey: string;
  placement: string;
  template: string;
  startsAt: string;
  endsAt: string;
  delaySeconds: number;
  displaySeconds: number | null;
  published: boolean;
};

const MAX = {
  name: 120,
  title: 200,
  message: 500,
  ctaLabel: 40,
  ctaHref: 500,
  campaign: 120,
  trackingKey: 120,
} as const;

/** One staged upload: the object URL for the preview, and the file's name. */
type Staged = { url: string; name: string } | null;

export default function PopupForm({
  mode,
  canEdit,
  values,
}: {
  mode: 'new' | 'edit';
  canEdit: boolean;
  values: PopupFormValues;
}) {
  const [name, setName] = useState(values.name);
  const [title, setTitle] = useState(values.title);
  const [message, setMessage] = useState(values.message);
  /* The stored image only feeds the preview's fallback. It has no setter:
     the value that reaches the action is either the kept path or a staged
     upload's new file, so typing never changes it. */
  const image = values.image;
  const [ctaLabel, setCtaLabel] = useState(values.ctaLabel);
  const [ctaHref, setCtaHref] = useState(values.ctaHref);
  const [campaign, setCampaign] = useState(values.campaign);
  const [trackingKey, setTrackingKey] = useState(values.trackingKey);
  const [placement, setPlacement] = useState(values.placement);
  const [template, setTemplate] = useState(values.template);
  const [startsAt, setStartsAt] = useState(values.startsAt);
  const [endsAt, setEndsAt] = useState(values.endsAt);
  const [delaySeconds, setDelaySeconds] = useState(String(values.delaySeconds));
  const [displaySeconds, setDisplaySeconds] = useState(
    values.displaySeconds === null ? '' : String(values.displaySeconds),
  );

  const [staged, setStaged] = useState<Staged>(null);
  const [cover, setCover] = useState<File | null>(null);

  /** Stage a picked file so the preview can show it before it is uploaded. */
  const stage = (file: File | null) => {
    if (cover === file) return;
    if (staged?.url) URL.revokeObjectURL(staged.url);
    setCover(file);
    setStaged(file ? { url: URL.createObjectURL(file), name: file.name } : null);
  };

  /* Whether there is artwork at all: a file picked in this session counts
     before it is uploaded, which is what the action decides on too. */
  const hasImage = Boolean(staged || image);

  /** The same list the publish action enforces, so the note and the server
      cannot disagree. Which fields it contains follows the template. */
  const missing = useMemo(
    () =>
      missingForPopupPublish({
        name,
        title,
        message,
        image: hasImage ? 'set' : '',
        ctaLabel,
        ctaHref,
        campaign,
        trackingKey,
        template,
      }),
    [name, title, message, hasImage, ctaLabel, ctaHref, campaign, trackingKey, template],
  );
  const ready = missing.length === 0;
  const gateText = ready ? null : `Not ready to publish. Still needed: ${missing.join(', ')}.`;

  /* Which required fields live on which tab, so each tab's pill can carry its
     own missing count. Mirrors lib/popups/completeness.ts — if a field moves,
     its tab moves with it here or the count would point at the wrong panel. */
  const TAB = {
    campaign: ['Name', 'Campaign', 'Tracking key'],
    content: ['Title', 'Message', 'Image', 'CTA label', 'CTA link'],
    schedule: [] as string[],
  } as const;
  type TabKey = keyof typeof TAB;

  const missingByTab: Record<TabKey, number> = {
    campaign: missing.filter((m) => (TAB.campaign as readonly string[]).includes(m)).length,
    content: missing.filter((m) => (TAB.content as readonly string[]).includes(m)).length,
    schedule: 0,
  };

  const [tab, setTab] = useState<TabKey>('campaign');

  /* What the chosen template renders, and therefore which fields the Content
     tab shows. The same two predicates the completeness list is built from. */
  const showsCopy = templateShowsCopy(template);
  const needsImage = templateNeedsImage(template);

  /* The action talks to the form while it is still mounted: a refused save
     returns { error } into this state, so the complaint shows up beside the
     fields exactly as they were typed. See the note on PopupActionState. */
  const [actionState, formAction, isPending] = useActionState(
    mode === 'new' ? addPopup : savePopup,
    { error: undefined },
  );
  const submitError =
    actionState.error && actionState.error in POPUP_ERR
      ? POPUP_ERR[actionState.error as keyof typeof POPUP_ERR]
      : null;

  return (
    <>
      <div className={styles.memberTopRow}>
        <Link className={styles.memberBackBtn} href="/admin/content/popups">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          All popups
        </Link>

        <div className={styles.filterPills} role="tablist" aria-label="Popup editor">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'campaign'}
            className={`${styles.fbtn} ${tab === 'campaign' ? styles.fbtnOn : ''}`}
            onClick={() => setTab('campaign')}
          >
            Campaign
            {missingByTab.campaign > 0 && (
              <span className={styles.fbtnCount}>{missingByTab.campaign}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'content'}
            className={`${styles.fbtn} ${tab === 'content' ? styles.fbtnOn : ''}`}
            onClick={() => setTab('content')}
          >
            Content
            {missingByTab.content > 0 && (
              <span className={styles.fbtnCount}>{missingByTab.content}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'schedule'}
            className={`${styles.fbtn} ${tab === 'schedule' ? styles.fbtnOn : ''}`}
            onClick={() => setTab('schedule')}
          >
            When &amp; how long
          </button>
        </div>

        {canEdit && (
          <div className={styles.memberTopActions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="submit"
              form="popup-form"
              disabled={isPending}
            >
              {mode === 'new' ? 'Create draft' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {gateText && canEdit && !values.published && (
        <p className={styles.publishGate} role="status">
          <strong>Not ready to publish.</strong> {gateText}
        </p>
      )}

      {!canEdit && <p className={styles.panelNote}>Only an editor may create or change a popup.</p>}

      {/* A refused save shows here, typed fields intact — the action returns an
          error to the mounted form rather than redirecting and wiping it. */}
      {submitError && (
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="status">
          {submitError}
        </p>
      )}

      <form id="popup-form" action={formAction}>
        {values.id && <input type="hidden" name="id" value={values.id} />}

        <section
          className={styles.panel}
          style={{ display: tab === 'campaign' ? undefined : 'none', overflow: 'visible' }}
        >
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Campaign</h2>
              <p className={styles.panelSub}>Who this push is for on the reports side</p>
            </div>
          </div>

          <div className={styles.popupTabBody}>
            <div className={styles.formGrid2}>
            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-name">
                Name <Req /> <Count n={name.length} max={MAX.name} />
              </label>
              <input
                id="pf-name"
                name="name"
                type="text"
                className={styles.memberFieldInput}
                placeholder="July WhatsApp push"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX.name}
                required
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                Your label for the list — visitors never see it.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-campaign">
                Campaign <Req /> <Count n={campaign.length} max={MAX.campaign} />
              </label>
              <input
                id="pf-campaign"
                name="campaign"
                type="text"
                className={styles.memberFieldInput}
                placeholder="Summer promo"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                maxLength={MAX.campaign}
                required
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                The grouping label shared by every popup in one push.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-key">
                Tracking key <Req /> <Count n={trackingKey.length} max={MAX.trackingKey} />
              </label>
              <input
                id="pf-key"
                name="trackingKey"
                type="text"
                className={styles.memberFieldInput}
                placeholder="summer-promo-2026"
                value={trackingKey}
                onChange={(e) => setTrackingKey(e.target.value)}
                maxLength={MAX.trackingKey}
                required
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                Lowercase letters, numbers and hyphens. This is what analytics
                reports will call the popup — it has to be unique.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-placement">
                Placement
              </label>
              <select
                id="pf-placement"
                name="placement"
                className={styles.memberFieldInput}
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                disabled={!canEdit}
              >
                {POPUP_PLACEMENT_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {POPUP_PLACEMENT_LABEL[p]}
                  </option>
                ))}
              </select>
              <span className={styles.memberFieldHelper}>
                Which pages the popup may appear on. “Every page” is the default.
              </span>
            </div>
          </div>
          </div>
        </section>

        <section
          className={styles.panel}
          style={{ display: tab === 'content' ? undefined : 'none', overflow: 'visible' }}
        >
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Content</h2>
              <p className={styles.panelSub}>What the visitor sees and where the button goes</p>
            </div>
          </div>

          <div className={styles.popupTabBody}>

          <div className={styles.memberFieldGroup}>
            <span className={styles.memberFieldLabel}>Template</span>
            <div className={styles.templateChoices} role="radiogroup" aria-label="Popup template">
              {POPUP_TEMPLATE_VALUES.map((t) => (
                <label
                  key={t}
                  className={`${styles.templateChoice} ${template === t ? styles.templateChoiceOn : ''}`}
                >
                  <input
                    className={styles.templateChoiceInput}
                    type="radio"
                    name="template"
                    value={t}
                    checked={template === t}
                    onChange={() => setTemplate(t)}
                    disabled={!canEdit}
                  />
                  <TemplateArt kind={t} />
                  <span className={styles.templateChoiceLabel}>{POPUP_TEMPLATE_LABEL[t]}</span>
                  <span className={styles.templateChoiceBlurb}>{POPUP_TEMPLATE_BLURB[t]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.memberFieldGroup}>
            <label className={styles.memberFieldLabel} htmlFor="pf-title">
              Headline <Req /> <Count n={title.length} max={MAX.title} />
            </label>
            <input
              id="pf-title"
              name="title"
              type="text"
              className={styles.memberFieldInput}
              placeholder="Book your free call this week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX.title}
              required
              readOnly={!canEdit}
            />
            {!showsCopy && (
              <span className={styles.memberFieldHelper}>
                A spotlight shows the image and nothing else, so this is not
                printed anywhere &mdash; it is the description of the image, read
                out to anyone using a screen reader.
              </span>
            )}
          </div>

          {/* Hidden rather than dropped on a spotlight: the wording is kept, so
              switching back to a corner card returns the popup you wrote. */}
          <div
            className={styles.memberFieldGroup}
            style={{ display: showsCopy ? undefined : 'none' }}
          >
            <label className={styles.memberFieldLabel} htmlFor="pf-message">
              Message <Req /> <Count n={message.length} max={MAX.message} />
            </label>
            <div className={styles.memberTextareaWrap}>
              <textarea
                id="pf-message"
                name="message"
                className={styles.memberTextarea}
                placeholder="One or two lines under the headline."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX.message}
                rows={3}
                readOnly={!canEdit}
              />
              <span className={styles.memberCharCount}>
                {message.length} / {MAX.message}
              </span>
            </div>
          </div>

          <ImageField
            name="image"
            label={needsImage ? 'Image' : 'Image (optional)'}
            value={image}
            preview={staged?.url ?? null}
            fileName={staged?.name ?? null}
            onFileChange={stage}
            canEdit={canEdit}
          />
          {needsImage && (
            <p className={styles.memberFieldHelper}>
              The whole popup. It is shown at its own proportions, centred over
              the page, and clicking it follows the CTA link below.
            </p>
          )}

          <div className={styles.formGrid2}>
            <div
              className={styles.memberFieldGroup}
              style={{ display: showsCopy ? undefined : 'none' }}
            >
              <label className={styles.memberFieldLabel} htmlFor="pf-cta-label">
                CTA label <Req /> <Count n={ctaLabel.length} max={MAX.ctaLabel} />
              </label>
              <input
                id="pf-cta-label"
                name="ctaLabel"
                type="text"
                className={styles.memberFieldInput}
                placeholder="Book a call"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                maxLength={MAX.ctaLabel}
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                The button text — one or two words.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-cta-href">
                CTA link <Req /> <Count n={ctaHref.length} max={MAX.ctaHref} />
              </label>
              <input
                id="pf-cta-href"
                name="ctaHref"
                type="url"
                className={styles.memberFieldInput}
                placeholder="https://calendly.com/…"
                value={ctaHref}
                onChange={(e) => setCtaHref(e.target.value)}
                maxLength={MAX.ctaHref}
                required
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                {showsCopy
                  ? 'Where the button goes: a page on the site or an external URL.'
                  : 'Where the image goes when it is clicked: a page on the site or an external URL.'}
              </span>
            </div>
          </div>
          </div>
        </section>

        <section
          className={styles.panel}
          style={{ display: tab === 'schedule' ? undefined : 'none', overflow: 'visible' }}
        >
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>When &amp; how long</h2>
              <p className={styles.panelSub}>Timing and behaviour of the popup</p>
            </div>
          </div>

          <div className={styles.popupTabBody}>

          <div className={styles.formGrid2}>
            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-starts">
                Starts
              </label>
              <input
                id="pf-starts"
                name="startsAt"
                type="datetime-local"
                className={styles.memberFieldInput}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                When it may begin showing. Empty = as soon as it is published.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-ends">
                Ends
              </label>
              <input
                id="pf-ends"
                name="endsAt"
                type="datetime-local"
                className={styles.memberFieldInput}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                readOnly={!canEdit}
              />
              <span className={styles.memberFieldHelper}>
                When it stops showing. Empty = until you suspend it.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-delay">
                Delay before showing
              </label>
              <div className={styles.memberStepWrap}>
                <input
                  id="pf-delay"
                  name="delaySeconds"
                  type="number"
                  inputMode="numeric"
                  className={styles.memberFieldInput}
                  min={0}
                  max={300}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(e.target.value)}
                  readOnly={!canEdit}
                />
                <span className={styles.memberStepUnit}>seconds</span>
              </div>
              <span className={styles.memberFieldHelper}>
                How long after the page loads before it appears.
              </span>
            </div>

            <div className={styles.memberFieldGroup}>
              <label className={styles.memberFieldLabel} htmlFor="pf-display">
                How long it stays
              </label>
              <div className={styles.memberStepWrap}>
                <input
                  id="pf-display"
                  name="displaySeconds"
                  type="number"
                  inputMode="numeric"
                  className={styles.memberFieldInput}
                  min={1}
                  max={600}
                  value={displaySeconds}
                  onChange={(e) => setDisplaySeconds(e.target.value)}
                  readOnly={!canEdit}
                />
                <span className={styles.memberStepUnit}>seconds</span>
              </div>
              <span className={styles.memberFieldHelper}>
                Leave empty to stay until the visitor closes it.
              </span>
            </div>
          </div>
          </div>
        </section>
      </form>
    </>
  );
}

/**
 * The thumbnail beside each template's name.
 *
 * Two rectangles and a few lines: a card in the corner of an otherwise ordinary
 * page, or an image centred over a dimmed one. The difference between the
 * templates is where they sit and what they cover, which is a thing to look at
 * rather than a thing to read.
 */
function TemplateArt({ kind }: { kind: PopupTemplate }) {
  if (kind === 'spotlight') {
    return (
      <svg className={styles.templateArt} viewBox="0 0 96 60" aria-hidden="true">
        <rect x="0.5" y="0.5" width="95" height="59" rx="6" className={styles.templateArtPage} />
        <rect x="0.5" y="0.5" width="95" height="59" rx="6" className={styles.templateArtDim} />
        <rect x="24" y="13" width="48" height="34" rx="4" className={styles.templateArtCard} />
        <circle cx="76" cy="10" r="4" className={styles.templateArtClose} />
      </svg>
    );
  }
  return (
    <svg className={styles.templateArt} viewBox="0 0 96 60" aria-hidden="true">
      <rect x="0.5" y="0.5" width="95" height="59" rx="6" className={styles.templateArtPage} />
      <rect x="9" y="11" width="44" height="4" rx="2" className={styles.templateArtLine} />
      <rect x="9" y="21" width="60" height="4" rx="2" className={styles.templateArtLine} />
      <rect x="9" y="31" width="36" height="4" rx="2" className={styles.templateArtLine} />
      <rect x="53" y="33" width="37" height="22" rx="4" className={styles.templateArtCard} />
    </svg>
  );
}

/**
 * "120 / 120" beside a field's label.
 *
 * The limits are already enforced by `maxLength` and the action, silently —
 * showing the count turns a dead keyboard into a number.
 */
function Count({ n, max }: { n: number; max: number }) {
  return (
    <span className={`${styles.countHint} ${n >= max ? styles.countHintFull : ''}`}>
      {n} / {max}
    </span>
  );
}