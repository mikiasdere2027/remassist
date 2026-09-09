'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './ContactRail.module.css';

/**
 * The "Let's Talk" button in the contact band, and the dialog behind it.
 *
 * Split from ContactRail so the band itself stays a server component: this is
 * the only part of it that needs state. The dialog — eight fields, the country
 * and service lists, the submit handler, the mailto fallback — is a separate
 * chunk pulled on the first click, the same arrangement BookingModal uses for
 * the Calendly panel. Twelve routes render this band; none of them should pay
 * for an intake form the visit may never open.
 */
const ContactDialog = dynamic(() => import('./ContactDialog'), { ssr: false });

export default function ContactRailCta() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  /* Called at the END of the dialog's fade-out — the dialog owns that timing,
     so focus returns to the button only once it has actually gone. */
  function onClose() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <button
        type="button"
        ref={trigger}
        className={styles.bannerBtn}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Let&rsquo;s Talk
      </button>
      {open && <ContactDialog onClose={onClose} />}
    </>
  );
}
