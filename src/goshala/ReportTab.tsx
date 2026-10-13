import React, { useRef, useState } from 'react';
import { useGoshala } from './goshalaStore';
import { Card, T, Btn, useLocaleText, StatusPill } from './ui';
import { fmtDateEn, inr, downloadJSON } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';

/* Goshala One — Reports: printable animal register, health cards, donor
   statements (A4 print CSS), plus one-click backup / restore. */

type ReportKind = 'register' | 'health' | 'donors';

export const ReportTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll } = useGoshala();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const { activeWorkspace } = useAuthWorkspace();
  const [kind, setKind] = useState<ReportKind>('register');
  const fileRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: string) => state.nandis.find((n) => n.id === id);
  const wsName = (activeWorkspace as any)?.name || 'Goshala';

  const doBackup = () => {
    downloadJSON(`goshala-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(exportJSON()));
    showToast(tr('goshala.rep.backedup', 'Backup downloaded', 'ব্যাকআপ ডাউনলোড', 'बैकअप डाउनलोड'), 'success');
  };

  const doRestore = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const ok = importJSON(String(r.result || ''));
      showToast(ok ? tr('goshala.rep.restored', 'Backup restored', 'ব্যাকআপ পুনরুদ্ধার', 'बैकअप पुनर्स्थापित') : tr('goshala.rep.badfile', 'Invalid backup file', 'অবৈধ ফাইল', 'अमान्य फ़ाइल'), ok ? 'success' : 'error');
    };
    r.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T en="Reports & backup" bn="প্রতিবেদন ও ব্যাকআপ" hi="रिपोर्ट एवं बैकअप" /></h2>
        <LocalOnlyBadge />
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4 no-print">
          {(['register', 'health', 'donors'] as ReportKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-xl px-4 py-2 text-sm font-bold border min-h-[40px] ${kind === k ? 'bg-amber-700 text-amber-50 border-amber-800' : 'bg-white text-stone-600 border-stone-200'}`}>
              {k === 'register' ? tr('goshala.rep.register', 'Animal register', 'পশু নিবন্ধন', 'पशु पंजी') : k === 'health' ? tr('goshala.rep.health', 'Health cards', 'স্বাস্থ্য কার্ড', 'स्वास्थ्य कार्ड') : tr('goshala.rep.donors', 'Donor statements', 'দাতা বিবরণ', 'दाता विवरण')}
            </button>
          ))}
          <Btn variant="ghost" onClick={() => window.print()} className="ml-auto">🖨 {tr('goshala.print', 'Print', 'প্রিন্ট', 'प्रिंट करें')}</Btn>
        </div>

        <div className="print-area rounded-xl">
          <h3 className="text-center font-extrabold text-lg">॥ {wsName} ॥</h3>
          <p className="text-center text-xs text-stone-500 mb-4">
            {kind === 'register' ? tr('goshala.rep.register', 'Animal register', 'পশু নিবন্ধন', 'पशु पंजी') : kind === 'health' ? tr('goshala.rep.health', 'Health cards', 'স্বাস্থ্য কার্ড', 'स्वास्थ्य कार्ड') : tr('goshala.rep.donors', 'Donor statements', 'দাতা বিবরণ', 'दाता विवरण')}
            {' '}· {fmtDateEn(new Date().toISOString().slice(0, 10))}
          </p>

          {kind === 'register' && (
            <table>
              <thead><tr><th>Tag ID</th><th>Name</th><th>Breed</th><th>Age</th><th>Source</th><th>Status</th><th>Since</th></tr></thead>
              <tbody>
                {state.nandis.map((n) => (
                  <tr key={n.id}><td><b>{n.tagId}</b></td><td>{n.name}</td><td>{n.breed}</td><td>{n.ageYears}y</td><td>{n.source}</td><td>{n.status}</td><td>{n.addedDate}</td></tr>
                ))}
              </tbody>
            </table>
          )}

          {kind === 'health' && (
            <div>
              {state.nandis.map((n) => (
                <div key={n.id} style={{ breakInside: 'avoid', marginBottom: 16 }}>
                  <h4><b>{n.name}</b> ({n.tagId}) — {n.breed}</h4>
                  <table>
                    <thead><tr><th>Date</th><th>Kind</th><th>Title</th><th>Vet</th><th>Cost</th><th>Next due</th></tr></thead>
                    <tbody>
                      {state.health.filter((h) => h.nandiId === n.id).sort((a, b) => b.date.localeCompare(a.date)).map((h) => (
                        <tr key={h.id}><td>{h.date}</td><td>{h.kind}</td><td>{h.title}</td><td>{h.vetName || '—'}</td><td>{inr(h.cost)}</td><td>{h.nextDue || '—'}</td>
                      </tr>
                      ))}
                      {state.health.filter((h) => h.nandiId === n.id).length === 0 && <tr><td colSpan={6}>—</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {kind === 'donors' && (
            <table>
              <thead><tr><th>Sponsor</th><th>For</th><th>Plan</th><th>Amount</th><th>Period</th><th>Receipt</th><th>Status</th></tr></thead>
              <tbody>
                {state.sponsorships.map((s) => (
                  <tr key={s.id}><td><b>{s.sponsorName}</b></td><td>{nameOf(s.nandiId || '')?.name || 'General Gau Seva'}</td><td>{s.plan}</td><td>{inr(s.amount)}</td><td>{s.startDate} → {s.endDate}</td><td>{s.receiptNo || '—'}</td><td>{s.status}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2"><T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप एवं पुनर्स्थापना" /></h3>
        <p className="text-xs text-stone-500 mb-3"><T en="Records live on this device. Download a backup regularly; restore it on any device." bn="রেকর্ড এই ডিভাইসে থাকে। নিয়মিত ব্যাকআপ নিন।" hi="रिकॉर्ड इस डिवाइस पर रहते हैं। नियमित बैकअप लें।" /></p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={doBackup}>⬇ {tr('goshala.rep.backup', 'Download backup', 'ব্যাকআপ নিন', 'बैकअप लें')}</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>⬆ {tr('goshala.rep.restore', 'Restore backup', 'পুনরুদ্ধার', 'पुनर्स्थापित करें')}</Btn>
          <Btn variant="danger" onClick={() => { if (confirm(tr('goshala.rep.resetq', 'Reset to demo data? Your records will be replaced.', 'ডেমো ডেটায় ফিরবেন?', 'डेमो डेटा पर लौटें?'))) { resetAll(); showToast(tr('goshala.rep.reset', 'Reset done', 'রিসেট সম্পন্ন', 'रीसेट पूर्ण'), 'success'); } }}>{tr('goshala.rep.resetb', 'Reset demo', 'ডেমো রিসেট', 'डेमो रीसेट')}</Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = ''; }} />
        </div>
      </Card>
    </div>
  );
};
