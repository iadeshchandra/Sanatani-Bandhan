/**
 * GuideCenter.tsx — The Quick Guide Center.
 * ==========================================
 * Searchable grid of all 16 module guides. Tap a card → full guide
 * in the upgraded QuickGuideModal. Entry: "📖 Guides" on Solo home.
 */
import React, { useMemo, useState } from 'react';
import { X, Search, BookOpen } from 'lucide-react';
import { T } from '../../solo/ui';
import { useLanguage } from '../../context/LanguageContext';
import { MODULE_GUIDES, getGuide, type ModuleGuide } from '../../lib/moduleGuides';
import { QuickGuideModal } from '../common/QuickGuideModal';

const GUIDE_ICONS: Record<string, string> = {
  treasury: '💰',
  devotees: '🙏',
  inventory: '📦',
  hr: '👥',
  events: '🎉',
  marketplace: '🏪',
  wallet: '👛',
  panjika: '🗓️',
  samskara: '💒',
  pathshala: '📚',
  goshala: '🐄',
  matha: '🏛️',
  sangam: '🤝',
  jyotish: '🔮',
  purohit: '🕉️',
  godmode: '⚙️',
  // Money & Chat guides
  chat: '💬',
  'chat-blessings': '✨',
  'p2p-requests': '💸',
  'p2p-lifecycle': '🔄',
  'p2p-wallet': '🪙',
  'org-requests': '🏛️',
  'p2p-qr': '📷',
  'p2p-safety': '🛡️',
};

/** Guide ids that belong to the "Money & Chat" section (rendered first). */
const MONEY_CHAT_IDS = [
  'chat',
  'chat-blessings',
  'p2p-requests',
  'p2p-lifecycle',
  'p2p-wallet',
  'org-requests',
  'p2p-qr',
  'p2p-safety',
];

function GuideCard({
  g,
  lang,
  onOpen,
}: {
  g: ModuleGuide;
  lang: string;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      key={g.id}
      type="button"
      onClick={() => onOpen(g.id)}
      className="text-left rounded-2xl bg-white border border-amber-100 p-4 hover:border-amber-300 hover:shadow-md transition-all min-h-[44px]"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl" aria-hidden>
          {GUIDE_ICONS[g.id] || '📖'}
        </span>
        <div className="font-extrabold text-stone-800 text-sm">{pick(g, lang, 'name')}</div>
      </div>
      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-2">
        {pick(g, lang, 'tagline')}
      </p>
    </button>
  );
}

function pick(g: ModuleGuide, lang: string, field: 'name' | 'tagline'): string {
  const v = g[field];
  if (lang === 'bn') return v.bn || v.en;
  if (lang === 'hi') return v.hi || v.en;
  return v.en;
}

export const GuideCenter: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialGuideId?: string | null;
}> = ({ isOpen, onClose, initialGuideId = null }) => {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const [query, setQuery] = useState('');
  const [activeGuideId, setActiveGuideId] = useState<string | null>(initialGuideId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULE_GUIDES;
    return MODULE_GUIDES.filter((g) => {
      const hay = `${g.id} ${g.name.en} ${g.name.bn} ${g.name.hi} ${g.tagline.en}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const isSearching = query.trim().length > 0;
  const moneyChatGuides = useMemo(
    () =>
      MONEY_CHAT_IDS.map((id) => filtered.find((g) => g.id === id)).filter(
        (g): g is ModuleGuide => !!g
      ),
    [filtered]
  );
  const otherGuides = useMemo(
    () => filtered.filter((g) => !MONEY_CHAT_IDS.includes(g.id)),
    [filtered]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-gradient-to-b from-amber-50 to-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 text-amber-50 p-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                📖
              </span>
              <div>
                <h2 className="text-lg font-extrabold">
                  <T en="Guide Center" bn="নির্দেশিকা কেন্দ্র" hi="मार्गदर्शिका केंद्र" />
                </h2>
                <p className="text-xs text-amber-200/80">
                  <T
                    en="Every module, explained in 30 seconds"
                    bn="প্রতিটি মডিউল, ৩০ সেকেন্ডে বুঝুন"
                    hi="प्रत्येक मॉड्यूल, 30 सेकंड में समझें"
                  />
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-11 h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-amber-200/70" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === 'bn' ? 'মডিউল খুঁজুন…' : lang === 'hi' ? 'मॉड्यूल खोजें…' : 'Search modules…'
              }
              className="w-full bg-white/15 border border-white/25 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-amber-200/60 focus:outline-none focus:bg-white/20 min-h-[44px]"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-500">
                <T en="No guides match your search." bn="কোনো নির্দেশিকা মেলেনি।" hi="कोई मार्गदर्शिका नहीं मिली।" />
              </p>
            </div>
          ) : isSearching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((g) => (
                <GuideCard key={g.id} g={g} lang={lang} onOpen={setActiveGuideId} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Money & Chat section */}
              {moneyChatGuides.length > 0 && (
                <section>
                  <h3 className="text-sm font-extrabold text-stone-700 mb-2.5 flex items-center gap-2">
                    <span aria-hidden>💬</span>
                    <T en="Money & Chat" bn="টাকা ও চ্যাট" hi="धन व चैट" />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {moneyChatGuides.map((g) => (
                      <GuideCard key={g.id} g={g} lang={lang} onOpen={setActiveGuideId} />
                    ))}
                  </div>
                </section>
              )}
              {/* All other modules */}
              <section>
                <h3 className="text-sm font-extrabold text-stone-700 mb-2.5 flex items-center gap-2">
                  <span aria-hidden>📚</span>
                  <T en="All modules" bn="সব মডিউল" hi="सभी मॉड्यूल" />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {otherGuides.map((g) => (
                    <GuideCard key={g.id} g={g} lang={lang} onOpen={setActiveGuideId} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Guide modal on top */}
      {activeGuideId && getGuide(activeGuideId) && (
        <QuickGuideModal
          isOpen={true}
          onClose={() => setActiveGuideId(null)}
          activeModule={activeGuideId}
        />
      )}
    </div>
  );
};
