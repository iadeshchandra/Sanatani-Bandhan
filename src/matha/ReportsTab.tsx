import React, { useState } from 'react';
import { useMatha, displayName, todaysDinacharya } from './mathaStore';
import { Card, Btn, Field, inputCls, fmtDate, fmtTime, fmtMonthDay } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

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
  const inr = useInr();
  const { state, exportJSON, importJSON, resetAll } = useMatha();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [restoring, setRestoring] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [printing, setPrinting] = useState(false);

  const doPrint = () => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 150); };

  const roleLabel = (r: string) => {
    const key = `suites.matha.common.roles.${r}`;
    const hit = t(key);
    return hit === key ? r : hit;
  };

  const purposeLabel = (p: string) => {
    const map: Record<string, string> = {
      'guru-dakshina': t('suites.matha.dakshina.purposeGuruDakshina'),
      'general-donation': t('suites.matha.dakshina.purposeGeneralDonation'),
      'annadana': t('suites.matha.dakshina.purposeAnnadana'),
      'other': t('suites.matha.dakshina.purposeOther'),
    };
    return map[p] || p.replace(/-/g, ' ');
  };

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
    showToast(t('suites.matha.reports.toastExportSannyasis'), 'success');
  };

  const exportStudents = () => {
    const rows = [['Name', 'Age', 'Guru', 'Subjects', 'Join date', 'Status', 'Progress notes']];
    for (const s of state.students) {
      rows.push([s.name, s.age || '', guruName(s.guruId), s.subjects, s.joinDate, s.status, s.progressNotes || '']);
    }
    download('matha-gurukul.csv', csv(rows));
    showToast(t('suites.matha.reports.toastExportStudents'), 'success');
  };

  const exportDakshina = () => {
    const rows = [['Date', 'Donor', 'Amount (INR)', 'Purpose', 'Payment mode', 'Posted to treasury']];
    for (const d of state.dakshina) {
      rows.push([d.date, d.donorName, String(d.amount), d.purpose, d.paymentMode, d.treasuryTxId ? 'yes' : 'no']);
    }
    download('matha-dakshina.csv', csv(rows));
    showToast(t('suites.matha.reports.toastExportDakshina'), 'success');
  };

  return (
    <div className="space-y-4">
      <Card className={printing ? 'print-report' : ''}>
        <h2 className="text-lg font-extrabold text-stone-800 mb-1">
          {t('suites.matha.reports.title')}
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          {t('suites.matha.reports.description')}
        </p>

        <h3 className="font-bold text-stone-700 text-sm mt-4 mb-2">{t('suites.matha.reports.sannyasiRegistry')}</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-2">{t('suites.matha.common.name')}</th>
              <th className="py-1.5 pr-2">{t('suites.matha.sannyasi.dikshaGuru')}</th>
              <th className="py-1.5 pr-2">{t('suites.matha.sannyasi.parampara')}</th>
              <th className="py-1.5 pr-2">{t('suites.matha.common.role')}</th>
            </tr>
          </thead>
          <tbody>
            {state.sannyasis.map((s) => (
              <tr key={s.id} className="border-b border-stone-100">
                <td className="py-1.5 pr-2 font-semibold">{displayName(s)}</td>
                <td className="py-1.5 pr-2">{guruName(s.dikshaGuruId) || '—'}</td>
                <td className="py-1.5 pr-2">{s.parampara || '—'}</td>
                <td className="py-1.5 pr-2">{roleLabel(s.role)}</td>
              </tr>
            ))}
            {state.sannyasis.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-stone-400">{t('suites.matha.common.noRecords')}</td></tr>
            )}
          </tbody>
        </table>

        <h3 className="font-bold text-stone-700 text-sm mt-5 mb-2">{t('suites.matha.reports.todaysDinacharya')}</h3>
        <table className="w-full text-xs">
          <tbody>
            {todaysDinacharya(state).map((d) => (
              <tr key={d.id} className="border-b border-stone-100">
                <td className="py-1.5 pr-2 font-mono font-bold w-24">{fmtTime(d.time)}</td>
                <td className="py-1.5 pr-2">{d.activity}</td>
              </tr>
            ))}
            {todaysDinacharya(state).length === 0 && (
              <tr><td className="py-3 text-stone-400">{t('suites.matha.reports.noRoutine')}</td></tr>
            )}
          </tbody>
        </table>

        <h3 className="font-bold text-stone-700 text-sm mt-5 mb-2">{t('suites.matha.reports.dakshinaLog')}</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-2">{t('suites.matha.common.date')}</th>
              <th className="py-1.5 pr-2">{t('suites.matha.reports.donor')}</th>
              <th className="py-1.5 pr-2">{t('suites.matha.dakshina.purpose')}</th>
              <th className="py-1.5 pr-2 text-right">{t('suites.matha.reports.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {state.dakshina.map((d) => (
              <tr key={d.id} className="border-b border-stone-100">
                <td className="py-1.5 pr-2">{fmtDate(d.date)}</td>
                <td className="py-1.5 pr-2 font-semibold">{d.donorName}</td>
                <td className="py-1.5 pr-2">{purposeLabel(d.purpose)}</td>
                <td className="py-1.5 pr-2 text-right font-bold">{inr(d.amount)}</td>
              </tr>
            ))}
            {state.dakshina.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-stone-400">{t('suites.matha.reports.noDakshina')}</td></tr>
            )}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-2 mt-5 no-print">
          <Btn variant="ghost" onClick={doPrint}>🖨️ {t('suites.matha.reports.printRegister')}</Btn>
          <Btn variant="ghost" onClick={exportSannyasis}>{t('suites.matha.reports.sannyasisCsv')}</Btn>
          <Btn variant="ghost" onClick={exportStudents}>{t('suites.matha.reports.gurukulCsv')}</Btn>
          <Btn variant="ghost" onClick={exportDakshina}>{t('suites.matha.reports.dakshinaCsv')}</Btn>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold text-stone-800 mb-3">
          {t('suites.matha.reports.backupRestore')}
        </h2>
        <div className="flex flex-wrap gap-2 no-print">
          <Btn variant="ghost" onClick={() => { download(`matha-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), 'application/json'); showToast(t('suites.matha.reports.toastBackupDownloaded'), 'success'); }}>
            ⬇️ {t('suites.matha.reports.downloadBackup')}
          </Btn>
          <Btn variant="ghost" onClick={() => setRestoring((v) => !v)}>
            ⬆️ {t('suites.matha.reports.restoreBackup')}
          </Btn>
          <Btn variant="danger" onClick={() => { if (window.confirm(t('suites.matha.reports.confirmReset'))) { resetAll(); showToast(t('suites.matha.reports.toastReset'), 'info'); } }}>
            {t('suites.matha.reports.reset')}
          </Btn>
        </div>
        {restoring && (
          <div className="mt-3">
            <Field label={t('suites.matha.reports.pasteBackupJson')}>
              <textarea className={inputCls} rows={5} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
            </Field>
            <div className="flex gap-2 mt-2">
              <Btn onClick={() => {
                if (importJSON(restoreText)) { showToast(t('suites.matha.reports.toastRestored'), 'success'); setRestoring(false); setRestoreText(''); }
                else showToast(t('suites.matha.reports.toastInvalidBackup'), 'error');
              }}>
                {t('suites.matha.reports.restore')}
              </Btn>
              <Btn variant="ghost" onClick={() => setRestoring(false)}>{t('suites.matha.common.cancel')}</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
