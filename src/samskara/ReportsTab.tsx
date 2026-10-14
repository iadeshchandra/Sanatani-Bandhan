import React, { useRef, useState } from 'react';
import { useSamskara, familyMembers, memberChronicle, ageYears } from './samskaraStore';
import { Card, Btn, Empty, fmtDate, T } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Reports. Export the family's sacred record as JSON
 * for safekeeping, import it back, and print a quiet family chronicle. */

export const ReportsTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll } = useSamskara();
  const { safeTranslate } = useLanguage();
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
    setMsg(safeTranslate('samskara.reports.exported', 'Chronicle exported. Keep it somewhere safe.', 'ইতিহাস রপ্তানি হয়েছে। নিরাপদ স্থানে রাখুন।', 'वृत्तांत निर्यात हो गया। सुरक्षित स्थान पर रखें।'));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const ok = importJSON(text);
    setMsg(ok
      ? safeTranslate('samskara.reports.imported', 'Chronicle restored.', 'ইতিহাস পুনরুদ্ধার হয়েছে।', 'वृत्तांत पुनर्स्थापित हो गया।')
      : safeTranslate('samskara.reports.importFail', 'That file could not be read as a chronicle.', 'ফাইলটি ইতিহাস হিসেবে পড়া যায়নি।', 'फ़ाइल वृत्तांत के रूप में पढ़ी नहीं जा सकी।'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-stone-800 mb-2">
          {safeTranslate('samskara.reports.safekeep', 'Keep it safe', 'নিরাপদে রাখুন', 'सुरक्षित रखें')}
        </h3>
        <p className="text-xs text-stone-500 mb-4 leading-relaxed">
          {safeTranslate(
            'samskara.reports.safekeepBody',
            'Your family\u2019s chronicle lives on this device. Export it regularly and keep a copy somewhere safe — with family, or printed.',
            'আপনার পরিবারের ইতিহাস এই ডিভাইসে থাকে। নিয়মিত রপ্তানি করুন এবং নিরাপদ স্থানে একটি কপি রাখুন — পরিবারের কাছে, বা ছাপিয়ে।',
            'आपके परिवार का वृत्तांत इसी डिवाइस पर रहता है। नियमित रूप से निर्यात करें और सुरक्षित स्थान पर एक प्रति रखें — परिवार के पास, या छपाकर।'
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={download}>
            {safeTranslate('samskara.reports.export', 'Export chronicle', 'ইতিহাস রপ্তানি', 'वृत्तांत निर्यात करें')}
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            {safeTranslate('samskara.reports.import', 'Restore from file', 'ফাইল থেকে পুনরুদ্ধার', 'फ़ाइल से पुनर्स्थापित करें')}
          </Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {msg && <p className="text-xs text-stone-600 mt-3">{msg}</p>}
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2">
          {safeTranslate('samskara.reports.print', 'Family chronicle', 'পারিবারিক ইতিহাস', 'पारिवारिक वृत्तांत')}
        </h3>
        {state.families.length === 0 ? (
          <Empty text={safeTranslate('samskara.reports.noFamily', 'No families yet.', 'এখনো কোনো পরিবার নেই।', 'अभी कोई परिवार नहीं है।')} />
        ) : (
          <div className="space-y-4">
            {state.families.map((f) => (
              <div key={f.id} className="rounded-xl border border-stone-100 p-4">
                <div className="font-bold text-stone-800 text-base">🪔 {f.name}</div>
                {f.gotra && <div className="text-xs text-stone-500">{safeTranslate('samskara.family.gotra', 'Gotra', 'গোত্র', 'गोत्र')}: {f.gotra}</div>}
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
                            {age >= 0 ? `${age} ${safeTranslate('samskara.member.yrs', 'yrs', 'বছর', 'वर्ष')}` : ''}
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
                      ॥ {safeTranslate('samskara.reports.remembered', 'Remembered', 'স্মরণীয়', 'स्मरणीय')} ॥
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
              {safeTranslate('samskara.reports.printBtn', 'Print chronicle', 'ইতিহাস ছাপুন', 'वृत्तांत छापें')}
            </Btn>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2 text-sm">
          {safeTranslate('samskara.reports.danger', 'Start over', 'নতুন করে শুরু', 'पुनः आरंभ करें')}
        </h3>
        {!confirmReset ? (
          <Btn variant="ghost" onClick={() => setConfirmReset(true)}>
            {safeTranslate('samskara.reports.reset', 'Clear all family records', 'সব পারিবারিক রেকর্ড মুছুন', 'सभी पारिवारिक रिकॉर्ड हटाएं')}
          </Btn>
        ) : (
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => { resetAll(); setConfirmReset(false); }}>
              {safeTranslate('samskara.common.delete', 'Remove', 'মুছুন', 'हटाएं')}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmReset(false)}>
              {safeTranslate('samskara.common.cancel', 'Cancel', 'বাতিল', 'रद्द करें')}
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
};
