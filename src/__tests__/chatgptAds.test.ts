/**
 * chatgptAds.test.ts — guards for the ChatGPT Ads surface.
 *
 * The /for-institutions landing page is the destination of paid
 * ChatGPT Ads clicks. Its facts (prices) must match the canonical
 * pricing published everywhere else, its framing must stay
 * institution-neutral (ad policy + standing content rule), and its
 * single conversion path must stay pointed at the /contact inquiry.
 * The measurement module (src/lib/openaiAds.ts) must stay honest:
 * with no Pixel ID configured it is a complete no-op, and it must
 * never carry a Conversions API key in browser code.
 *
 * File-reading pattern (same as aiDiscoverability.test.ts): these
 * are static content guards, so no DOM or SDK is needed — and the
 * openaiAds guard logic is asserted on the source so the test can
 * run in the node jest environment without importing import.meta code.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..', '..');
const page = readFileSync(resolve(root, 'src', 'pages', 'ForInstitutionsPage.tsx'), 'utf8');
const ads = readFileSync(resolve(root, 'src', 'lib', 'openaiAds.ts'), 'utf8');
const robots = readFileSync(resolve(root, 'public', 'robots.txt'), 'utf8');
const contact = readFileSync(resolve(root, 'src', 'pages', 'ContactPage.tsx'), 'utf8');
const app = readFileSync(resolve(root, 'src', 'App.tsx'), 'utf8');

/** The page's <h1> block, for the framing guard. */
function headlineOf(source: string): string {
  const start = source.indexOf('<h1');
  const end = source.indexOf('</h1>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('ForInstitutionsPage — canonical facts', () => {
  it('carries the canonical prices (Standard and Premium, monthly + annual)', () => {
    for (const price of ['₹499', '৳700', '$6', '₹4,999', '৳7,000', '$60', '₹1,999', '৳2,800', '$24', '₹19,999', '৳28,000', '$240', '₹0']) {
      expect(page).toContain(price);
    }
  });

  it('headline is institution-neutral — software for many institution kinds, never one venue only', () => {
    const headline = headlineOf(page).toLowerCase();
    expect(headline).toContain('institution management software');
    for (const kind of ['trusts', 'schools', 'charities', 'non-profits']) {
      expect(headline).toContain(kind);
    }
    for (const venueOnly of ['temple', 'mandir', 'mosque', 'church']) {
      expect(headline).not.toContain(venueOnly);
    }
  });

  it('has exactly one conversion destination: the /contact inquiry', () => {
    expect(page).toContain("navigate('/contact')");
    // The ContactCta component is the only body CTA and it points at /contact.
    expect(page).toContain('Talk to us about your institution');
    expect(page).not.toContain('wa.me');
    expect(page).not.toContain('startDemo');
  });

  it('measures the view: captures oppref and fires page_viewed on mount', () => {
    expect(page).toContain('captureOppref()');
    expect(page).toContain('initOpenAiAds()');
    expect(page).toContain("trackOpenAiEvent('page_viewed'");
    expect(page).toContain("from '../lib/openaiAds'");
  });
});

describe('openaiAds module — inert by default, honest by construction', () => {
  it('reads the Pixel ID from the environment and guards every send on it', () => {
    expect(ads).toContain('import.meta.env.VITE_OPENAI_ADS_PIXEL_ID');
    expect(ads).toContain('export function isOpenAiAdsEnabled()');
    expect(ads).toContain('if (!isOpenAiAdsEnabled()) return false;');
    expect(ads).toContain('if (!isOpenAiAdsEnabled()) return;');
  });

  it('captures oppref into the first-party __oppref cookie', () => {
    expect(ads).toContain("const OPPREF_COOKIE = '__oppref';");
    expect(ads).toContain("get('oppref')");
    expect(ads).toContain('export function captureOppref()');
    expect(ads).toContain('export function getStoredOppref()');
  });

  it('loads only the official OpenAI SDK and documents the dedup rule', () => {
    expect(ads).toContain('https://bzrcdn.openai.com/sdk/oaiq.min.js');
    expect(ads).toContain('event_id');
    expect(ads).toContain('bzr.openai.com');
  });

  it('never sends a Conversions API key from the browser', () => {
    expect(ads).not.toContain('Bearer');
    expect(ads).not.toContain('/v1/events');
    expect(ads.toLowerCase()).toContain('server-side only');
  });
});

describe('robots.txt — OpenAI crawlers welcomed', () => {
  it('explicitly allows OAI-AdsBot, OAI-SearchBot, GPTBot and ChatGPT-User', () => {
    for (const bot of ['OAI-AdsBot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User']) {
      expect(robots).toContain(`User-agent: ${bot}`);
    }
    const adsBotBlock = robots.slice(robots.indexOf('User-agent: OAI-AdsBot'));
    expect(adsBotBlock).toContain('Allow: /');
    expect(robots).toContain('User-agent: *');
  });
});

describe('wiring — ContactPage conversion + App route', () => {
  it('ContactPage fires lead_created keyed by the Firestore lead id on successful submit', () => {
    expect(contact).toContain("import { trackOpenAiEvent } from '../lib/openaiAds';");
    expect(contact).toContain('const leadRef = await addDoc');
    expect(contact).toContain("trackOpenAiEvent('lead_created', { type: 'lead' }, leadRef.id);");
  });

  it('App.tsx lazy-loads the page, routes /for-institutions and keeps it public signed-out', () => {
    expect(app).toContain("const ForInstitutionsPage = lazy(() => import('./pages/ForInstitutionsPage')");
    expect(app).toContain('path="/for-institutions"');
    expect(app).toContain("'/for-institutions'");
  });
});
