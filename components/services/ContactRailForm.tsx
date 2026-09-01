'use client';

import { useState, type FormEvent } from 'react';
import styles from './ContactRail.module.css';
import { attributionForSubmit } from '@/lib/analytics/attribution';
import { track } from '@/lib/analytics/events';

/**
 * The contact-brief form inside ContactRail.
 *
 * Provides a clean 2-column input layout with proper placeholders,
 * validation, honeypot spam protection, privacy consent checkbox,
 * and reliable error fallback.
 */

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Ireland', 'Australia',
  'New Zealand', 'United Arab Emirates', 'Saudi Arabia', 'Germany',
  'Netherlands', 'Sweden', 'South Africa', 'Kenya', 'Nigeria', 'Ethiopia',
  'India', 'Singapore', 'Philippines',
];

const SERVICES = [
  'Virtual Back Office Pod',
  'Order Processing & Data Entry',
  'Bookkeeping, AP / AR',
  'Inbox & Chat Administration',
  'Account Administration & CRM',
  'Customer Support & Helpdesk',
  'A custom mix — scope in consultation',
];

const CONTACT_EMAIL = 'support@remassistance.com';
const CALENDLY = 'https://calendly.com/j-zemene-remassistance/new-meeting';

interface Brief {
  first: string;
  last: string;
  company: string;
  phone: string;
  email: string;
  country: string;
  service: string;
  message: string;
}

function mailtoFallback(b: Brief) {
  const body = [
    'I tried to send this through the website form and it did not go through.',
    '',
    `Name:     ${[b.first, b.last].filter(Boolean).join(' ')}`,
    b.company ? `Company:  ${b.company}` : '',
    b.phone ? `Phone:    ${b.phone}` : '',
    b.country ? `Country:  ${b.country}` : '',
    b.service ? `Needs:    ${b.service}` : '',
    '',
    b.message,
  ].filter(Boolean).join('\n');
  const subject = 'Back office enquiry';
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ContactRailForm() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'fallback'>('idle');
  const [brief, setBrief] = useState<Brief | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;

    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const b: Brief = {
      first: get('first_name'),
      last: get('last_name'),
      company: get('company'),
      phone: get('phone'),
      email: get('email'),
      country: get('country'),
      service: get('service'),
      message: get('message'),
    };
    setBrief(b);
    setSending(true);

    const message = [
      b.service ? `Needs: ${b.service}` : '',
      b.country ? `Country: ${b.country}` : '',
      b.message,
    ].filter(Boolean).join('\n');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: b.email,
          name: [b.first, b.last].filter(Boolean).join(' ') || undefined,
          phone: b.phone || undefined,
          company: b.company || undefined,
          message: message || undefined,
          honey: get('company_website') || undefined,
          source: 'contact_form',
          page: window.location.href,
          attribution: attributionForSubmit(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      track('generate_lead', { lead_source: 'contact_form', has_quiz: false });
      setStatus('sent');
    } catch {
      setStatus('fallback');
    } finally {
      setSending(false);
    }
  }

  if (status === 'sent') {
    return (
      <div className={styles.sent} role="status">
        <strong>Thanks — that reached us.</strong>
        <p>
          We read every brief ourselves and reply within one business day. If it is urgent,{' '}
          <a href={CALENDLY} target="_blank" rel="noopener">book the consult</a> and skip the queue.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.formGrid} onSubmit={onSubmit}>
      <div>
        <label className={styles.label} htmlFor="cr-first">First name</label>
        <input
          className={styles.input}
          id="cr-first"
          name="first_name"
          type="text"
          placeholder="Enter your first name"
          autoComplete="given-name"
          required
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="cr-last">Last name</label>
        <input
          className={styles.input}
          id="cr-last"
          name="last_name"
          type="text"
          placeholder="Enter your last name"
          autoComplete="family-name"
          required
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="cr-company">Company</label>
        <input
          className={styles.input}
          id="cr-company"
          name="company"
          type="text"
          placeholder="Your company name"
          autoComplete="organization"
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="cr-phone">Phone</label>
        <input
          className={styles.input}
          id="cr-phone"
          name="phone"
          type="tel"
          placeholder="Your phone number"
          autoComplete="tel"
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="cr-email">Business email</label>
        <input
          className={styles.input}
          id="cr-email"
          name="email"
          type="email"
          placeholder="name@company.com"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="cr-country">Country</label>
        <select className={styles.input} id="cr-country" name="country" defaultValue="">
          <option value="" disabled>Select your country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label} htmlFor="cr-service">What do you need covered?</label>
        <select className={styles.input} id="cr-service" name="service" defaultValue="">
          <option value="" disabled>Select the closest fit</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label} htmlFor="cr-message">How can we help?</label>
        <textarea
          className={styles.input}
          id="cr-message"
          name="message"
          rows={3}
          placeholder="Tell us more about your goals, challenges, or the support you need."
        />
      </div>

      {/* Honeypot spam defense */}
      <div className={styles.honey} aria-hidden="true">
        <label>
          Do not fill this in
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={styles.consent}>
        <input id="cr-consent" name="consent" type="checkbox" required />
        <label htmlFor="cr-consent">
          I agree to the <a href="/privacy-policy" target="_blank">Privacy Policy</a> and allow the team to contact me about this inquiry. We respect your privacy.
        </label>
      </div>

      <div className={styles.formFoot}>
        <button className={styles.btn} type="submit" disabled={sending}>
          <span>{sending ? 'Sending…' : 'Send it over'}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
        <span className={styles.formNote}>
          Prefer to talk? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </span>
      </div>

      {status === 'fallback' && brief && (
        <p className={styles.error} role="alert">
          That did not go through — our fault, not yours.{' '}
          <a href={mailtoFallback(brief)}>Send it as an email instead</a> and everything you typed
          comes with it.
        </p>
      )}
    </form>
  );
}