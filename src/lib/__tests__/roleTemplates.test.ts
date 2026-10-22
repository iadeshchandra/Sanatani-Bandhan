/**
 * roleTemplates.test.ts — Blueprint B template law.
 * ================================================================
 * Pins: the 10-template set exists complete; every template's
 * grants stay inside the canonical role's own grantable surface
 * (a template can NARROW a role, never widen it — resolve-down);
 * assignments respect template ceilings; template defaults
 * (scope/expiry) apply; validation catches the two honest errors.
 */
import {
  ROLE_TEMPLATES,
  templateById,
  grantNeedsApproval,
  resolveAssignment,
  validateAssignment,
  desksVisibleForRole,
} from '../roleTemplates';

/**
 * The visibility law reads exactly two fields of a catalog row —
 * `id` and `domain` (DeskVisibilityModule). Importing the real
 * MODULE_CATALOG would drag the whole Sidebar → auth → firebase
 * ESM chain into jest (the known environmental suite-load failure),
 * so the fixture below carries the id/domain pairs extracted from
 * src/components/common/Sidebar.tsx MODULE_CATALOG verbatim.
 */
const MODULE_CATALOG = [
  { id: 'dashboard', domain: 1 }, { id: 'checkin', domain: 1 },
  { id: 'devotees', domain: 1 }, { id: 'membership', domain: 1 },
  { id: 'family', domain: 1 }, { id: 'vanshavali', domain: 1 },
  { id: 'guests', domain: 1 }, { id: 'donorCare', domain: 1 },
  { id: 'bulkImport', domain: 1 }, { id: 'federation', domain: 1 },
  { id: 'sevadar-roster', domain: 1 }, { id: 'quick-chanda-pos', domain: 2 },
  { id: 'treasury', domain: 2 }, { id: 'hundi-audit', domain: 2 },
  { id: 'cash-custody', domain: 2 }, { id: 'ratna-bhandar', domain: 2 },
  { id: 'taxReceipts', domain: 2 }, { id: 'form10bd', domain: 2 },
  { id: 'tally-export', domain: 2 }, { id: 'campaigns', domain: 2 },
  { id: 'karmaLedger', domain: 2 }, { id: 'assets', domain: 2 },
  { id: 'inventory', domain: 2 }, { id: 'bhoomi', domain: 2 },
  { id: 'vahan', domain: 2 }, { id: 'recurring-seva', domain: 2 },
  { id: 'poojaBooking', domain: 3 }, { id: 'mandirPuja', domain: 3 },
  { id: 'purohitDesk', domain: 3 }, { id: 'purohitMarket', domain: 3 },
  { id: 'pitruShradh', domain: 3 }, { id: 'panchang', domain: 3 },
  { id: 'yatranet-gis', domain: 3 }, { id: 'rakthaSeva', domain: 4 },
  { id: 'goshala', domain: 4 }, { id: 'annadanam', domain: 4 },
  { id: 'annakshetra-one', domain: 4 }, { id: 'nyas-one', domain: 4 },
  { id: 'utsav-one', domain: 4 }, { id: 'tirth-one', domain: 4 },
  { id: 'yoga-one', domain: 4 }, { id: 'matha-one', domain: 4 },
  { id: 'satsang-one', domain: 4 }, { id: 'sabha-one', domain: 4 },
  { id: 'samskara-one', domain: 4 }, { id: 'ashramKutir', domain: 4 },
  { id: 'dharamshala', domain: 4 }, { id: 'gurukul', domain: 4 },
  { id: 'gurukulAcademy', domain: 4 }, { id: 'vidyalaya', domain: 4 },
  { id: 'pathshala', domain: 4 }, { id: 'goshala-one', domain: 4 },
  { id: 'ashram-one', domain: 4 }, { id: 'satsang', domain: 4 },
  { id: 'sanghaDrills', domain: 4 }, { id: 'granthLibrary', domain: 4 },
  { id: 'utsavPanjika', domain: 5 }, { id: 'panchayatPolls', domain: 5 },
  { id: 'sandeshBroadcast', domain: 5 }, { id: 'dharmicAssistant', domain: 5 },
  { id: 'trusteeGovernance', domain: 6 }, { id: 'legalVault', domain: 6 },
  { id: 'qrScanner', domain: 6 }, { id: 'appStore', domain: 6 },
  { id: 'workspace-hub', domain: 6 }, { id: 'masterSettings', domain: 6 },
  { id: 'spiritualSettings', domain: 6 }, { id: 'crisis-command', domain: 6 },
  { id: 'tactical-radar', domain: 6 }, { id: 'sadhana-karma', domain: 7 },
  { id: 'sanatani-vivah', domain: 7 }, { id: 'yatraNet', domain: 7 },
];

