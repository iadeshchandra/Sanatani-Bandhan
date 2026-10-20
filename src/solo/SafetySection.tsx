/**
 * solo/SafetySection.tsx — the 🛡️ Safety home on the Profile tab.
 * =====================================================================
 * Mounts the Crisis Command Tier-1 personal safety surfaces that were
 * built but never wired into production (audit 2026-10-20):
 *
 *  - EmergencyContacts — the family circle whose phones ride on every
 *    SOS as `familyNotified`. Without this mount, devotees had NO way
 *    to enter the numbers their SOS claims to notify.
 *  - FamilySafety — consent-first family linking (invite → mutual
 *    grant → consented SOS history). Zero visibility without consent.
 *  - PersonalHistory — the devotee's own SOS log (was dev-preview only).
 *
 * Each surface opens as a full-screen sheet (z-9970 — always below the
 * SOS FAB at z-9990; SOS wins every z-fight, standing law).
 *
 * The one-time nudge: while the circle is empty and the devotee hasn't
 * dismissed it, EmergencyContactsNudge asks once — "Who should we call
 * if you're in danger?" — warm, never alarming, never repeated.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { ChevronRight, Heart, History, Phone, X } from 'lucide-react';
import { Card, T } from './ui';
import { EmergencyContacts, EmergencyContactsNudge } from '../crisis/EmergencyContacts';
import { FamilySafety } from '../crisis/FamilySafety';
import { PersonalHistory } from '../crisis/PersonalHistory';
import { loadEmergencyContacts } from '../crisis/sosService';
import {
  browserNudgeStorage,
  dismissSafetyNudge,
  shouldShowSafetyNudge,
} from '../crisis/safetyNudge';

type SafetySheet = 'contacts' | 'family' | 'history' | null;

const SheetShell: React.FC<{
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[9970] flex flex-col bg-stone-50" role="dialog" aria-modal="true">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
      <h2 className="text-base font-extrabold text-stone-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-stone-200/70 text-stone-700 hover:bg-stone-300"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
    <div className="grow overflow-y-auto">{children}</div>
  </div>
);

const SafetyRow: React.FC<{
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  badge?: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 py-3 text-left"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-bold text-stone-900">{title}</span>
      <span className="block text-sm text-stone-500">{subtitle}</span>
    </span>
    {badge && (
      <span className="shrink-0 rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-bold text-amber-50">
        {badge}
      </span>
    )}
    <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden />
  </button>
);

export const SafetySection: React.FC = () => {
  const [sheet, setSheet] = useState<SafetySheet>(null);
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const refreshCount = useCallback(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setContactsCount(null);
      return;
    }
    loadEmergencyContacts(uid)
      .then((list) => setContactsCount(list.length))
      .catch(() => setContactsCount(null));
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const closeSheet = useCallback(() => {
    setSheet(null);
    // The devotee may have just added their first contact — recount so
    // the nudge retires the moment the circle exists.
    refreshCount();
  }, [refreshCount]);

  const storage = browserNudgeStorage();
  const showNudge = !nudgeDismissed && shouldShowSafetyNudge(storage, contactsCount);

  const handleDismissNudge = () => {
    dismissSafetyNudge(browserNudgeStorage());
    setNudgeDismissed(true);
  };

  return (
    <>
      <Card>
        <h3 className="mb-1 font-extrabold text-stone-900">
          🛡️ <T en="Safety" bn="নিরাপত্তা" hi="सुरक्षा" />
        </h3>
        <p className="mb-2 text-sm text-stone-500">
          <T
            en="The people who'll be there for you — and your own safety story, kept with care."
            bn="যাঁরা আপনার পাশে থাকবেন — আর আপনার নিজের নিরাপত্তার গল্প, যত্নে রাখা।"
            hi="जो लोग आपके साथ होंगे — और आपकी अपनी सुरक्षा की कहानी, सँभालकर रखी गई।"
          />
        </p>

        {showNudge && (
          <div className="relative mb-2">
            <EmergencyContactsNudge onSetup={() => setSheet('contacts')} />
            <button
              type="button"
              onClick={handleDismissNudge}
              aria-label="Dismiss"
              className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-amber-800/70 hover:bg-amber-200/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="divide-y divide-stone-100">
          <SafetyRow
            icon={<Phone className="h-5 w-5" aria-hidden />}
            title={<T en="Family Circle" bn="পরিবার বৃত্ত" hi="पारिवारिक मंडल" />}
            subtitle={
              <T
                en="Who should we call if you are in danger?"
                bn="বিপদে পড়লে আমরা কাকে ফোন করব?"
                hi="खतरे में हों तो हम किसे बुलाएँ?"
              />
            }
            badge={contactsCount !== null && contactsCount > 0 ? String(contactsCount) : undefined}
            onClick={() => setSheet('contacts')}
          />
          <SafetyRow
            icon={<Heart className="h-5 w-5" aria-hidden />}
            title={<T en="Family safety circle" bn="পরিবার নিরাপত্তা বৃত্ত" hi="पारिवारिक सुरक्षा मंडल" />}
            subtitle={
              <T
                en="People you trust, linked with their permission. Nothing is visible without consent — ever."
                bn="যাদের আপনি বিশ্বাস করেন, তাদের সম্মতিতে যুক্ত। সম্মতি ছাড়া কিছুই দৃশ্যমান নয় — কখনোই নয়।"
                hi="जिन पर आप भरोसा करते हैं, उनकी अनुमति से जुड़े। सहमति के बिना कुछ भी दृश्य नहीं — कभी नहीं।"
              />
            }
            onClick={() => setSheet('family')}
          />
          <SafetyRow
            icon={<History className="h-5 w-5" aria-hidden />}
            title={<T en="My safety log" bn="আমার নিরাপত্তা লগ" hi="मेरा सुरक्षा लॉग" />}
            subtitle={
              <T
                en="A quiet record of moments that mattered. Nothing here is scored or shared."
                bn="গুরুত্বপূর্ণ মুহূর্তগুলোর শান্ত রেকর্ড। এখানে কিছুই স্কোর বা শেয়ার করা হয় না।"
                hi="महत्वपूर्ण क्षणों का शांत रिकॉर्ड। यहाँ कुछ भी स्कोर या साझा नहीं किया जाता।"
              />
            }
            onClick={() => setSheet('history')}
          />
        </div>
      </Card>

      {sheet === 'contacts' && (
        <SheetShell
          title={<T en="Family Circle" bn="পরিবার বৃত্ত" hi="पारिवारिक मंडल" />}
          onClose={closeSheet}
        >
          <div className="mx-auto max-w-2xl p-4">
            <EmergencyContacts onClose={closeSheet} />
          </div>
        </SheetShell>
      )}
      {sheet === 'family' && (
        <SheetShell
          title={<T en="Family safety circle" bn="পরিবার নিরাপত্তা বৃত্ত" hi="पारिवारिक सुरक्षा मंडल" />}
          onClose={closeSheet}
        >
          <FamilySafety />
        </SheetShell>
      )}
      {sheet === 'history' && (
        <SheetShell
          title={<T en="My safety log" bn="আমার নিরাপত্তা লগ" hi="मेरा सुरक्षा लॉग" />}
          onClose={closeSheet}
        >
          <PersonalHistory />
        </SheetShell>
      )}
    </>
  );
};
