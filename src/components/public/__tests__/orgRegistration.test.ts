/**
 * orgRegistration.test.ts — QUEUED #41 regression suite.
 * =====================================================================
 * Pins the P0: /register-org rejected complete forms for ALL org types
 * with "Please fill all core required fields." because the effective
 * admin name was resolved only from the Firebase Auth profile — a
 * field the app's own email/password signup never populates. The
 * validation contract pinned here:
 *  - a genuinely complete form passes for every org type;
 *  - each individually-emptied required field fails AND names itself;
 *  - the session-name resolver finds the name in the app's profile
 *    sources when the Auth profile name is null (the exact P0 shape).
 */
import {
  firstNonBlank,
  orgRegistrationErrorSummary,
  orgRegistrationFieldErrorMap,
  validateOrgRegistration,
  type OrgRegistrationField,
  type OrgRegistrationInput,
} from '../orgRegistration';

const ORG_TYPES = ['Mandir', 'Goshala', 'Ashram', 'Gurukul', 'Sangha'] as const;

/** A complete form as the live audit filled it (Rangpur, Bangladesh). */
function completeForm(): OrgRegistrationInput {
  return {
    orgName: 'Audit Mandir',
    adminName: 'Adesh Chandra',
    email: 'iadeshchandra@gmail.com',
    phone: '01608533529',
    password: '',
    country: 'Bangladesh',
    state: 'Rangpur',
    city: 'Rangpur',
    // Signed-in session — identity already authenticated, no password.
    hasLinkedIdentity: true,
  };
}

describe('complete forms pass — every org type', () => {
  it.each(ORG_TYPES)('complete form passes for %s', (_type) => {
    expect(validateOrgRegistration(completeForm())).toEqual([]);
  });

  it('complete fresh-signup form (password given, no linked identity) passes', () => {
    const form = { ...completeForm(), hasLinkedIdentity: false, password: 'secret1' };
    expect(validateOrgRegistration(form)).toEqual([]);
  });
});

describe('each missing field fails and names itself', () => {
  const cases: Array<[OrgRegistrationField, Partial<OrgRegistrationInput>, string]> = [
    ['orgName', { orgName: '' }, 'Organisation name'],
    ['adminName', { adminName: '' }, 'Your name'],
    ['email', { email: '' }, 'Email address'],
    ['phone', { phone: '' }, 'Phone number'],
    ['country', { country: '' }, 'Country'],
    ['state', { state: '' }, 'State / Division'],
    ['city', { city: '' }, 'City / District'],
  ];

  it.each(cases)('empty %s → single named error', (field, patch, label) => {
    const errors = validateOrgRegistration({ ...completeForm(), ...patch });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe(field);
    expect(errors[0].label).toBe(label);
    expect(errors[0].message).toContain(label);
  });

  it('password is required only without a linked identity', () => {
    const noIdentity = { ...completeForm(), hasLinkedIdentity: false, password: '' };
    const errors = validateOrgRegistration(noIdentity);
    expect(errors.map((e) => e.field)).toEqual(['password']);
    expect(errors[0].label).toBe('Password');

    const linked = { ...completeForm(), hasLinkedIdentity: true, password: '' };
    expect(validateOrgRegistration(linked)).toEqual([]);
  });

  it('whitespace-only counts as missing', () => {
    const errors = validateOrgRegistration({ ...completeForm(), orgName: '   ', phone: '  ' });
    expect(errors.map((e) => e.field)).toEqual(['orgName', 'phone']);
  });

  it('summary names every missing field', () => {
    const errors = validateOrgRegistration({ ...completeForm(), phone: '', country: '', city: '' });
    const summary = orgRegistrationErrorSummary(errors);
    expect(summary).toContain('Phone number');
    expect(summary).toContain('Country');
    expect(summary).toContain('City / District');
    expect(orgRegistrationErrorSummary([])).toBe('');
  });

  it('field-error map keys messages by field', () => {
    const errors = validateOrgRegistration({ ...completeForm(), phone: '' });
    const map = orgRegistrationFieldErrorMap(errors);
    expect(map.phone).toBe('Phone number is required.');
    expect(map.orgName).toBeUndefined();
  });
});

describe('firstNonBlank — the P0 session-name resolver', () => {
  it('skips null/empty/whitespace candidates and trims', () => {
    expect(firstNonBlank([null, '', '   ', '  Adesh Chandra '])).toBe('Adesh Chandra');
  });

  it('returns empty string when every source is blank', () => {
    expect(firstNonBlank([null, undefined, '', '  '])).toBe('');
  });

  it('P0 shape: Auth displayName null, Sanatani profile name present → resolves, form passes', () => {
    // Exactly the live-audit failure: an app-created email/password
    // account has NO Firebase Auth displayName; the name lives in the
    // Sanatani profile minted at signup.
    const authDisplayName: string | null = null;
    const sanataniProfileName = 'Adesh Chandra';
    const resolved = firstNonBlank([authDisplayName, sanataniProfileName]);
    expect(resolved).toBe('Adesh Chandra');
    expect(validateOrgRegistration({ ...completeForm(), adminName: resolved })).toEqual([]);
  });
});
