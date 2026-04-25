/**
 * Parser best-effort de texto OCR para documentos de identidad CO.
 *
 * Port fiel del parser Python en
 * `contracts/biometric_providers/_colombian_id_parser.py`. La doble
 * implementación permite OCR client-side (privacy-first) sin perder
 * la fuente de verdad jurídica del backend cuando se requiera
 * verificación cruzada.
 */

export interface ParsedColombianID {
  documentNumber: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  expiryDate: string | null;
  detectedType: string;
}

const EXPLICIT_TYPE_KEYWORDS: Array<readonly [string, readonly string[]]> = [
  ['pasaporte', ['PASAPORTE', 'PASSPORT']],
  ['tarjeta_identidad', ['TARJETA DE IDENTIDAD']],
  [
    'cedula_extranjeria',
    ['CEDULA DE EXTRANJERIA', 'CÉDULA DE EXTRANJERÍA'],
  ],
  [
    'cedula_ciudadania',
    ['CEDULA DE CIUDADANIA', 'CÉDULA DE CIUDADANÍA'],
  ],
];

const FALLBACK_CEDULA_KEYWORDS = [
  'REPUBLICA DE COLOMBIA',
  'REPÚBLICA DE COLOMBIA',
];

const CEDULA_NUMBER_RE = /\b[1-9]\d{5,9}\b/g;
const CE_NUMBER_RE = /\bCE[\s\-]*?(\d{6,7})\b/i;
const DATE_RE =
  /\b(0?[1-9]|[12]\d|3[01])[\/\-\s](0?[1-9]|1[0-2])[\/\-\s]((?:19|20)\d{2})\b/g;
const DATE_SPANISH_MONTH_RE =
  /\b(0?[1-9]|[12]\d|3[01])[\s\-\/]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*[\s\-\/]+((?:19|20)\d{2})\b/gi;

const SPANISH_MONTHS: Record<string, number> = {
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
};

const BIRTH_HINTS = ['NACIMIENTO', 'NACIDO', 'DATE OF BIRTH', 'BIRTH'];
const EXPIRY_HINTS = [
  'VENCIMIENTO',
  'VIGENCIA',
  'EXPIRATION',
  'EXPIRY',
  'VALIDEZ',
];

const STOPWORDS_NAME = new Set([
  'REPUBLICA',
  'REPÚBLICA',
  'COLOMBIA',
  'CEDULA',
  'CÉDULA',
  'CIUDADANIA',
  'CIUDADANÍA',
  'EXTRANJERIA',
  'EXTRANJERÍA',
  'TARJETA',
  'IDENTIDAD',
  'PASAPORTE',
  'NACIONAL',
  'REGISTRADURIA',
  'REGISTRADURÍA',
  'ESTADO',
  'CIVIL',
  'NUMERO',
  'NÚMERO',
  'NUIP',
  'APELLIDOS',
  'NOMBRES',
  'SEXO',
  'ESTATURA',
  'FIRMA',
  'HUELLA',
  'INDICE',
  'ÍNDICE',
  'DERECHO',
  'FECHA',
  'NACIMIENTO',
  'EXPEDICION',
  'EXPEDICIÓN',
  'VIGENCIA',
  'VENCIMIENTO',
  'LUGAR',
  'RH',
]);

