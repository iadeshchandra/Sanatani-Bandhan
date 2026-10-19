/**
 * Sanatani Bandhan — Org event manager (trustee-only).
 * =====================================================
 * Trustees manage their org's `upcomingEvents` here: add, edit, delete —
 * and bridge each event to Sangam with one tap ("🪔 Share to Sangam").
 *
 * Bridge states per event:
 * - Not shared → "🪔 Share to Sangam" (only for concrete dates; free-text
 *   dates like "Every Purnima" can't become RSVP-able Sangam events)
 * - Shared → "↻ Sync to Sangam" (pushes edits) + "Unshare"
 *
 * All Sangam writes go through the Fix #1 path: createEvent (which uses
 * the whitelist-exact toCloudEvent serializer). Unshare deletes the
 * trustee's own Sangam event (rules: creator-delete, flagged).
 */
import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useSangam, type AuthorInfo } from '../sangam/sangamStore';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import {
  type OrgEventItem,
  MAX_ORG_EVENTS,
  ensureEventIds,
  canShareToSangam,
  isShared,
  buildSangamEventInput,
  buildSangamEventUpdate,
  validateOrgEvent,
} from './eventBridge';

export interface OrgEventManagerProps {
  orgId: string;
  orgName: string;
  /** Current events (raw from the org page doc). */
  events: OrgEventItem[];
  autoShare: boolean;
  /** Persist events + autoShare to orgPages (parent owns the write). */
  onSave: (events: OrgEventItem[], autoShare: boolean) => Promise<void>;
}

interface FormState {
  title: string;
  date: string;
  time: string;
  description: string;
}

const EMPTY_FORM: FormState = { title: '', date: '', time: '', description: '' };

