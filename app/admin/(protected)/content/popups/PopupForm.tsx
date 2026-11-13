'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import {
  isoToLocal,
  localToIso,
  missingFromError,
  type AdminPopup,
  type PopupInput,
} from '@/lib/api/popups';
import { listMissing, missingForPopupPublish } from '@/lib/popups/completeness';
import { POPUP_PLACEMENT_LABEL, POPUP_PLACEMENT_VALUES } from '@/lib/popups/placement';
import {
  POPUP_TEMPLATE_BLURB,
  POPUP_TEMPLATE_LABEL,
  POPUP_TEMPLATE_VALUES,
  templateNeedsImage,
  templateShowsCopy,
  type PopupTemplate,
} from '@/lib/popups/templates';
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
 * A client component: the publish gate needs the values while they are being
 * typed. Saving goes to the backend (POST/PATCH /v1/admin/popups), which
 * enforces the same rules — completeness for the template, the unique tracking
 * key, the http(s) CTA link, end-after-start — and answers with the field that
 * failed, shown beside it. The image uploads straight to Cloudinary
 * (ImageUploadField) and the form saves the resulting URL.
 *
 * Schedule times are typed in the editor's own zone (datetime-local) and sent
 * as ISO instants (toISOString), which is what the backend requires.
 *
 * Publish is gated on lib/popups/completeness.ts, a mirror of the backend's
 * list (src/modules/popups/completeness.ts), so the note and the server's
 * answer agree — and each
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
 * same rule the backend applies.
 */

const MAX = {
  name: 120,
  title: 200,
  message: 500,
  ctaLabel: 40,
  ctaHref: 500,
  campaign: 120,
  trackingKey: 120,
} as const;

