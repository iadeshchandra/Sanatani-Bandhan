import React, { useRef, useState } from 'react';
import { useAshram, todayISO, roomLoadOn, eachDate } from './ashramStore';
import { Card, Btn, Field, inputCls, T, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Ashram One — reports & data safety: printable daily occupancy
 * report, printable guest register (the legal register), CSV export
 * of stays, JSON backup/restore, and one-tap retry for stay donations
 * whose treasury posting failed while offline. */

export const ReportsTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll, update } = useAshram();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const { activeWorkspace } = useAuthWorkspace();
  const { addTreasuryTransaction } = useData();
  const [report, setReport] = useState<'occupancy' | 'register' | null>(null);
  const [reportDate, setReportDate] = useState(todayISO());
  const fileRef = useRef<HTMLInputElement>(null);

  const doPrint = () => window.print();

  const csv = () => {
    const rows = [
      ['guestName', 'phone', 'idType', 'idNumber', 'purpose', 'partySize', 'room', 'checkIn', 'expectedCheckout', 'checkoutAt', 'status', 'suggestedTotal', 'actualDonation', 'receiptNo', 'treasury'],
    ];
    for (const s of state.stays) {
      rows.push([
        s.guestName, s.phone, s.idType || '', s.idNumber || '', s.purpose || '', String(s.partySize),
        state.rooms.find((r) => r.id === s.roomId)?.number || '', s.checkIn, s.expectedCheckout,
        s.checkoutAt || '', s.status, String(s.suggestedTotal), String(s.actualDonation ?? ''),
        s.receiptNo || '', s.treasuryTxId ? 'posted' : 'local',
      ]);
    }
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ashram-stays-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const backup = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ashram-one-backup-${activeWorkspace.id}-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(tr('ashram.rep.backupOk', 'Backup downloaded.', 'ব্যাকআপ ডাউনলোড।', 'बैकअप डाउनलोड।'), 'success');
  };

  const restore = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      const ok = importJSON(String(rd.result || ''));
      showToast(
        ok ? tr('ashram.rep.restoreOk', 'Backup restored.', 'পুনরুদ্ধার সম্পন্ন।', 'पुनर्स्थापित।')
           : tr('ashram.rep.restoreBad', 'Invalid backup file.', 'ভুল ফাইল।', 'अमान्य फ़ाइल।'),
        ok ? 'success' : 'error',
      );
    };
    rd.readAsText(file);
  };

  const retryTreasury = (stayId: string) => {
    const s = state.stays.find((x) => x.id === stayId);
    if (!s || s.treasuryTxId) return;
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(), type: 'Income',
      category: 'Yatri Stay (Donation)', subcategory: 'Ashram One — Stay donation (retry)',
      amount: s.actualDonation || 0, handledBy: 'Ashram Karyalaya',
      paymentMode: s.paymentMode || 'Cash', referenceNo: s.receiptNo || `STAY-retry-${s.id.slice(-6)}`,
      purpose: `Stay donation (retry) — ${s.guestName} (${s.receiptNo || s.id}). Not 80G-eligible (accommodation).`,
      is80GEligible: false, taxReceiptIssued: false, devoteeName: s.guestName,
    });
    if (ok) {
      update('stays', s.id, { treasuryTxId: 'posted' });
      showToast(tr('ashram.rep.retryOk', 'Posted to treasury.', 'ট্রেজারিতে পোস্ট।', 'ट्रेजरी में पोस्ट।'), 'success');
    } else {
      showToast(tr('ashram.rep.retryFail', 'Still offline — will keep locally.', 'এখনও অফলাইন।', 'अभी भी ऑफ़लाइन।'), 'warning');
    }
  };

  const failedPosts = state.stays.filter((s) => s.status === 'checked-out' && !s.treasuryTxId && (s.actualDonation || 0) > 0);

  const occRows = eachDate(reportDate, (() => { const d = new Date(reportDate + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })())
    .flatMap((d) => state.rooms.filter((r) => r.status !== 'maintenance').map((r) => ({ d, r, load: roomLoadOn(r, d, state) })));

  const regStays = state.stays
    .filter((s) => s.checkIn.slice(0, 10) === reportDate || (s.status === 'checked-in'))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <div className="space-y-4">
      {failedPosts.length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <h4 className="font-bold text-red-900 mb-2">
            ⚠ {tr('ashram.rep.failed', 'Treasury postings pending', 'ট্রেজারি বাকি', 'ट्रेजरी बकाया')} ({failedPosts.length})
          </h4>
          <ul className="space-y-2">
            {failedPosts.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{s.guestName} · ₹{(s.actualDonation || 0).toLocaleString('en-IN')} · {s.receiptNo}</span>
                <Btn className="!py-1.5 !min-h-0 text-xs" onClick={() => retryTreasury(s.id)}>
                  {tr('ashram.rep.retry', 'Retry posting', 'পুনরায়', 'पुनः प्रयास')}
                </Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3 no-print">
        <Card>
          <h4 className="font-bold text-stone-800 mb-2"><T en="Daily occupancy report" bn="দৈনিক দখল প্রতিবেদন" hi="दैनिक अधिभोग रिपोर्ट" /></h4>
          <div className="flex gap-2">
            <input type="date" className={inputCls} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            <Btn onClick={() => { setReport('occupancy'); setTimeout(doPrint, 150); }}>
              {tr('ashram.rep.print', 'Print', 'ছাপুন', 'प्रिंट')}
            </Btn>
          </div>
        </Card>
        <Card>
          <h4 className="font-bold text-stone-800 mb-2"><T en="Guest register (legal)" bn="অতিথি নথি" hi="अतिथि पंजी" /></h4>
          <div className="flex gap-2">
            <input type="date" className={inputCls} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            <Btn onClick={() => { setReport('register'); setTimeout(doPrint, 150); }}>
              {tr('ashram.rep.print', 'Print', 'ছাপুন', 'प्रिंट')}
            </Btn>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            🔒 {tr('ashram.rep.regNote', 'Includes ID details — print and keep securely, as required by local law.', 'পরিচয় বিবরণসহ।', 'पहचान विवरण सहित।')}
          </p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 no-print">
        <Card>
          <h4 className="font-bold text-stone-800 mb-2 text-sm"><T en="Export stays (CSV)" bn="CSV রপ্তানি" hi="CSV निर्यात" /></h4>
          <Btn variant="ghost" className="w-full" onClick={csv}>{tr('ashram.rep.csv', 'Download CSV', 'CSV ডাউনলোড', 'CSV डाउनलोड')}</Btn>
        </Card>
        <Card>
          <h4 className="font-bold text-stone-800 mb-2 text-sm"><T en="Backup / restore" bn="ব্যাকআপ" hi="बैकअप" /></h4>
          <div className="flex gap-2">
            <Btn variant="ghost" className="flex-1" onClick={backup}>{tr('ashram.rep.backup', 'Backup', 'ব্যাকআপ', 'बैकअप')}</Btn>
            <Btn variant="ghost" className="flex-1" onClick={() => fileRef.current?.click()}>{tr('ashram.rep.restore', 'Restore', 'পুনরুদ্ধার', 'पुनर्स्थापित')}</Btn>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
          </div>
        </Card>
        <Card>
          <h4 className="font-bold text-stone-800 mb-2 text-sm"><T en="Reset demo data" bn="রিসেট" hi="रीसेट" /></h4>
          <Btn variant="danger" className="w-full" onClick={() => { if (window.confirm(tr('ashram.rep.resetQ', 'Reset all Ashram One data to demo seed?', 'রিসেট করবেন?', 'रीसेट करें?'))) { resetAll(); showToast(tr('ashram.rep.resetOk', 'Data reset.', 'রিসেট।', 'रीसेट।'), 'success'); } }}>
            {tr('ashram.rep.reset', 'Reset', 'রিসেট', 'रीसेट')}
          </Btn>
        </Card>
      </div>

      {/* ---------- printable: occupancy ---------- */}
      {report === 'occupancy' && (
        <div className="ashram-report bg-white rounded-2xl border border-stone-200 p-6">
          <h1>{tr('ashram.rep.occTitle', 'Daily Occupancy Report', 'দৈনিক দখল প্রতিবেদন', 'दैनिक अधिभोग रिपोर्ट')}</h1>
          <p className="meta">{activeWorkspace.name} · {reportDate}</p>
          <h2>{tr('ashram.rep.roomWise', 'Room-wise occupancy', 'কক্ষভিত্তিক', 'कमवार')}</h2>
          <table>
            <thead><tr><th>{tr('ashram.rep.room', 'Room', 'কক্ষ', 'कमरा')}</th><th>{tr('ashram.rep.type', 'Type', 'ধরন', 'प्रकार')}</th><th>{tr('ashram.rep.used', 'Used', 'ব্যবহৃত', 'प्रयुक्त')}</th><th>{tr('ashram.rep.cap', 'Capacity', 'ধারণ', 'क्षमता')}</th><th>{tr('ashram.rep.guests', 'Guests', 'অতিথি', 'अतिथि')}</th></tr></thead>
            <tbody>
              {occRows.map(({ r, load }) => (
                <tr key={r.id}>
                  <td>{r.number}</td><td>{r.type}</td>
                  <td>{load.used > 0 ? '✓' : '—'}</td><td>{r.capacity}</td>
                  <td>{load.by.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sig"><span>{tr('ashram.rep.prepared', 'Prepared by', 'প্রস্তুতকারী', 'तैयारकर्ता')}: ______________</span><span>{tr('ashram.rep.verified', 'Verified by', 'যাচাইকারী', 'सत्यापनकर्ता')}: ______________</span></div>
        </div>
      )}

      {/* ---------- printable: guest register ---------- */}
      {report === 'register' && (
        <div className="ashram-report bg-white rounded-2xl border border-stone-200 p-6">
          <h1>{tr('ashram.rep.regTitle', 'Guest Register', 'অতিথি নথি', 'अतिथि पंजी')}</h1>
          <p className="meta">{activeWorkspace.name} · {reportDate} · {tr('ashram.rep.regSub', 'In-house guests', 'ভিতরের অতিথি', 'अंदर के अतिथि')}</p>
          <table>
            <thead><tr>
              <th>#</th><th>{tr('ashram.rep.guest', 'Guest', 'অতিথি', 'अतिथि')}</th>
              <th>{tr('ashram.rep.phone', 'Phone', 'ফোন', 'फोन')}</th>
              <th>{tr('ashram.rep.idp', 'ID proof', 'পরিচয়', 'पहचान')}</th>
              <th>{tr('ashram.rep.room', 'Room', 'কক্ষ', 'कमरा')}</th>
              <th>{tr('ashram.rep.in', 'Check-in', 'আগমন', 'आगमन')}</th>
              <th>{tr('ashram.rep.purpose', 'Purpose', 'উদ্দেশ্য', 'उद्देश्य')}</th>
            </tr></thead>
            <tbody>
              {regStays.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td><td>{s.guestName}</td><td>{s.phone}</td>
                  <td>{s.idType ? `${s.idType}: ${s.idNumber || ''}` : '—'}</td>
                  <td>{state.rooms.find((r) => r.id === s.roomId)?.number}</td>
                  <td>{s.checkIn.slice(0, 16).replace('T', ' ')}</td>
                  <td>{s.purpose || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="meta" style={{ marginTop: 10 }}>
            {tr('ashram.rep.nightsNote', 'Nights are computed checkout-exclusive. ID details are device-local and appear only on this printed register.', '…', '…')}
          </p>
          <div className="sig"><span>{tr('ashram.rep.prepared', 'Prepared by', 'প্রস্তুতকারী', 'तैयारकर्ता')}: ______________</span><span>{tr('ashram.rep.verified', 'Verified by', 'যাচাইকারী', 'सत्यापनकर्ता')}: ______________</span></div>
        </div>
      )}
    </div>
  );
};
