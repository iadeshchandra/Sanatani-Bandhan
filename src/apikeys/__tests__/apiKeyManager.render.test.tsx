/**
 * apiKeyManager.render.test.tsx — API Keys tab discoverability fix (2026-10-24).
 * ============================================================================
 * The owner opened GodMode → API Keys to paste a key and "didn't see enter
 * api key field": the tab rendered the API Health desk (7 provider cards)
 * FIRST and buried the "+ Add key" button — and its form — below it. These
 * tests pin the repaired layout contract so the button can never be buried
 * again:
 *
 *  (a) the Add-key action renders BEFORE the health desk (DOM order), in
 *      both the shipped stateful component and its presentational view;
 *  (b) the "No keys yet" empty state contains a REAL Add button, wired to
 *      the same openAdd handler as the header button;
 *  (c) a failed key load renders the prominent load-failure banner
 *      (role="alert") instead of the old small grey notice line.
 *
 * Stack note: this repo's jest runs in the node environment (no jsdom), so
 * — like the other *.render.test suites — these use react-dom/server. The
 * manager's render lives in the hook-free ApiKeyManagerView, which is what
 * makes states beyond the initial one renderable here; the stateful half
 * (query failure → banner state) is pinned by a source contract test below.
 */
import React, { isValidElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  // Never resolves: the stateful manager stays in its initial render state
  // under SSR (effects do not run), which is all the order test needs.
  getDocs: jest.fn(() => new Promise(() => {})),
  limit: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => ({})),
  writeBatch: jest.fn(),
}));

jest.mock('../../firebase', () => ({ db: {} }));

jest.mock('../apiKeys', () => ({ clearApiKeyCache: jest.fn() }));

jest.mock('../admin/ApiHealthDesk', () => ({
  ApiHealthDesk: () => <div data-testid="api-health-desk">API HEALTH DESK</div>,
}));

import {
  ApiKeyManager,
  ApiKeyManagerView,
  type ApiKeyManagerViewProps,
} from '../admin/ApiKeyManager';

const HEALTH = 'API HEALTH DESK';

const baseProps = (over: Partial<ApiKeyManagerViewProps> = {}): ApiKeyManagerViewProps => ({
  lang: 'en',
  keys: [],
  audit: [],
  loading: false,
  loadFailed: false,
  msg: null,
  showForm: false,
  editing: null,
  revealed: {},
  busy: false,
  fName: '',
  fProvider: 'youtube',
  fValue: '',
  fClientSafe: true,
  fNotes: '',
  testState: 'idle',
  preset: {
    id: 'youtube',
    label: 'YouTube Data API',
    suggestedName: 'youtubeDataApi',
    clientSafeDefault: true,
    testUrl: null,
    testOk: () => false,
  },
  onReload: jest.fn(),
  onOpenAdd: jest.fn(),
  onOpenEdit: jest.fn(),
  onToggleEnabled: jest.fn(),
  onToggleReveal: jest.fn(),
  onCloseForm: jest.fn(),
  onProviderChange: jest.fn(),
  onNameChange: jest.fn(),
  onValueChange: jest.fn(),
  onClientSafeChange: jest.fn(),
  onNotesChange: jest.fn(),
  onRunTest: jest.fn(),
  onSave: jest.fn(),
  ...over,
});

/* ------------------------------------------- element-tree walk helpers */
/* The view is hook-free, so tests can invoke it directly and inspect the
 * exact element tree it returns — handler wiring included. */

type El = ReactElement<{ children?: unknown; onClick?: () => void }>;

function walk(node: unknown, visit: (el: El) => void): void {
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit));
    return;
  }
  if (isValidElement(node)) {
    visit(node as El);
    walk((node.props as { children?: unknown }).children, visit);
  }
}

function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) {
    return textOf((node.props as { children?: unknown }).children);
  }
  return '';
}

function buttonsIn(tree: unknown): El[] {
  const out: El[] = [];
  walk(tree, (el) => {
    if (el.type === 'button') out.push(el);
  });
  return out;
}

/* ------------------------------------------------------------------ tests */