export default function PopupForm({
  popup,
  canEdit,
}: {
  /** null for New popup. */
  popup: AdminPopup | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const mode = popup ? 'edit' : 'new';
  const [name, setName] = useState(popup?.name ?? '');
  const [title, setTitle] = useState(popup?.title ?? '');
  const [message, setMessage] = useState(popup?.message ?? '');
  const [image, setImage] = useState<string | null>(popup?.image ?? null);
  const [ctaLabel, setCtaLabel] = useState(popup?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(popup?.ctaHref ?? '');
  const [campaign, setCampaign] = useState(popup?.campaign ?? '');
  const [trackingKey, setTrackingKey] = useState(popup?.trackingKey ?? '');
  const [placement, setPlacement] = useState(popup?.placement ?? 'everywhere');
  const [template, setTemplate] = useState(popup?.template ?? 'corner');
  const [startsAt, setStartsAt] = useState(isoToLocal(popup?.startsAt));
  const [endsAt, setEndsAt] = useState(isoToLocal(popup?.endsAt));
  const [delaySeconds, setDelaySeconds] = useState(String(popup?.delaySeconds ?? 1));
  const [displaySeconds, setDisplaySeconds] = useState(
    popup?.displaySeconds == null ? '' : String(popup.displaySeconds),
  );

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const hasImage = Boolean(image);

  /** The same list the backend enforces, so the note and the server agree.
      Which fields it contains follows the template. */
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
  const gateText = ready ? null : `Still needed: ${listMissing(missing)}.`;

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

  /** What the backend receives: datetime-local → ISO, '' → null. */
  function body(): PopupInput {
    const delay = Number(delaySeconds);
    return {
      name,
      title,
      message,
      image,
      ctaLabel,
      ctaHref,
      campaign,
      trackingKey,
      placement,
      template,
      startsAt: localToIso(startsAt),
      endsAt: localToIso(endsAt),
      delaySeconds: Number.isFinite(delay) ? delay : 1,
      displaySeconds: displaySeconds.trim() === '' ? null : Number(displaySeconds),
    };
  }

  /** One call to the backend; a refusal stays on screen with the fields intact. */
  async function run(call: () => Promise<string | void>) {
    setBusy(true);
    setNotice(null);
    setErrs({});
    try {
      const ok = await call();
      if (ok) setNotice({ tone: 'ok', text: ok });
    } catch (err) {
      const stillNeeded = missingFromError(err);
      if (err instanceof ApiError) setErrs(err.fieldErrors());
      setNotice({
        tone: 'err',
        text: stillNeeded.length
          ? `Not saved — still needed: ${listMissing(stillNeeded)}.`
          : err instanceof ApiError && err.issues.length
            ? err.issues.map((i) => i.message).join(' ')
            : err instanceof Error
              ? err.message
              : 'Something went wrong.',
      });
    } finally {
      setBusy(false);
    }
  }

  function save(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    return run(async () => {
      if (!popup) {
        const created = await api.post<AdminPopup>('/admin/popups', body());
        router.push(`/admin/content/popups/${created.id}?created=1`);
        return;
      }
      await api.patch<AdminPopup>(`/admin/popups/${popup.id}`, body());
      router.refresh();
      return 'Saved.';
    });
  }

  /** Publish saves what is on screen too; suspend changes nothing else. */
  const setPublished = (next: boolean) =>
    run(async () => {
      if (!popup) return;
      await api.patch<AdminPopup>(
        `/admin/popups/${popup.id}`,
        next ? { ...body(), published: true } : { published: false },
      );
      router.refresh();
      return next
        ? 'Saved and published — it can now appear on its placement (inside its schedule).'
        : 'Suspended. Nothing was deleted — the draft is kept.';
    });

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
              disabled={busy}
            >
              {mode === 'new' ? 'Create draft' : 'Save changes'}
            </button>
            {popup && (
              <button
                className={`${styles.btn} ${popup.published ? styles.btnGhost : styles.btnPrimary}`}
                type="button"
                onClick={() => setPublished(!popup.published)}
                disabled={busy || (!popup.published && !ready)}
                title={!popup.published && !ready ? gateText ?? undefined : undefined}
              >
                {popup.published ? 'Suspend' : 'Save & publish'}
              </button>
            )}
          </div>
        )}
      </div>

      {gateText && canEdit && !popup?.published && (
        <p className={styles.publishGate} role="status">
          <strong>Not ready to publish.</strong> {gateText}
        </p>
      )}

      {popup && popup.published && popup.state !== 'live' && (
        <p className={styles.publishGate} role="status">
          <strong>{popup.state === 'scheduled' ? 'Scheduled.' : 'Ended.'}</strong>{' '}
          {popup.state === 'scheduled'
            ? 'Published, but its start time is still ahead — it shows nowhere until then.'
            : 'Published, but its end time has passed — it shows nowhere. Change the schedule or suspend it.'}
        </p>
      )}

      {!canEdit && <p className={styles.panelNote}>Only an editor may create or change a popup.</p>}

      {/* A refused save shows here, typed fields intact. */}
      {notice && (
        <p
          className={`${styles.signinMsg} ${notice.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={notice.tone === 'ok' ? 'status' : 'alert'}
        >
          {notice.text}
        </p>
      )}

      <form id="popup-form" onSubmit={save}>

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
              <Err msg={errs.name} />
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
              <Err msg={errs.campaign} />
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
              <Err msg={errs.trackingKey} />
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
            <Err msg={errs.message} />
          </div>

          <ImageUploadField
            label={needsImage ? 'Image' : 'Image (optional)'}
            kind="popups"
            value={image}
            onChange={setImage}
            canEdit={canEdit}
            required={needsImage}
          />
          <Err msg={errs.image} />
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
              <Err msg={errs.ctaLabel} />
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
              <Err msg={errs.ctaHref} />
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
              <Err msg={errs.startsAt} />
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
              <Err msg={errs.endsAt} />
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
              <Err msg={errs.delaySeconds} />
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
              <Err msg={errs.displaySeconds} />
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

/** The backend's complaint about one field, under that field. */
function Err({ msg }: { msg?: string }) {
  return msg ? <p className={styles.fieldErr} role="alert">{msg}</p> : null;
}
