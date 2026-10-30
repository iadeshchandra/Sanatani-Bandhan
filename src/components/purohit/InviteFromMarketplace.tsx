/**
 * InviteFromMarketplace — org-side affordance inside the purohit management
 * desk. Trustees search VERIFIED independent purohits by ID/city and send a
 * staff invite. Acceptance links the independent profile as org staff (dual
 * identity) — org data becomes visible to them ONLY inside the org session.
 */
import React, { useState } from 'react';
import { usePurohit } from '../../context/PurohitContext';
import { PurohitIdentity } from '../../types/purohit';
import { Card, SectionTitle, EmptyState, Stars, TierBadge } from './ui';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';

export const InviteFromMarketplace: React.FC = () => {
  const { browsePurohits, getPurohit, invitePurohit } = usePurohit();
  const { t } = useLanguage();
  const [idQuery, setIdQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [results, setResults] = useState<PurohitIdentity[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const search = async () => {
    setSearching(true);
    setSearched(true);
    try {
      if (idQuery.trim()) {
        // Direct ID lookup: PUR-XXXXXX
        const found = await getPurohit(idQuery.trim().toUpperCase());
        setResults(found ? [found] : []);
      } else {
        const res = await browsePurohits({ city: cityQuery.trim() || undefined });
        setResults(res);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const invite = async (p: PurohitIdentity) => {
    setInviting(p.id);
    try {
      await invitePurohit(p, message.trim() || undefined);
    } catch (e: any) {
      console.error(e);
      alert(friendlyError(e, t, 'save'));
    } finally {
      setInviting(null);
    }
  };

  return (
    <Card>
      <SectionTitle sub="Invite a verified independent purohit to serve on your organisation's staff — mandir, sangha, ashram, gurukul or trust. They keep their independent profile; accepting links it here.">
        Invite from marketplace
      </SectionTitle>
      <div className="grid sm:grid-cols-3 gap-2.5 mb-3">
        <input
          value={idQuery}
          onChange={(e) => setIdQuery(e.target.value)}
          placeholder="Purohit ID (e.g. PUR-7K2Q9M)"
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
        <EmptyState title="No purohits found" sub="Check the ID or try another city." />
      )}
      <div className="space-y-2.5">
        {results.map((p) => (
          <div key={p.id} className="border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm text-stone-900">{p.displayName}</p>
                <TierBadge tier={p.verificationTier} />
              </div>
              <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                {p.id} · {p.city}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Stars value={p.ratingAggregate} size="w-3 h-3" />
                <span className="text-[10px] text-stone-500 font-bold">
                  {p.ratingAggregate.toFixed(1)} · {p.completedGigs} rituals
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => invite(p)}
              disabled={inviting === p.id}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shrink-0 min-h-[44px] disabled:opacity-50"
            >
              {inviting === p.id ? 'Sending…' : 'Invite'}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};
