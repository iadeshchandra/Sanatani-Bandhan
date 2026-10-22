import React, { useState } from 'react';
import { useTirth, todayISO, waitingTokens, nowServingSeq, estWaitMins } from './tirthStore';
import { T, Card, Btn, Empty, fmtTime } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Tirth One — live queue board: now-serving per slot, serve-next,
 * no-show marking, re-queue. Big-number display mode for gate screens. */

export const QueueTab: React.FC = () => {
  const { state, update } = useTirth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [date] = useState(todayISO());
  const [bigMode, setBigMode] = useState(false);

  const activeSlots = state.slots.filter((s) => s.active);
  if (!activeSlots.length) return <Card><Empty text={t('suites.tirth.queue.empty')} /></Card>;

  const serveNext = (slotId: string) => {
    const next = waitingTokens(state, slotId, date)[0];
    if (!next) { showToast(t('suites.tirth.queue.toastEmpty'), 'warning'); return; }
    update('tokens', next.id, { status: 'served', servedAt: new Date().toISOString() });
    showToast(t('suites.tirth.queue.toastServed').replace('{no}', String(next.no)), 'success');
  };

  const markNoShow = (tokenId: string, no: string) => {
    update('tokens', tokenId, { status: 'no-show' });
    showToast(t('suites.tirth.queue.toastNoShow').replace('{no}', String(no)), 'success');
  };

  const requeue = (tokenId: string, no: string) => {
    update('tokens', tokenId, { status: 'waiting' });
    showToast(t('suites.tirth.queue.toastBackInLine').replace('{no}', String(no)), 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Live queue board" bn="লাইভ সারি বোর্ড" hi="लाइव कतार बोर्ड" /></h2>
        <Btn variant={bigMode ? 'primary' : 'ghost'} onClick={() => setBigMode((b) => !b)}>
          📺 <T en={bigMode ? 'Exit display mode' : 'Gate display mode'} bn={bigMode ? 'ডিসপ্লে বন্ধ' : 'গেট ডিসপ্লে'} hi={bigMode ? 'डिस्प्ले बंद करें' : 'गेट डिस्प्ले'} />
        </Btn>
      </div>

      <div className={`grid gap-4 ${bigMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {activeSlots.map((sl) => {
          const nowSeq = nowServingSeq(state, sl.id, date);
          const waiting = waitingTokens(state, sl.id, date);
          return (
            <Card key={sl.id} className={bigMode ? '!p-8 text-center' : ''}>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">{sl.name} · {fmtTime(sl.startTime)}–{fmtTime(sl.endTime)}</div>
              <div className={`font-extrabold text-teal-800 ${bigMode ? 'text-7xl my-4' : 'text-4xl my-2'}`}>
                {nowSeq !== null ? `T-${String(nowSeq).padStart(4, '0')}` : '—'}
              </div>
              <div className="text-sm text-stone-500">
                <T en="Now serving" bn="এখন সেবা চলছে" hi="अभी सेवा" /> · {waiting.length} <T en="waiting" bn="অপেক্ষমাণ" hi="प्रतीक्षारत" />
              </div>
              {!bigMode && (
                <>
                  <div className="flex flex-wrap gap-2 mt-3 no-print">
                    <Btn onClick={() => serveNext(sl.id)} disabled={!waiting.length}>⏭ <T en="Serve next" bn="পরবর্তী" hi="अगला" /></Btn>
                  </div>
                  {waiting.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                      {waiting.slice(0, 12).map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                          <span className="font-mono font-bold text-teal-800">{t.no}</span>
                          <span className="text-stone-500 text-xs truncate">{t.name || t.kind} · ~{estWaitMins(state, sl.id, date, t.seq)} min (est.)</span>
                          <button onClick={() => markNoShow(t.id, t.no)} className="text-xs font-bold text-red-600 underline min-h-[44px] px-2 no-print">
                            <T en="No-show" bn="অনুপস্থিত" hi="नो-शो" />
                          </button>
                        </div>
                      ))}
                      {waiting.length > 12 && <div className="text-xs text-stone-400">+{waiting.length - 12} more waiting</div>}
                    </div>
                  )}
                  <NoShowRow slotId={sl.id} date={date} onRequeue={requeue} />
                </>
              )}
            </Card>
          );
        })}
      </div>
      {bigMode && <p className="text-xs text-stone-400 text-center no-print">Display mode — connect this screen at the gate. Exit to manage the queue.</p>}
    </div>
  );
};

const NoShowRow: React.FC<{ slotId: string; date: string; onRequeue: (id: string, no: string) => void }> = ({ slotId, date, onRequeue }) => {
  const { state } = useTirth();
  const noShows = state.tokens.filter((t) => t.date === date && t.slotId === slotId && t.status === 'no-show');
  if (!noShows.length) return null;
  return (
    <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 no-print">
      <div className="text-xs font-bold text-red-700 mb-1">No-shows ({noShows.length})</div>
      <div className="flex flex-wrap gap-2">
        {noShows.map((t) => (
          <button key={t.id} onClick={() => onRequeue(t.id, t.no)} className="text-xs font-mono font-bold bg-white border border-red-200 rounded-lg px-2 py-1.5 min-h-[44px]">
            {t.no} ↩
          </button>
        ))}
      </div>
    </div>
  );
};
