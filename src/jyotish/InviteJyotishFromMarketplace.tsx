/**
 * InviteJyotishFromMarketplace — org-side affordance inside the purohit
 * management desk, mirroring InviteFromMarketplace (JY-FIX-B / JY-11).
 * =====================================================================
 * The audit found the org → jyotishi invite loop could never START:
 * the context writer (inviteJyotish), the Firestore rules, and the
 * jyotishi's accept/decline inbox all existed — but no surface anywhere
 * could SEND an invite. This is that surface: Trustees search
 * independent jyotishis by ID (JYO-XXXXXX) or city and send a staff
 * invite. Acceptance links the independent profile as org staff (dual
 * identity) — org data becomes visible to them ONLY inside the org
 * session, exactly like Purohit One.
 */
import React, { useState } from 'react';
import { useJyotish } from '../context/JyotishContext';
import type { JyotishIdentity } from '../types/jyotish';
import { Card, SectionTitle, EmptyState, Stars } from '../components/purohit/ui';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useLanguage } from '../context/LanguageContext';
import { friendlyError } from '../lib/friendlyError';

export const InviteJyotishFromMarketplace: React.FC = () => {
  const { browseJyotishis, getJyotish, inviteJyotish } = useJyotish();
  const { t } = useLanguage();
  const [idQuery, setIdQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [results, setResults] = useState<JyotishIdentity[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const search = async () => {
    setSearching(true);
    setSearched(true);
    try {
      if (idQuery.trim()) {
        // Direct ID lookup: JYO-XXXXXX
        const found = await getJyotish(idQuery.trim().toUpperCase());
        setResults(found ? [found] : []);
      } else {
        const res = await browseJyotishis({ city: cityQuery.trim() || undefined });
        setResults(res);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const invite = async (j: JyotishIdentity) => {
    setInviting(j.id);
    try {
      await inviteJyotish(j, message.trim() || undefined);
    } catch (e: any) {
      console.error(e);
      alert(friendlyError(e, t, 'save'));
    } finally {
      setInviting(null);
    }
  };

  return (
    <Card>
      <SectionTitle sub="Invite an independent jyotishi to serve on your organisation's staff — mandir, sangha, ashram, gurukul or trust. They keep their independent profile; accepting links it here.">
        Invite a jyotishi
      </SectionTitle>
      <div className="grid sm:grid-cols-3 gap-2.5 mb-3">
        <input
          value={idQuery}
          onChange={(e) => setIdQuery(e.target.value)}
          placeholder="Jyotish ID (e.g. JYO-7K2Q9M)"
          className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono min-h-[44px]"
        />
        <input
          value={cityQuery}
          onChange={(e) => setCityQuery(e.target.value)}
          placeholder="Or city…"
          className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px]"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold min-h-[44px] disabled:opacity-50"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Invitation message (optional)"
        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px] mb-3"
      />
      {searched && results.length === 0 && (
        <EmptyState title="No jyotishis found" sub="Check the ID or try another city." />
      )}
      <div className="space-y-2.5">
        {results.map((j) => (
          <div key={j.id} className="border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm text-stone-900">{j.displayName}</p>
                <VerificationBadge tier={j.verificationTier} subject="Jyotishi" size="xs" />
              </div>
              <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                {j.id} · {j.city}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Stars value={j.ratingAggregate} size="w-3 h-3" />
                <span className="text-[10px] text-stone-500 font-bold">
                  {j.ratingAggregate.toFixed(1)} · {j.completedConsultations} consultations
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => invite(j)}
              disabled={inviting === j.id}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shrink-0 min-h-[44px] disabled:opacity-50"
            >
              {inviting === j.id ? 'Sending…' : 'Invite'}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};
