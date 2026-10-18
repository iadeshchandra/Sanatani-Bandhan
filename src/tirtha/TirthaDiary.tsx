/**
 * tirtha/TirthaDiary.tsx — the devotee's personal pilgrimage diary.
 * =====================================================================
 * Renders the visit timeline as a beautiful diary: grouped by month,
 * warm cards, one-tap forget. Also hosts the yatra list and gentle
 * private stats.
 *
 * Mounted two ways:
 *  - <TirthaDiarySheet/> — full-screen sheet (used today from Profile
 *    and the AI assistant; no router change needed).
 *  - <TirthaDiaryView/> — the inner view, ready for a future
 *    `/tirtha` route without modification.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Btn } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import { CoachMark, TourPill, useGuide, GUIDES } from '../components/guide';
import {
  computeStats,
  forgetAll,
  forgetVisit,
  getLocalVisits,
  getLocalYatras,
  pendingSyncCount,
  syncTirtha,
} from './tirthaStore';
import { tirthaLangOf, tt } from './i18n';
import type { VisitEntry, Yatra } from './types';
import { VisitCheckinSheet } from './VisitCheckinSheet';
import { YatraView } from './YatraView';

function fmtDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    const locale = lang === 'bn' ? 'bn-BD' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function fmtMonth(key: string, lang: string): string {
  try {
    const d = new Date(key + '-01T00:00:00');
    const locale = lang === 'bn' ? 'bn-BD' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    return key;
  }
}

const VisitCard: React.FC<{
  visit: VisitEntry;
  lang: string;
  onForget: (id: string) => void;
}> = ({ visit, lang, onForget }) => (
  <article className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4" data-guide-anchor="tirtha-visit">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-bold text-stone-800 text-base leading-snug">🛕 {visit.templeName}</h3>
        <p className="text-xs text-stone-500 mt-0.5">{fmtDate(visit.visitedAt, lang)}</p>
        {visit.darshanKind && (
          <span className="inline-block mt-1.5 text-[11px] font-semibold bg-amber-50 text-amber-800 rounded-full px-2.5 py-1">
            {tt(lang, `darshan.${visit.darshanKind}`)}
          </span>
        )}
      </div>
      <button
        onClick={() => onForget(visit.id)}
        aria-label={tt(lang, 'visit.forget')}
        title={tt(lang, 'visit.forget')}
        className="shrink-0 w-11 h-11 rounded-full text-stone-300 hover:text-red-500 hover:bg-red-50 text-lg transition-colors"
      >
        🗑
      </button>
    </div>
    {visit.note && (
      <p className="mt-2 text-sm text-stone-600 italic leading-relaxed">“{visit.note}”</p>
    )}
    {visit.photoVaultUrl && (
      <p className="mt-2 text-xs text-stone-400">📷 {lang === 'bn' ? 'ছবি সংরক্ষিত' : lang === 'hi' ? 'फोटो सहेजा गया' : 'Photo kept'}</p>
    )}
  </article>
);

export const TirthaDiaryView: React.FC<{ uid: string }> = ({ uid }) => {
  const { currentLang } = useLanguage();
  const [visits, setVisits] = useState<VisitEntry[]>(() => getLocalVisits(uid));
  const [yatras, setYatras] = useState<Yatra[]>(() => getLocalYatras(uid));
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [activeYatra, setActiveYatra] = useState<Yatra | null>(null);
  const [showYatraList, setShowYatraList] = useState(false);
  const [confirmForgetAll, setConfirmForgetAll] = useState(false);
  const [toast, setToast] = useState('');
  const guide = useGuide('tirtha', uid);

  const refresh = useCallback(() => {
    setVisits(getLocalVisits(uid));
    setYatras(getLocalYatras(uid));
  }, [uid]);

  useEffect(() => {
    void syncTirtha(uid).then(refresh);
  }, [uid, refresh]);

  const stats = useMemo(() => computeStats(uid), [uid, visits, yatras]);
  const pending = pendingSyncCount(uid);

  const grouped = useMemo(() => {
    const map = new Map<string, VisitEntry[]>();
    for (const v of visits) {
      const k = monthKey(v.visitedAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visits]);

  const doForget = async (id: string) => {
    await forgetVisit(uid, id);
    refresh();
    setToast(tt(currentLang, 'visit.forgotten'));
    setTimeout(() => setToast(''), 2500);
  };

  const doForgetAll = async () => {
    await forgetAll(uid);
    setConfirmForgetAll(false);
    refresh();
    setToast(tt(currentLang, 'settings.forgetAll.done'));
    setTimeout(() => setToast(''), 3000);
  };

  if (activeYatra) {
    return (
      <YatraView
        uid={uid}
        yatra={activeYatra}
        onBack={() => { setActiveYatra(null); refresh(); }}
        onChanged={refresh}
      />
    );
  }

  return (
    <div className="pb-8">
      {/* Gentle private stats — warm, never gamified */}
      {visits.length > 0 && (
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-amber-50 rounded-2xl px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-amber-800">{stats.templeCount}</div>
            <div className="text-[11px] text-amber-700 font-semibold">{tt(currentLang, 'stats.temples')}</div>
          </div>
          <div className="flex-1 bg-amber-50 rounded-2xl px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-amber-800">{stats.visitCount}</div>
            <div className="text-[11px] text-amber-700 font-semibold">{tt(currentLang, 'stats.visits')}</div>
          </div>
          <div className="flex-1 bg-amber-50 rounded-2xl px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-amber-800">{stats.yatraCount}</div>
            <div className="text-[11px] text-amber-700 font-semibold">{tt(currentLang, 'stats.yatras')}</div>
          </div>
        </div>
      )}

      {/* Yatra strip */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-stone-700">🧭 {tt(currentLang, 'yatra.title')}</h3>
        <button
          onClick={() => setShowYatraList((s) => !s)}
          className="text-sm font-bold text-amber-700 min-h-[44px] px-2"
        >
          {showYatraList
            ? tt(currentLang, 'common.close')
            : `${tt(currentLang, 'yatra.new')} · ${yatras.length}`}
        </button>
      </div>
      {showYatraList && (
        <YatraListInline
          uid={uid}
          yatras={yatras}
          onOpen={setActiveYatra}
          onChanged={refresh}
        />
      )}

      {/* Timeline */}
      {visits.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-100 p-8 text-center">
          <div className="text-4xl mb-3">🪔</div>
          <p className="text-stone-600 leading-relaxed">{tt(currentLang, 'diary.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, list]) => (
            <section key={key}>
              <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">
                {fmtMonth(key, currentLang)}
              </h4>
              <div className="space-y-3">
                {list.map((v) => (
                  <VisitCard key={v.id} visit={v} lang={currentLang} onForget={doForget} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {pending > 0 && (
        <p className="text-center text-xs text-stone-400 mt-4">
          ⏳ {currentLang === 'bn' ? 'সিঙ্ক হবে যখন অনলাইনে আসবেন' : currentLang === 'hi' ? 'ऑनलाइन आने पर सिंक होगा' : 'Will sync when you are back online'}
        </p>
      )}

      {/* Danger zone */}
      {visits.length > 0 && (
        <div className="mt-8 pt-4 border-t border-stone-100">
          {!confirmForgetAll ? (
            <button
              onClick={() => setConfirmForgetAll(true)}
              className="text-sm text-stone-400 hover:text-red-500 min-h-[44px]"
            >
              {tt(currentLang, 'settings.forgetAll')}
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-sm text-red-700 mb-3">{tt(currentLang, 'settings.forgetAll.confirm')}</p>
              <div className="flex gap-2">
                <Btn variant="danger" onClick={doForgetAll} className="flex-1">
                  {tt(currentLang, 'common.delete')}
                </Btn>
                <Btn variant="ghost" onClick={() => setConfirmForgetAll(false)} className="flex-1">
                  {tt(currentLang, 'common.cancel')}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record button */}
      <div className="sticky bottom-4 mt-6">
        <Btn onClick={() => setCheckinOpen(true)} className="w-full !py-4 text-base shadow-lg">
          {tt(currentLang, 'visit.record')}
        </Btn>
      </div>

      {checkinOpen && (
        <VisitCheckinSheet
          uid={uid}
          onSaved={() => { setCheckinOpen(false); refresh(); setToast(tt(currentLang, 'visit.saved')); setTimeout(() => setToast(''), 2500); }}
          onClose={() => setCheckinOpen(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-800 text-amber-50 text-sm font-semibold rounded-full px-5 py-2.5 shadow-lg z-[9980]">
          {toast}
        </div>
      )}

      {/* Guide */}
      {guide.pillVisible && (
        <TourPill guide={GUIDES.tirtha} uid={uid} onStart={guide.start} onDismiss={guide.dismissPill} />
      )}
      {guide.tourActive && (
        <CoachMark
          guide={GUIDES.tirtha}
          onFinish={(completed) => guide.finish(completed)}
        />
      )}
    </div>
  );
};

/** Inline yatra list + creation, shown inside the diary. */
const YatraListInline: React.FC<{
  uid: string;
  yatras: Yatra[];
  onOpen: (y: Yatra) => void;
  onChanged: () => void;
}> = ({ uid, yatras, onOpen, onChanged }) => {
  const { currentLang } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [reflection, setReflection] = useState('');

  const create = async () => {
    if (!name.trim()) return;
    const { createYatra } = await import('./tirthaStore');
    await createYatra(uid, { name: name.trim(), reflection: reflection.trim() || undefined });
    setName(''); setReflection(''); setCreating(false);
    onChanged();
  };

  return (
    <div className="mb-5 space-y-2">
      {yatras.map((y) => (
        <button
          key={y.id}
          onClick={() => onOpen(y)}
          className="w-full text-left bg-white rounded-2xl border border-stone-100 p-4 min-h-[44px] hover:border-amber-200"
        >
          <div className="font-bold text-stone-800">🧭 {y.name}</div>
          {y.reflection && <div className="text-xs text-stone-500 italic mt-1 line-clamp-2">“{y.reflection}”</div>}
        </button>
      ))}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-2xl border-2 border-dashed border-stone-200 p-4 text-stone-500 font-semibold min-h-[44px]"
        >
          {tt(currentLang, 'yatra.new')}
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tt(currentLang, 'yatra.name.ph')}
            className="w-full rounded-xl border border-stone-200 px-4 py-3 min-h-[44px]"
          />
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder={tt(currentLang, 'yatra.reflection')}
            rows={2}
            className="w-full rounded-xl border border-stone-200 px-4 py-3"
          />
          <div className="flex gap-2">
            <Btn onClick={create} className="flex-1">{tt(currentLang, 'yatra.create')}</Btn>
            <Btn variant="ghost" onClick={() => setCreating(false)}>{tt(currentLang, 'common.cancel')}</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export const TirthaDiarySheet: React.FC<{ uid: string; onClose: () => void }> = ({ uid, onClose }) => {
  const { currentLang } = useLanguage();
  return (
    <div className="fixed inset-0 z-[9970] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
      <div className="bg-white border-b border-stone-100 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-stone-800">🪔 {tt(currentLang, 'diary.title')}</h2>
            <p className="text-xs text-stone-500 mt-0.5">🔒 {tt(currentLang, 'diary.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={tt(currentLang, 'common.close')}
            className="w-11 h-11 rounded-full bg-stone-100 text-stone-600 text-lg shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <TirthaDiaryView uid={uid} />
      </div>
    </div>
  );
};
