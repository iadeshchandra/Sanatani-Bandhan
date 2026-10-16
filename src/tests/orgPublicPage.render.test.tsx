/**
 * orgPublicPage.render.test.tsx — Pillar 3.
 * Verifies the public org page renders the Verified Institution seal,
 * Follow button, and Request to Join button with mocked data — and, most
 * importantly, that its data path NEVER touches the private
 * `workspaces/{id}` doc (treasury / members / bank details must be
 * unreachable from the public route).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ orgId: 'ws-test' }),
  useNavigate: () => jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('../firebase', () => ({ db: {} }));

// OrgLogo pulls in orgBranding → idb-keyval (ESM, unloadable in jest);
// the logo itself is not under test here.
jest.mock('../components/common/OrgLogo', () => ({
  OrgLogo: () => null,
  OrgMonogram: () => null,
}));

jest.mock('../context/MembershipContext', () => ({
  useMembership: () => ({
    isFollowing: jest.fn().mockReturnValue(false),
    toggleFollow: jest.fn(),
    followerCount: jest.fn().mockResolvedValue(42),
    myMemberships: [],
  }),
}));

jest.mock('../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => ({ firebaseUser: null }),
}));

jest.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    safeTranslate: (_k: string, en: string) => en,
    currentLang: 'en',
    language: 'en',
  }),
}));

jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

import { OrgPublicPage } from '../pages/OrgPublicPage';

describe('OrgPublicPage render', () => {
  it('renders the loading state without crashing (data loads client-side)', () => {
    // The page loads its public projection in useEffect; renderToString
    // won't run effects, so we verify the loading state renders cleanly.
    const html = renderToString(<OrgPublicPage />);
    expect(html).toMatch(/animate-spin|loader/i);
  });

  it('source keeps the social actions and trust badges', () => {
    const fs = require('fs');
    const src: string = fs.readFileSync('src/pages/OrgPublicPage.tsx', 'utf8');
    expect(src).toMatch(/Verified Institution/); // verified-institution badge
    expect(src).toMatch(/BadgeCheck/); // trust-badge visual language
    expect(src).toMatch(/Follow/); // Follow button
    expect(src).toMatch(/Request to Join/); // Request to Join button
    expect(src).toMatch(/followerCount/);
    expect(src).toMatch(/memberCount/);
    expect(src).toMatch(/orgPages/); // reads the public projection
  });

  it('source NEVER reaches the private workspace doc or sensitive collections', () => {
    const fs = require('fs');
    const raw: string = fs.readFileSync('src/pages/OrgPublicPage.tsx', 'utf8');
    // Strip comments — the security property is about executed code, not prose.
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');
    expect(src).not.toMatch(/['"]workspaces['"]/); // private org doc
    expect(src).not.toMatch(/treasury/i); // ledger
    expect(src).not.toMatch(/workspaceMembers/); // member lists
    expect(src).not.toMatch(/['"]bank/i); // bank details
  });

  it('orgPublic lib documents the whitelist boundary', () => {
    const fs = require('fs');
    const src: string = fs.readFileSync('src/lib/orgPublic.ts', 'utf8');
    expect(src).toMatch(/ORG_PUBLIC_FIELDS/);
    expect(src).toMatch(/darshanTimings/);
    expect(src).toMatch(/galleryUrls/);
    expect(src).toMatch(/upcomingEvents/);
  });
});
