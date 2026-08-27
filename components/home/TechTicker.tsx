import styles from './TechTicker.module.css';

/**
 * TechTicker — "Our dedicated tech-stack" (index.html, Phase 02).
 *
 * OPEN ITEM: the artboard sourced every tool mark from Google's favicon
 * service at render time, which is exactly the third-party runtime fetch this
 * migration exists to remove (and it tells Google about every visitor). The
 * URL is built in one place below so vendoring the marks into
 * /public/images/tools/ is a one-line change — see ICON_SRC.
 */
const ICON_SRC = (domain: string) =>
  `url('https://www.google.com/s2/favicons?domain=${domain}&sz=64')`;

const TOOLS = [
  { name: 'GoHighLevel', domain: 'gohighlevel.com' },
  { name: 'HubSpot', domain: 'hubspot.com' },
  { name: 'LinkedIn Sales Navigator', domain: 'linkedin.com' },
  { name: 'Zendesk', domain: 'zendesk.com' },
  { name: 'Intercom', domain: 'intercom.com' },
  { name: 'Slack', domain: 'slack.com' },
  { name: 'Zoom', domain: 'zoom.us' },
  { name: 'Monday.com', domain: 'monday.com' },
  { name: 'QuickBooks', domain: 'quickbooks.intuit.com' },
  { name: 'Zapier', domain: 'zapier.com' },
  { name: 'n8n', domain: 'n8n.io' },
  { name: 'Make.com', domain: 'make.com' },
  { name: 'Apollo.io', domain: 'apollo.io' },
  { name: 'ListKit', domain: 'listkit.io' },
  { name: 'Cake Equity', domain: 'cakeequity.com' },
  { name: 'Snowflake', domain: 'snowflake.com' },
  { name: 'Microsoft Teams', domain: 'teams.microsoft.com' },
  { name: 'Instantly', domain: 'instantly.ai' },
  { name: 'Meetily', domain: 'meetily.com' },
  { name: 'Claude', domain: 'claude.ai' },
  { name: 'Calendly', domain: 'calendly.com' },
  { name: 'Figma', domain: 'figma.com' },
];

function Group({ hidden }: { hidden?: boolean }) {
  return (
    <div className={styles.group} aria-hidden={hidden || undefined}>
      {TOOLS.map((t) => (
        <div className={styles.item} key={t.name}>
          <span className={styles.icon} style={{ backgroundImage: ICON_SRC(t.domain) }} />
          <span className={styles.name}>{t.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function TechTicker() {
  return (
    <section className={styles.section}>
      <p className={styles.label}>Our dedicated tech-stack</p>
      <div className={styles.track}>
        <Group />
        {/* duplicate group so translateX(-50%) loops without a seam */}
        <Group hidden />
      </div>
    </section>
  );
}