export const OrgEventManager: React.FC<OrgEventManagerProps> = ({
  orgId,
  orgName,
  events,
  autoShare,
  onSave,
}) => {
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);
  const { createEvent } = useSangam();
  const { firebaseUser } = useAuthWorkspace();

  /** The trustee shares as themselves; the event carries the org's identity. */
  const author: AuthorInfo = {
    uid: firebaseUser?.uid || '',
    name: firebaseUser?.displayName || 'Trustee',
    sanId: '',
    kind: 'devotee',
  };

  const [items, setItems] = useState<OrgEventItem[]>(() => ensureEventIds(events));
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [shareState, setShareState] = useState(autoShare);

  const persist = async (next: OrgEventItem[], nextAutoShare: boolean) => {
    setItems(next);
    await onSave(next, nextAutoShare);
  };

  const setBusyKey = (key: string, v: boolean) =>
    setBusy((prev) => ({ ...prev, [key]: v }));

  /* ------------------------------ add / edit ------------------------------ */

  const openNew = () => {
    if (items.length >= MAX_ORG_EVENTS) return;
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (index: number) => {
    const it = items[index];
    setForm({
      title: it.title,
      date: it.date,
      time: it.time || '',
      description: it.description || '',
    });
    setFormError(null);
    setEditing(index);
  };

  const saveForm = async () => {
    const err = validateOrgEvent(form);
    if (err === 'title') {
      setFormError(T('orgev_err_title', 'Please give the event a title.', 'অনুষ্ঠানের একটি শিরোনাম দিন।', 'कृपया कार्यक्रम को शीर्षक दें।'));
      return;
    }
    if (err === 'date') {
      setFormError(T('orgev_err_date', 'Please add a date (YYYY-MM-DD) or a line like "Every Purnima".', 'একটি তারিখ (YYYY-MM-DD) বা "প্রতি পূর্ণিমা"-এর মতো একটি লাইন যোগ করুন।', 'तारीख (YYYY-MM-DD) या "हर पूर्णिमा" जैसी पंक्ति जोड़ें।'));
      return;
    }
    setBusyKey('form', true);
    try {
      let next: OrgEventItem[];
      let savedItem: OrgEventItem;
      if (editing === 'new') {
        savedItem = {
          id: `orgev-${Date.now().toString(36)}`,
          title: form.title.trim(),
          date: form.date.trim(),
          time: form.time.trim() || undefined,
          description: form.description.trim() || undefined,
        };
        next = [...items, savedItem];
      } else if (typeof editing === 'number') {
        savedItem = {
          ...items[editing],
          title: form.title.trim(),
          date: form.date.trim(),
          time: form.time.trim() || undefined,
          description: form.description.trim() || undefined,
        };
        next = items.map((it, i) => (i === editing ? savedItem : it));
      } else {
        return;
      }
      // Auto-share: the trustee opted in at org level, so a newly published
      // event goes to Sangam immediately — still their choice, default off.
      if (shareState && editing === 'new' && canShareToSangam(savedItem)) {
        const input = buildSangamEventInput(savedItem, { orgId, orgName });
        if (input) {
          const ev = await createEvent(author, input);
          savedItem = { ...savedItem, sangamEventId: ev.id };
          next = next.map((it) => (it.id === savedItem.id ? savedItem : it));
        }
      }
      await persist(next, shareState);
      // If an already-shared event was edited, push the edits to Sangam too.
      if (typeof editing === 'number' && isShared(savedItem)) {
        await syncToSangam(savedItem);
        return; // syncToSangam already persisted
      }
      setEditing(null);
    } finally {
      setBusyKey('form', false);
    }
  };

  const deleteItem = async (index: number) => {
    const it = items[index];
    if (!window.confirm(T('orgev_delete_confirm', `Remove "${it.title}" from your org page?`, `"${it.title}" আপনার প্রতিষ্ঠানের পেজ থেকে সরিয়ে দেবেন?`, `"${it.title}" को आपके संस्थान के पेज से हटाएँ?`))) return;
    setBusyKey(`del-${it.id}`, true);
    try {
      if (isShared(it)) {
        try {
          await deleteDoc(doc(db, 'sangamEvents', it.sangamEventId as string));
        } catch {
          /* already gone or offline — the org-page removal still proceeds */
        }
      }
      await persist(items.filter((_, i) => i !== index), shareState);
    } finally {
      setBusyKey(`del-${it.id}`, false);
    }
  };

  /* ------------------------------ bridge ------------------------------ */

  const shareToSangam = async (item: OrgEventItem) => {
    const input = buildSangamEventInput(item, { orgId, orgName });
    if (!input) return;
    setBusyKey(`share-${item.id}`, true);
    try {
      const ev = await createEvent(author, input);
      const next = items.map((it) =>
        it.id === item.id ? { ...it, sangamEventId: ev.id } : it
      );
      await persist(next, shareState);
    } finally {
      setBusyKey(`share-${item.id}`, false);
    }
  };

  /** Push org-event edits into the already-shared Sangam event. */
  const syncToSangam = async (item: OrgEventItem) => {
    if (!isShared(item)) return;
    const update = buildSangamEventUpdate(item, { orgId, orgName });
    if (!update) return;
    setBusyKey(`sync-${item.id}`, true);
    try {
      await updateDoc(doc(db, 'sangamEvents', item.sangamEventId as string), {
        ...update,
        updatedAt: serverTimestamp(),
      });
      setEditing(null);
    } finally {
      setBusyKey(`sync-${item.id}`, false);
    }
  };

  const unshareFromSangam = async (item: OrgEventItem) => {
    if (!isShared(item)) return;
    if (!window.confirm(T('orgev_unshare_confirm', `Remove "${item.title}" from Sangam? RSVPs will be lost.`, `"${item.title}" সংগম থেকে সরিয়ে দেবেন? RSVP হারিয়ে যাবে।`, `"${item.title}" को संगम से हटाएँ? RSVP खो जाएँगे।`))) return;
    setBusyKey(`unshare-${item.id}`, true);
    try {
      await deleteDoc(doc(db, 'sangamEvents', item.sangamEventId as string));
      const next = items.map((it) =>
        it.id === item.id ? { ...it, sangamEventId: undefined } : it
      );
      await persist(next, shareState);
    } finally {
      setBusyKey(`unshare-${item.id}`, false);
    }
  };

  const toggleAutoShare = async () => {
    const next = !shareState;
    setShareState(next);
    await onSave(items, next);
  };

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-black text-stone-700">
          {T('orgev_manage', '🛠️ Manage events', '🛠️ অনুষ্ঠান পরিচালনা', '🛠️ कार्यक्रम प्रबंधित करें')}
        </p>
        <button
          type="button"
          onClick={openNew}
          disabled={items.length >= MAX_ORG_EVENTS}
          className="min-h-[44px] px-4 rounded-xl bg-amber-700 text-white text-xs font-black shadow-sm hover:bg-amber-800 disabled:opacity-40 active:scale-[0.98] transition"
        >
          {T('orgev_add', '+ Add event', '+ অনুষ্ঠান যোগ করুন', '+ कार्यक्रम जोड़ें')}
        </button>
      </div>

      {/* Auto-share toggle — default OFF, trustee's explicit choice. */}
      <label className="flex items-start gap-3 bg-amber-50/70 border border-amber-200 rounded-2xl p-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={shareState}
          onChange={toggleAutoShare}
          className="mt-1 w-5 h-5 accent-amber-700"
        />
        <span>
          <span className="block text-xs font-black text-stone-800">
            {T('orgev_autoshare', '🪔 Always share new events to Sangam', '🪔 নতুন অনুষ্ঠান সবসময় সংগমে শেয়ার করুন', '🪔 नए कार्यक्रम हमेशा संगम में साझा करें')}
          </span>
          <span className="block text-[11px] text-stone-500 mt-0.5 leading-relaxed">
            {T('orgev_autoshare_hint', 'When on, each event you publish appears in Sangam at once. You can unshare any time.', 'চালু থাকলে, আপনি প্রকাশ করা প্রতিটি অনুষ্ঠান একসাথে সংগমে দেখা যাবে। যেকোনো সময় আনশেয়ার করতে পারেন।', 'चालू होने पर, आपके प्रकाशित हर कार्यक्रम तुरंत संगम में दिखेगा। आप कभी भी अनशेयर कर सकते हैं।')}
          </span>
        </span>
      </label>

      {items.length === 0 && editing !== 'new' && (
        <p className="text-xs text-stone-400">
          {T('orgev_empty', 'No events yet. Add your first one above.', 'এখনও কোনো অনুষ্ঠান নেই। উপরে প্রথমটি যোগ করুন।', 'अभी कोई कार्यक्रम नहीं। ऊपर पहला जोड़ें।')}
        </p>
      )}

      <ul className="space-y-2.5">
        {items.map((it, i) => {
          const shared = isShared(it);
          const shareable = canShareToSangam(it);
          return (
            <li key={it.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-stone-900 flex items-center gap-2">
                    {it.title}
                    {shared && (
                      <span className="text-[10px] font-black bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                        {T('orgev_on_sangam', '🪔 On Sangam', '🪔 সংগমে', '🪔 संगम पर')}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {[it.date, it.time].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(i)}
                    className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white border border-stone-300 text-xs font-black text-stone-700"
                    aria-label={T('orgev_edit', 'Edit', 'সম্পাদনা', 'संपादित करें')}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(i)}
                    disabled={!!busy[`del-${it.id}`]}
                    className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white border border-stone-300 text-xs font-black text-red-700 disabled:opacity-50"
                    aria-label={T('orgev_delete', 'Delete', 'মুছুন', 'हटाएँ')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {!shared ? (
                  <button
                    type="button"
                    onClick={() => shareToSangam(it)}
                    disabled={!shareable || !!busy[`share-${it.id}`]}
                    title={
                      shareable
                        ? undefined
                        : T('orgev_share_hint', 'Only events with a concrete date can be shared to Sangam.', 'শুধুমাত্র নির্দিষ্ট তারিখের অনুষ্ঠান সংগমে শেয়ার করা যায়।', 'केवल ठोस तारीख वाले कार्यक्रम संगम में साझा किए जा सकते हैं।')
                    }
                    className="min-h-[44px] px-4 rounded-xl bg-orange-600 text-white text-xs font-black shadow-sm hover:bg-orange-700 disabled:opacity-40 active:scale-[0.98] transition"
                  >
                    {busy[`share-${it.id}`]
                      ? T('orgev_sharing', 'Sharing…', 'শেয়ার হচ্ছে…', 'साझा हो रहा…')
                      : T('orgev_share', '🪔 Share to Sangam', '🪔 সংগমে শেয়ার করুন', '🪔 संगम में साझा करें')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => syncToSangam(it)}
                      disabled={!!busy[`sync-${it.id}`]}
                      className="min-h-[44px] px-4 rounded-xl bg-white border border-orange-300 text-orange-800 text-xs font-black hover:bg-orange-50 active:scale-[0.98] transition"
                    >
                      {busy[`sync-${it.id}`]
                        ? T('orgev_syncing', 'Syncing…', 'সিঙ্ক হচ্ছে…', 'सिंक हो रहा…')
                        : T('orgev_sync', '↻ Sync to Sangam', '↻ সংগমে সিঙ্ক করুন', '↻ संगम में सिंक करें')}
                    </button>
                    <button
                      type="button"
                      onClick={() => unshareFromSangam(it)}
                      disabled={!!busy[`unshare-${it.id}`]}
                      className="min-h-[44px] px-4 rounded-xl bg-white border border-stone-300 text-stone-600 text-xs font-black hover:bg-stone-100 active:scale-[0.98] transition"
                    >
                      {T('orgev_unshare', 'Unshare', 'আনশেয়ার', 'अनशेयर')}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Add / edit form */}
      {editing !== null && (
        <div className="mt-4 bg-white border-2 border-amber-300 rounded-2xl p-4">
          <p className="text-xs font-black text-stone-800 mb-3">
            {editing === 'new'
              ? T('orgev_new', '✨ New event', '✨ নতুন অনুষ্ঠান', '✨ नया कार्यक्रम')
              : T('orgev_edit_title', '✏️ Edit event', '✏️ অনুষ্ঠান সম্পাদনা', '✏️ कार्यक्रम संपादित करें')}
          </p>
          <label className="block text-[11px] font-black text-stone-600 mb-1">
            {T('orgev_f_title', 'Title', 'শিরোনাম', 'शीर्षक')}
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={T('orgev_f_title_ph', 'e.g. Janmashtami Mahotsav', 'যেমন: জন্মাষ্টমী মহোৎসব', 'जैसे: जन्माष्टमी महोत्सव')}
            className="w-full min-h-[44px] rounded-xl border border-stone-300 px-3 text-sm mb-3"
          />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">
                {T('orgev_f_date', 'Date', 'তারিখ', 'तारीख')}
              </label>
              <input
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-full min-h-[44px] rounded-xl border border-stone-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">
                {T('orgev_f_time', 'Time (optional)', 'সময় (ঐচ্ছিক)', 'समय (वैकल्पिक)')}
              </label>
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="18:00"
                className="w-full min-h-[44px] rounded-xl border border-stone-300 px-3 text-sm"
              />
            </div>
          </div>
          <p className="text-[11px] text-stone-400 mb-3">
            {T('orgev_f_date_hint', 'A real date (YYYY-MM-DD) lets you share to Sangam. Free text like "Every Purnima" stays on your page only.', 'আসল তারিখ (YYYY-MM-DD) থাকলে সংগমে শেয়ার করতে পারবেন। "প্রতি পূর্ণিমা"-এর মতো ফ্রি টেক্সট শুধু আপনার পেজে থাকবে।', 'असली तारीख (YYYY-MM-DD) होने पर संगम में साझा कर सकते हैं। "हर पूर्णिमा" जैसा फ्री टेक्स्ट केवल आपके पेज पर रहेगा।')}
          </p>
          <label className="block text-[11px] font-black text-stone-600 mb-1">
            {T('orgev_f_desc', 'Description (optional)', 'বিবরণ (ঐচ্ছিক)', 'विवरण (वैकल्पिक)')}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm mb-3"
          />
          {formError && <p className="text-xs font-bold text-red-700 mb-3">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveForm}
              disabled={!!busy['form']}
              className="min-h-[44px] px-6 rounded-xl bg-amber-700 text-white text-sm font-black shadow-sm hover:bg-amber-800 disabled:opacity-50 active:scale-[0.98] transition"
            >
              {busy['form']
                ? T('orgev_saving', 'Saving…', 'সংরক্ষণ হচ্ছে…', 'सहेजा जा रहा…')
                : T('orgev_save', 'Save event', 'অনুষ্ঠান সংরক্ষণ', 'कार्यक्रम सहेजें')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-[44px] px-6 rounded-xl bg-white border border-stone-300 text-sm font-black text-stone-600 active:scale-[0.98] transition"
            >
              {T('orgev_cancel', 'Cancel', 'বাতিল', 'रद्द करें')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
