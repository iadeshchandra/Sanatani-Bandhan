/**
 * worldReady.test.ts — WORLD-READINESS Batch 1 pins (2026-10-24).
 *
 * Exhibit 1 (Ask sheet voice card): raw engine errors must never reach
 * the user's screen — the download layer stores error KIND tokens only,
 * the sheet mounts a calm status note instead of the download manager,
 * and classification maps the owner's actual failure ("Unable to find a
 * compatible GPU") to the permanent 'gpu' kind.
 *
 * Exhibit 2 (dead guides): an `openGuide` action may be emitted ONLY
 * when it resolves in the interactive TOUR registry — for every module
 * guide, forever (this test iterates the live registries, so registry
 * drift fails loudly here instead of dead-ending on a user's phone).
 * The sheet contains no "still being written" dead-end copy at all.
 *
 * Exhibit 6 (landing language): the public header mounts the canonical
 * language switcher.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MODULE_GUIDES } from '../../lib/moduleGuides';
import { getGuide as getTour } from '../../components/guide/guides';
import { tourIdForModuleGuide } from '../guideTours';
import { classifyDownloadError } from '../voice/downloader';

const root = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

describe('Exhibit 2 — guide actions always resolve, or are never offered', () => {
  it('every module guide: a returned tour id exists in the tour registry', () => {
    for (const g of MODULE_GUIDES) {
      const tourId = tourIdForModuleGuide(g.id);
      if (tourId !== null) {
        expect(getTour(tourId)).toBeDefined();
      }
    }
  });

  it('guides without a tour twin yield null (the text guide is the answer)', () => {
    expect(tourIdForModuleGuide('panjika')).toBeNull();
    expect(tourIdForModuleGuide('sangam')).toBeNull();
    expect(tourIdForModuleGuide('treasury')).toBeNull();
    expect(tourIdForModuleGuide('')).toBeNull();
    expect(tourIdForModuleGuide('no-such-guide')).toBeNull();
  });

  it('the wallet guide and the P2P guides map to their real tours', () => {
    expect(tourIdForModuleGuide('wallet')).toBe('wallet');
    expect(tourIdForModuleGuide('p2p-qr')).toBe('p2p');
    expect(tourIdForModuleGuide('p2p-wallet')).toBe('p2p');
  });

  it('the assistant sheet contains no dead-end copy and no download manager', () => {
    const sheet = read('src/ai/components/AssistantSheet.tsx');
    expect(sheet).not.toContain('guideMissing');
    expect(sheet).not.toContain('sheetMissing');
    expect(sheet).not.toContain('That guide is still being written');
    expect(sheet).not.toContain('এখনও লেখা হচ্ছে');
    expect(sheet).not.toContain('AiVoiceSettings');
    expect(sheet).toContain('VoiceStatusNote');
  });
});

describe('Exhibit 1 — voice errors are kind tokens, never raw text', () => {
  it("the owner's exact failure classifies as the permanent 'gpu' kind", () => {
    expect(classifyDownloadError(new Error('Unable to find a compatible GPU'))).toBe('gpu');
    expect(classifyDownloadError(new Error('WebGPU adapter request failed'))).toBe('gpu');
  });

  it('network, storage and integrity failures classify to their kinds', () => {
    expect(classifyDownloadError(new Error('Failed to fetch'))).toBe('network');
    expect(classifyDownloadError(new Error('QuotaExceededError: quota exceeded'))).toBe('storage');
    expect(classifyDownloadError(new Error('voice-download-integrity-failed'))).toBe('integrity');
    expect(classifyDownloadError(new Error('something entirely unexpected'))).toBe('unknown');
    expect(classifyDownloadError(undefined)).toBe('unknown');
  });

  it('the downloader persists tokens only; the card never renders the raw field', () => {
    const dl = read('src/ai/voice/downloader.ts');
    expect(dl).toContain('classifyDownloadError');
    expect(dl).not.toMatch(/state: 'error', error: e instanceof Error/);
    const card = read('src/ai/voice/components/AiVoiceSettings.tsx');
    expect(card).not.toContain('{ui.dl.error}');
  });
});

describe('Exhibit 6 — the public header carries the canonical switcher', () => {
  it('landing, contact, institutions, ask-ai and org public pages mount it', () => {
    for (const page of [
      'src/pages/LandingPage.tsx',
      'src/pages/ContactPage.tsx',
      'src/pages/ForInstitutionsPage.tsx',
      'src/pages/AskAiPage.tsx',
      'src/pages/OrgPublicPage.tsx',
    ]) {
      expect(read(page)).toContain('PublicLanguageButton');
    }
  });

  it('the button drives the canonical registry through LanguageContext', () => {
    const btn = read('src/components/public/PublicLanguageButton.tsx');
    expect(btn).toContain('LanguagePickerSheet');
    expect(btn).toContain('markLanguageChosen');
    expect(btn).toContain('supportedLanguages');
  });
});
