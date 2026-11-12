import { z } from 'zod';

/**
 * Custom fields: a workspace defines them (custom_field_defs), and values are
 * stored in each record's `custom` column. This turns the definitions into one
 * zod schema so every write is validated the same way, whichever screen or
 * API it comes from. Industry editions add fields here, not in migrations.
 */

export const FIELD_TYPES = [
  'text', 'long_text', 'number', 'date', 'select', 'multiselect', 'boolean', 'url', 'email', 'phone',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[] | null;
  required?: boolean;
  archivedAt?: Date | null;
}

export const FIELD_KEY = /^[a-z][a-z0-9_]{0,39}$/;

function valueSchema(d: FieldDef): z.ZodType {
  switch (d.type) {
    case 'text': return z.string().trim().max(500);
    case 'long_text': return z.string().trim().max(10_000);
    case 'number': return z.number().finite();
    case 'date': return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
    case 'boolean': return z.boolean();
    case 'url': return z.string().trim().url().max(2000);
    case 'email': return z.string().trim().toLowerCase().email().max(320);
    case 'phone': return z.string().trim().min(5).max(40);
    case 'select': return z.enum((d.options ?? []) as [string, ...string[]]);
    case 'multiselect': return z.array(z.enum((d.options ?? []) as [string, ...string[]])).max(50);
  }
}

/**
 * The schema for a record's `custom` object. Unknown keys are dropped; values
 * of archived fields are kept as they were, so archiving a field never
 * destroys data.
 */
export function customFieldsSchema(defs: FieldDef[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const d of defs) {
    if (d.archivedAt || !FIELD_KEY.test(d.key)) continue;
    const v = valueSchema(d);
    shape[d.key] = d.required ? v : v.nullish();
  }
  return z.object(shape);
}

export function validateCustomFields(defs: FieldDef[], input: unknown, existing: Record<string, unknown> = {}) {
  const parsed = customFieldsSchema(defs).safeParse(input ?? {});
  if (!parsed.success) return parsed;
  const archived = Object.fromEntries(
    defs.filter((d) => d.archivedAt && d.key in existing).map((d) => [d.key, existing[d.key]]),
  );
  return { success: true as const, data: { ...archived, ...parsed.data } };
}

/**
 * Read a submitted form into a `custom` object, typed per definition: numbers
 * become numbers, multiselects collect every checked box, a blank field
 * becomes null (clears it). Inputs are named `cf_<key>`. Validation is still
 * validateCustomFields' job.
 */
export function customFromFormData(defs: FieldDef[], fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    if (d.archivedAt) continue;
    const name = `cf_${d.key}`;
    if (d.type === 'multiselect') {
      out[d.key] = fd.getAll(name).map(String).filter(Boolean);
      continue;
    }
    if (d.type === 'boolean') {
      out[d.key] = fd.get(name) === 'on' || fd.get(name) === 'true';
      continue;
    }
    const raw = fd.get(name);
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (!v) out[d.key] = null;
    else if (d.type === 'number') out[d.key] = Number.isFinite(Number(v)) ? Number(v) : v;
    else out[d.key] = v;
  }
  return out;
}

/** A stored value as display text. */
export function formatCustomValue(d: FieldDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.join(', ');
  if (d.type === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
