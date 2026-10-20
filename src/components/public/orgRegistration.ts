/**
 * orgRegistration.ts — pure validation for the organisation-registration
 * form (PortalLogin's orgRegisterOnly flow, /register-org).
 * =====================================================================
 * QUEUED #41 (P0): the register-org form rejected COMPLETE forms with a
 * generic "Please fill all core required fields." banner for every org
 * type. Root cause: in orgRegisterOnly mode the form deliberately hides
 * the "Your name" / "Official email" / "Password" fields and takes the
 * identity from the live session — but the name was resolved ONLY from
 * the Firebase Auth profile (`auth.currentUser.displayName`). The app's
 * own email/password signup never writes that field (SignupCredentialsStep
 * carries the typed name into the Sanatani profile, not the Auth
 * profile), so for every app-created email/password account the
 * effective admin name was '' and validation failed on a field the user
 * could not even see, let alone fill.
 *
 * This module is the single source of truth for what "complete" means:
 * - `validateOrgRegistration` returns one entry per missing field, each
 *   NAMING itself, so the UI can highlight the exact field and the
 *   banner can list exactly what is missing — never a generic dead-end.
 * - `firstNonBlank` is the session-identity resolver: Auth profile name
 *   first, then the app's own profile sources (Sanatani profile /
 *   devotee record), so a name the user already gave the app is never
 *   reported missing.
 *
 * Pure and synchronous — no React, no Firebase — so it is unit-tested
 * directly (see __tests__/orgRegistration.test.ts).
 */

export type OrgRegistrationField =
  | 'orgName'
  | 'adminName'
  | 'email'
  | 'phone'
  | 'password'
  | 'country'
  | 'state'
  | 'city';

export interface OrgRegistrationInput {
  /** Organisation / workspace name (regData.commName). */
  orgName: string;
  /** Effective administrator name — session-resolved or typed. */
  adminName: string;
  /** Effective email — session-resolved or typed. */
  email: string;
  phone: string;
  password: string;
  country: string;
  state: string;
  city: string;
  /**
   * True when a linked identity (Google sign-in, unified Step-1 signup,
   * or the live signed-in session) already authenticates the user — in
   * that case no password is required.
   */
  hasLinkedIdentity: boolean;
}

export interface OrgRegistrationFieldError {
  field: OrgRegistrationField;
  label: string;
  message: string;
}

export const ORG_REGISTRATION_LABELS: Record<OrgRegistrationField, string> = {
  orgName: 'Organisation name',
  adminName: 'Your name',
  email: 'Email address',
  phone: 'Phone number',
  password: 'Password',
  country: 'Country',
  state: 'State / Division',
  city: 'City / District',
};

const isBlank = (v: string | null | undefined): boolean => !v || v.trim().length === 0;

/**
 * First non-blank candidate, trimmed — the session-identity resolver.
 * Exists so the register-org flow can resolve the admin name/email from
 * EVERY identity source the app maintains (Auth profile, Sanatani
 * profile, devotee record) instead of only the Auth profile.
 */
export function firstNonBlank(candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    if (!isBlank(c)) return (c as string).trim();
  }
  return '';
}

/**
 * Validate a registration attempt. Returns one error per missing
 * required field (empty array = complete). Whitespace-only counts as
 * missing. The organisation TYPE is intentionally not an input: it
 * always carries a value (select with a default) and never gates
 * registration for any of the five org types.
 */
export function validateOrgRegistration(input: OrgRegistrationInput): OrgRegistrationFieldError[] {
  const errors: OrgRegistrationFieldError[] = [];
  const need = (field: OrgRegistrationField, value: string) => {
    if (isBlank(value)) {
      const label = ORG_REGISTRATION_LABELS[field];
      errors.push({ field, label, message: `${label} is required.` });
    }
  };

  need('orgName', input.orgName);
  need('adminName', input.adminName);
  need('email', input.email);
  need('phone', input.phone);
  if (!input.hasLinkedIdentity) need('password', input.password);
  need('country', input.country);
  need('state', input.state);
  need('city', input.city);
  return errors;
}

/** Banner text naming every missing field, e.g. "Please add: Phone number, Country." */
export function orgRegistrationErrorSummary(errors: OrgRegistrationFieldError[]): string {
  if (errors.length === 0) return '';
  return `Please add: ${errors.map((e) => e.label).join(', ')}.`;
}

/** field → message map for per-field highlighting in the form. */
export function orgRegistrationFieldErrorMap(
  errors: OrgRegistrationFieldError[],
): Partial<Record<OrgRegistrationField, string>> {
  const map: Partial<Record<OrgRegistrationField, string>> = {};
  for (const e of errors) map[e.field] = e.message;
  return map;
}
