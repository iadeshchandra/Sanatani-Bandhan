/**
 * TransparencyBoard — Blueprint A: the public trust surface on an
 * organisation's public page.
 * ============================================================================
 * Renders ONLY trustee-published monthly accounts (publishedAccounts
 * documents). An unpublished month has no document and therefore no
 * presence here — nothing about an organisation's money is public
 * until a trustee deliberately publishes it (research §2c: publish
 * on a rhythm after reconciliation; never a live raw ledger).
 *
 * The snapshots carry aggregates only — totals, per-category
 * breakdown, a donor COUNT, a record COUNT, the publisher's name and
 * an optional note. No donor names, no individual amounts, no staff
 * details exist in the document, so none can leak here. Amounts
 * render in the organisation's own currency (stamped on the
 * snapshot at publish time), not the visitor's.
 *
 * When nothing has been published the board renders nothing: the
 * section appears on the public page once the organisation begins
 * publishing — silence is not a claim, and no empty accusation box
 * is pinned on organisations that have not started yet.
 */

import React, { useEffect, useState } from 'react';
import { BookOpenCheck, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { bcp47For } from '../../i18n/schema';
import {
  formatWorkspaceAmount,
  resolveWorkspaceCurrency,
} from '../../lib/treasuryDisplay';
import type { PublishedAccountsDoc } from '../../lib/publishedAccounts';
import { fetchPublishedAccounts } from '../../context/data/publishedAccountsStore';

interface TransparencyBoardProps {
  workspaceId: string;
  orgName: string;
}

export const TransparencyBoard: React.FC<TransparencyBoardProps> = ({
  workspaceId,
  orgName,
}) => {
  const { t, currentLang } = useLanguage();
  const [docs, setDocs] = useState<PublishedAccountsDoc[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedAccounts(workspaceId)
      .then((rows) => {
        if (!cancelled) setDocs(rows);
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  if (!docs || docs.length === 0) return null;

  const locale = bcp47For(currentLang);
  const monthLabel = (month: string): string => {
    const [y, m] = month.split('-').map((x) => parseInt(x, 10));
    if (!y || !m) return month;
    try {
      return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      }).format(new Date(y, m - 1, 1));
    } catch {
      return month;
    }
  };
  const fmt = (doc: PublishedAccountsDoc, n: number): string =>
    formatWorkspaceAmount(
      n,
      resolveWorkspaceCurrency({ currency: doc.currencyCode })
    );

  const [latest, ...past] = docs;

  const CategoryRows: React.FC<{ doc: PublishedAccountsDoc }> = ({ doc }) => {
    const cats = Object.entries(doc.byCategory || {}).filter(
      ([, v]) => v.income !== 0 || v.expense !== 0
    );
    if (cats.length === 0) return null;
    return (
      <div className="mt-4 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
          {t('org.audit.transparency.categoriesTitle')}
        </p>
        {cats.map(([name, v]) => (
          <div
            key={name}
            className="flex items-center justify-between gap-3 text-xs text-stone-600"
          >
            <span className="truncate">{name || t('org.audit.transparency.uncategorised')}</span>
            <span className="font-mono whitespace-nowrap">
              {v.income !== 0 && (
                <span className="text-emerald-700">+{fmt(doc, v.income)}</span>
              )}
              {v.income !== 0 && v.expense !== 0 && <span> · </span>}
              {v.expense !== 0 && (
                <span className="text-rose-700">−{fmt(doc, v.expense)}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-14">
      <div className="rounded-3xl border border-amber-200 bg-white/80 p-5 sm:p-7 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-900">
              {t('org.audit.transparency.boardTitle')}
            </h2>
            <p className="text-xs text-stone-500">
              {t('org.audit.transparency.boardSubtitle').replace(
                '{org}',
                orgName
              )}
            </p>
          </div>
        </div>

        {/* Latest published month */}
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-black text-stone-900">
              {monthLabel(latest.month)}
            </h3>
            <span className="text-[11px] text-stone-500">
              {t('org.audit.transparency.publishedOn')}{' '}
              {new Date(latest.publishedAt).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {' · '}
              {latest.publishedByName}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {t('org.audit.transparency.totalReceived')}
              </p>
              <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-emerald-700">
                {fmt(latest, latest.totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {t('org.audit.transparency.totalSpent')}
              </p>
              <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-rose-700">
                {fmt(latest, latest.totalExpense)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {t('org.audit.transparency.balance')}
              </p>
              <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-stone-900">
                {fmt(latest, latest.netBalance)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-stone-500">
            {t('org.audit.transparency.donorsLabel').replace(
              '{count}',
              String(latest.donorCount)
            )}
            {' · '}
            {t('org.audit.transparency.recordsLabel').replace(
              '{count}',
              String(latest.txCount)
            )}
          </p>
          <CategoryRows doc={latest} />
          {latest.note && (
            <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-xs italic text-stone-600">
              {latest.note}
            </p>
          )}
        </div>

        {/* Past months */}
        {past.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {t('org.audit.transparency.pastMonths')}
            </p>
            {past.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs"
              >
                <span className="font-bold text-stone-800">
                  {monthLabel(doc.month)}
                </span>
                <span className="font-mono text-stone-600">
                  <span className="text-emerald-700">
                    +{fmt(doc, doc.totalIncome)}
                  </span>
                  {' · '}
                  <span className="text-rose-700">
                    −{fmt(doc, doc.totalExpense)}
                  </span>
                  {' · '}
                  {fmt(doc, doc.netBalance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
