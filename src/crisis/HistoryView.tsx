/**
 * HistoryView — resolved / cancelled incidents, newest first.
 * Read-only: outcome note + resolved time per event.
 */
import React, { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { CrisisEvent } from './crisisCommandTypes';
import { tsToMs } from './crisisCommandTypes';
import { useCrisisT } from './crisisI18n';
import { SITUATION_ICON, SEVERITY_STYLE, relTime } from './crisisShared';

export const HistoryView: React.FC<{ events: CrisisEvent[] }> = ({ events }) => {
  const t = useCrisisT();
  const sorted = useMemo(
    () => [...events].sort((a, b) => tsToMs(b.resolvedAt) - tsToMs(a.resolvedAt)),
    [events],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p className="text-[17px] text-stone-600 leading-relaxed">{t('hist.empty')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sorted.map((e) => (
        <li key={e.id} className="bg-white border border-stone-200 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl ${SEVERITY_STYLE[e.severity] ?? 'bg-stone-500 text-white'}`}>
              {SITUATION_ICON[e.situation]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[16px] text-stone-900 truncate">
                {e.senderName} · {t(`sit.${e.situation}`)}
              </p>
              <p className="text-[12px] text-stone-500">
                {t(`st.${e.status}`)} · {t('hist.resolvedAt')} {relTime(tsToMs(e.resolvedAt), t)}
              </p>
            </div>
            {e.status === 'resolved' ? (
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
            ) : (
              <XCircle size={22} className="text-stone-400 shrink-0" />
            )}
          </div>
          {e.outcomeNote ? (
            <p className="mt-2 text-[14px] text-stone-700 bg-stone-50 rounded-2xl p-3 leading-relaxed">
              <span className="font-semibold">{t('hist.outcome')}: </span>
              {e.outcomeNote}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
};
