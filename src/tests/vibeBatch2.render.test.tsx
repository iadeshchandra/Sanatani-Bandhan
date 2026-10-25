/**
 * vibeBatch2.render.test.tsx — VIBE B2 render gates (SSR, node env).
 *
 * The offline vocabulary states are rendered from FIXED queue states
 * (the hook is mocked at its module surface — the same surface the
 * component consumes; the count logic itself is gated in
 * lib/__tests__/vibeBatch2.test.ts against the real queues' shape):
 *   · online + empty queue → the bar honestly says "All sent", and the
 *     floating pill renders NOTHING (it must not shout over the app);
 *   · online + 3 waiting → "Saved on this phone (3)" — the real count;
 *   · offline + 2 waiting → the offline-strength line + the count.
 * The Your-usual row renders only what it is given, and nothing at all
 * when it has nothing honest to show.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { core as enCore } from '../i18n/lang/en/core';

const dict: Record<string, unknown> = enCore as unknown as Record<string, unknown>;
const resolveKey = (key: string): string => {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)?.[part];
  }
  return typeof node === 'string' ? node : key;
};

jest.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => resolveKey(key),
    safeTranslate: (key: string, en: string) => resolveKey(key) !== key ? resolveKey(key) : en,
    currentLang: 'en',
    rt: (key: string) => key,
  }),
}));

const queueState = { online: true, pending: 0, loading: false };
jest.mock('../hooks/useOfflineQueueStatus', () => ({
  useOfflineQueueStatus: () => queueState,
}));

jest.mock('../components/common/PanchangHeader', () => ({
  useSanctumLite: () => true,
}));

import { OfflineSevakStatus } from '../components/common/OfflineSevakStatus';
import { YourUsualRow } from '../components/common/YourUsualRow';
import { LayoutGrid } from 'lucide-react';

describe('OfflineSevakStatus — the sevak vocabulary, from real states', () => {
  it('bar: online + empty queue renders "All sent" and nothing else dramatic', () => {
    queueState.online = true; queueState.pending = 0;
    const html = renderToString(<OfflineSevakStatus variant="bar" />);
    expect(html).toContain('All sent');
    expect(html).not.toContain('Saved on this phone');
    expect(html).not.toContain('You are offline');
  });

  it('bar: online + 3 waiting renders the real count', () => {
    queueState.online = true; queueState.pending = 3;
    const html = renderToString(<OfflineSevakStatus variant="bar" />);
    expect(html).toContain('Saved on this phone (3)');
    expect(html).not.toContain('All sent');
  });

  it('bar: offline renders strength first, then the waiting count', () => {
    queueState.online = false; queueState.pending = 2;
    const html = renderToString(<OfflineSevakStatus variant="bar" />);
    expect(html).toContain('You are offline — everything keeps working');
    expect(html).toContain('Saved on this phone (2)');
  });

  it('pill: online + empty queue renders nothing at all', () => {
    queueState.online = true; queueState.pending = 0;
    expect(renderToString(<OfflineSevakStatus variant="pill" />)).toBe('');
  });

  it('pill: offline renders the pill', () => {
    queueState.online = false; queueState.pending = 0;
    const html = renderToString(<OfflineSevakStatus variant="pill" />);
    expect(html).toContain('You are offline — everything keeps working');
  });
});

describe('YourUsualRow — renders only what it is given', () => {
  it('renders the heading and item labels', () => {
    const html = renderToString(
      <YourUsualRow
        heading="Your usual"
        items={[{ id: 'treasury', label: 'Treasury', Icon: LayoutGrid }]}
        onOpen={() => {}}
      />,
    );
    expect(html).toContain('Your usual');
    expect(html).toContain('Treasury');
  });

  it('renders nothing with no items — no fake row', () => {
    expect(
      renderToString(<YourUsualRow heading="Your usual" items={[]} onOpen={() => {}} />),
    ).toBe('');
  });
});