function detectType(lines: string[]): string {
  const joined = lines.map(l => l.toUpperCase()).join(' ');
  for (const [typeName, keywords] of EXPLICIT_TYPE_KEYWORDS) {
    for (const kw of keywords) {
      if (joined.includes(kw)) return typeName;
    }
  }
  for (const fallback of FALLBACK_CEDULA_KEYWORDS) {
    if (joined.includes(fallback)) return 'cedula_ciudadania';
  }
  return '';
}

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  const m = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${m}-${dd}`;
}

interface DateMatch {
  date: string;
  position: number;
}

function extractDates(text: string): DateMatch[] {
  const results: DateMatch[] = [];
  let m: RegExpExecArray | null;

  DATE_RE.lastIndex = 0;
  while ((m = DATE_RE.exec(text)) !== null) {
    const [, dayStr, monthStr, yearStr] = m;
    if (!dayStr || !monthStr || !yearStr) continue;
    const iso = isoDate(parseInt(yearStr, 10), parseInt(monthStr, 10), parseInt(dayStr, 10));
    if (iso) results.push({ date: iso, position: m.index });
  }

  DATE_SPANISH_MONTH_RE.lastIndex = 0;
  while ((m = DATE_SPANISH_MONTH_RE.exec(text)) !== null) {
    const [, dayStr, monthName, yearStr] = m;
    if (!dayStr || !monthName || !yearStr) continue;
    const monthKey = monthName.slice(0, 3).toUpperCase();
    const month = SPANISH_MONTHS[monthKey];
    if (!month) continue;
    const iso = isoDate(parseInt(yearStr, 10), month, parseInt(dayStr, 10));
    if (iso) results.push({ date: iso, position: m.index });
  }

  return results;
}

function extractDocumentNumber(text: string, docType: string): string | null {
  if (docType === 'cedula_extranjeria') {
    const m = text.match(CE_NUMBER_RE);
    if (m) return `CE${m[1]}`;
  }
  CEDULA_NUMBER_RE.lastIndex = 0;
  const candidates = text.match(CEDULA_NUMBER_RE);
  if (!candidates || candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.length - a.length)[0] ?? null;
}

function extractNames(lines: string[]): {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
} {
  const candidates: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/\d/.test(line)) continue;
    if (line !== line.toUpperCase()) continue;
    const tokens = line.split(/\s+/).filter(t => !STOPWORDS_NAME.has(t));
    if (tokens.length < 2) continue;
    if (tokens.every(t => t.length <= 2)) continue;
    candidates.push(tokens.join(' '));
  }

  if (candidates.length === 0) {
    return { fullName: null, firstName: null, lastName: null };
  }

  candidates.sort((a, b) => b.length - a.length);
  const fullName = candidates[0] ?? null;
  if (!fullName) {
    return { fullName: null, firstName: null, lastName: null };
  }
  const parts = fullName.split(/\s+/);

  let firstName: string | null = null;
  let lastName: string | null = null;
  if (parts.length === 2) {
    firstName = parts[0] ?? null;
    lastName = parts[1] ?? null;
  } else if (parts.length >= 3) {
    const mid = Math.floor(parts.length / 2);
    firstName = parts.slice(0, mid).join(' ');
    lastName = parts.slice(mid).join(' ');
  }

  return { fullName, firstName, lastName };
}

function assignDates(
  text: string,
  dates: DateMatch[],
): { birth: string | null; expiry: string | null } {
  if (dates.length === 0) return { birth: null, expiry: null };

  const upper = text.toUpperCase();
  let birth: string | null = null;
  let expiry: string | null = null;

  for (const { date, position } of dates) {
    const windowStart = Math.max(0, position - 40);
    const context = upper.slice(windowStart, position);
    if (BIRTH_HINTS.some(hint => context.includes(hint))) {
      if (!birth) birth = date;
      continue;
    }
    if (EXPIRY_HINTS.some(hint => context.includes(hint))) {
      if (!expiry) expiry = date;
      continue;
    }
  }

  if (!birth || !expiry) {
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!birth && first) birth = first.date;
    if (!expiry && sorted.length > 1 && last) expiry = last.date;
  }

  return { birth, expiry };
}

export function parseColombianId(textLines: string[]): ParsedColombianID {
  const lines = textLines.filter(ln => ln && ln.trim());
  const text = lines.join('\n');
  const docType = detectType(lines);

  const documentNumber = extractDocumentNumber(text, docType);
  const { fullName, firstName, lastName } = extractNames(lines);
  const { birth, expiry } = assignDates(text, extractDates(text));

  return {
    documentNumber,
    fullName,
    firstName,
    lastName,
    dateOfBirth: birth,
    expiryDate: expiry,
    detectedType: docType,
  };
}
