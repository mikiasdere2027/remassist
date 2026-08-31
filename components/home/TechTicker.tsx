import styles from './TechTicker.module.css';

/**
 * TechTicker — "Our dedicated tech-stack" (index.html, Phase 02).
 *
 * The marks are self-hosted. The artboard sourced all 22 from Google's favicon
 * service at render time — 22 third-party requests on the home page, every
 * one of them announcing the visitor to Google, and all of them firing before
 * the consent banner has been answered. That is the exact runtime dependency
 * this migration exists to remove, and it was the last one left on this page.
 *
 * Files were fetched once from that same service at 64px and committed to
 * public/images/tools/, named after the domain with dots replaced by hyphens.
 * They are third-party trademarks either way; self-hosting changes where they
 * are served from, not that they are shown. To refresh one, or add a tool,
 * drop a 64px PNG in that directory under the matching name.
 *
 * Still a CSS background rather than <img>: these are decorative — the tool's
 * name is right beside each one in real text — and a background does not need
 * 22 elements in the accessibility tree saying the same thing twice.
 */
const ICON_SRC = (domain: string) =>
  `url('/images/tools/${domain.replace(/\./g, '-')}.png')`;

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
