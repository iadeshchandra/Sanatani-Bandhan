/**
 * tirtha/YatraView.tsx — a single yatra: its visits, reflection,
 * keepsake PDF export, and visit assignment.
 */
import React, { useState } from 'react';
import { Btn } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import {
  assignVisitsToYatra,
  forgetYatra,
  getLocalVisits,
  getVisitsForYatra,
} from './tirthaStore';
import { tt } from './i18n';
import type { VisitEntry, Yatra } from './types';
import { exportYatraPdf } from './yatraExport';
import { CreateGroupSheet, useSelfParticipant } from '../chat/groups';

export const YatraView: React.FC<{
  uid: string;
  yatra: Yatra;
  onBack: () => void;
  onChanged: () => void;
}> = ({ uid, yatra, onBack, onChanged }) => {
  const { currentLang } = useLanguage();
  const [visits, setVisits] = useState<VisitEntry[]>(() => getVisitsForYatra(uid, yatra.id));
  const [assignMode, setAssignMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const [toast, setToast] = useState('');
  const [groupOpen, setGroupOpen] = useState(false);
  const selfInfo = useSelfParticipant(uid);

  const unassigned = getLocalVisits(uid).filter((v) => !v.yatraId);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doAssign = async () => {
    await assignVisitsToYatra(uid, [...selected], yatra.id);
    setSelected(new Set());
    setAssignMode(false);
    setVisits(getVisitsForYatra(uid, yatra.id));
    onChanged();
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await exportYatraPdf(uid, yatra, currentLang);
    } catch {
      setToast('…');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setExporting(false);
    }
  };

  const doForget = async (withVisits: boolean) => {
    await forgetYatra(uid, yatra.id, withVisits);
    onChanged();
    onBack();
  };

  return (
    <div className="pb-8">
      <button onClick={onBack} className="text-sm font-bold text-amber-700 min-h-[44px] mb-2">
        ← {tt(currentLang, 'yatra.title')}
      </button>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 mb-5 border border-amber-100">
        <h2 className="text-2xl font-extrabold text-stone-800">🧭 {yatra.name}</h2>
        {yatra.reflection && (
          <p className="mt-2 text-stone-600 italic leading-relaxed">“{yatra.reflection}”</p>
        )}
        <p className="mt-2 text-xs text-stone-500">
          {visits.length} {tt(currentLang, 'yatra.visits')}
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        <Btn onClick={doExport} disabled={exporting || visits.length === 0} variant="ghost" className="flex-1">
          {exporting ? tt(currentLang, 'yatra.exporting') : tt(currentLang, 'yatra.export')}
        </Btn>
        <Btn onClick={() => setAssignMode((s) => !s)} variant="ghost" className="flex-1">
          {assignMode ? tt(currentLang, 'common.close') : `+ ${tt(currentLang, 'yatra.visits')}`}
        </Btn>
      </div>

      <button
        type="button"
        onClick={() => setGroupOpen(true)}
        className="w-full mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold py-3 min-h-[52px] flex items-center justify-center gap-2"
      >
        <span aria-hidden>👥</span>
        {currentLang === 'bn'
          ? 'যাত্রা গ্রুপ তৈরি করুন'
          : currentLang === 'hi'
            ? 'यात्रा समूह बनाएँ'
            : 'Create yatra group'}
      </button>

      {groupOpen && (
        <CreateGroupSheet
          uid={uid}
          selfInfo={selfInfo}
          prefill={{ name: `🚩 ${yatra.name}`, type: 'yatra' }}
          onClose={() => setGroupOpen(false)}
          onCreated={() => {
            setGroupOpen(false);
            setToast(
              currentLang === 'bn'
                ? 'যাত্রা গ্রুপ তৈরি! বার্তায় খুঁজুন 👥'
                : currentLang === 'hi'
                  ? 'यात्रा समूह बन गया! संदेश में देखें 👥'
                  : 'Yatra group created! Find it in Messages 👥',
            );
            setTimeout(() => setToast(''), 3500);
          }}
        />
      )}

      {assignMode && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-5">
          <p className="text-sm font-bold text-stone-700 mb-2">
            {currentLang === 'bn' ? 'কোন ভ্রমণগুলি এই যাত্রার অংশ?' : currentLang === 'hi' ? 'कौन-सी यात्राएँ इस यात्रा का हिस्सा हैं?' : 'Which visits belong to this yatra?'}
          </p>
          {unassigned.length === 0 && (
            <p className="text-sm text-stone-400">
              {currentLang === 'bn' ? 'সব ভ্রমণ ইতিমধ্যে সাজানো।' : currentLang === 'hi' ? 'सभी यात्राएँ पहले से जुड़ी हैं।' : 'All visits are already assigned.'}
            </p>
          )}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {unassigned.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleSelect(v.id)}
                className={`w-full text-left rounded-xl border p-3 min-h-[44px] ${
                  selected.has(v.id) ? 'border-amber-500 bg-amber-50' : 'border-stone-200'
                }`}
              >
                <span className="font-semibold text-stone-700 text-sm">🛕 {v.templeName}</span>
                <span className="text-xs text-stone-400 ml-2">{v.visitedAt.slice(0, 10)}</span>
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <Btn onClick={doAssign} className="w-full mt-3">
              {currentLang === 'bn' ? `${selected.size}টি যোগ করুন` : currentLang === 'hi' ? `${selected.size} जोड़ें` : `Add ${selected.size}`}
            </Btn>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visits.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-6">
            {currentLang === 'bn' ? 'এই যাত্রায় এখনও কোনো ভ্রমণ নেই।' : currentLang === 'hi' ? 'इस यात्रा में अभी कोई यात्रा नहीं है।' : 'No visits in this yatra yet.'}
          </p>
        )}
        {visits.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-stone-800">🛕 {v.templeName}</div>
              <div className="text-xs text-stone-500">{v.visitedAt.slice(0, 10)}</div>
            </div>
            <button
              onClick={async () => {
                await assignVisitsToYatra(uid, [v.id], undefined);
                setVisits(getVisitsForYatra(uid, yatra.id));
                onChanged();
              }}
              aria-label={tt(currentLang, 'common.close')}
              className="w-11 h-11 rounded-full text-stone-300 hover:text-red-500 text-lg shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-stone-100">
        {!confirmForget ? (
          <button onClick={() => setConfirmForget(true)} className="text-sm text-stone-400 hover:text-red-500 min-h-[44px]">
            {tt(currentLang, 'yatra.forget')}
          </button>
        ) : (
          <div className="bg-red-50 rounded-2xl p-4 space-y-2">
            <div className="flex gap-2">
              <Btn variant="danger" onClick={() => doForget(false)} className="flex-1">
                {currentLang === 'bn' ? 'যাত্রা মুছুন (ভ্রমণ রাখুন)' : currentLang === 'hi' ? 'यात्रा मिटाएँ (यात्राएँ रखें)' : 'Forget yatra (keep visits)'}
              </Btn>
            </div>
            <div className="flex gap-2">
              <Btn variant="danger" onClick={() => doForget(true)} className="flex-1">
                {currentLang === 'bn' ? 'যাত্রা + ভ্রমণ মুছুন' : currentLang === 'hi' ? 'यात्रा + यात्राएँ मिटाएँ' : 'Forget yatra + visits'}
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmForget(false)} className="flex-1">
                {tt(currentLang, 'common.cancel')}
              </Btn>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-800 text-amber-50 text-sm rounded-full px-5 py-2.5 z-[9980]">
          {toast}
        </div>
      )}
    </div>
  );
};
