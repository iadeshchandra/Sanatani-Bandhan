import React, { useState } from 'react';
import { useMatha, displayName, todaysDinacharya } from './mathaStore';
import { T, Card, Btn, Field, inputCls, inr, fmtDate, fmtTime, fmtMonthDay } from './ui';
import { useToast } from '../context/ToastContext';

/* Matha One — reports: printable registry, CSV exports, backup/restore. */

const csv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

const download = (name: string, text: string, type = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

export const ReportsTab: React.FC = () => {
  const { state, exportJSON, importJSON, resetAll } = useMatha();
  const { showToast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [printing, setPrinting] = useState(false);

  const doPrint = () => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 150); };

  const guruName = (id?: string) => {
    if (!id) return '';
    const g = state.sannyasis.find((s) => s.id === id);
    return g ? displayName(g) : '';
  };

  const exportSannyasis = () => {
    const rows = [['Sannyas name', 'Poorvashram name', 'Diksha date', 'Diksha guru', 'Parampara', 'Role', 'Status']];
    for (const s of state.sannyasis) {
      rows.push([s.sannyasName, s.poorvashramName, s.dikshaDate || '', guruName(s.dikshaGuruId), s.parampara, s.role, s.status]);
    }
    download('matha-sannyasis.csv', csv(rows));
    showToast('Sannyasi registry exported.', 'success');
  };

  const exportStudents = () => {
    const rows = [['Name', 'Age', 'Guru', 'Subjects', 'Join date', 'Status', 'Progress notes']];
    for (const s of state.students) {
      rows.push([s.name, s.age || '', guruName(s.guruId), s.subjects, s.joinDate, s.status, s.progressNotes || '']);
    }
    download('matha-gurukul.csv', csv(rows));
    showToast('Gurukul register exported.', 'success');
  };

  const exportDakshina = () => {
    const rows = [['Date', 'Donor', 'Amount (INR)', 'Purpose', 'Payment mode', 'Posted to treasury']];
    for (const d of state.dakshina) {
      rows.push([d.date, d.donorName, String(d.amount), d.purpose, d.paymentMode, d.treasuryTxId ? 'yes' : 'no']);
    }
    download('matha-dakshina.csv', csv(rows));
    showToast('Dakshina log exported.', 'success');
  };

  return (
    <div className="space-y-4">
      <Card className={printing ? 'print-report' : ''}>
        <h2 className="text-lg font-extrabold text-stone-800 mb-1">
          <T en="Matha register (printable)" bn="মঠ রেজিস্টার (প্রিন্টযোগ্য)" hi="मठ रजिस्टर (मुद्रण योग्य)" />
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          <T en="The matha's own internal record — print for the office file." bn="মঠের নিজস্ব অভ্যন্তরীণ রেকর্ড — অফিস ফাইলের জন্য প্রিন্ট করুন।" hi="मठ का अपना आंतरिक रिकॉर्ड — कार्यालय फाइल हेतु प्रिंट करें।" />
        </p>

        <h3 className="font-bold text-stone-700 text-sm mt-4 mb-2"><T en="Sannyasi registry" bn="সন্ন্যাসী রেজিস্টার" hi="संन्यासी रजिस्टर" /></h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-2"><T en="Name" bn="নাম" hi="नाम" /></th>
              <th className="py-1.5 pr-2"><T en="Diksha guru" bn="দীক্ষা গুরু" hi="दीक्षा गुरु" /></th>
              <th className="py-1.5 pr-2"><T en="Parampara" bn="পরম্পরা" hi="परंपरा" /></th>
              <th className="py-1.5 pr-2"><T en="Role" bn="ভূমিকা" hi="भूमिका" /></th>
            </tr>
          </thead>
          <tbody>
            {state.sannyasis.map((s) => (
              <tr key={s.id} className="border-b border-stone-100">
                <td className="py-1.5 pr-2 font-semibold">{displayName(s)}</td>
                <td className="py-1.5 pr-2">{guruName(s.dikshaGuruId) || '—'}</td>
                <td className="py-1.5 pr-2">{s.parampara || '—'}</td>
                <td className="py-1.5 pr-2">{s.role}</td>
              </tr>
            ))}
            {state.sannyasis.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-stone-400"><T en="No records yet." bn="এখনও রেকর্ড নেই।" hi="अभी कोई रिकॉर्ड नहीं।" /></td></tr>
            )}
          </tbody>
        </table>

        <h3 className="font-bold text-stone-700 text-sm mt-5 mb-2"><T en="Today's dinacharya" bn="আজকের দিনচর্যা" hi="आज की दिनचर्या" /></h3>
        <table className="w-full text-xs">
          <tbody>
            {todaysDinacharya(state).map((d) => (
              <tr key={d.id} className="border-b border-stone-100">
                <td className="py-1.5 pr-2 font-mono font-bold w-24">{fmtTime(d.time)}</td>
                <td className="py-1.5 pr-2">{d.activity}</td>
              </tr>
            ))}
            {todaysDinacharya(state).length === 0 && (
              <tr><td className="py-3 text-stone-400"><T en="No routine set." bn="রুটিন নেই।" hi="कोई दिनचर्या नहीं।" /></td></tr>
            )}
          </tbody>
        </table>

        <h3 className="font-bold text-stone-700 text-sm mt-5 mb-2"><T en="Dakshina log" bn="দক্ষিণা লগ" hi="दक्षिणा लॉग" /></h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-2"><T en="Date" bn="তারিখ" hi="तिथि" /></th>
              <th className="py-1.5 pr-2"><T en="Donor" bn="দাতা" hi="दाता" /></th>
              <th className="py-1.5 pr-2"><T en="Purpose" bn="উদ্দেশ্য" hi="उद्देश्य" /></th>
              <th className="py-1.5 pr-2 text-right"><T en="Amount" bn="টাকা" hi="राशि" /></th>
            </tr>
          </thead>
          <tbody>
            {state.dakshina.map((d) => (
              <tr key={d.id} className="border-b border-stone-100">
                <td className="py-1.5 pr-2">{fmtDate(d.date)}</td>
                <td className="py-1.5 pr-2 font-semibold">{d.donorName}</td>
                <td className="py-1.5 pr-2">{d.purpose.replace(/-/g, ' ')}</td>
                <td className="py-1.5 pr-2 text-right font-bold">{inr(d.amount)}</td>
              </tr>
            ))}
            {state.dakshina.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-stone-400"><T en="No dakshina recorded." bn="দক্ষিণা নথিভুক্ত নেই।" hi="कोई दक्षिणा दर्ज नहीं।" /></td></tr>
            )}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-2 mt-5 no-print">
          <Btn variant="ghost" onClick={doPrint}>🖨️ <T en="Print register" bn="রেজিস্টার প্রিন্ট" hi="रजिस्टर प्रिंट करें" /></Btn>
          <Btn variant="ghost" onClick={exportSannyasis}><T en="Sannyasis CSV" bn="সন্ন্যাসী CSV" hi="संन्यासी CSV" /></Btn>
          <Btn variant="ghost" onClick={exportStudents}><T en="Gurukul CSV" bn="গুরুকুল CSV" hi="गुरुकुल CSV" /></Btn>
          <Btn variant="ghost" onClick={exportDakshina}><T en="Dakshina CSV" bn="দক্ষিণা CSV" hi="दक्षिणा CSV" /></Btn>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold text-stone-800 mb-3">
          <T en="Backup & restore" bn="ব্যাকআপ ও পুনরুদ্ধার" hi="बैकअप व पुनर्स्थापना" />
        </h2>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => { download(`matha-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), 'application/json'); showToast('Backup downloaded.', 'success'); }}>
            ⬇️ <T en="Download backup" bn="ব্যাকআপ ডাউনলোড" hi="बैकअप डाउनलोड करें" />
          </Btn>
          <Btn variant="ghost" onClick={() => setRestoring((v) => !v)}>
            ⬆️ <T en="Restore from backup" bn="ব্যাকআপ থেকে পুনরুদ্ধার" hi="बैकअप से पुनर्स्थापित करें" />
          </Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm('Reset all Matha One data on this device?')) { resetAll(); showToast('Reset to seed data.', 'info'); } }}>
            <T en="Reset" bn="রিসেট" hi="रीसेट" />
          </Btn>
        </div>
        {restoring && (
          <div className="mt-3">
            <Field label={<T en="Paste backup JSON" bn="ব্যাকআপ JSON পেস্ট করুন" hi="बैकअप JSON पेस्ट करें" />}>
              <textarea className={inputCls} rows={5} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
            </Field>
            <div className="flex gap-2 mt-2">
              <Btn onClick={() => {
                if (importJSON(restoreText)) { showToast('Backup restored.', 'success'); setRestoring(false); setRestoreText(''); }
                else showToast('Invalid backup file.', 'error');
              }}>
                <T en="Restore" bn="পুনরুদ্ধার" hi="पुनर्स्थापित करें" />
              </Btn>
              <Btn variant="ghost" onClick={() => setRestoring(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
