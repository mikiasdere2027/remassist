import { describe, expect, it } from 'vitest';
import { LeadBody } from '@/lib/leads/schema';
import { CONTACT } from '@/lib/chat/kb';
import { SERVICES } from '@/lib/services';
import { buildSystemPrompt } from './prompt';
import { toLeadBody } from './tools';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('carries the contact details Maya falls back to', () => {
    expect(prompt).toContain(CONTACT.email);
    expect(prompt).toContain(CONTACT.phone);
  });

  it('names every service line', () => {
    for (const s of SERVICES) expect(prompt).toContain(s.name);
  });

  it('tells Maya to save the lead and say so', () => {
    expect(prompt).toMatch(/capture_lead/);
    expect(prompt).toMatch(/follow up/i);
  });
});

describe('toLeadBody', () => {
  const page = 'https://remassistance.com/services/sdr-as-a-service?utm_source=x';

  it('produces a body /api/leads accepts', () => {
    const body = toLeadBody({
      name: 'Ada Lovelace', email: 'Ada@Example.com', company: 'Engines Ltd',
      service: 'SDR as a Service', teamSize: 2, workingHours: 'US Eastern',
      notes: 'Outbound calls', meetingRequested: true, consentGiven: true,
    }, page);
    const parsed = LeadBody.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.source).toBe('voice_agent');
    expect(parsed.data?.email).toBe('ada@example.com');
  });

  it('puts the qualification answers where a person and a query can both find them', () => {
    const body = toLeadBody({ name: 'A', email: 'a@b.co', teamSize: 2, workingHours: 'US hours', meetingRequested: true, consentGiven: true });
    expect(body.rawFields).toEqual({ meetingRequested: 'yes', teamSize: '2', workingHours: 'US hours' });
    expect(body.message).toContain('Meeting requested: YES');
    expect(body.message).toContain('Team size: 2');
  });

  it('treats consent as given only on a literal true', () => {
    expect(toLeadBody({ email: 'a@b.co', consentGiven: 'yes' }).consent).toBe(false);
    expect(toLeadBody({ email: 'a@b.co', consentGiven: true }).consent).toBe(true);
  });

  it('drops non-string junk from the model', () => {
    const body = toLeadBody({ email: 'a@b.co', name: { evil: 1 }, company: '   ' });
    expect(body.name).toBeUndefined();
    expect(body.company).toBeUndefined();
  });
});
