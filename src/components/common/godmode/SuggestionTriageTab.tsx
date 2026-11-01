/**
 * godmode/SuggestionTriageTab.tsx — Margdarshan Your Voice triage (J3).
 * ====================================================================
 * The owner-side desk for the public suggestions board
 * (suggestions/{id} + supporters ballots, ARCHITECTURE.md §19).
 * Queue by pipeline status; every action is a SuperAdmin rules-path
 * write through lib/margdarshan/suggestionsService:
 *
 *  - set status (received → under-review → planned → in-progress →
 *    shipped, or the honest exits not-now / duplicate) — the write
 *    appends to the suggestion's statusHistory in the same update;
 *  - official reply (pinned to the suggestion for everyone to read);
 *  - hide / unhide (hidden = invisible to every non-admin read —
 *    the rules serve hidden == false only);
 *  - "Seed the board" — writes the team's real roadmap items as
 *    ordinary suggestions (fixed ids, idempotent).
 *
 * Loop-closure honesty: this desk does NOT write into authors'
 * inboxes — the notifications rules are self-write-only. The
 * author's own device watches their suggestions and rings their
 * Suchana on the next visit (lib/suggestionNotifyService). What this
 * desk guarantees is the underlying fact: every status change is
 * recorded in statusHistory the moment it is made here.
 *
 * Dark sovereign console idiom, like the other tabs. Rules are the
 * boundary: a delegated admin who is not the platform SuperAdmin
 * will see the rules refuse the writes, and the error says so.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Feather,
  RefreshCw,
  Send,
  Sprout,
} from 'lucide-react';
import { auth } from '../../../firebase';
import { useToast } from '../../../context/ToastContext';
import { friendlyErrorText } from '../../../lib/friendlyError';
import {
  SUGGESTION_STATUSES,
  type Suggestion,
  type SuggestionStatus,
} from '../../../lib/margdarshan/suggestions';
import {
  seedSuggestionBoard,
  subscribeAllSuggestions,
  triageAddReply,
  triageSetHidden,
  triageSetStatus,
} from '../../../lib/margdarshan/suggestionsService';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>
    {children}
  </div>
);

const STATUS_ORDER: SuggestionStatus[] = [
  'received',
  'under-review',
  'planned',
  'in-progress',
  'shipped',
  'not-now',
  'duplicate',
];

type Filter = 'all' | 'hidden' | SuggestionStatus;

export const SuggestionTriageTab: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('received');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [versionDraft, setVersionDraft] = useState<Record<string, string>>({});
  const [dupDraft, setDupDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeAllSuggestions(
      (list) => {
        setItems(list);
        setError(null);
      },
      (err) => {
        setError(friendlyErrorText(err, 'en', 'generic'));
      }
    );
    return unsub;
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of items || []) {
      map.set(s.status, (map.get(s.status) || 0) + 1);
      if (s.hidden) map.set('hidden', (map.get('hidden') || 0) + 1);
    }
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const list = (items || []).filter((s) => {
      if (filter === 'all') return true;
      if (filter === 'hidden') return s.hidden;
      return s.status === filter && !s.hidden;
    });
    return list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  }, [items, filter]);

  const run = async (item: Suggestion, fn: () => Promise<void>, okMsg: string) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await fn();
      showToast(okMsg, 'success');
    } catch (e) {
      showToast(friendlyErrorText(e, 'en', 'generic'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (item: Suggestion, next: SuggestionStatus) => {
    const opts: { shippedVersion?: string | null; duplicateOf?: string | null } = {};
    if (next === 'shipped') opts.shippedVersion = (versionDraft[item.id] || '').trim() || null;
    if (next === 'duplicate') opts.duplicateOf = (dupDraft[item.id] || '').trim() || null;
    if (next !== 'shipped' && item.shippedVersion) opts.shippedVersion = item.shippedVersion;
    if (next !== 'duplicate' && item.duplicateOf) opts.duplicateOf = item.duplicateOf;
    void run(item, () => triageSetStatus(item, next, opts), `Moved to ${next}`);
  };

  const postReply = (item: Suggestion) => {
    const text = (replyDraft[item.id] || '').trim();
    if (!text) return;
    void run(
      item,
      async () => {
        await triageAddReply(item, text, 'Sanatani Bandhan team');
        setReplyDraft((prev) => ({ ...prev, [item.id]: '' }));
      },
      'Official reply posted'
    );
  };

  const seed = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || seeding) return;
    setSeeding(true);
    try {
      const outcomes = await seedSuggestionBoard(uid);
      const created = outcomes.filter((o) => o.outcome === 'created').length;
      showToast(
        created > 0
          ? `Seeded ${created} roadmap suggestion${created === 1 ? '' : 's'}`
          : 'Board already seeded — nothing new written',
        'success'
      );
    } catch (e) {
      showToast(friendlyErrorText(e, 'en', 'generic'), 'error');
    } finally {
      setSeeding(false);
    }
  };

  const filterChip = (id: Filter, label: string, count?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      className={`min-h-[44px] rounded-full border px-3.5 py-2 text-xs font-bold transition ${
        filter === id
          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
      }`}
    >
      {label}
      {typeof count === 'number' && count > 0 ? ` · ${count}` : ''}
    </button>
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-base font-black text-slate-100">
              <Feather className="w-5 h-5 text-amber-400" /> Your Voice — Triage Desk
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
              Every suggestion filed in Margdarshan lands here. Moving a
              suggestion records the step in its status history at once;
              the author's own device rings their Suchana with the news
              on their next visit (in-app bells are self-delivered by
              design — this desk never writes into another user's
              inbox). Hidden suggestions are invisible to every
              non-admin read, instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void seed()}
            disabled={seeding}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50"
          >
            <Sprout className="w-4 h-4" />
            {seeding ? 'Seeding…' : 'Seed the board'}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {filterChip('all', 'All', items?.length)}
          {STATUS_ORDER.map((s) => filterChip(s, s, counts.get(s)))}
          {filterChip('hidden', 'Hidden', counts.get('hidden'))}
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">The queue could not be read</p>
          <p className="mt-1 text-xs leading-5 text-red-200/70">{error}</p>
        </Card>
      )}

      {items === null && !error ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-500">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading the queue…
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">
            Nothing in this part of the queue. When a voice is filed, it
            will stand here.
          </p>
        </Card>
      ) : (
        visible.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-300">
                {item.kind}
              </span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-300">
                {item.status}
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-300">
                ♥ {item.supporterCount} supporters
              </span>
              {item.hidden && (
                <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-300">
                  Hidden
                </span>
              )}
              {item.shippedVersion && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                  Shipped in {item.shippedVersion}
                </span>
              )}
              {item.duplicateOf && (
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Duplicate of {item.duplicateOf}
                </span>
              )}
              <span className="flex-1" />
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() =>
                  void run(
                    item,
                    () => triageSetHidden(item.id, !item.hidden),
                    item.hidden ? 'Suggestion is visible again' : 'Suggestion hidden'
                  )
                }
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-slate-500 disabled:opacity-50"
              >
                {item.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {item.hidden ? 'Unhide' : 'Hide'}
              </button>
            </div>

            <h4 className="mt-3 text-sm font-black text-slate-100">{item.title}</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {item.body}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {item.authorName} · {item.language} ·{' '}
              {item.createdAtMs > 0
                ? new Date(item.createdAtMs).toLocaleString()
                : 'just now'}
              {' · '}history: {item.statusHistory.map((h) => h.status).join(' → ') || 'received'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Move to
              </span>
              {SUGGESTION_STATUSES.filter((s) => s !== item.status).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => setStatus(item, s)}
                  className="min-h-[44px] rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-amber-500/60 hover:text-amber-200 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={versionDraft[item.id] ?? item.shippedVersion ?? ''}
                  onChange={(e) =>
                    setVersionDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="Version stamp when marking shipped (e.g. v2026.11.01-xxxxxxx)"
                  className="min-h-[44px] min-w-[260px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500/60"
                />
                <input
                  type="text"
                  value={dupDraft[item.id] ?? item.duplicateOf ?? ''}
                  onChange={(e) =>
                    setDupDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="Canonical suggestion id when marking duplicate"
                  className="min-h-[44px] min-w-[260px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500/60"
                />
            </div>

            {item.officialReplies.length > 0 && (
              <div className="mt-3 space-y-2">
                {item.officialReplies.map((r, i) => (
                  <p key={i} className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200/90">
                    <span className="font-black">{r.byName}:</span> {r.text}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyDraft[item.id] || ''}
                onChange={(e) =>
                  setReplyDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                placeholder="Write an official reply — it is pinned to the suggestion, readable by everyone"
                className="min-h-[44px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500/60"
              />
              <button
                type="button"
                disabled={busyId === item.id || !(replyDraft[item.id] || '').trim()}
                onClick={() => postReply(item)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Reply
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default SuggestionTriageTab;
