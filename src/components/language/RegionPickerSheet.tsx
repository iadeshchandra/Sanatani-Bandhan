/**
 * language/RegionPickerSheet.tsx — "your community's words" picker.
 * ================================================================
 * Bottom sheet over the 15 REGIONS: warm label + native-script blurb
 * (the words the devotee will actually see), checkmark on current.
 * ≥44px rows. The caller owns setRegion + markRegionChosen.
 */

import React from 'react';
import { X, Check, MapPin } from 'lucide-react';
import {
  REGION_IDS,
  REGIONS,
  type RegionId,
} from '../../i18n/regionalTerms';

type CopyKey = 'title' | 'sub' | 'close';

const COPY: Record<string, Record<CopyKey, string>> = {
  hi: {
    title: '🗺️ आपका क्षेत्र',
    sub: 'ताकि हम आपके समुदाय के शब्दों में बात कर सकें।',
    close: 'बंद करें',
  },
  bn: {
    title: '🗺️ আপনার অঞ্চল',
    sub: 'যাতে আমরা আপনার সম্প্রদায়ের শব্দে কথা বলতে পারি।',
    close: 'বন্ধ করুন',
  },
  en: {
    title: '🗺️ Your region',
    sub: 'So we can use the words your community uses.',
    close: 'Close',
  },
};

function copyFor(lang: string): Record<CopyKey, string> {
  return COPY[(lang || 'en').toLowerCase()] || COPY.en;
}

interface Props {
  open: boolean;
  currentRegion: RegionId | null;
  chromeLang: string;
  onSelect: (region: RegionId) => void;
  onClose: () => void;
}

export const RegionPickerSheet: React.FC<Props> = ({
  open,
  currentRegion,
  chromeLang,
  onSelect,
  onClose,
}) => {
  if (!open) return null;
  const copy = copyFor(chromeLang);

  return (
    <div
      className="fixed inset-0 z-[210]"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-[#faf7f2] rounded-t-3xl shadow-2xl border-t border-amber-200/60">
        <div className="sticky top-0 bg-[#faf7f2]/95 backdrop-blur rounded-t-3xl z-10 px-5 pt-3 pb-3 border-b border-amber-100">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-stone-300/70" />
          <div className="flex items-center gap-2.5 mt-2">
            <span className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-amber-700" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-[18px] font-bold text-stone-900 leading-snug">
                {copy.title}
              </h2>
              <p className="text-[12px] text-stone-500">{copy.sub}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 shrink-0"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>

        <ul className="px-5 py-4 space-y-2">
          {REGION_IDS.map((id) => {
            const info = REGIONS[id];
            const active = currentRegion === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-pressed={active}
                  className={`w-full min-h-[60px] rounded-2xl border px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[16px] font-bold text-stone-900 leading-snug">
                      {info.label}
                    </span>
                    <span className="block text-[13px] text-stone-500 leading-relaxed">
                      {info.blurb}
                    </span>
                  </span>
                  {active && (
                    <span
                      className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0"
                      aria-hidden
                    >
                      <Check className="w-4 h-4 text-white" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
