/**
 * chat/backup/BackupSettings.tsx — "Your words are yours" settings.
 * =================================================================
 * Drive connect (one small permission), sealing-words setup, backup now
 * (words prompt → seal → one-time recovery key display), schedule, last
 * backup status, restored-history viewer. Warm, unhurried, Sanatani.
 *
 * SECURITY: sealing words and recovery keys live in memory only, inside
 * the current call chain. Nothing here writes them anywhere.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useBackupStrings, fillTemplate } from './strings';
import { PassphraseSetup } from './PassphraseSetup';
import { PassphrasePrompt } from './PassphrasePrompt';
import { ArchiveViewer } from './ArchiveViewer';
import { formatRecoveryCode } from './crypto';
import {
  performBackup,
  readBackupMeta,
  writeBackupMeta,
  type BackupMeta,
  type BackupSchedule,
} from './backupService';
import {
  requestDriveAccess,
  hasDriveAccess,
  clearDriveToken,
  DRIVE_APPDATA_SCOPE,
} from './driveClient';
import { hasArchive } from './archiveStore';

type View = 'main' | 'setup' | 'prompt' | 'sealed' | 'archive';

const SCHEDULES: BackupSchedule[] = ['off', 'daily', 'weekly', 'monthly'];

export const BackupSettings: React.FC<{ uid: string; onClose: () => void }> = ({ uid, onClose }) => {
  const { tr, lang } = useBackupStrings();
  const [view, setView] = useState<View>('main');
  const [meta, setMeta] = useState<BackupMeta>(() => readBackupMeta());
  const [driveOn, setDriveOn] = useState(() => hasDriveAccess());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [archiveExists, setArchiveExists] = useState(false);
  const [freshRecovery, setFreshRecovery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    hasArchive().then(setArchiveExists).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      await requestDriveAccess();
      setDriveOn(true);
    } catch (e: unknown) {
      if ((e as Error).message !== 'popup-closed') {
        setStatus({ ok: false, text: tr.backupFailed });
      }
    } finally {
      setBusy(false);
    }
  }, [tr]);

  const disconnect = useCallback(() => {
    clearDriveToken();
    setDriveOn(false);
  }, []);

  /** First-time seal creation — words only, no backup yet. */
  const finishSetup = useCallback(
    (_words: string) => {
      setMeta(writeBackupMeta({ sealReady: true }));
      setView('main');
      setStatus({ ok: true, text: tr.passphraseSet });
    },
    [tr]
  );

  /** Backup-now: words entered → seal → show this copy's recovery key. */
  const runBackup = useCallback(
    async (passphrase: string) => {
      setBusy(true);
      setStatus(null);
      try {
        const result = await performBackup(uid, passphrase);
        setMeta(readBackupMeta());
        setFreshRecovery(result.recoveryCode);
        setCopied(false);
        setView('sealed');
        setStatus({
          ok: true,
          text: `${tr.backupDone} ${fillTemplate(tr.chatsSealed, { n: result.chatCount })}`,
        });
      } catch (e: unknown) {
        if ((e as Error).message !== 'popup-closed') {
          setStatus({ ok: false, text: tr.backupFailed });
        }
        setView('main');
      } finally {
        setBusy(false);
      }
    },
    [uid, tr]
  );

  const copyRecovery = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(freshRecovery);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the key is visible to write down */
    }
  }, [freshRecovery]);

  const scheduleLabel = (s: BackupSchedule): string => {
    switch (s) {
      case 'daily':
        return tr.scheduleDaily;
      case 'weekly':
        return tr.scheduleWeekly;
      case 'monthly':
        return tr.scheduleMonthly;
      default:
        return tr.scheduleOff;
    }
  };

  const lastBackupText = meta.lastBackupAt
    ? new Date(meta.lastBackupAt).toLocaleString(lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : tr.neverBackedUp;

  if (view === 'setup') {
    return (
      <div className="p-5">
        <PassphraseSetup onComplete={finishSetup} onCancel={() => setView('main')} />
      </div>
    );
  }

  if (view === 'prompt') {
    return (
      <div className="p-5">
        <PassphrasePrompt onSubmit={runBackup} onCancel={() => setView('main')} busy={busy} />
      </div>
    );
  }

  if (view === 'sealed') {
    return (
      <div className="p-5 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2" aria-hidden>
            🔑
          </div>
          <h3 className="text-base font-extrabold text-stone-900">{tr.recoveryTitle}</h3>
          <p className="text-sm text-stone-600 mt-1 leading-relaxed">{tr.recoveryDesc}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="font-mono text-sm text-amber-900 break-all leading-loose tracking-wide">
            {formatRecoveryCode(freshRecovery)}
          </p>
        </div>
        <button
          type="button"
          onClick={copyRecovery}
          className="w-full min-h-[44px] rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-700 hover:bg-stone-50"
        >
          {copied ? tr.recoveryCopied : tr.copyCode}
        </button>
        <button
          type="button"
          onClick={() => {
            setFreshRecovery('');
            setView('main');
          }}
          className="w-full min-h-[44px] rounded-2xl bg-gradient-to-br from-amber-700 to-orange-700 text-white text-sm font-extrabold shadow"
        >
          🪔 {tr.iHaveWrittenIt}
        </button>
      </div>
    );
  }

  if (view === 'archive') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="px-5 pt-4 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setView('main')}
            className="text-sm font-bold text-amber-800 min-h-[44px]"
          >
            ← {tr.back}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-2 pb-4">
          <ArchiveViewer />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 overflow-y-auto">
      <div className="text-center">
        <div className="text-4xl mb-2" aria-hidden>
          📦
        </div>
        <h3 className="text-lg font-extrabold text-stone-900">{tr.title}</h3>
        <p className="text-sm text-stone-600 mt-1 leading-relaxed">{tr.subtitle}</p>
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">🪔 {tr.includesNote}</p>
      </div>

      {/* Drive connection */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              {driveOn ? '✅' : '☁️'}
            </span>
            <span className="text-sm font-extrabold text-stone-800">
              {driveOn ? tr.driveConnected : tr.connectDrive}
            </span>
          </div>
          {driveOn ? (
            <button
              type="button"
              onClick={disconnect}
              className="min-h-[44px] px-4 rounded-2xl border border-stone-300 text-sm font-bold text-stone-600"
            >
              {tr.disconnect}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={busy}
              className="min-h-[44px] px-4 rounded-2xl bg-gradient-to-br from-amber-700 to-orange-700 text-white text-sm font-extrabold shadow disabled:opacity-50"
            >
              {tr.connectDrive}
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">{tr.connectDriveDesc}</p>
        <p className="text-xs text-stone-500 leading-relaxed">{tr.driveNote}</p>
        <p className="text-[10px] font-mono text-stone-400 break-all" title="The only permission we ever request">
          {DRIVE_APPDATA_SCOPE}
        </p>
      </section>

      {driveOn && (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="text-sm font-extrabold text-stone-800">🪔 {tr.passphraseTitle}</div>
            <p className="text-xs text-stone-500 leading-relaxed">
              {meta.sealReady ? tr.passphraseSet : tr.passphraseDesc}
            </p>
            <button
              type="button"
              onClick={() => setView('setup')}
              className="w-full min-h-[44px] rounded-2xl border border-amber-300 bg-amber-50 text-sm font-extrabold text-amber-900 hover:bg-amber-100"
            >
              {meta.sealReady ? tr.changeSeal : tr.passphraseTitle}
            </button>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-stone-800">{tr.lastBackup}</span>
              <span className="text-sm text-stone-600">{lastBackupText}</span>
            </div>
            <button
              type="button"
              disabled={busy || !meta.sealReady}
              onClick={() => setView('prompt')}
              className="w-full min-h-[48px] rounded-2xl bg-gradient-to-br from-amber-700 to-orange-700 text-white text-sm font-extrabold shadow disabled:opacity-50"
            >
              📦 {tr.backupNow}
            </button>
            {!meta.sealReady && (
              <p className="text-xs text-stone-500 text-center">{tr.passphraseTitle} →</p>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="text-sm font-extrabold text-stone-800">🔁 {tr.scheduleLabel}</div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={tr.scheduleLabel}>
              {SCHEDULES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={meta.schedule === s}
                  onClick={() => setMeta(writeBackupMeta({ schedule: s }))}
                  className={`min-h-[44px] rounded-2xl text-xs font-extrabold border transition-colors ${
                    meta.schedule === s
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-white text-stone-600 border-stone-300'
                  }`}
                >
                  {scheduleLabel(s)}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">{tr.scheduleHonest}</p>
          </section>
        </>
      )}

      {archiveExists && (
        <button
          type="button"
          onClick={() => setView('archive')}
          className="w-full min-h-[44px] rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-700"
        >
          📜 {tr.viewHistory}
        </button>
      )}

      {status && (
        <p
          role="status"
          className={`text-sm font-semibold rounded-2xl px-4 py-2.5 border ${
            status.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status.text}
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full min-h-[44px] rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-600"
      >
        {tr.close}
      </button>
    </div>
  );
};
