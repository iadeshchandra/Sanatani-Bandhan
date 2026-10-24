import React from 'react';
import { useInr } from '../../hooks/useWorkspaceInr';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';

/**
 * KarmaLedgerDesk — the SEVA REGISTER (World-Readiness E-03).
 * =====================================================================
 * This desk used to RANK devotees: a "Karma Index Score" computed as
 * (Chanda ÷ 100) + (Volunteer Hours × 2.5), a Rank column with medals,
 * and point-tier cards where more giving bought higher privilege
 * ("Ratna 850+ pts → VIP Sanctum Darshan"). Blueprint D bans ranked
 * people, scored devotion and giving ladders outright — and a banner
 * reading "Nishkama Karma" (desireless action) over a scored ranking
 * contradicted itself.
 *
 * What trustees legitimately need survives, unranked: a REGISTER of
 * each member's seva — hours served and chanda recorded — as plain
 * facts for gratitude and receipts, in name order, with no score, no
 * tier, no order of merit. The underlying devotee records are
 * untouched; only the scored presentation is gone.
 */
export const KarmaLedgerDesk: React.FC = () => {
  const inr = useInr();
  const { safeTranslate } = useLanguage();
  const taxonomy = useWorkspaceTaxonomy();
  const { devotees } = useData();

  const register = [...devotees].sort((a, b) =>
    (a.fullName || '').localeCompare(b.fullName || ''),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
              {safeTranslate('seva_register_badge', 'Seva Register', 'সেবা খাতা', 'सेवा पंजी')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            {safeTranslate('seva_register_title', 'Seva Register — service, gratefully recorded', 'সেবা খাতা — সেবা, কৃতজ্ঞতায় লিপিবদ্ধ', 'सेवा पंजी — सेवा, कृतज्ञता से दर्ज')}
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            {safeTranslate(
              'seva_register_sub',
              'Every member’s hours and chanda, kept as plain facts for gratitude and receipts. Seva is honoured here — never ranked, never scored.',
              'প্রতিটি সদস্যের সময় ও চাঁদা, কৃতজ্ঞতা ও রসিদের জন্য সরল তথ্য হিসেবে রাখা। এখানে সেবা সম্মানিত — কখনও ক্রম বা নম্বর নয়।',
              'हर सदस्य के घंटे और चंदा, कृतज्ञता और रसीदों के लिए सरल तथ्य के रूप में। यहाँ सेवा का सम्मान है — कभी क्रम या अंक नहीं।'
            )}
          </p>
        </div>
      </div>

      {/* The register — name order, facts only */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-temple-400 uppercase bg-temple-950/60 font-semibold border-b border-temple-800">
              <tr>
                <th className="p-3">{taxonomy.memberNoun}</th>
                <th className="p-3">{safeTranslate('seva_register_gotra', 'Gotra', 'গোত্র', 'गोत्र')}</th>
                <th className="p-3">{safeTranslate('seva_register_hours', 'Volunteer Hours', 'স্বেচ্ছাসেবার ঘণ্টা', 'स्वयंसेवा घंटे')}</th>
                <th className="p-3 text-right">{safeTranslate('seva_register_chanda', 'Total Chanda (record)', 'মোট চাঁদা (রেকর্ড)', 'कुल चंदा (रिकॉर्ड)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-temple-800">
              {register.map((d, idx) => (
                <tr key={`${d.id}-${idx}`} className="hover:bg-temple-800/40 transition-colors">
                  <td className="p-3">
                    <p className="font-extrabold text-temple-100">{d.fullName}</p>
                    {d.spiritualName && (
                      <p className="text-[11px] text-saffron-400/90 italic">{d.spiritualName}</p>
                    )}
                  </td>
                  <td className="p-3 text-temple-300">{d.gotra}</td>
                  <td className="p-3 font-mono text-sky-400">{d.volunteerHours}h</td>
                  <td className="p-3 text-right font-mono text-saffron-400">{inr((d.totalDonated || 0))}</td>
                </tr>
              ))}
              {register.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-temple-400 font-semibold">
                    {safeTranslate('seva_register_empty', 'No seva recorded yet — the register opens with the first offering of time or chanda. 🙏', 'এখনও কোনো সেবা লিপিবদ্ধ হয়নি — সময় বা চাঁদার প্রথম নিবেদনেই খাতা খুলবে। 🙏', 'अभी कोई सेवा दर्ज नहीं — समय या चंदा के पहले अर्पण से पंजी खुलेगी। 🙏')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
