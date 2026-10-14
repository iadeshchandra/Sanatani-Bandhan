import React, { useState } from 'react';
import { useSabha, duesCollected, duesDefaulters, welfareBalance, thisYear, activeMembers } from './sabhaStore';
import { SPEC_LABEL } from './types';
import { T, Card, Btn, fmtDate, inr } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Reports — printable sabha summary, member directory, dues defaulter */
/* list, welfare statement, CSV exports, JSON backup/restore.         */
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
  const { state, exportJSON, importJSON, resetAll } = useSabha();
  const { showToast } = useToast();
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const yr = thisYear();
  const members = activeMembers(state);

  const memberRows = [['Name', 'Phone', 'Specializations', 'Experience (yrs)', 'Tier', 'Join date', 'Active']];
  members.forEach((m) => {
    memberRows.push([m.name, m.phone || '', m.specializations.map((s) => SPEC_LABEL[s]).join('; '), m.experienceYears !== undefined ? String(m.experienceYears) : '', m.verificationTier, m.joinDate, m.active ? 'yes' : 'no']);
  });

  const duesRows = [['Year', 'Member', 'Amount', 'Receipt', 'Date', 'Posted']];
  [...state.dues].sort((a, b) => b.createdAt - a.createdAt).forEach((d) => {
    const who = state.members.find((m) => m.id === d.memberId)?.name || '';
    duesRows.push([String(d.year), who, String(d.amount), d.receiptNo, d.date, d.treasuryTxId ? 'yes' : 'no']);
  });

  const welfareRows = [['Date', 'Kind', 'Member', 'Amount', 'Purpose', 'Approved by', 'Posted']];
  [...state.welfare].sort((a, b) => b.createdAt - a.createdAt).forEach((w) => {
    const who = w.memberId ? (state.members.find((m) => m.id === w.memberId)?.name || '') : '';
    welfareRows.push([w.date, w.kind, who, String(w.amount), w.purpose || '', w.approvedBy || '', w.treasuryTxId ? 'yes' : 'no']);
  });

  const doPrint = () => window.print();

  const doImport = () => {
    if (importJSON(importText)) { showToast('Backup restored.', 'success'); setImporting(false); setImportText(''); }
    else showToast('Could not read that backup file.', 'error');
  };

  const defaulters = duesDefaulters(state, yr);

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm font-bold text-stone-700 mb-3">
          <T en="Printable sabha summary" bn="মুদ্রণযোগ্য সভা সারাংশ" hi="मुद्रण योग्य सभा सारांश" />
        </div>
        <div className="print-report text-sm space-y-3">
          <div className="font-extrabold text-lg text-stone-800">
            {state.settings.sabhaName || 'Purohit Sabha'} — <T en="Summary" bn="সারাংশ" hi="सारांश" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><T en="Active members" bn="সক্রিয় সদস্য" hi="सक्रिय सदस्य" />: <b>{members.length}</b></div>
            <div><T en={`Dues collected · ${yr}`} bn={`${yr} চাঁদা`} hi={`${yr} शुल्क`} />: <b>{inr(duesCollected(state, yr))}</b> ({defaulters.length} <T en="pending" bn="বকেয়া" hi="बकाया" />)</div>
            <div><T en="Welfare balance" bn="কল্যাণ ব্যালেন্স" hi="कल्याण शेष" />: <b>{inr(welfareBalance(state))}</b></div>
            <div><T en="Trainings" bn="প্রশিক্ষণ" hi="प्रशिक्षण" />: <b>{state.trainings.length}</b> · <T en="Duties" bn="দায়িত্ব" hi="कर्तव्य" />: <b>{state.duties.length}</b></div>
          </div>
          <div>
            <div className="font-bold text-stone-700 mb-1"><T en={`Dues defaulters · ${yr}`} bn={`${yr} চাঁদা বকেয়া`} hi={`${yr} शुल्क बकाया`} /></div>
            {defaulters.length === 0
              ? <div className="text-xs text-emerald-700">✓ <T en="All members paid." bn="সব সদস্য পরিশোধ করেছেন।" hi="सभी सदस्यों ने भुगतान किया।" /></div>
              : <div className="text-xs text-stone-600">{defaulters.map((m) => m.name).join(', ')}</div>}
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
          <Btn variant="ghost" onClick={() => download('sabha-members.csv', csv(memberRows))}>
            <T en="Members CSV" bn="সদস্য CSV" hi="सदस्य CSV" />
          </Btn>
          <Btn variant="ghost" onClick={() => download('sabha-dues.csv', csv(duesRows))}>
            <T en="Dues CSV" bn="চাঁদা CSV" hi="शुल्क CSV" />
          </Btn>
          <Btn variant="ghost" onClick={() => download('sabha-welfare.csv', csv(welfareRows))}>
            <T en="Welfare CSV" bn="কল্যাণ CSV" hi="कल्याण CSV" />
          </Btn>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-bold text-stone-700 mb-3">
          <T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप व पुनर्स्थापना" />
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => download('sabha-backup.json', exportJSON(), 'application/json')}>
            <T en="Download backup" bn="ব্যাকআপ ডাউনলোড" hi="बैकअप डाउनलोड करें" />
          </Btn>
          <Btn variant="ghost" onClick={() => setImporting((v) => !v)}>
            <T en="Restore backup" bn="ব্যাকআপ পুনরুদ্ধার" hi="बैकअप पुनर्स्थापित करें" />
          </Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm('Reset all sabha data to the seed?')) { resetAll(); showToast('Reset to seed.', 'info'); } }}>
            <T en="Reset" bn="রিসেট" hi="रीसेट" />
          </Btn>
        </div>
        {importing && (
          <div className="mt-3">
            <textarea
              className="w-full h-32 rounded-xl border border-stone-200 p-2 text-xs font-mono"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste backup JSON…"
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
