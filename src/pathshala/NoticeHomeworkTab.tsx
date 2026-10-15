import React, { useMemo, useState } from 'react';
import { Plus, Printer, Megaphone, BookOpen, Trash2 } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { todayISO, uid, fmtDateEn } from './bn';

/* Checklist #10 — notice board: publish, A4 print with institution logo/name.
   Checklist #11 — homework: varga/subject-wise, bulk print. */

export const NoticeHomeworkTab: React.FC = () => {
  const { t } = useLanguage();
  const { lang } = useLocaleText();
  const { state, add, remove } = usePathshala();
  const { activeWorkspace } = useAuthWorkspace();
  const [mode, setMode] = useState<'notice' | 'homework'>('notice');
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [hw, setHw] = useState({ date: todayISO(), vargaId: '', subjectId: '', text: '' });
  const [hwDate, setHwDate] = useState(todayISO());
  const [printHw, setPrintHw] = useState(false);

  const orgName = activeWorkspace.name || t('suites.pathshala.notice.orgFallback');

  const publish = () => {
    if (!nTitle.trim()) { alert(t('suites.pathshala.notice.enterTitle')); return; }
    add('suchanas', { id: uid('n'), title: nTitle, body: nBody, date: todayISO(), publishedBy: 'Karyalaya' });
    setNTitle(''); setNBody('');
  };

  const hwSubjects = useMemo(() => state.subjects.filter((s) => !hw.vargaId || s.vargaId === hw.vargaId), [state.subjects, hw.vargaId]);
  const addHw = () => {
    if (!hw.vargaId || !hw.subjectId || !hw.text.trim()) { alert(t('suites.pathshala.notice.enterVargaSubjDesc')); return; }
    add('homework', { id: uid('hw'), ...hw });
    setHw({ ...hw, subjectId: '', text: '' });
  };
  const hwForDate = useMemo(() => state.homework.filter((h) => h.date === hwDate), [state.homework, hwDate]);
  const hwByVarga = useMemo(() => {
    const g: Record<string, typeof hwForDate> = {};
    for (const h of hwForDate) { (g[h.vargaId] = g[h.vargaId] || []).push(h); }
    return g;
  }, [hwForDate]);
  const subjName = (id: string) => { const s = state.subjects.find((x) => x.id === id); if (!s) return '—'; return lang === 'bn' ? `${s.nameBn || s.name} (${s.name})` : s.name || s.nameBn || '—'; };
  const vargaName = (id: string) => state.vargas.find((v) => v.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.notice.heading')}</h2>
        <div className="flex gap-2 no-print">
          <Btn variant="ghost" onClick={() => setMode('notice')} className={mode === 'notice' ? '!bg-amber-100' : ''}><Megaphone className="w-4 h-4" /> {t('suites.pathshala.notice.tabNotice')}</Btn>
          <Btn variant="ghost" onClick={() => setMode('homework')} className={mode === 'homework' ? '!bg-amber-100' : ''}><BookOpen className="w-4 h-4" /> {t('suites.pathshala.notice.tabHw')}</Btn>
        </div>
      </div>

      {mode === 'notice' && (
        <>
          <Card>
            <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.notice.publishTitle')}</h3>
            <div className="grid gap-3">
              <Field label={t('suites.pathshala.notice.fTitle')}><input value={nTitle} onChange={(e) => setNTitle(e.target.value)} className={inputCls} placeholder={t('suites.pathshala.notice.phTitle')} /></Field>
              <Field label={t('suites.pathshala.notice.fBody')}><textarea value={nBody} onChange={(e) => setNBody(e.target.value)} rows={3} className={`${inputCls} !min-h-[90px]`} /></Field>
            </div>
            <Btn onClick={publish} className="mt-3"><Plus className="w-4 h-4" /> {t('suites.pathshala.notice.publish')}</Btn>
          </Card>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...state.suchanas].reverse().map((n) => (
              <Card key={n.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-bold">{n.title}</div><div className="text-xs text-stone-500 mb-1">{fmtDateEn(n.date)}{n.publishedBy ? ` • ${n.publishedBy}` : ''}</div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{n.body}</p></div>
                  <div className="flex gap-1 no-print shrink-0">
                    <button onClick={() => setPrintNotice(n.id)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" aria-label={t('suites.pathshala.notice.print')}><Printer className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm(t('suites.pathshala.notice.confirmDelete'))) remove('suchanas', n.id); }} className="p-2 rounded-lg bg-red-50 text-red-600" aria-label={t('suites.pathshala.notice.delete')}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {!state.suchanas.length && <Empty text={t('suites.pathshala.notice.noNotices')} />}
        </>
      )}

      {mode === 'homework' && (
        <>
          <Card>
            <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.notice.assignTitle')}</h3>
            <div className="grid sm:grid-cols-4 gap-2">
              <Field label={t('suites.pathshala.notice.fDate')}><input type="date" value={hw.date} onChange={(e) => setHw({ ...hw, date: e.target.value })} className={inputCls} /></Field>
              <Field label={t('suites.pathshala.notice.fVarga')}><select value={hw.vargaId} onChange={(e) => setHw({ ...hw, vargaId: e.target.value, subjectId: '' })} className={inputCls}><option value="">—</option>{state.vargas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
              <Field label={t('suites.pathshala.notice.fSubject')}><select value={hw.subjectId} onChange={(e) => setHw({ ...hw, subjectId: e.target.value })} className={inputCls}><option value="">—</option>{hwSubjects.map((s) => <option key={s.id} value={s.id}>{s.nameBn}</option>)}</select></Field>
              <Field label={t('suites.pathshala.notice.fTask')}><input value={hw.text} onChange={(e) => setHw({ ...hw, text: e.target.value })} className={inputCls} placeholder={t('suites.pathshala.notice.phTask')} /></Field>
            </div>
            <Btn onClick={addHw} className="mt-3"><Plus className="w-4 h-4" /> {t('suites.pathshala.notice.add')}</Btn>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <Field label={t('suites.pathshala.notice.fDate')}><input type="date" value={hwDate} onChange={(e) => setHwDate(e.target.value)} className={`${inputCls} !w-44`} /></Field>
              <Btn variant="ghost" onClick={() => setPrintHw(true)}><Printer className="w-4 h-4" /> {t('suites.pathshala.notice.printAll')}</Btn>
            </div>
            <div className="space-y-3">
              {Object.entries(hwByVarga).map(([vid, list]) => (
                <div key={vid}>
                  <div className="font-bold text-amber-800 mb-1">{vargaName(vid)}</div>
                  {list.map((h) => (
                    <div key={h.id} className="flex items-start justify-between border-b border-stone-100 py-1.5 text-sm">
                      <div><b>{subjName(h.subjectId)}</b> — {h.text}</div>
                      <button onClick={() => remove('homework', h.id)} className="text-red-400 text-xs no-print">{t('suites.pathshala.notice.delete')}</button>
                    </div>
                  ))}
                </div>
              ))}
              {!hwForDate.length && <Empty text={t('suites.pathshala.notice.noHwDate')} />}
            </div>
          </Card>
        </>
      )}

      {printNotice && (() => { const n = state.suchanas.find((x) => x.id === printNotice); return n && (
        <Modal title={t('suites.pathshala.notice.printNoticeTitle')} onClose={() => setPrintNotice(null)} wide>
          <div className="print-area rounded-xl border p-8 text-center" style={{ minHeight: 400 }}>
            <h2 className="font-extrabold text-2xl">{orgName}</h2>
            <p className="text-sm mb-4">॥ {t('suites.pathshala.notice.noticePrintTitle')} ॥</p>
            <h3 className="font-bold text-xl underline mb-3">{n.title}</h3>
            <p className="text-base whitespace-pre-wrap text-left leading-relaxed">{n.body}</p>
            <p className="text-sm mt-4 text-left">{t('suites.pathshala.notice.colDate')}: {fmtDateEn(n.date)}</p>
            <div className="flex justify-between mt-16 text-sm">
              <div><div className="border-t border-black pt-1 px-6">{t('suites.pathshala.notice.colDate')}</div></div>
              <div className="text-center"><div className="border-t border-black pt-1 px-6">{t('suites.pathshala.notice.acharyaSign')}</div><div className="text-xs">({t('suites.pathshala.notice.seal')})</div></div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 no-print"><Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {t('suites.pathshala.notice.print')}</Btn><Btn variant="ghost" onClick={() => setPrintNotice(null)}>{t('suites.pathshala.notice.close')}</Btn></div>
        </Modal>); })()}

      {printHw && (
        <Modal title={t('suites.pathshala.notice.hwPrintTitle')} onClose={() => setPrintHw(false)} wide>
          <div className="print-area rounded-xl border p-5">
            <h2 className="text-center font-extrabold text-xl">{orgName}</h2>
            <p className="text-center text-sm mb-3">॥ {t('suites.pathshala.notice.hwTitle')} — {fmtDateEn(hwDate)} ॥</p>
            {Object.entries(hwByVarga).map(([vid, list]) => (
              <div key={vid} className="mb-3">
                <h3 className="font-bold">{vargaName(vid)}</h3>
                <table><thead><tr><th>{t('suites.pathshala.notice.colSubject')}</th><th>{t('suites.pathshala.notice.colWork')}</th></tr></thead>
                  <tbody>{list.map((h) => <tr key={h.id}><td>{subjName(h.subjectId)}</td><td>{h.text}</td></tr>)}</tbody></table>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 no-print"><Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {t('suites.pathshala.notice.print')}</Btn><Btn variant="ghost" onClick={() => setPrintHw(false)}>{t('suites.pathshala.notice.close')}</Btn></div>
        </Modal>
      )}
    </div>
  );
};
