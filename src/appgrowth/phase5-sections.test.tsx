/**
 * Phase 5 component tests — content-override rendering.
 * =====================================================
 * Verifies the GodMode Content editor's `appGrowth/config.content` override
 * actually reaches the landing sections, with the hardcoded copy as the
 * field-wise fallback. Rendered with react-dom/server (no browser needed).
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('../firebase', () => ({ db: {}, auth: {} }));
jest.mock('./appgrowth.css', () => ({}), { virtual: true });

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../context/LanguageContext';
import { WhySection, FaqSection, TrustSection } from './GetAppSections';
import { DEFAULT_CONTENT, tri, type AppGrowthContent } from './useAppGrowthConfig';

const render = (el: React.ReactElement): string =>
  renderToStaticMarkup(<LanguageProvider>{el}</LanguageProvider>);

const customContent = (): AppGrowthContent => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONTENT)) as AppGrowthContent;
  c.whyCards[0] = {
    title: { en: 'Custom Why Title', bn: 'কাস্টম শিরোনাম', hi: 'कस्टम शीर्षक' },
    body: { en: 'Custom why body.', bn: 'কাস্টম বডি।', hi: 'कस्टम बॉडी।' },
  };
  c.faq.items = [{ q: tri('Custom question?', 'কাস্টম প্রশ্ন?', 'कस्टम प्रश्न?'), a: tri('Custom answer.', 'কাস্টম উত্তর।', 'कस्टम उत्तर।') }];
  c.testimonial = {
    quote: tri('A real temple said this.', 'একটি আসল মন্দির বলেছে।', 'एक असली मंदिर ने कहा।'),
    name: tri('Temple Committee', 'মন্দির কমিটি', 'मंदिर समिति'),
    role: tri('Verified institution', 'যাচাইকৃত প্রতিষ্ঠান', 'सत्यापित संस्थान'),
  };
  return c;
};

describe('GetAppSections — content override plumbing', () => {
  test('WhySection renders the admin override when present', () => {
    const html = render(<WhySection content={customContent()} />);
    expect(html).toContain('Custom Why Title');
    expect(html).toContain('Custom why body.');
  });

  test('WhySection falls back to the hardcoded card when not overridden', () => {
    const html = render(<WhySection />);
    expect(html).toContain('One identity for every temple');
    expect(html).not.toContain('Ajker Suchana');
  });

  test('FaqSection renders override Q&A pairs', () => {
    const html = render(<FaqSection content={customContent()} />);
    expect(html).toContain('Custom question?');
    expect(html).toContain('Custom answer.');
  });

  test('FaqSection falls back to hardcoded FAQs by default', () => {
    const html = render(<FaqSection />);
    expect(html).toContain('Is it free?');
  });

  test('TrustSection shows the testimonial only when the owner provided one', () => {
    const withQuote = render(<TrustSection content={customContent()} />);
    expect(withQuote).toContain('A real temple said this.');
    expect(withQuote).toContain('Temple Committee');
    const withoutQuote = render(<TrustSection />);
    expect(withoutQuote).toContain('coming soon');
    expect(withoutQuote).not.toContain('A real temple said this.');
  });
});
