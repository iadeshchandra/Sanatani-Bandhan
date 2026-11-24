/**
 * godmode/PlatformNoticesTab.tsx — NOTIFICATION WAVE 4: the
 * platform's one voice (DESIGN §2.7).
 * ====================================================================
 * The desk where GodMode speaks to EVERY user: maintenance windows,
 * new versions, policy changes. Publishing writes ONE doc to the
 * `platformNotices` collection; each signed-in user's own device
 * self-listens (lib/platformNoticeService) and rings its Suchana
 * exactly once, in the user's language frame, when they next open
 * the app. Honest reach (law L9): there is no push rail on the free
 * plan, and this desk says so — a notice reaches people when they
 * next open the app, never "instantly".
 *
 * Rules are the boundary: create/update/delete are SuperAdmin-only
 * and schema-pinned; update may flip ONLY `active` — a published
 * notice's words are never rewritten here (correcting one means
 * deactivating it and publishing a new one). A delegated admin who
 * is not the platform SuperAdmin will see the rules refuse the
 * write, and the error surfaces honestly.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { friendlyErrorText } from '../../../lib/friendlyError';
import {
  isNoticeLive,
  validatePlatformNoticeInput,
  PLATFORM_NOTICE_BODY_MAX,
  PLATFORM_NOTICE_TITLE_MAX,
  type PlatformNoticeKind,
  type PlatformNoticeLike,
} from '../../../lib/platformNotices';
import {
  deletePlatformNotice,
  fetchPlatformNotices,
  publishPlatformNotice,
  setPlatformNoticeActive,
} from '../../../lib/platformNoticeService';
import { GmBadge, GmButton, GmCard, GmSectionTitle } from './ui';

const DAY_MS = 24 * 60 * 60 * 1000;

const EXPIRY_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 0, label: 'No expiry' },
  { days: 1, label: 'Expires in 1 day' },
  { days: 7, label: 'Expires in 7 days' },
  { days: 30, label: 'Expires in 30 days' },
];

function formatWhen(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const errorCopy = (code: string): string => {
  switch (code) {
    case 'title_required':
      return 'Please write a headline for the notice.';
    case 'title_too_long':
      return `Headline is too long (max ${PLATFORM_NOTICE_TITLE_MAX} characters).`;
    case 'body_too_long':
      return `Message is too long (max ${PLATFORM_NOTICE_BODY_MAX} characters).`;
    case 'kind_invalid':
      return 'Please choose whether this is an info or an important notice.';
    default:
      return 'Could not publish. Please try again.';
  }
};

export const PlatformNoticesTab: React.FC = () => {
  const { showToast } = useToast();
  const [notices, setNotices] = useState<PlatformNoticeLike[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<PlatformNoticeKind>('info');
  const [expiryDays, setExpiryDays] = useState(7);
  const [formError, setFormError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotices(await fetchPlatformNotices());
    } catch {
      setNotices([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublish = async () => {
    if (publishing) return;
    const err = validatePlatformNoticeInput({ title, body, kind });
    if (err) {
      setFormError(errorCopy(err));
      return;
    }
    setFormError(null);
    setPublishing(true);
    try {
      await publishPlatformNotice({
        title,
        body,
        kind,
        expiresAt: expiryDays === 0 ? 0 : Date.now() + expiryDays * DAY_MS,
      });
      setTitle('');
      setBody('');
      setKind('info');
      await load();
      showToast(
        'Notice published — every signed-in user sees it once in their Suchana, when they next open the app.',
        'success',
      );
    } catch (e) {
      setFormError(friendlyErrorText(e, 'en', 'generic'));
    } finally {
      setPublishing(false);
    }
  };

  const handleToggle = async (n: PlatformNoticeLike) => {
    if (busyId) return;
    setBusyId(n.id);
    try {
      await setPlatformNoticeActive(n.id, !n.active);
      await load();
    } catch (e) {
      showToast(friendlyErrorText(e, 'en', 'generic'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (n: PlatformNoticeLike) => {
    if (confirmDeleteId !== n.id) {
      setConfirmDeleteId(n.id);
      return;
    }
    setConfirmDeleteId(null);
    setBusyId(n.id);
    try {
      await deletePlatformNotice(n.id);
      await load();
      showToast('Notice deleted.', 'success');
    } catch (e) {
      showToast(friendlyErrorText(e, 'en', 'generic'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const now = Date.now();

  return (
    <div className="space-y-4">
      <GmCard>
        <GmSectionTitle
          action={
            <GmButton onClick={() => void load()} title="Reload the notice shelf">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </GmButton>
          }
        >
          <span className="inline-flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-saffron-400" /> Platform notices
          </span>
        </GmSectionTitle>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          Speak to every user at once — maintenance windows, new versions, policy changes. Each
          notice appears <strong className="text-slate-200">once</strong> in every signed-in
          user&apos;s Suchana, framed in their own language, when they next open the app. There is
          no push on the free plan: a notice reaches people on their next visit, never
          &ldquo;instantly&rdquo; — write only what stays true.
        </p>

        <div className="space-y-3">
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={PLATFORM_NOTICE_TITLE_MAX + 20}
              placeholder="Headline — e.g. Maintenance on Sunday, 6–8 am"
              aria-label="Notice headline"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-saffron-500"
            />
            <p className="text-[10px] text-slate-500 text-right mt-0.5 font-mono">
              {title.length} / {PLATFORM_NOTICE_TITLE_MAX}
            </p>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={PLATFORM_NOTICE_BODY_MAX + 20}
            placeholder="The notice in your own words (optional) — it is shown exactly as written, never machine-translated."
            aria-label="Notice message"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-saffron-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2" role="radiogroup" aria-label="Notice kind">
              {(
                [
                  ['info', 'Info — gentle'],
                  ['important', 'Important — action tier'],
                ] as Array<[PlatformNoticeKind, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={kind === value}
                  onClick={() => setKind(value)}
                  className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    kind === value
                      ? 'bg-saffron-500/90 text-white border-saffron-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              aria-label="Notice expiry"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-100 focus:outline-none focus:border-saffron-500"
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="text-xs font-bold text-red-400">{formError}</p>}
          <GmButton variant="primary" onClick={() => void handlePublish()} disabled={publishing}>
            <Send className="w-3.5 h-3.5" />
            {publishing ? 'Publishing…' : 'Publish notice'}
          </GmButton>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Only the platform SuperAdmin can publish — the Firestore rules refuse anyone else. A
            published notice&apos;s words can never be edited; switch it off here and publish a
            corrected one instead.
          </p>
        </div>
      </GmCard>

      <GmCard>
        <GmSectionTitle>The notice shelf</GmSectionTitle>
        {!loaded ? (
          <p className="text-xs text-slate-500">Loading notices…</p>
        ) : notices.length === 0 ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            No notices yet. The platform has not spoken — the first announcement starts above.
          </p>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => {
              const live = isNoticeLive(n, now);
              const expired = n.active && n.expiresAt > 0 && now >= n.expiresAt;
              return (
                <li key={n.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {n.kind === 'important' ? (
                      <GmBadge tone="red">Important</GmBadge>
                    ) : (
                      <GmBadge tone="sky">Info</GmBadge>
                    )}
                    {live ? (
                      <GmBadge tone="emerald">Live</GmBadge>
                    ) : expired ? (
                      <GmBadge tone="amber">Expired</GmBadge>
                    ) : (
                      <GmBadge tone="slate">Off</GmBadge>
                    )}
                    <span className="text-[11px] text-slate-500">{formatWhen(n.createdAt)}</span>
                    <span className="text-[11px] text-slate-500">
                      {n.expiresAt > 0 ? `Expires ${formatWhen(n.expiresAt)}` : 'No expiry'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-100">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <GmButton
                      variant="subtle"
                      disabled={busyId === n.id}
                      onClick={() => void handleToggle(n)}
                    >
                      {n.active ? 'Switch off' : 'Switch on'}
                    </GmButton>
                    <GmButton
                      variant={confirmDeleteId === n.id ? 'danger' : 'subtle'}
                      disabled={busyId === n.id}
                      onClick={() => void handleDelete(n)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === n.id ? 'Tap again to delete' : 'Delete'}
                    </GmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GmCard>
    </div>
  );
};
