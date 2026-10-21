import React, { useRef, useState } from 'react';
import { useGoshala } from './goshalaStore';
import { Card, Btn, STATUS_KEY, SOURCE_KEY, HEALTH_KIND_KEY, SPONSOR_PLAN_KEY, SPONSOR_STATUS_KEY, labelFor } from './ui';
import { fmtDateEn, downloadJSON } from '../pathshala/bn';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Reports: printable animal register, health cards, donor
   statements (A4 print CSS), plus one-click backup / restore. */

type ReportKind = 'register' | 'health' | 'donors';

export const ReportTab: React.FC = () => {
  const inr = useInr();
  const { state, exportJSON, importJSON, resetAll } = useGoshala();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { activeWorkspace } = useAuthWorkspace();
  const [kind, setKind] = useState<ReportKind>('register');
  const fileRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: string) => state.nandis.find((n) => n.id === id);
  const wsName = (activeWorkspace as any)?.name || 'Goshala';

  const reportTitle = (k: ReportKind) =>
    k === 'register' ? t('suites.goshala.report.register') : k === 'health' ? t('suites.goshala.report.health') : t('suites.goshala.report.donors');

  const doBackup = () => {
    downloadJSON(`goshala-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(exportJSON()));
    showToast(t('suites.goshala.report.backedup'), 'success');
  };

  const doRestore = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const ok = importJSON(String(r.result || ''));
      showToast(ok ? t('suites.goshala.report.restored') : t('suites.goshala.report.badfile'), ok ? 'success' : 'error');
    };
    r.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.report.title')}</h2>
        <LocalOnlyBadge />
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4 no-print">
          {(['register', 'health', 'donors'] as ReportKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-xl px-4 py-2 text-sm font-bold border min-h-[40px] ${kind === k ? 'bg-amber-700 text-amber-50 border-amber-800' : 'bg-white text-stone-600 border-stone-200'}`}>
              {reportTitle(k)}
            </button>
          ))}
          <Btn variant="ghost" onClick={() => window.print()} className="ml-auto">🖨 {t('suites.goshala.common.print')}</Btn>
        </div>

        <div className="print-area rounded-xl">
          <h3 className="text-center font-extrabold text-lg">॥ {wsName} ॥</h3>
          <p className="text-center text-xs text-stone-500 mb-4">
            {reportTitle(kind)}
            {' '}· {fmtDateEn(new Date().toISOString().slice(0, 10))}
          </p>

          {kind === 'register' && (
            <table>
              <thead><tr>
                <th>{t('suites.goshala.nandi.thTag')}</th><th>{t('suites.goshala.nandi.thName')}</th>
                <th>{t('suites.goshala.nandi.thBreed')}</th><th>{t('suites.goshala.nandi.thAge')}</th>
                <th>{t('suites.goshala.nandi.thSource')}</th><th>{t('suites.goshala.nandi.thStatus')}</th>
                <th>{t('suites.goshala.report.since')}</th>
              </tr></thead>
              <tbody>
                {state.nandis.map((n) => (
                  <tr key={n.id}><td><b>{n.tagId}</b></td><td>{n.name}</td><td>{n.breed}</td><td>{t('suites.goshala.nandi.ageYears').replace('{age}', String(n.ageYears))}</td><td>{labelFor(t, SOURCE_KEY, n.source)}</td><td>{labelFor(t, STATUS_KEY, n.status)}</td><td>{n.addedDate}</td></tr>
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
                    <thead><tr>
                      <th>{t('suites.goshala.swasthya.date')}</th><th>{t('suites.goshala.swasthya.kind')}</th>
                      <th>{t('suites.goshala.swasthya.titleLabel')}</th><th>{t('suites.goshala.report.vet')}</th>
                      <th>{t('suites.goshala.report.cost')}</th><th>{t('suites.goshala.report.nextDue')}</th>
                    </tr></thead>
                    <tbody>
                      {state.health.filter((h) => h.nandiId === n.id).sort((a, b) => b.date.localeCompare(a.date)).map((h) => (
                        <tr key={h.id}><td>{h.date}</td><td>{labelFor(t, HEALTH_KIND_KEY, h.kind)}</td><td>{h.title}</td><td>{h.vetName || '—'}</td><td>{inr(h.cost)}</td><td>{h.nextDue || '—'}</td>
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
              <thead><tr>
                <th>{t('suites.goshala.sponsorship.thSponsor')}</th><th>{t('suites.goshala.sponsorship.thFor')}</th>
                <th>{t('suites.goshala.sponsorship.thPlan')}</th><th>{t('suites.goshala.sponsorship.thAmount')}</th>
                <th>{t('suites.goshala.report.period')}</th><th>{t('suites.goshala.common.receipt')}</th>
                <th>{t('suites.goshala.sponsorship.thStatus')}</th>
              </tr></thead>
              <tbody>
                {state.sponsorships.map((s) => (
                  <tr key={s.id}><td><b>{s.sponsorName}</b></td><td>{nameOf(s.nandiId || '')?.name || t('suites.goshala.sponsorship.general')}</td><td>{labelFor(t, SPONSOR_PLAN_KEY, s.plan)}</td><td>{inr(s.amount)}</td><td>{s.startDate} → {s.endDate}</td><td>{s.receiptNo || '—'}</td><td>{labelFor(t, SPONSOR_STATUS_KEY, s.status)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2">{t('suites.goshala.report.backupRestore')}</h3>
        <p className="text-xs text-stone-500 mb-3">{t('suites.goshala.report.backupDesc')}</p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={doBackup}>⬇ {t('suites.goshala.report.backup')}</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>⬆ {t('suites.goshala.report.restore')}</Btn>
          <Btn variant="danger" onClick={() => { if (confirm(t('suites.goshala.report.resetq'))) { resetAll(); showToast(t('suites.goshala.report.reset'), 'success'); } }}>{t('suites.goshala.report.resetb')}</Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = ''; }} />
        </div>
      </Card>
    </div>
  );
};