describe('API Keys tab — layout order (discoverability fix)', () => {
  it('(a) the shipped component renders Add key before the health desk', () => {
    const html = renderToString(<ApiKeyManager />);
    const addAt = html.indexOf('Add key');
    const healthAt = html.indexOf(HEALTH);
    expect(addAt).toBeGreaterThan(-1);
    expect(healthAt).toBeGreaterThan(-1);
    expect(addAt).toBeLessThan(healthAt);
  });

  it('(a) view order: action bar → key table → health desk → audit', () => {
    const html = renderToString(
      <ApiKeyManagerView
        {...baseProps({
          keys: [
            {
              id: 'youtubedataapi',
              name: 'youtubeDataApi',
              provider: 'YouTube Data API',
              keyValue: 'AIzaSyExampleKeyValue1234',
              clientSafe: true,
              enabled: true,
              notes: '',
            },
          ],
        })}
      />,
    );
    const addAt = html.indexOf('Add key');
    const rowAt = html.indexOf('youtubeDataApi');
    const healthAt = html.indexOf(HEALTH);
    const auditAt = html.indexOf('Recent changes');
    expect(addAt).toBeGreaterThan(-1);
    expect(rowAt).toBeGreaterThan(addAt);
    expect(healthAt).toBeGreaterThan(rowAt);
    expect(auditAt).toBeGreaterThan(healthAt);
  });

  it('exactly one Add button in the header area (no duplicate kept from the old layout)', () => {
    const tree = ApiKeyManagerView(baseProps());
    const buttons = buttonsIn(tree);
    const addButtons = buttons.filter((b) => textOf(b).includes('Add key'));
    // Header button + empty-state button — and no third copy anywhere.
    expect(addButtons.length).toBe(2);
  });
});

describe('API Keys tab — empty state', () => {
  it('(b) the "No keys yet" box contains a real Add button, after the text', () => {
    const html = renderToString(<ApiKeyManagerView {...baseProps()} />);
    const emptyAt = html.indexOf('No keys yet');
    expect(emptyAt).toBeGreaterThan(-1);
    const buttonAt = html.indexOf('<button', emptyAt);
    expect(buttonAt).toBeGreaterThan(emptyAt);
    expect(html.slice(buttonAt, buttonAt + 800)).toContain('Add key');
    // …and it sits inside the table box, i.e. before the health desk.
    expect(buttonAt).toBeLessThan(html.indexOf(HEALTH));
  });

  it('(b) the empty-state button is wired to the same openAdd as the header button', () => {
    const onOpenAdd = jest.fn();
    const tree = ApiKeyManagerView(baseProps({ onOpenAdd }));
    const addButtons = buttonsIn(tree).filter((b) => textOf(b).includes('Add key'));
    expect(addButtons.length).toBe(2);
    for (const b of addButtons) {
      expect(b.props.onClick).toBe(onOpenAdd);
    }
    addButtons[1].props.onClick?.();
    expect(onOpenAdd).toHaveBeenCalledTimes(1);
  });

  it('no empty-state Add button once keys exist (the box is gone)', () => {
    const html = renderToString(
      <ApiKeyManagerView
        {...baseProps({
          keys: [
            {
              id: 'k1',
              name: 'someKey',
              provider: 'Custom',
              keyValue: 'valuevaluevalue',
              clientSafe: false,
              enabled: false,
              notes: '',
            },
          ],
        })}
      />,
    );
    expect(html).not.toContain('No keys yet');
  });
});

describe('API Keys tab — load failure banner', () => {
  it('(c) a failed load renders the prominent banner with the plain-words remedy', () => {
    const html = renderToString(<ApiKeyManagerView {...baseProps({ loadFailed: true })} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Keys could not be loaded');
    expect(html).toContain('visible only to the owner');
    expect(html).toContain('Reload');
    // The banner is prominent — it renders above the health desk.
    expect(html.indexOf('Keys could not be loaded')).toBeLessThan(html.indexOf(HEALTH));
    // The old small grey line is gone for load failures.
    expect(html).not.toContain('Could not load keys — check your connection and owner access.');
  });

  it('(c) no banner when the load succeeded', () => {
    const html = renderToString(<ApiKeyManagerView {...baseProps({ loadFailed: false })} />);
    expect(html).not.toContain('Keys could not be loaded');
    expect(html).not.toContain('role="alert"');
  });

  it('(c) the banner reload button calls the load handler', () => {
    const onReload = jest.fn();
    const tree = ApiKeyManagerView(baseProps({ loadFailed: true, onReload }));
    const reload = buttonsIn(tree).find((b) => textOf(b).includes('Reload'));
    expect(reload).toBeDefined();
    reload?.props.onClick?.();
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

describe('API Keys tab — manager wiring (source contract)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../admin/ApiKeyManager.tsx'), 'utf8');

  it('a rejected key query sets the banner state, not the grey notice', () => {
    // The load() catch is what a rejected query reaches.
    expect(src).toContain('setLoadFailed(true)');
    expect(src).toContain('setLoadFailed(false)');
    expect(src).not.toContain('Could not load keys — check your connection and owner access.');
  });

  it('the stateful manager renders the view (single source of layout)', () => {
    expect(src).toContain('<ApiKeyManagerView');
    expect(src).toContain('onOpenAdd={openAdd}');
    expect(src).toContain('loadFailed={loadFailed}');
  });
});
