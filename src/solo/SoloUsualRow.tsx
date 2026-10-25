import React, { useMemo } from 'react';
import {
  Bookmark, CalendarDays, Flame, Heart, Receipt, ScrollText,
  Star, Store, Sun, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useLocaleText } from './ui';
import { useFeatureFlag } from '../hooks/usePlatformStatus';
import { hasAnyUsage, rankByUsage, readUsage, recordUse } from '../lib/usageStore';
import { YourUsualRow, type UsualItem } from '../components/common/YourUsualRow';

/**
 * SoloUsualRow — VIBE B2: the Solo home's "Your usual" row.
 * =====================================================================
 * The devotee's own most-used sadhana actions, from the same honest
 * device-local usage store as the org row (scope 'solo'; opens are
 * recorded in HomeTab whenever a sub-tab actually renders, plus this
 * row's own taps). Cold start — no opens yet — shows the canonical
 * sadhana starter set under "Begin here", never a borrowed claim.
 *
 * Targets are the real routable home sub-tabs only. (The Tirtha Diary
 * is deliberately absent: it opens as a sheet from Profile, not a
 * sub-tab, so the row cannot honestly deep-link it.)
 */

type SoloActionId =
  | 'sadhana' | 'panjika' | 'panchang' | 'samskara' | 'giving'
  | 'wallet' | 'sangam' | 'marketplace' | 'saved' | 'receipts' | 'jyotish';

const SOLO_USAGE_SCOPE = 'solo';
const MAX_ITEMS = 5;
/** Canonical sadhana starter set for a devotee who has opened nothing yet. */
const STARTERS: SoloActionId[] = ['sadhana', 'panjika', 'panchang', 'giving'];

export const SoloUsualRow: React.FC<{ goTab: (t: SoloActionId) => void }> = ({ goTab }) => {
  const { t } = useLanguage();
  const { tr } = useLocaleText();
  const sangamOn = useFeatureFlag('sangam_enabled');
  const marketplaceOn = useFeatureFlag('marketplace_enabled');

  const catalogue = useMemo<Record<SoloActionId, { label: string; Icon: LucideIcon }>>(
    () => ({
      sadhana: { label: tr('solo.usual.sadhana', 'Sadhana', 'সাধনা', 'साधना'), Icon: Flame },
      panjika: { label: tr('solo.usual.panjika', 'Panjika', 'পঞ্জিকা', 'पंजिका'), Icon: CalendarDays },
      panchang: { label: tr('solo.usual.panchang', 'Panchang', 'পঞ্চাঙ্গ', 'पंचांग'), Icon: Sun },
      samskara: { label: tr('solo.usual.samskara', 'Samskara Bookings', 'সংস্কার বুকিং', 'संस्कार बुकिंग'), Icon: ScrollText },
      giving: { label: tr('solo.usual.giving', 'Giving', 'দান', 'दान'), Icon: Heart },
      wallet: { label: tr('solo.usual.wallet', 'Seva Wallet', 'সেবা ওয়ালেট', 'सेवा वॉलेट'), Icon: Wallet },
      sangam: { label: tr('solo.usual.sangam', 'Sangam', 'সঙ্গম', 'संगम'), Icon: Users },
      marketplace: { label: tr('solo.usual.marketplace', 'Seva Bazar', 'সেবা বাজার', 'सेवा बाज़ार'), Icon: Store },
      saved: { label: tr('solo.usual.saved', 'Saved', 'সংরক্ষিত', 'सहेजा गया'), Icon: Bookmark },
      receipts: { label: tr('solo.usual.receipts', 'Receipts', 'রসিদ', 'रसीदें'), Icon: Receipt },
      jyotish: { label: tr('solo.usual.jyotish', 'Jyotish', 'জ্যোতিষ', 'ज्योतिष'), Icon: Star },
    }),
    [tr],
  );

  const available = useMemo(
    () =>
      (Object.keys(catalogue) as SoloActionId[]).filter(
        (id) =>
          (id !== 'sangam' || sangamOn) && (id !== 'marketplace' || marketplaceOn),
      ),
    [catalogue, sangamOn, marketplaceOn],
  );

  const { heading, items } = useMemo<{ heading: string; items: UsualItem[] }>(() => {
    const toItem = (id: SoloActionId): UsualItem => ({
      id,
      label: catalogue[id].label,
      Icon: catalogue[id].Icon,
    });
    if (hasAnyUsage(SOLO_USAGE_SCOPE)) {
      const usage = readUsage(SOLO_USAGE_SCOPE);
      const used = usage.map((u) => u.id).filter((id): id is SoloActionId =>
        available.includes(id as SoloActionId),
      );
      const rest = available.filter((id) => !used.includes(id));
      const ranked = rankByUsage([...used, ...rest], usage).slice(0, MAX_ITEMS);
      return { heading: t('vibe.yourUsual'), items: ranked.map(toItem) };
    }
    return {
      heading: t('vibe.beginHere'),
      items: STARTERS.filter((id) => available.includes(id)).map(toItem),
    };
  }, [catalogue, available, t]);

  if (items.length === 0) return null;

  const open = (id: string) => {
    recordUse(id, SOLO_USAGE_SCOPE);
    goTab(id as SoloActionId);
  };

  return <YourUsualRow heading={heading} items={items} onOpen={open} />;
};

export default SoloUsualRow;
