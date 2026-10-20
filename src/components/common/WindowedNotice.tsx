import React from 'react';
import { useData } from '../../context/DataContext';
import { hasMoreToLoad, type CoreCollectionKey } from '../../context/data/windowing';

/**
 * WindowedNotice — F2 (scale-surge §6) honesty chrome.
 *
 * In a large organisation (> 2,000 records in a core collection)
 * DataContext loads a window of records instead of the whole set, so
 * any figure a desk derives from the loaded array is a PARTIAL figure.
 * This notice says so, in place, with the real loaded/total counts —
 * partial numbers are never presented as complete ledger truth.
 *
 * Renders nothing at all when the collection is fully synced (the
 * overwhelming majority of workspaces), so small temples see no change.
 *
 * variant 'list':  for record lists/grids — includes Load More.
 * variant 'totals': for desks whose headline figures come from the set.
 *                   For treasury, when the server aggregation succeeded,
 *                   the headline income/expense totals are exact and the
 *                   copy says so (breakdowns remain window-derived).
 */
export const WindowedNotice: React.FC<{
  collection: CoreCollectionKey;
  variant?: 'list' | 'totals';
  loaded: number;
  className?: string;
}> = ({ collection, variant = 'list', loaded, className = '' }) => {
  const { collectionWindows, treasuryExactTotals, loadMoreCollection, receiptSeqDegraded } =
    useData();
  const state = collectionWindows[collection];
  if (!state || !state.windowed) return null;

  const totalLabel = state.total != null ? state.total.toLocaleString('en-IN') : 'many';
  const loadedLabel = loaded.toLocaleString('en-IN');
  const more = hasMoreToLoad(state, loaded);
  const exactTreasury = collection === 'treasury' && treasuryExactTotals != null;

  return (
    <div
      className={`rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 ${className}`}
      role="note"
    >
      <p className="font-bold">Large-organisation mode</p>
      {variant === 'list' ? (
        <p>
          Showing {loadedLabel} of {totalLabel} records (loaded most relevant first) so this
          desk stays fast. Older records are safe in the ledger and available in exports and
          audit views.
        </p>
      ) : exactTreasury ? (
        <p>
          Headline income &amp; expense totals below are exact full-ledger figures. Detailed
          breakdowns (by category, fund, donor or month) are computed from the {loadedLabel}{' '}
          most recent of {totalLabel} entries — use exports or the audit view for full-period
          breakdowns.
        </p>
      ) : (
        <p>
          Figures below are computed from the {loadedLabel} most recent of {totalLabel} ledger
          entries (large-organisation mode) and are therefore partial. Full-period statements
          remain available via exports and the audit view.
        </p>
      )}
      {collection === 'treasury' && receiptSeqDegraded && (
        <p className="mt-1 font-semibold">
          Note: receipt-number sequences are currently derived from the loaded window (the
          server sequence index is not built yet) — verify new receipt numbers against the
          register until it is.
        </p>
      )}
      {more && (
        <button
          type="button"
          onClick={() => loadMoreCollection(collection)}
          className="mt-2 inline-flex min-h-[36px] items-center rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700"
        >
          Load more records
        </button>
      )}
    </div>
  );
};

export default WindowedNotice;
