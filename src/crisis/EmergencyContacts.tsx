/**
 * crisis/EmergencyContacts.tsx — the family circle.
 * ================================================
 * Add / edit / delete emergency contacts (name, phone, relation), stored in
 * `emergencyContacts/{uid}`. Their phones are attached to every SOS via
 * `familyNotified` so responders and the sangha know who to call.
 *
 * Also exports EmergencyContactsNudge — shown when the circle is empty:
 * "Who should we call if you're in danger?" Warm, not scary.
 */
import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Plus, Pencil, Trash2, Phone, Loader2, HeartHandshake, X } from 'lucide-react';
import { loadEmergencyContacts, saveEmergencyContacts } from './sosService';
import { CrisisSkeletonList } from './CrisisSkeleton';
import type { EmergencyContact } from './types';
import { crisisCopy, useCrisisT } from './crisisStrings';

const PHONE_RE = /^[+\d][\d\s\-()]{5,18}$/;

function emptyForm(): EmergencyContact {
  return { name: '', phone: '', relation: '' };
}

export const EmergencyContactsNudge: React.FC<{ onSetup: () => void }> = ({ onSetup }) => {
  const t = useCrisisT();
  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shrink-0 shadow">
          <HeartHandshake className="w-6 h-6 text-amber-50" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-stone-800 leading-snug">{t(crisisCopy.nudgeText)}</p>
      </div>
      <button
        type="button"
        onClick={onSetup}
        className="mt-4 w-full min-h-[52px] rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 font-bold shadow hover:brightness-110"
      >
        {t(crisisCopy.contactsTitle)}
      </button>
    </div>
  );
};

export const EmergencyContacts: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const t = useCrisisT();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<EmergencyContact>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    loadEmergencyContacts(uid)
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next: EmergencyContact[]) => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await saveEmergencyContacts(uid, next);
      setContacts(next);
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (i: number) => {
    setForm({ ...contacts[i] });
    setFormError(null);
    setEditing(i);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setFormError(t(crisisCopy.contactName));
      return;
    }
    if (!PHONE_RE.test(form.phone.trim())) {
      setFormError(t(crisisCopy.invalidPhone));
      return;
    }
    const clean: EmergencyContact = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      relation: form.relation.trim(),
    };
    const next = editing === 'new' ? [...contacts, clean] : contacts.map((c, i) => (i === editing ? clean : c));
    await persist(next);
    setEditing(null);
  };

  const remove = async (i: number) => {
    await persist(contacts.filter((_, j) => j !== i));
  };

  return (
    <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-stone-100 p-5 sm:p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900">{t(crisisCopy.contactsTitle)}</h2>
          <p className="text-sm text-stone-600 mt-1">{t(crisisCopy.contactsSubtitle)}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t(crisisCopy.close)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-200/70 text-stone-700 hover:bg-stone-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading ? (
        <CrisisSkeletonList rows={2} />
      ) : (
        <>
          {contacts.length === 0 && editing === null && (
            <p className="mt-4 text-sm text-stone-600 bg-white rounded-2xl p-4 shadow-sm">
              {t(crisisCopy.noContacts)}
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {contacts.map((c, i) => (
              <li key={`${c.phone}-${i}`} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-extrabold shrink-0" aria-hidden>
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 truncate">{c.name}</p>
                  <p className="text-sm text-stone-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" aria-hidden />
                    <a href={`tel:${c.phone}`} className="underline decoration-amber-300">
                      {c.phone}
                    </a>
                    {c.relation && <span className="text-stone-400">· {c.relation}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(i)}
                  aria-label={t(crisisCopy.edit)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  <Pencil className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(i)}
                  aria-label={t(crisisCopy.delete)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </li>
            ))}
          </ul>

          {editing !== null ? (
            <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div>
                <label htmlFor="ec-name" className="text-xs font-semibold text-stone-600">
                  {t(crisisCopy.contactName)}
                </label>
                <input
                  id="ec-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="ec-phone" className="text-xs font-semibold text-stone-600">
                  {t(crisisCopy.contactPhone)}
                </label>
                <input
                  id="ec-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+880 …"
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="ec-relation" className="text-xs font-semibold text-stone-600">
                  {t(crisisCopy.contactRelation)}
                </label>
                <input
                  id="ec-relation"
                  value={form.relation}
                  onChange={(e) => setForm({ ...form, relation: e.target.value })}
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {formError && (
                <p className="text-sm font-semibold text-red-800" role="alert">
                  {formError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 min-h-[52px] rounded-2xl bg-stone-200 text-stone-800 font-bold hover:bg-stone-300"
                >
                  {t(crisisCopy.cancel)}
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={saving}
                  className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 font-bold shadow hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                  {t(crisisCopy.save)}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openNew}
              className="mt-4 w-full min-h-[52px] rounded-2xl border-2 border-dashed border-amber-400 text-amber-900 font-bold flex items-center justify-center gap-2 hover:bg-amber-100/60"
            >
              <Plus className="w-5 h-5" aria-hidden />
              {t(crisisCopy.addContact)}
            </button>
          )}
        </>
      )}
    </div>
  );
};
