/**
 * QUEUED #52 (audit D12): the SetupWizard welcome heading must follow
 * the selected org type — the audit found EVERY type greeted with
 * "let's set up your digital ashram". Pins the per-type warm noun and
 * the neutral fallback for unknown types.
 */
import { WIZARD_ORG_TYPES, wizardWelcomeHeading } from '../wizardDeskMap';

describe('wizardWelcomeHeading — type-aware wizard greeting (QUEUED #52)', () => {
  it('gives each audited org type its own home noun', () => {
    expect(wizardWelcomeHeading('Mandir')).toBe("Namaste 🙏 — let's set up your digital mandir");
    expect(wizardWelcomeHeading('Goshala')).toBe("Namaste 🙏 — let's set up your digital goshala");
    expect(wizardWelcomeHeading('Ashram')).toBe("Namaste 🙏 — let's set up your digital ashram");
    expect(wizardWelcomeHeading('Gurukul')).toBe("Namaste 🙏 — let's set up your digital gurukul");
    expect(wizardWelcomeHeading('Sangha')).toBe("Namaste 🙏 — let's set up your digital sangha");
  });

  it('covers every type the wizard offers (no silent fallback)', () => {
    for (const t of WIZARD_ORG_TYPES) {
      const h = wizardWelcomeHeading(t);
      expect(h.startsWith('Namaste 🙏 — ')).toBe(true);
      expect(h).not.toContain('digital workspace');
    }
  });

  it('never promises a Goshala an ashram (the audited bug)', () => {
    expect(wizardWelcomeHeading('Goshala')).not.toContain('ashram');
    expect(wizardWelcomeHeading('Mandir')).not.toContain('ashram');
    expect(wizardWelcomeHeading('Gurukul')).not.toContain('ashram');
  });

  it('falls back warmly + neutrally for unknown/future types', () => {
    expect(wizardWelcomeHeading('SomethingNew')).toBe(
      "Namaste 🙏 — let's set up your digital workspace"
    );
    expect(wizardWelcomeHeading('')).toBe("Namaste 🙏 — let's set up your digital workspace");
  });
});
