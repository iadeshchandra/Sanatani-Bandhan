/**
 * BecomeJyotishModal.smoke.test.tsx — render smoke pin for JY-01.
 * =====================================================================
 * The Jyotishi audit (2026-10-31) found the Solo → Jyotishi upgrade
 * modal crashed on open: it called useLanguage() with no import
 * (tsc TS2304; the production bundle shipped a bare free identifier),
 * so exactly the user trying to upgrade hit a dead door — and NO suite
 * rendered the modal, so the defect lived in the test gap.
 *
 * This test renders the modal (open and closed) via react-dom/server
 * (jest runs in the node environment — no DOM needed to execute the
 * component body, which is where the crash lived) with the context
 * hooks stubbed. If the useLanguage import ever goes missing again,
 * module compilation / render throws and this suite goes red.
 *
 * The JoinUpgrade jyotish branch is rendered too: it is the surface
 * that mounts this modal when a Solo user taps "Start application".
 */
import React from 'react';
import { renderToString } from 'react-dom/server';

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    safeTranslate: (_k: string, en: string) => en,
    rt: (v: any) => (typeof v === 'string' ? v : v?.en || ''),
    currentLang: 'en',
  }),
}));
jest.mock('../../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => ({
    firebaseUser: { uid: 'uid_smoke', email: 'devotee@example.test' },
    currentDevotee: { fullName: 'Smoke Devotee', phone: '+8801700000000' },
    enterJyotishSession: jest.fn(),
    exitSoloSession: jest.fn(),
  }),
}));
jest.mock('../../context/JyotishContext', () => ({
  useJyotish: () => ({ mintJyotishIdentity: jest.fn() }),
}));
jest.mock('../../solo/SoloContext', () => ({
  useSolo: () => ({ profile: null, attachRole: jest.fn() }),
}));
jest.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('../../lib/friendlyError', () => ({
  friendlyError: () => 'errors.generic',
}));
jest.mock('../useMyJyotishIdentity', () => ({
  useMyJyotishIdentity: () => ({ identity: null, refresh: jest.fn(async () => null) }),
}));
jest.mock('../../components/purohit/useMyPurohitIdentity', () => ({
  useMyPurohitIdentity: () => ({ identity: null, refresh: jest.fn(async () => null) }),
}));
jest.mock('../../components/purohit/BecomePurohitModal', () => ({
  BecomePurohitModal: () => null,
}));

import { BecomeJyotishModal } from '../BecomeJyotishModal';
import { JoinUpgrade } from '../../solo/JoinUpgrade';

describe('BecomeJyotishModal render smoke (JY-01 regression pin)', () => {
  it('renders the open modal — the useLanguage hook resolves', () => {
    const html = renderToString(<BecomeJyotishModal isOpen={true} onClose={() => {}} />);
    // The language stub echoes dictionary keys, so the modal title key
    // appearing in the markup proves the component body executed
    // through the useLanguage() call and the full form render.
    expect(html).toContain('jyotish.become.title');
    expect(html).toContain('jyotish.become.createIdentity');
  });

  it('renders closed (null) without throwing', () => {
    const html = renderToString(<BecomeJyotishModal isOpen={false} onClose={() => {}} />);
    expect(html).toBe('');
  });

  it('JoinUpgrade renders with its jyotishi upgrade branch', () => {
    const html = renderToString(<JoinUpgrade />);
    expect(html.length).toBeGreaterThan(0);
  });
});
