/**
 * PublishedAccountsPanel — Blueprint A: the trustee publish flow
 * for the Transparency Board, living in the audit area.
 * ============================================================================
 * A finance-role member picks a month, optionally adds a note, and
 * publishes. The figures are NEVER typed: the panel reads the
 * workspace's FULL treasury set once (the same one-time full read
 * the summary backfill uses for windowed workspaces — a page of the
 * ledger would understate a public figure, which is fabrication),
 * and the snapshot is buildPublishedSnapshot over that month's exact
 * rows. Republishing a month recomputes and replaces the snapshot;
 * unpublishing deletes the document and the board stops showing the
 * month immediately. Publish and unpublish are themselves audit
 * events on the master stream.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { resolveActorName } from '../../bahikhata/bahikhataStore';
import { resolveWorkspaceCurrency } from '../../lib/treasuryDisplay';
import {
  buildPublishedSnapshot,
  monthsPresent,
  rowsForMonth,
  type PublishedAccountsDoc,
} from '../../lib/publishedAccounts';
import type { AggregatableTx } from '../../lib/treasuryAggregates';
import { fetchFullTreasurySet } from '../../context/data/summaryStore';
import {
  fetchPublishedAccounts,
  publishSnapshot,
  unpublishSnapshot,
} from '../../context/data/publishedAccountsStore';
import { auditRecorder } from '../../context/data/auditStore';

export const PublishedAccountsPanel: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace, currentUser, currentRole, firebaseUser } =
    useAuthWorkspace();
  const { showToast } = useToast();
  const inr = useInr();

  const workspaceId = activeWorkspace?.id || '';
  const [fullSet, setFullSet] = useState<AggregatableTx[] | null>(null);
  const [published, setPublished] = useState<PublishedAccountsDoc[]>([]);
  const [month, setMonth] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [rows, pubs] = await Promise.all([
        fetchFullTreasurySet(workspaceId),
        fetchPublishedAccounts(workspaceId),
      ]);
      setFullSet(rows);
      setPublished(pubs);
    } catch {
      showToast(t('org.audit.publish.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const months = useMemo(
    () => (fullSet ? monthsPresent(fullSet) : []),
    [fullSet]
  );

  useEffect(() => {
    if (!month && months.length > 0) setMonth(months[0]);
  }, [months, month]);

  const actor = () => ({
    // Rules bind actorUid to request.auth.uid — the Firebase uid leads
    // (currentUser.id can be a devotee doc id; see DataContext's glue).
    actorUid:
      (firebaseUser as { uid?: string } | null)?.uid || currentUser?.id || '',
    actorName: resolveActorName(
      [currentUser?.fullName, currentUser?.name],
      currentUser?.email ||
        (firebaseUser as { email?: string } | null)?.email
    ),
    actorRole: currentRole || '',
  });

  const handlePublish = async () => {
    if (!workspaceId || !month || !fullSet || busy) return;
    const monthRows = rowsForMonth(fullSet, month);
    if (monthRows.length === 0) {
      showToast(t('org.audit.publish.noRecords'), 'warning');
      return;
    }
    setBusy(true);
    try {
      const a = actor();
      const snapshot = buildPublishedSnapshot({
        workspaceId,
        month,
        monthRows,
        currencyCode: resolveWorkspaceCurrency(activeWorkspace).code,
        publishedBy: a.actorUid,
        publishedByName: a.actorName,
        note,
        now: Date.now(),
      });
      await publishSnapshot(snapshot);
      auditRecorder.record({
        workspaceId,
        ...a,
        action: 'accounts.published',
        entityType: 'publishedAccounts',
        entityId: snapshot.id,
        entityLabel: month,
        summaryKey: 'org.audit.history.accountsPublished',
        summaryParams: { month },
      });
      setNote('');
      await load();
      showToast(t('org.audit.publish.publishedToast'), 'success');
    } catch {
      showToast(t('org.audit.publish.publishFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = async (doc: PublishedAccountsDoc) => {
    if (busy) return;
    setBusy(true);
    try {
      await unpublishSnapshot(workspaceId, doc.month);
      auditRecorder.record({
        workspaceId,
        ...actor(),
        action: 'accounts.unpublished',
        entityType: 'publishedAccounts',
        entityId: doc.id,
        entityLabel: doc.month,
        summaryKey: 'org.audit.history.accountsUnpublished',
        summaryParams: { month: doc.month },
      });
      await load();
      showToast(t('org.audit.publish.unpublishedToast'), 'success');
    } catch {
      showToast(t('org.audit.publish.publishFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <BookOpenCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-temple-100">
              {t('org.audit.publish.title')}
            </h3>
            <p className="text-xs text-temple-400">
              {t('org.audit.publish.subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[44px] px-3 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('org.audit.publish.refresh')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-temple-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('org.audit.history.loading')}
        </div>
      ) : (
        <>
          {/* Publish form */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl px-3 text-xs text-temple-200 focus:outline-none focus:border-saffron-500"
              aria-label={t('org.audit.publish.monthLabel')}
            >
              {months.length === 0 && <option value="">—</option>}
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('org.audit.publish.notePlaceholder')}
              className="flex-1 min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl px-3 text-xs text-temple-200 placeholder-temple-500 focus:outline-none focus:border-saffron-500"
            />
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={busy || !month}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {t('org.audit.publish.publishButton')}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-temple-500">
            {t('org.audit.publish.computedNote')}
          </p>

          {/* Published list */}
          <div className="mt-4 space-y-2">
            {published.length === 0 && (
              <p className="text-xs text-temple-400 py-2">
                {t('org.audit.publish.noneYet')}
              </p>
            )}
            {published.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-temple-800 bg-temple-950/50 px-3.5 py-2.5"
              >
                <div className="text-xs">
                  <span className="font-bold text-temple-100">{doc.month}</span>
                  <span className="text-temple-400">
                    {' '}
                    · +{inr(doc.totalIncome)} · −{inr(doc.totalExpense)} ·{' '}
                    {doc.publishedByName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleUnpublish(doc)}
                  disabled={busy}
                  className="min-h-[44px] px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('org.audit.publish.unpublishButton')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
