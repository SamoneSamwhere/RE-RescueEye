/**
 * Philippine phone numbers.
 *
 * Accepts the ways people actually type them — "09171234567",
 * "+63 917-123-4567", "639171234567", "(032) 234 5678", "02 8123 4567" — and
 * returns one standard national format for storage and display:
 *
 *   mobile            0917 123 4567      11 digits, 09XX + 7
 *   Metro Manila      (02) 8123 4567     02 + 8-digit subscriber (since 2019)
 *   provincial        (032) 234 5678     0 + 2-digit area code + 7 digits
 *
 * Mobile is what a responder is paged on (dispatch goes out by SMS), so
 * personal numbers are mobile-only; an organization's office line may be a
 * landline.
 */

export type PhKind = 'mobile' | 'landline'

export type PhPhoneResult =
  | { ok: true; kind: PhKind; formatted: string; e164: string }
  | { ok: false; error: string }

/** Digits, spaces, dashes, dots, parentheses, and one leading "+". */
const ALLOWED = /^\+?[\d\s().-]+$/

export function parsePhPhone(input: string, allow: PhKind[] = ['mobile', 'landline']): PhPhoneResult {
  const raw = input.trim()
  const hint = allow.includes('landline')
    ? 'Use a PH mobile (0917 123 4567) or landline ((032) 234 5678) number.'
    : 'Use a PH mobile number, e.g. 0917 123 4567.'
  if (!raw) return { ok: false, error: 'Enter a contact number.' }
  if (!ALLOWED.test(raw)) return { ok: false, error: `Contact number can only contain digits. ${hint}` }

  let digits = raw.replace(/\D/g, '')
  // +63 / 63 country code → national 0 prefix.
  if (raw.startsWith('+') || digits.startsWith('63')) {
    if (!digits.startsWith('63')) return { ok: false, error: `Only Philippine (+63) numbers are accepted. ${hint}` }
    digits = `0${digits.slice(2)}`
  }

  if (/^09\d{9}$/.test(digits)) {
    return {
      ok: true,
      kind: 'mobile',
      formatted: `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`,
      e164: `+63${digits.slice(1)}`,
    }
  }

  if (allow.includes('landline')) {
    if (/^02\d{8}$/.test(digits)) {
      return {
        ok: true,
        kind: 'landline',
        formatted: `(02) ${digits.slice(2, 6)} ${digits.slice(6)}`,
        e164: `+63${digits.slice(1)}`,
      }
    }
    if (/^0[3-8]\d{8}$/.test(digits)) {
      return {
        ok: true,
        kind: 'landline',
        formatted: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`,
        e164: `+63${digits.slice(1)}`,
      }
    }
  }

  if (/^0[2-8]/.test(digits) && !allow.includes('landline')) {
    return { ok: false, error: `A mobile number is required here, not a landline. ${hint}` }
  }
  return { ok: false, error: `That is not a valid Philippine number. ${hint}` }
}

/** The standard format if `input` is valid, else `input` unchanged — for tidying a field on blur. */
export function formatPhPhone(input: string, allow?: PhKind[]): string {
  const result = parsePhPhone(input, allow)
  return result.ok ? result.formatted : input
}
