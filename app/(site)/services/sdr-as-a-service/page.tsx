import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import styles from './page.module.css';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import ContactRail from '@/components/services/ContactRail';

export const metadata: Metadata = {
  title: 'SDR as a Service',
  description:
    'Niche-trained SDRs who build lists, run multi-channel sequences, and book qualified meetings — a full outbound engine without the hiring cycle.',
  alternates: { canonical: '/services/sdr-as-a-service' },
  openGraph: pageOg('/services/sdr-as-a-service'),
};

export default function Page() {
  return (
    <main>
  
  
    
  
    
  <section style={{ backgroundColor: "var(--bg-marketing-paper)", backgroundImage: "url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22240%22%20height%3D%2260%22%20viewBox%3D%220%200%20240%2060%22%3E%3Cpath%20d%3D%22M0%2030c20-20%2040-20%2060%200s40%2020%2060%200%2040-20%2060%200%2040%2020%2060%200%22%20fill%3D%22none%22%20stroke%3D%22rgba(44%2C123%2C229%2C0.20)%22%20stroke-width%3D%221.6%22%2F%3E%3Cpath%20d%3D%22M0%2048c20-20%2040-20%2060%200s40%2020%2060%200%2040-20%2060%200%2040%2020%2060%200%22%20fill%3D%22none%22%20stroke%3D%22rgba(14%2C42%2C74%2C0.10)%22%20stroke-width%3D%221.2%22%2F%3E%3C%2Fsvg%3E'), url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22240%22%20height%3D%2260%22%20viewBox%3D%220%200%20240%2060%22%3E%3Cpath%20d%3D%22M0%2030c20-20%2040-20%2060%200s40%2020%2060%200%2040-20%2060%200%2040%2020%2060%200%22%20fill%3D%22none%22%20stroke%3D%22rgba(44%2C123%2C229%2C0.20)%22%20stroke-width%3D%221.6%22%2F%3E%3Cpath%20d%3D%22M0%2048c20-20%2040-20%2060%200s40%2020%2060%200%2040-20%2060%200%2040%2020%2060%200%22%20fill%3D%22none%22%20stroke%3D%22rgba(14%2C42%2C74%2C0.10)%22%20stroke-width%3D%221.2%22%2F%3E%3C%2Fsvg%3E'), radial-gradient(rgba(44,123,229,0.13) 1.5px, transparent 1.5px)", backgroundSize: "240px 60px, 240px 60px, 26px 26px", backgroundPosition: "0 0, 0 30px, 0 0", animation: "waveShift 26s linear infinite", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" }}>
        <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-blue)" }}>SDR as a Service</p>
        <h1 style={{ margin: "0 auto 20px", fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5.4vw, 50px)", lineHeight: 1.15, fontWeight: 700, color: "var(--brand-navy)", maxWidth: "22ch", textWrap: "balance" }}>SDRs who book meetings, not activity in a dashboard.</h1>
        <p style={{ margin: "0 auto 32px", fontSize: "18px", lineHeight: 1.6, color: "var(--ink-600)", maxWidth: "60ch" }}>Niche-trained SDRs who build lists, run multi-channel sequences, and book qualified meetings — a full outbound engine without the hiring cycle.</p>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "center" }}>
          <a href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener' style={{ background: "var(--brand-blue)", color: "#fff", fontSize: "17px", fontWeight: 600, textDecoration: "none", padding: "14px 28px", borderRadius: "6px", transition: "background 150ms" }} className={styles['hv-1']}>Book a Call</a>
          <a href='/pricing' style={{ color: "var(--brand-navy)", fontSize: "17px", fontWeight: 600, textDecoration: "none", padding: "14px 20px", borderRadius: "6px", border: "1px solid var(--border-strong)" }} className={styles['hv-2']}>See pricing</a>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section style={{ background: "#fff", borderTop: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)" }}>
 <div className={styles['rgrid-1']} style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 24px", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: "30px", fontWeight: 700, color: "var(--brand-navy)" }}>2 wks</div>
          <div style={{ fontSize: "14px", color: "var(--ink-500)" }}>From kickoff to first sequences</div>
        </div>
        <div>
          <div style={{ fontSize: "30px", fontWeight: 700, color: "var(--brand-navy)" }}>3</div>
          <div style={{ fontSize: "14px", color: "var(--ink-500)" }}>Channels: email, phone, LinkedIn</div>
        </div>
        <div>
          <div style={{ fontSize: "30px", fontWeight: 700, color: "var(--brand-navy)" }}>100%</div>
          <div style={{ fontSize: "14px", color: "var(--ink-500)" }}>Verified contact data</div>
        </div>
        <div>
          <div style={{ fontSize: "30px", fontWeight: 700, color: "var(--brand-navy)" }}>Held</div>
          <div style={{ fontSize: "14px", color: "var(--ink-500)" }}>We report meetings held, not sent</div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section style={{ background: "var(--bg-marketing-paper)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 700, color: "var(--brand-navy)" }}>The outbound engine, end to end</h2>
        <p style={{ margin: "0 0 48px", fontSize: "16px", lineHeight: 1.6, color: "var(--ink-600)", maxWidth: "64ch" }}>Your SDRs don’t just dial. Each seat owns the full loop from targeting to handoff.</p>
 <div className={styles['rgrid-1']}>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)", marginBottom: "14px" }}>01</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>List building</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>ICP-matched accounts sourced via LinkedIn Sales Navigator, enriched and verified with RevenueBase.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)", marginBottom: "14px" }}>02</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>Sequencing</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Multi-touch cadences built and run in GoHighLevel or HubSpot — email, calls, and LinkedIn touches.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)", marginBottom: "14px" }}>03</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>Qualification + booking</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Replies worked to a meeting on your AE’s calendar, qualified against criteria you define.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--border-default)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700, color: "var(--brand-blue)", marginBottom: "14px" }}>04</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "var(--brand-navy)" }}>Handoff + hygiene</h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--ink-600)" }}>Clean CRM records, call notes, and no-show rescue sequences — nothing falls between tools.</p>
          </div>
        </div>
      </div>
    </section>
  
  
    
  
    
  <section style={{ background: "var(--brand-navy)" }}>
 <div className={styles['rgrid-2']} style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px", alignItems: "center" }}>
        <div>
          <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--blue-300)" }}>Why our SDRs ramp fast</p>
          <h2 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: "34px", fontWeight: 700, color: "#fff" }}>Trained in the tools before they touch your pipeline</h2>
          <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.65, color: "var(--ink-200)" }}>Every SDR completes our outbound track — prospecting, objection handling, and hands-on certification in GHL, HubSpot, and Sales Navigator — before placement. Add your product training on top, and they’re sequencing in week one.</p>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
          <li style={{ background: "var(--navy-800)", border: "1px solid var(--navy-600)", borderRadius: "6px", padding: "18px 22px", fontSize: "15px", color: "var(--ink-100)", display: "flex", gap: "12px", alignItems: "baseline" }}><span style={{ color: "var(--blue-300)" }}>✓</span> Dedicated SDRs — never shared across clients</li>
          <li style={{ background: "var(--navy-800)", border: "1px solid var(--navy-600)", borderRadius: "6px", padding: "18px 22px", fontSize: "15px", color: "var(--ink-100)", display: "flex", gap: "12px", alignItems: "baseline" }}><span style={{ color: "var(--blue-300)" }}>✓</span> Your ICP, your messaging, your qualification bar</li>
          <li style={{ background: "var(--navy-800)", border: "1px solid var(--navy-600)", borderRadius: "6px", padding: "18px 22px", fontSize: "15px", color: "var(--ink-100)", display: "flex", gap: "12px", alignItems: "baseline" }}><span style={{ color: "var(--blue-300)" }}>✓</span> Scale seats up or down as pipeline demands</li>
          <li style={{ background: "var(--navy-800)", border: "1px solid var(--navy-600)", borderRadius: "6px", padding: "18px 22px", fontSize: "15px", color: "var(--ink-100)", display: "flex", gap: "12px", alignItems: "baseline" }}><span style={{ color: "var(--blue-300)" }}>✓</span> ISO 27001-aligned handling of prospect data</li>
        </ul>
      </div>
    </section>
  
  
    
  
    
  <ServiceJsonLd path='/services/sdr-as-a-service' />

  <ContactRail />
    </main>
  );
}
