/**
 * groups/CreateGroupSheet.tsx — create a group chat.
 * ====================================================
 * Name → type picker → invite members by Sanatani ID → create →
 * invite code reveal. Warm, calm, Sanatani tone throughout.
 */
import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Modal, T, useLocaleText } from '../../solo/ui';
import type { ChatParticipant } from '../types';
import { createGroup } from './groupService';
import { GROUP_TYPES, groupTypeIcon, groupTypeLabel, validGroupName, type GroupType } from './types';
import { gt } from './i18n';

const InviteReveal: React.FC<{
  groupName: string;
  inviteCode: string;
  onDone: (groupId: string) => void;
  groupId: string;
}> = ({ groupName, inviteCode, onDone, groupId }) => {
  const { lang } = useLocaleText();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      /* clipboard unavailable — the code is visible to copy manually */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="text-center py-2">
      <div className="text-4xl mb-3" aria-hidden>
        🪔
      </div>
      <h3 className="text-base font-extrabold text-stone-900">{groupName}</h3>
      <p className="text-sm text-stone-500 mt-2 leading-relaxed">{gt(lang, 'create.created')}</p>
      <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
          {gt(lang, 'invite.title')}
        </div>
        <div className="font-mono text-2xl font-extrabold tracking-[0.2em] text-stone-900 mt-2">
          {inviteCode}
        </div>
        <p className="text-[11px] text-stone-500 mt-2">{gt(lang, 'invite.hint')}</p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-bold px-5 py-2.5 min-h-[44px] text-sm"
        >
          {copied ? gt(lang, 'invite.copied') : gt(lang, 'invite.copy')}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onDone(groupId)}
        className="mt-4 w-full rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-50 font-bold py-3 min-h-[48px]"
      >
        <T en="Open the group →" bn="গ্রুপ খুলুন →" hi="समूह खोलें →" />
      </button>
    </div>
  );
};

export const CreateGroupSheet: React.FC<{
  uid: string;
  selfInfo: ChatParticipant;
  /** Prefill for yatra/family flows: name + type. */
  prefill?: { name?: string; type?: GroupType };
  onClose: () => void;
  onCreated: (groupId: string) => void;
}> = ({ uid, selfInfo, prefill, onClose, onCreated }) => {
  const { lang } = useLocaleText();
  const [name, setName] = useState(prefill?.name ?? '');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType>(prefill?.type ?? 'custom');
  const [members, setMembers] = useState<ChatParticipant[]>([]);
  const [sanataniId, setSanataniId] = useState('');
  const [adding, setAdding] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [nameError, setNameError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ groupId: string; inviteCode: string } | null>(null);

  const addMember = async () => {
    const clean = sanataniId.trim().toUpperCase();
    if (!/^SAN-[A-Z0-9]{6}$/.test(clean)) {
      setMemberError(gt(lang, 'invite.join.error'));
      return;
    }
    if (members.some((m) => m.sanataniId === clean)) {
      setMemberError('');
      setSanataniId('');
      return;
    }
    setAdding(true);
    setMemberError('');
    try {
      const q = query(collection(db, 'sanataniProfiles'), where('id', '==', clean), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setMemberError(gt(lang, 'invite.join.error'));
        return;
      }
      const d = snap.docs[0].data();
      const otherUid = d.uid as string;
      if (otherUid === uid) {
        setMemberError(gt(lang, 'info.you'));
        return;
      }
      setMembers((prev) => [
        ...prev,
        {
          uid: otherUid,
          displayName: (d.displayName as string) || 'Sanatani',
          sanataniId: clean,
          verificationTier: (d.verificationTier as string) || 'REGISTERED',
        },
      ]);
      setSanataniId('');
    } catch {
      setMemberError(gt(lang, 'error.generic'));
    } finally {
      setAdding(false);
    }
  };

  const submit = async () => {
    if (!validGroupName(name)) {
      setNameError(gt(lang, 'create.name.error'));
      return;
    }
    setNameError('');
    setBusy(true);
    try {
      const groupId = await createGroup(uid, selfInfo, {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        members,
      });
      // Read back the invite code for the reveal.
      const { getGroup } = await import('./groupService');
      const g = await getGroup(groupId);
      setCreated({ groupId, inviteCode: g?.inviteCode ?? '' });
    } catch {
      setNameError(gt(lang, 'error.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={gt(lang, 'create.title')} onClose={onClose}>
      {created ? (
        <InviteReveal
          groupName={name.trim()}
          inviteCode={created.inviteCode}
          groupId={created.groupId}
          onDone={onCreated}
        />
      ) : (
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-bold text-stone-800 block mb-1.5">
              {gt(lang, 'create.name')}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={gt(lang, 'create.name.ph')}
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-[15px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[48px]"
            />
            {nameError && <p className="text-sm text-red-600 font-semibold mt-1.5">{nameError}</p>}
          </div>

          {/* Type picker */}
          <div>
            <div className="text-sm font-bold text-stone-800 mb-1.5">{gt(lang, 'create.type')}</div>
            <div className="grid grid-cols-5 gap-2">
              {GROUP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`rounded-2xl border-2 py-2.5 px-1 min-h-[64px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    type === t
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-stone-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {groupTypeIcon(t)}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${type === t ? 'text-amber-800' : 'text-stone-500'}`}
                  >
                    {groupTypeLabel(t, lang as 'en' | 'bn' | 'hi')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <label className="text-sm font-bold text-stone-800 block mb-1.5">
              {gt(lang, 'create.about')}
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={gt(lang, 'create.about.ph')}
              maxLength={280}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-[15px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[48px]"
            />
          </div>

          {/* Members */}
          <div>
            <div className="text-sm font-bold text-stone-800 mb-1.5">{gt(lang, 'create.members')}</div>
            <p className="text-xs text-stone-500 mb-2">{gt(lang, 'create.members.hint')}</p>
            <div className="flex gap-2">
              <input
                value={sanataniId}
                onChange={(e) => setSanataniId(e.target.value.toUpperCase())}
                placeholder="SAN-XXXXXX"
                maxLength={10}
                autoCapitalize="characters"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-stone-300 bg-white font-mono text-base tracking-widest text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[48px]"
              />
              <button
                type="button"
                onClick={addMember}
                disabled={adding || !sanataniId.trim()}
                className="rounded-xl bg-amber-100 hover:bg-amber-200 disabled:opacity-50 text-amber-900 font-bold px-5 min-h-[48px]"
              >
                {adding ? '…' : gt(lang, 'create.add')}
              </button>
            </div>
            {memberError && (
              <p className="text-sm text-red-600 font-semibold mt-1.5">{memberError}</p>
            )}
            {members.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {members.map((m) => (
                  <span
                    key={m.uid}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 text-sm font-bold pl-3 pr-1.5 py-1"
                  >
                    {m.displayName}
                    <button
                      type="button"
                      onClick={() => setMembers((prev) => prev.filter((x) => x.uid !== m.uid))}
                      aria-label={`Remove ${m.displayName}`}
                      className="w-7 h-7 rounded-full hover:bg-amber-200 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-amber-50 font-bold py-3 min-h-[52px]"
          >
            {busy ? <T en="Creating…" bn="তৈরি হচ্ছে…" hi="बन रहा…" /> : gt(lang, 'create.submit')}
          </button>
        </div>
      )}
    </Modal>
  );
};
