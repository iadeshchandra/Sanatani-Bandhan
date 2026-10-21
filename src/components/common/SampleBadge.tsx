import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * SampleBadge — QUEUED #59 (A4-4): the "clearly marked as sample" half
 * of the SetupWizard's sample-data promise. Rendered next to any record
 * the first-run seeder laid down (`isDemoSeed`) and next to suite rows
 * proven to be sample-era residue (lib/sampleData), so a fictitious
 * record can never again sit in a list indistinguishable from a real
 * one. Amber, small, unmissable — the same visual language as the
 * 80G SAMPLE watermark.
 */
export const SampleBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { safeTranslate } = useLanguage();
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-300 align-middle ${className}`}
      title={safeTranslate(
        'sample_badge_tip',
        'Sample record from the first-run tour — removable anytime in Settings',
        'প্রথম ট্যুরের নমুনা রেকর্ড — সেটিংস থেকে যেকোনো সময় মোছা যাবে',
        'पहले टूर का नमूना रिकॉर्ड — सेटिंग्स से कभी भी हटाया जा सकता है',
      )}
    >
      {safeTranslate('sample_badge', 'Sample', 'নমুনা', 'नमूना')}
    </span>
  );
};

export default SampleBadge;
