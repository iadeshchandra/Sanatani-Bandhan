/**
 * search/SearchButton.tsx — header search button, self-contained.
 * ============================================================================
 * Renders the 🔍 button and lazily mounts the full-screen SearchOverlay.
 * Drop it anywhere a header needs global search.
 */

import React, { Suspense, lazy, useState } from 'react';
import { Search } from 'lucide-react';

const SearchOverlay = lazy(() =>
  import('./SearchOverlay').then((m) => ({ default: m.SearchOverlay })),
);

export const SearchButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        title="Search"
        className="w-11 h-11 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center border border-white/10 transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <SearchOverlay onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
