/**
 * tirtha/RecordVisitButton.tsx — "Record this visit" entry point.
 * =====================================================================
 * Drop-in button for the campus visitor view (and anywhere else a
 * devotee might stand, in spirit, at a temple's threshold). Opens the
 * check-in sheet; the visit is recorded ONLY on explicit confirm.
 */
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { VisitCheckinSheet } from './VisitCheckinSheet';
import { tt } from './i18n';

export const RecordVisitButton: React.FC<{
  uid: string;
  templeName?: string;
  orgId?: string;
  variant?: 'primary' | 'subtle';
  className?: string;
}> = ({ uid, templeName, orgId, variant = 'subtle', className = '' }) => {
  const { currentLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const styles =
    variant === 'primary'
      ? 'bg-amber-700 hover:bg-amber-800 text-amber-50'
      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200';

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSaved(false); }}
        className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors min-h-[44px] ${styles} ${className}`}
      >
        {saved ? tt(currentLang, 'visit.saved') : tt(currentLang, 'visit.record')}
      </button>
      {open && (
        <VisitCheckinSheet
          uid={uid}
          initialTemple={templeName}
          initialOrgId={orgId}
          onSaved={() => { setOpen(false); setSaved(true); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
