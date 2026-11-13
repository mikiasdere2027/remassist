import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import Image from 'next/image';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';

export const metadata: Metadata = {
  title: 'GTM Teams',
  description:
    'Outbound, marketing ops and CRM administration assembled into a single team that runs your motion end to end — one contract, one report, one weekly standup.',
  alternates: { canonical: '/services/gtm-teams' },
  openGraph: pageOg('/services/gtm-teams'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <div style={{ background: "var(--bg-marketing-paper)", borderBottom: "1px solid var(--border-default)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "12px 24px" }}>
        <a href='/services/marketing-and-content' style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: "var(--brand-blue)", textDecoration: "none" }} className={styles['hv-1']}>
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M19 12H5m6 6-6-6 6-6' /></svg>
          Marketing &amp; Content
        </a>
      </div>
    </div>
  
  
    
  
    
  <section style={{ background: "var(--brand-navy)" }}>
 <div className={styles['rgrid-1']} style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px 72px", alignItems: "center" }}>
        <div>
          <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--blue-300)" }}>GTM Teams</p>
          <h1 style={{ margin: "0 0 20px", fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5.2vw, 48px)", lineHeight: 1.15, fontWeight: 700, color: "#fff", textWrap: "balance" }}>A go-to-market pod, hired as one unit.</h1>
          <p style={{ margin: "0 0 32px", fontSize: "18px", lineHeight: 1.6, color: "var(--ink-200)", maxWidth: "54ch" }}>Skip six hiring cycles. We assemble outbound, marketing ops, and CRM administration into a single team that runs your motion end to end — under one contract, one report, one weekly standup.</p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <a href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener' style={{ background: "var(--brand-blue)", color: "#fff", fontSize: "17px", fontWeight: 600, textDecoration: "none", padding: "14px 28px", borderRadius: "6px", transition: "background 150ms" }} className={styles['hv-2']}>Book a Call</a>
            <a href='/pricing' style={{ color: "#fff", fontSize: "17px", fontWeight: 600, textDecoration: "none", padding: "14px 20px", borderRadius: "6px", border: "1px solid var(--navy-500)" }} className={styles['hv-3']}>See pricing</a>
          </div>
        </div>
        <div className={styles['gtm-pod']} aria-hidden='true'>
          <svg className={styles['gtm-pod-svg']} viewBox='0 0 400 400'>
            <path className={styles['gtm-pod-rail']} d='M78 128 Q120 158 132 172' />
            <path className={styles['gtm-pod-rail']} d='M322 128 Q280 158 268 172' />
            <path className={styles['gtm-pod-rail']} d='M200 330 L200 292' />
            <path className={`${styles['gtm-pod-flow']} ${styles['gtm-pod-flow--b']}`} pathLength='100' d='M78 128 Q120 158 132 172' />
            <path className={`${styles['gtm-pod-flow']} ${styles['gtm-pod-flow--c']}`} pathLength='100' d='M322 128 Q280 158 268 172' />
            <path className={`${styles['gtm-pod-flow']} ${styles['gtm-pod-flow--out']}`} pathLength='100' d='M200 330 L200 292' />
          </svg>

          <span className={styles['gtm-pod-halo']}></span>

          <span className={styles['gtm-pod-core']}>
            <span className={styles['gtm-pod-faces']}>
              <span><Image src='/images/Agents/gtm-1.jpg' alt='' width={128} height={128} sizes="34px" loading="eager" /></span>
              <span><Image src='/images/Agents/gtm-2.jpg' alt='' width={128} height={128} sizes="34px" loading="eager" /></span>
              <span><Image src='/images/Agents/gtm-3.jpg' alt='' width={128} height={128} sizes="34px" loading="eager" /></span>
            </span>
            <b>One pod,<br />one contract</b>
            <small>One weekly standup</small>
          </span>

          <span className={`${styles['gtm-pod-node']} ${styles['gtm-pod-node--out']}`}>
            <i><svg viewBox='0 0 24 24'><path d='M4 6h16v12H4z' /><path d='m4 7 8 6 8-6' /></svg></i>
            <span><b>Outbound</b><em>Pipeline built</em></span>
          </span>
          <span className={`${styles['gtm-pod-node']} ${styles['gtm-pod-node--ops']}`}>
            <i><svg viewBox='0 0 24 24'><path d='M4 19V9M10 19V5M16 19v-6' /><path d='M2 19h20' /></svg></i>
            <span><b>Marketing ops</b><em>Campaigns shipped</em></span>
          </span>
          <span className={`${styles['gtm-pod-node']} ${styles['gtm-pod-node--crm']}`}>
            <i><svg viewBox='0 0 24 24'><rect x='3' y='4' width='18' height='16' rx='2' /><path d='M3 9h18M8 14h8' /></svg></i>
            <span><b>CRM admin</b><em>Data kept clean</em></span>
          </span>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section style={{ background: "var(--bg-marketing-paper)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 700, color: "var(--brand-navy)" }}>What’s in a pod</h2>
        <p style={{ margin: "0 0 48px", fontSize: "16px", lineHeight: 1.6, color: "var(--ink-600)", maxWidth: "64ch" }}>Pods run 2–6 seats depending on your motion. Every role is filled from our bench — tech-adept generalists for breadth, niche-trained specialists where depth matters.</p>
 <div className={styles['rgrid-2']}>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--brand-blue)", letterSpacing: "0.05em", marginBottom: "12px" }}>SEAT 1</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--brand-navy)" }}>GTM Lead</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Owns the plan and the weekly report. Your single point of contact for the whole pod.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--brand-blue)", letterSpacing: "0.05em", marginBottom: "12px" }}>SEATS 2–3</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--brand-navy)" }}>SDRs</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>List building, sequencing, calls, and booking — the same specialists behind our <a href='/services/sdr-as-a-service' style={{ color: "var(--brand-blue)", fontWeight: 600 }}>SDR as a Service</a> offer.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--brand-blue)", letterSpacing: "0.05em", marginBottom: "12px" }}>SEAT 4</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--brand-navy)" }}>Marketing VA</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Content, social, SEO support, and campaign assembly that keeps the outbound warm.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--brand-blue)", letterSpacing: "0.05em", marginBottom: "12px" }}>SEAT 5</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--brand-navy)" }}>RevOps / CRM Admin</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Pipelines, automations, attribution, and hygiene in GoHighLevel or HubSpot — so the data stays true.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section style={{ background: "#fff", borderTop: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)" }}>
 <div className={styles['rgrid-3']} style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 700, color: "var(--brand-navy)" }}>Built in your stack, not around it</h2>
          <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.65, color: "var(--ink-600)" }}>Our pods live inside GoHighLevel and HubSpot daily — funnels, workflows, snapshots, sequences, reporting dashboards. Prospecting runs on LinkedIn Sales Navigator with RevenueBase-verified data. If you run something else, our agents adapt: no software mandates, ever.</p>
        </div>
 <div className={styles['rgrid-4']}>
          <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "18px 20px", background: "var(--bg-marketing-paper)" }}><div style={{ fontSize: "15px", fontWeight: 700, color: "var(--brand-navy)" }}>GoHighLevel</div><div style={{ fontSize: "13px", color: "var(--ink-500)" }}>Funnels, workflows, snapshots</div></div>
          <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "18px 20px", background: "var(--bg-marketing-paper)" }}><div style={{ fontSize: "15px", fontWeight: 700, color: "var(--brand-navy)" }}>HubSpot</div><div style={{ fontSize: "13px", color: "var(--ink-500)" }}>CRM, sequences, reporting</div></div>
          <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "18px 20px", background: "var(--bg-marketing-paper)" }}><div style={{ fontSize: "15px", fontWeight: 700, color: "var(--brand-navy)" }}>Sales Navigator</div><div style={{ fontSize: "13px", color: "var(--ink-500)" }}>Account + lead sourcing</div></div>
          <div style={{ border: "1px solid var(--border-default)", borderRadius: "6px", padding: "18px 20px", background: "var(--bg-marketing-paper)" }}><div style={{ fontSize: "15px", fontWeight: 700, color: "var(--brand-navy)" }}>RevenueBase</div><div style={{ fontSize: "13px", color: "var(--ink-500)" }}>Verified B2B contact data</div></div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section style={{ background: "var(--bg-marketing-paper)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ margin: "0 0 40px", fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 700, color: "var(--brand-navy)" }}>What you get every week</h2>
 <div className={styles['rgrid-5']}>
          <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)" }}>01</span>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>Pipeline report</h3>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Meetings booked, opportunities created, campaign performance — against the KPIs you set.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)" }}>02</span>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>Standup with your lead</h3>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>One call, one owner. Adjust targeting, messaging, and priorities without chasing five contractors.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)" }}>03</span>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>Daily work logs</h3>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>AI-assisted monitoring with hourly logs and daily email reports on every seat in the pod.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <ServiceJsonLd path='/services/gtm-teams' />

  <ContactRail />
    </main>
  );
}