const NOW = new Date('2026-10-22T00:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('the template set', () => {
  it('has exactly the brief’s 10 templates', () => {
    expect(ROLE_TEMPLATES.map((t) => t.id).sort()).toEqual(
      [
        'accountant-maker',
        'auditor-readonly',
        'desk-lead',
        'festival-volunteer',
        'member-donor',
        'org-manager',
        'org-secretary',
        'religious-lead',
        'treasurer-checker',
        'trustee-chair',
      ].sort()
    );
  });

  it('every template names canonical i18n keys', () => {
    for (const tpl of ROLE_TEMPLATES) {
      expect(tpl.nameKey).toBe(`org.access.templates.${tpl.id}.name`);
      expect(tpl.descKey).toBe(`org.access.templates.${tpl.id}.desc`);
    }
  });

  it('unknown template ids resolve to null (resolve-down)', () => {
    expect(templateById('super-mega-admin')).toBeNull();
    expect(templateById(null)).toBeNull();
    expect(templateById(undefined)).toBeNull();
  });
});

describe('templates narrow, never widen (resolve-down law)', () => {
  it('every scoped template’s desks are visible to its canonical role', () => {
    for (const tpl of ROLE_TEMPLATES) {
      const visible = new Set(desksVisibleForRole(tpl.role, MODULE_CATALOG));
      for (const desk of tpl.deskScope ?? tpl.defaultDeskScope ?? []) {
        expect(visible.has(desk)).toBe(true);
      }
    }
  });

  it('the Auditor template is exactly the read-only oversight set', () => {
    const tpl = templateById('auditor-readonly')!;
    expect(tpl.role).toBe('Auditor');
    expect(tpl.deskScope).not.toContain('quickChanda');
    expect(tpl.deskScope).toContain('treasury');
    expect(tpl.deskScope).toContain('hundi-audit');
  });
});

describe('gated grants', () => {
  it('roles above Sevadar need approval; Sevadar and Devotee do not', () => {
    expect(grantNeedsApproval('Priest')).toBe(true);
    expect(grantNeedsApproval('Accountant')).toBe(true);
    expect(grantNeedsApproval('CSO')).toBe(true);
    expect(grantNeedsApproval('Auditor')).toBe(true);
    expect(grantNeedsApproval('Trustee')).toBe(true);
    expect(grantNeedsApproval('SuperAdmin')).toBe(true);
    expect(grantNeedsApproval('Sevadar')).toBe(false);
    expect(grantNeedsApproval('Devotee')).toBe(false);
  });
});

describe('resolveAssignment', () => {
  it('template defaults apply (festival volunteer expires in 30 days)', () => {
    const a = resolveAssignment({ templateId: 'festival-volunteer' }, NOW);
    expect(a.role).toBe('Sevadar');
    expect(a.roleExpiresAt).toBe(NOW + 30 * DAY);
    expect(a.deskScope).toContain('dashboard');
  });

  it('auditor expires in 90 days by default', () => {
    const a = resolveAssignment({ templateId: 'auditor-readonly' }, NOW);
    expect(a.roleExpiresAt).toBe(NOW + 90 * DAY);
  });

  it('an explicit expiry beats the template default', () => {
    const a = resolveAssignment(
      { templateId: 'festival-volunteer', roleExpiresAt: NOW + 5 * DAY },
      NOW
    );
    expect(a.roleExpiresAt).toBe(NOW + 5 * DAY);
  });

  it('a requested scope is intersected with the template ceiling', () => {
    const a = resolveAssignment(
      {
        templateId: 'org-secretary',
        deskScope: ['dashboard', 'devotees', 'treasury'],
      },
      NOW
    );
    expect(a.deskScope).toContain('devotees');
    expect(a.deskScope).not.toContain('treasury'); // not in the secretary ceiling
    expect(a.deskScope).toContain('dashboard'); // home is always kept
  });

  it('desk-lead starts home-only until desks are picked', () => {
    const a = resolveAssignment({ templateId: 'desk-lead' }, NOW);
    expect(a.deskScope).toEqual(['dashboard']);
    const picked = resolveAssignment(
      { templateId: 'desk-lead', deskScope: ['dashboard', 'inventory', 'guests'] },
      NOW
    );
    expect(picked.deskScope).toEqual(expect.arrayContaining(['dashboard', 'inventory', 'guests']));
  });

  it('an unknown template id falls back to a plain custom role', () => {
    const a = resolveAssignment({ templateId: 'nope', role: 'Sevadar' }, NOW);
    expect(a.templateId).toBeNull();
    expect(a.role).toBe('Sevadar');
    expect(a.deskScope).toBeNull();
  });

  it('an unknown role string resolves DOWN to Devotee', () => {
    const a = resolveAssignment({ role: 'GrandVizier' }, NOW);
    expect(a.role).toBe('Devotee');
  });
});

describe('validateAssignment', () => {
  it('flags an expiry in the past', () => {
    const a = resolveAssignment({ role: 'Sevadar', roleExpiresAt: NOW - DAY }, NOW);
    expect(validateAssignment(a, NOW)).toContain('EXPIRY_IN_PAST');
  });

  it('flags desk-lead with no desk picked', () => {
    const a = resolveAssignment({ templateId: 'desk-lead' }, NOW);
    expect(validateAssignment(a, NOW)).toContain('SCOPE_REQUIRED');
  });

  it('accepts a complete assignment', () => {
    const a = resolveAssignment(
      { templateId: 'desk-lead', deskScope: ['inventory'] },
      NOW
    );
    expect(validateAssignment(a, NOW)).toEqual([]);
  });
});
