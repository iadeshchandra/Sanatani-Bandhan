import React, { useRef, useState } from 'react';
import { useSamskara, familyMembers, memberChronicle, ageYears } from './samskaraStore';
import { Card, Btn, Empty, fmtDate } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Reports. Export the family's sacred record as JSON
 * for safekeeping, import it back, and print a quiet family chronicle. */

export const ReportsTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll } = useSamskara();
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samskara-chronicle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(t('suites.samskara.reports.exported'));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const ok = importJSON(text);
    setMsg(ok
      ? t('suites.samskara.reports.imported')
      : t('suites.samskara.reports.importFail'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-stone-800 mb-2">
          {t('suites.samskara.reports.safekeep')}
        </h3>
        <p className="text-xs text-stone-500 mb-4 leading-relaxed">
          {t('suites.samskara.reports.safekeepBody')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={download}>
            {t('suites.samskara.reports.export')}
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            {t('suites.samskara.reports.import')}
          </Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {msg && <p className="text-xs text-stone-600 mt-3">{msg}</p>}
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2">
          {t('suites.samskara.reports.print')}
        </h3>
        {state.families.length === 0 ? (
          <Empty text={t('suites.samskara.reports.noFamily')} />
        ) : (
          <div className="space-y-4">
            {state.families.map((f) => (
              <div key={f.id} className="rounded-xl border border-stone-100 p-4">
                <div className="font-bold text-stone-800 text-base">🪔 {f.name}</div>
                {f.gotra && <div className="text-xs text-stone-500">{t('suites.samskara.common.gotra')}: {f.gotra}</div>}
                <div className="mt-3 space-y-3">
                  {familyMembers(state, f.id).map((m) => {
                    const chron = memberChronicle(state, m.id);
                    const done = chron.filter((c) => c.record?.status === 'completed');
                    const age = ageYears(m.birthDate);
                    return (
                      <div key={m.id} className="text-sm">
                        <div className="font-bold text-stone-700">
                          {m.name}
                          <span className="ml-2 text-xs font-normal text-stone-400">
                            {age >= 0 ? `${age} ${t('suites.samskara.member.yrs')}` : ''}
                            {m.birthDate ? ` · ${fmtDate(m.birthDate)}` : ''}
                          </span>
                        </div>
                        {done.length === 0 ? (
                          <div className="text-xs text-stone-400 italic">—</div>
                        ) : (
                          <ul className="text-xs text-stone-600 mt-1 space-y-0.5">
                            {done.map(({ meta, record }) => (
                              <li key={meta.id}>
                                {meta.transliteration}
                                {record?.dateCompleted ? ` — ${fmtDate(record.dateCompleted)}` : ''}
                                {record?.purohitName ? ` · ${record.purohitName}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
                {state.ancestors.filter((a) => a.familyId === f.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="text-xs font-bold text-stone-500 mb-1">
                      ॥ {t('suites.samskara.reports.remembered')} ॥
                    </div>
                    {state.ancestors.filter((a) => a.familyId === f.id).map((a) => (
                      <div key={a.id} className="text-xs text-stone-600">
                        🪔 {a.name}{a.relation ? ` — ${a.relation}` : ''}{a.deathDate ? ` · ${fmtDate(a.deathDate)}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Btn variant="ghost" onClick={() => window.print()} className="w-full">
              {t('suites.samskara.reports.printBtn')}
            </Btn>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2 text-sm">
          {t('suites.samskara.reports.danger')}
        </h3>
        {!confirmReset ? (
          <Btn variant="ghost" onClick={() => setConfirmReset(true)}>
            {t('suites.samskara.reports.reset')}
          </Btn>
        ) : (
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => { resetAll(); setConfirmReset(false); }}>
              {t('suites.samskara.common.delete')}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmReset(false)}>
              {t('suites.samskara.common.cancel')}
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
};
