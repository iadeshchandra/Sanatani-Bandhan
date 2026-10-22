import React, { useState } from 'react';
import { useSatsang, fundBalance, attendancePct, presentCount } from './satsangStore';
import { T, Card, Btn, fmtDate, fmtTime } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* ------------------------------------------------------------------ */
/* Reports — printable member list, gathering summary, fund statement, */
/* CSV exports, JSON backup/restore.                                  */
/* ------------------------------------------------------------------ */

const csv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

const download = (name: string, text: string, mime = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

export const ReportsTab: React.FC = () => {
  const inr = useInr();
  const { state, exportJSON, importJSON, resetAll } = useSatsang();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');

  const memberRows = [['Name', 'Phone', 'Role', 'Join date', 'Active', 'Attendance %']];
  state.members.forEach((m) => {
    const p = attendancePct(state, m.id);
    memberRows.push([m.name, m.phone || '', m.role, m.joinDate, m.active ? 'yes' : 'no', p === null ? '—' : `${p}%`]);
  });

  const gatheringRows = [['Date', 'Time', 'Venue', 'Host', 'Theme', 'Status', 'Present']];
  [...state.gatherings].sort((a, b) => a.date.localeCompare(b.date)).forEach((g) => {
    const host = g.hostId ? (state.members.find((m) => m.id === g.hostId)?.name || '') : '';
    gatheringRows.push([g.date, g.time, g.venue, host, g.theme || '', g.status, String(presentCount(state, g.id))]);
  });

  const fundRows = [['Date', 'Kind', 'Member', 'Amount', 'Note', 'Posted']];
  [...state.fund].sort((a, b) => a.date.localeCompare(b.date)).forEach((f) => {
    const who = f.memberId ? (state.members.find((m) => m.id === f.memberId)?.name || '') : '';
    fundRows.push([f.date, f.kind, who, String(f.amount), f.note || '', f.treasuryTxId ? 'yes' : 'no']);
  });

  const doPrint = () => window.print();

  const doImport = () => {
    if (importJSON(importText)) { showToast(t('suites.satsang.reports.toastRestored'), 'success'); setImporting(false); setImportText(''); }
    else showToast(t('suites.satsang.reports.toastInvalidBackup'), 'error');
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm font-bold text-stone-700 mb-3">
          <T en="Printable mandali summary" bn="মুদ্রণযোগ্য মণ্ডলী সারাংশ" hi="मुद्रण योग्य मंडली सारांश" />
        </div>
        <div className="print-report text-sm space-y-3">
          <div className="font-extrabold text-lg text-stone-800">
            {state.settings.mandaliName || 'Satsang Mandali'} — <T en="Summary" bn="সারাংশ" hi="सारांश" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><T en="Members" bn="সদস্য" hi="सदस्य" />: <b>{state.members.length}</b> ({state.members.filter((m) => m.active).length} <T en="active" bn="সক্রিয়" hi="सक्रिय" />)</div>
            <div><T en="Gatherings" bn="সমাবেশ" hi="सभाएं" />: <b>{state.gatherings.length}</b></div>
            <div><T en="Bhajans in repertoire" bn="ভজন সংগ্রহে" hi="भजन संग्रह में" />: <b>{state.bhajans.length}</b></div>
            <div><T en="Fund balance" bn="তহবিল ব্যালেন্স" hi="निधि शेष" />: <b>{inr(fundBalance(state))}</b></div>
          </div>
          <div>
            <div className="font-bold text-stone-700 mb-1"><T en="Recent gatherings" bn="সাম্প্রতিক সমাবেশ" hi="हाल की सभाएं" /></div>
            {[...state.gatherings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((g) => (
              <div key={g.id} className="text-xs py-1 border-b border-stone-100">
                {fmtDate(g.date)} · {fmtTime(g.time)} · {g.venue} · {g.status} · {presentCount(state, g.id)} <T en="present" bn="উপস্থিত" hi="उपस्थित" />
              </div>
            ))}
            {state.gatherings.length === 0 && <div className="text-xs text-stone-400">—</div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 no-print">
          <Btn onClick={doPrint}>🖨️ <T en="Print" bn="প্রিন্ট" hi="प्रिंट" /></Btn>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-bold text-stone-700 mb-3">
          <T en="CSV exports" bn="CSV রপ্তানি" hi="CSV निर्यात" />
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => download('satsang-members.csv', csv(memberRows))}>
            <T en="Members CSV" bn="সদস্য CSV" hi="सदस्य CSV" />
          </Btn>
          <Btn variant="ghost" onClick={() => download('satsang-gatherings.csv', csv(gatheringRows))}>
            <T en="Gatherings CSV" bn="সমাবেশ CSV" hi="सभाएं CSV" />
          </Btn>
          <Btn variant="ghost" onClick={() => download('satsang-fund.csv', csv(fundRows))}>
            <T en="Fund CSV" bn="তহবিল CSV" hi="निधि CSV" />
          </Btn>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-bold text-stone-700 mb-3">
          <T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप व पुनर्स्थापना" />
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => download('satsang-backup.json', exportJSON(), 'application/json')}>
            <T en="Download backup" bn="ব্যাকআপ ডাউনলোড" hi="बैकअप डाउनलोड करें" />
          </Btn>
          <Btn variant="ghost" onClick={() => setImporting((v) => !v)}>
            <T en="Restore backup" bn="ব্যাকআপ পুনরুদ্ধার" hi="बैकअप पुनर्स्थापित करें" />
          </Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm(t('suites.satsang.reports.confirmReset'))) { resetAll(); showToast(t('suites.satsang.reports.toastReset'), 'info'); } }}>
            <T en="Reset" bn="রিসেট" hi="रीसेट" />
          </Btn>
        </div>
        {importing && (
          <div className="mt-3">
            <textarea
              className="w-full h-32 rounded-xl border border-stone-200 p-2 text-xs font-mono"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t('suites.satsang.reports.phPasteBackup')}
            />
            <div className="flex gap-2 mt-2">
              <Btn onClick={doImport}><T en="Restore" bn="পুনরুদ্ধার" hi="पुनर्स्थापित करें" /></Btn>
              <Btn variant="ghost" onClick={() => setImporting(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
