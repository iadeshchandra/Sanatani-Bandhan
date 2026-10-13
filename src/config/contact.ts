/**
 * contact.ts — single source of truth for public contact channels.
 *
 * Owner-provided (2026-10-13):
 *   - WhatsApp: +8801608533529 → canonical wa.me link uses international
 *     format WITHOUT the '+' (wa.me requirement): https://wa.me/8801608533529
 *   - Support email: Sanatanibandhan@gmail.com
 *
 * Display rule (H-9): every WhatsApp CTA in the UI must gate on
 * `WHATSAPP_URL` being non-empty. If the number is ever removed, the
 * buttons hide instead of rendering a broken link.
 */

export const WHATSAPP_NUMBER_INTL = '8801608533529';

/** Canonical wa.me link, or '' when no number is configured (gate display on this). */
export const WHATSAPP_URL = WHATSAPP_NUMBER_INTL
  ? `https://wa.me/${WHATSAPP_NUMBER_INTL}`
  : '';

/** Prefilled WhatsApp chat link about a topic. */
export function whatsappLink(message: string): string {
  if (!WHATSAPP_URL) return '';
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

/** True when a real WhatsApp number is configured. */
export const hasWhatsApp = (): boolean => WHATSAPP_URL !== '';

/** Public support inbox (owner-provided). */
export const SUPPORT_EMAIL = 'Sanatanibandhan@gmail.com';

/** True when a real (non-placeholder) support email is configured. */
export const hasSupportEmail = (): boolean => SUPPORT_EMAIL.trim() !== '';
