/**
 * margdarshan/VoiceBoard.tsx — Your Voice: the suggestions board (J3).
 * =====================================================================
 * One board, both faces (the views.tsx law — the in-app centre and
 * the public web render the SAME component over the SAME service):
 *
 *  - READING needs nothing (the owner's read/engage law): anyone
 *    sees the board, the pipeline, the counts.
 *  - ENGAGEMENT asks for an account at the moment of the act: with
 *    no `engagement` prop, Support and Suggest become sign-in doors
 *    (the wrapper supplies where they lead); the board itself never
 *    pretends a signed-out tap did something.
 *  - Support counts stand on IDEAS, never people: a count and a
 *    button; no supporter names or lists exist anywhere in this UI.
 *  - The filing form carries the owner's plain warning ABOVE its
 *    submit button: "Your name and suggestion will be readable by
 *    everyone." Nobody files in ignorance.
 *  - While the live collection is empty the board shows the team's
 *    own roadmap (bundled seeds, read-only, labelled as such) — an
 *    honest room, never a blank one; a read failure says so and
 *    shows the same roadmap below the apology.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  Feather,
  Heart,
  Pencil,
  Plus,
  Reply,
  Trash2,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';
import {
  PIPELINE_STATUSES,
  SUGGESTION_KINDS,
  filterBoard,
  seedDisplayItems,
  sortBoard,
  validateSuggestionDraft,
  type BoardSort,
  type Suggestion,
  type SuggestionKind,
  type SuggestionStatus,
} from '../../lib/margdarshan';
import {
  createSuggestion,
  deleteSuggestion,
  editSuggestion,
  fetchMySupportedIds,
  subscribeMySuggestions,
  subscribePublicSuggestions,
  supportSuggestion,
  withdrawSupport,
} from '../../lib/margdarshan/suggestionsService';
import { TEAM_AUTHOR_NAME } from '../../lib/margdarshan/suggestionSeeds';

export interface VoiceEngagement {
  uid: string;
  authorName: string;
}

const STATUS_KEY: Record<SuggestionStatus, string> = {
  received: 'marg.voiceStatusReceived',
  'under-review': 'marg.voiceStatusUnderReview',
  planned: 'marg.voiceStatusPlanned',
  'in-progress': 'marg.voiceStatusInProgress',
  shipped: 'marg.voiceStatusShipped',
  'not-now': 'marg.voiceStatusNotNow',
  duplicate: 'marg.voiceStatusDuplicate',
};

const STATUS_PILL: Record<SuggestionStatus, string> = {
  received: 'bg-stone-100 text-stone-600',
  'under-review': 'bg-amber-100 text-amber-800',
  planned: 'bg-sky-100 text-sky-800',
  'in-progress': 'bg-violet-100 text-violet-800',
  shipped: 'bg-emerald-100 text-emerald-800',
  'not-now': 'bg-stone-100 text-stone-500',
  duplicate: 'bg-stone-100 text-stone-500',
};

const KIND_KEY: Record<SuggestionKind, string> = {
  feature: 'marg.voiceKindFeature',
  problem: 'marg.voiceKindProblem',
  praise: 'marg.voiceKindPraise',
  'manual-gap': 'marg.voiceKindManualGap',
};

export const VoiceBoard: React.FC<{
  engagement: VoiceEngagement | null;
  onNeedSignIn: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ engagement, onNeedSignIn, showToast }) => {
  const { t, currentLang } = useLanguage();
  const uid = engagement?.uid;

  const [liveItems, setLiveItems] = useState<Suggestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mine, setMine] = useState<Suggestion[]>([]);
  const [supportedIds, setSupportedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'board' | 'mine'>('board');
  const [filter, setFilter] = useState<SuggestionStatus | 'all'>('all');
  const [sort, setSort] = useState<BoardSort>('top');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<SuggestionKind>('feature');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editKind, setEditKind] = useState<SuggestionKind>('feature');
  const [deleteArmId, setDeleteArmId] = useState<string | null>(null);

  /* ------------------------------ data ------------------------------ */

  useEffect(() => {
    const unsub = subscribePublicSuggestions(
      (items) => {
        setLiveItems(items);
        setLoadError(false);
      },
      () => setLoadError(true)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) {
      setMine([]);
      return undefined;
    }
    const unsub = subscribeMySuggestions(uid, setMine, () => undefined);
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid || !liveItems || liveItems.length === 0) return undefined;
    let alive = true;
    void fetchMySupportedIds(
      liveItems.map((i) => i.id),
      uid
    ).then((set) => {
      if (alive) setSupportedIds(set);
    });
    return () => {
      alive = false;
    };
  }, [uid, liveItems]);

  /* --------------------------- derived ------------------------------ */

  const fallback = useMemo(
    () => seedDisplayItems(currentLang),
    [currentLang]
  );
  const usingFallback = loadError || (liveItems !== null && liveItems.length === 0);
  const boardItems = usingFallback ? fallback : liveItems || [];
  const visibleBoard = useMemo(
    () => sortBoard(filterBoard(boardItems, filter), sort),
    [boardItems, filter, sort]
  );
  const visibleMine = useMemo(
    () => sortBoard(mine, 'new'),
    [mine]
  );

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLang || 'en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [currentLang]
  );

  /* ---------------------------- actions ----------------------------- */

  const setBusy = (id: string, on: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleSupport = async (item: Suggestion) => {
    if (!engagement) {
      onNeedSignIn();
      return;
    }
    if (busyIds.has(item.id)) return;
    const isSupported = supportedIds.has(item.id);
    setBusy(item.id, true);
    // Optimistic: the count and the heart move with the tap; the
    // anchored batch is the truth and a failure restores both.
    setSupportedIds((prev) => {
      const next = new Set(prev);
      if (isSupported) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setLiveItems((prev) =>
      prev
        ? prev.map((i) =>
            i.id === item.id
              ? { ...i, supporterCount: Math.max(0, i.supporterCount + (isSupported ? -1 : 1)) }
              : i
          )
        : prev
    );
    try {
      if (isSupported) await withdrawSupport(item.id, engagement.uid);
      else await supportSuggestion(item.id, engagement.uid);
    } catch (e) {
      setSupportedIds((prev) => {
        const next = new Set(prev);
        if (isSupported) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setLiveItems((prev) =>
        prev
          ? prev.map((i) =>
              i.id === item.id
                ? { ...i, supporterCount: Math.max(0, i.supporterCount + (isSupported ? 1 : -1)) }
                : i
            )
          : prev
      );
      showToast?.(friendlyError(e, t, 'save'), 'error');
    } finally {
      setBusy(item.id, false);
    }
  };

  const submitDraft = async () => {
    if (!engagement || submitting) return;
    const problems = validateSuggestionDraft({
      authorId: engagement.uid,
      authorName: engagement.authorName,
      kind: draftKind,
      deskId: null,
      title: draftTitle,
      body: draftBody,
      language: (currentLang || 'en').toLowerCase(),
    });
    if (problems.length > 0) {
      showToast?.(t('marg.voiceFormInvalid'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createSuggestion({
        authorId: engagement.uid,
        authorName: engagement.authorName,
        kind: draftKind,
        deskId: null,
        title: draftTitle,
        body: draftBody,
        language: (currentLang || 'en').toLowerCase(),
      });
      showToast?.(t('marg.voiceThanks'), 'success');
      setDraftTitle('');
      setDraftBody('');
      setDraftKind('feature');
      setFormOpen(false);
      setTab('mine');
    } catch (e) {
      showToast?.(friendlyError(e, t, 'save'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: Suggestion) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditBody(item.body);
    setEditKind(item.kind);
    setDeleteArmId(null);
  };

  const saveEdit = async (item: Suggestion) => {
    const problems = validateSuggestionDraft({
      authorId: item.authorId,
      authorName: item.authorName,
      kind: editKind,
      deskId: item.deskId,
      title: editTitle,
      body: editBody,
      language: item.language,
    });
    if (problems.length > 0) {
      showToast?.(t('marg.voiceFormInvalid'), 'error');
      return;
    }
    try {
      await editSuggestion(item.id, {
        title: editTitle,
        body: editBody,
        kind: editKind,
        deskId: item.deskId,
      });
      setEditingId(null);
      showToast?.(t('marg.voiceSaved'), 'success');
    } catch (e) {
      showToast?.(friendlyError(e, t, 'save'), 'error');
    }
  };

  const removeMine = async (item: Suggestion) => {
    if (deleteArmId !== item.id) {
      setDeleteArmId(item.id);
      return;
    }
    try {
      await deleteSuggestion(item.id);
      setDeleteArmId(null);
      showToast?.(t('marg.voiceDeleted'), 'success');
    } catch (e) {
      showToast?.(friendlyError(e, t, 'save'), 'error');
    }
  };

  /* ----------------------------- pieces ----------------------------- */

  const chip = (
    label: string,
    active: boolean,
    onClick: () => void,
    key?: string
  ) => (
    <button
      key={key || label}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-xs font-black transition ${
        active
          ? 'border-orange-400 bg-orange-500 text-white shadow-sm'
          : 'border-amber-200 bg-white text-stone-600 hover:border-orange-300'
      }`}
    >
      {label}
    </button>
  );

  const renderCard = (item: Suggestion, opts: { mineCard?: boolean } = {}) => {
    const isMine = !!engagement && item.authorId === engagement.uid;
    const isSupported = supportedIds.has(item.id);
    const latestReply = item.officialReplies[item.officialReplies.length - 1];
    return (
      <article
        key={item.id}
        className="rounded-3xl border border-amber-200/80 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800 border border-amber-200">
            {t(KIND_KEY[item.kind])}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_PILL[item.status]}`}
          >
            {t(STATUS_KEY[item.status])}
          </span>
          {item.shippedVersion && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black tracking-wide text-emerald-700 border border-emerald-200">
              {t('marg.voiceShippedIn').replace('{version}', item.shippedVersion)}
            </span>
          )}
          {isMine && (
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">
              {t('marg.voiceYoursTag')}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-black leading-snug text-stone-900">
          {item.title}
        </h3>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-stone-600">
          {item.body}
        </p>

        {latestReply && (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-700">
              <Reply className="h-3.5 w-3.5" aria-hidden="true" />
              {t('marg.voiceOfficialReply')} · {latestReply.byName}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {latestReply.text}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-amber-100 pt-3">
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-stone-400">
            {item.authorName === TEAM_AUTHOR_NAME
              ? t('marg.voiceTeamTag')
              : item.authorName}
            {item.createdAtMs > 0 &&
              ` · ${dateFmt.format(new Date(item.createdAtMs))}`}
          </span>
          {!usingFallback && (
            <button
              type="button"
              onClick={() => void toggleSupport(item)}
              disabled={busyIds.has(item.id)}
              aria-pressed={isSupported}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition disabled:opacity-50 ${
                isSupported
                  ? 'border-orange-400 bg-orange-500 text-white shadow-sm'
                  : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-orange-300'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${isSupported ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              {item.supporterCount}
              <span className="text-xs font-bold">
                {isSupported ? t('marg.voiceSupported') : t('marg.voiceSupport')}
              </span>
            </button>
          )}
        </div>

        {opts.mineCard && item.status === 'received' && editingId !== item.id && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => startEdit(item)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-xs font-black text-stone-600 transition hover:border-orange-300"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {t('marg.voiceEdit')}
            </button>
            {item.supporterCount === 0 && (
              <button
                type="button"
                onClick={() => void removeMine(item)}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black transition ${
                  deleteArmId === item.id
                    ? 'border-red-300 bg-red-500 text-white'
                    : 'border-stone-200 bg-white text-stone-500 hover:border-red-200 hover:text-red-600'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {deleteArmId === item.id
                  ? t('marg.voiceDeleteConfirm')
                  : t('marg.voiceDelete')}
              </button>
            )}
            <span className="text-xs leading-5 text-stone-400">
              {t('marg.voiceEditNote')}
            </span>
          </div>
        )}

        {opts.mineCard && editingId === item.id && (
          <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_KINDS.map((k) =>
                chip(t(KIND_KEY[k]), editKind === k, () => setEditKind(k), `edit-${k}`)
              )}
            </div>
            <input
              type="text"
              value={editTitle}
              maxLength={140}
              onChange={(e) => setEditTitle(e.target.value)}
              aria-label={t('marg.voiceFormTitleLabel')}
              className="min-h-[48px] w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <textarea
              value={editBody}
              maxLength={2000}
              rows={4}
              onChange={(e) => setEditBody(e.target.value)}
              aria-label={t('marg.voiceFormBodyLabel')}
              className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-stone-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveEdit(item)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {t('marg.voiceSave')}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-600 transition hover:border-stone-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('marg.voiceCancel')}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="space-y-5">
      {/* Tabs + sort */}
      <div className="flex flex-wrap items-center gap-2">
        {chip(t('marg.voiceBoardTab'), tab === 'board', () => setTab('board'), 'tab-board')}
        {engagement &&
          chip(
            `${t('marg.voiceMine')}${mine.length > 0 ? ` · ${mine.length}` : ''}`,
            tab === 'mine',
            () => setTab('mine'),
            'tab-mine'
          )}
        <span className="flex-1" />
        {tab === 'board' && (
          <>
            {chip(t('marg.voiceSortTop'), sort === 'top', () => setSort('top'), 'sort-top')}
            {chip(t('marg.voiceSortNew'), sort === 'new', () => setSort('new'), 'sort-new')}
          </>
        )}
      </div>

      {/* Suggest door / form */}
      {tab === 'board' && !formOpen && (
        <button
          type="button"
          onClick={() => (engagement ? setFormOpen(true) : onNeedSignIn())}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-500/20 transition hover:brightness-105"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          {t('marg.voiceSuggestCta')}
        </button>
      )}
      {!engagement && tab === 'board' && (
        <p className="text-center text-xs leading-5 text-stone-400">
          {t('marg.voiceSignInPrompt')}
        </p>
      )}

      {tab === 'board' && formOpen && engagement && (
        <div className="space-y-3 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700/70">
            {t('marg.voiceFormKindLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_KINDS.map((k) =>
              chip(t(KIND_KEY[k]), draftKind === k, () => setDraftKind(k), `kind-${k}`)
            )}
          </div>
          <input
            type="text"
            value={draftTitle}
            maxLength={140}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder={t('marg.voiceTitlePlaceholder')}
            aria-label={t('marg.voiceFormTitleLabel')}
            className="min-h-[48px] w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 outline-none placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
          <textarea
            value={draftBody}
            maxLength={2000}
            rows={4}
            onChange={(e) => setDraftBody(e.target.value)}
            placeholder={t('marg.voiceBodyPlaceholder')}
            aria-label={t('marg.voiceFormBodyLabel')}
            className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
          {/* The owner's law, stated BEFORE the act: filing is public. */}
          <p className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            {t('marg.voicePublicWarning')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submitDraft()}
              disabled={submitting}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
            >
              <Feather className="h-4 w-4" aria-hidden="true" />
              {t('marg.voiceSubmit')}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex min-h-[48px] items-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-black text-stone-600 transition hover:border-stone-300"
            >
              {t('marg.voiceCancel')}
            </button>
          </div>
        </div>
      )}

      {/* Pipeline filter */}
      {tab === 'board' && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('marg.voiceBoardTab')}>
          {chip(t('marg.voiceFilterAll'), filter === 'all', () => setFilter('all'), 'f-all')}
          {PIPELINE_STATUSES.map((s) =>
            chip(t(STATUS_KEY[s]), filter === s, () => setFilter(s), `f-${s}`)
          )}
        </div>
      )}

      {/* States + list */}
      {tab === 'board' ? (
        liveItems === null && !loadError ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="anim-skeleton h-32 rounded-3xl border border-amber-100 bg-white" />
            ))}
          </div>
        ) : (
          <>
            {loadError && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {t('marg.voiceOfflineNote')}
              </p>
            )}
            {!loadError && usingFallback && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {t('marg.voiceSeedNote')}
              </p>
            )}
            {visibleBoard.length > 0 ? (
              <div className="space-y-3">
                {visibleBoard.map((item) => renderCard(item))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-6 py-10 text-center">
                <p className="mx-auto max-w-md text-sm leading-6 text-stone-500">
                  {t('marg.voiceEmpty')}
                </p>
              </div>
            )}
          </>
        )
      ) : visibleMine.length > 0 ? (
        <div className="space-y-3">
          {visibleMine.map((item) => renderCard(item, { mineCard: true }))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-6 py-10 text-center">
          <p className="mx-auto max-w-md text-sm leading-6 text-stone-500">
            {t('marg.voiceMineEmpty')}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceBoard;
