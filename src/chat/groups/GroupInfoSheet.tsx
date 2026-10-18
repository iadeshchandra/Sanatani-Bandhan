/**
 * groups/GroupInfoSheet.tsx — group info + management.
 * ======================================================
 * Member list with admin badges, add/remove (admin), rename (admin),
 * invite code + regenerate (admin), leave, delete (admin, confirmed).
 */
import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Modal, T, useLocaleText } from '../../solo/ui';
import { ChatAvatar } from '../ChatList';
import type { ChatParticipant } from '../types';
import {
  addGroupMember,
  deleteGroup,
  leaveGroup,
  promoteMember,
  regenerateInviteCode,
  removeGroupMember,
  renameGroup,
} from './groupService';
import { GroupAvatar } from './GroupThread';
import { isGroupAdmin, type GroupChat } from './types';
import { gt } from './i18n';

const ConfirmRow: React.FC<{
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  busy?: boolean;
}> = ({ message, onConfirm, onCancel, danger, busy }) => {
  const { lang } = useLocaleText();
  return (
    <div className="rounded-2xl bg-stone-100 p-4 mt-2">
      <p className="text-sm font-bold text-stone-800">{message}</p>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold py-2.5 min-h-[44px]"
        >
          {gt(lang, 'info.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-xl font-bold py-2.5 min-h-[44px] disabled:opacity-50 ${
            danger ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-amber-700 hover:bg-amber-800 text-amber-50'
          }`}
        >
          {gt(lang, 'info.confirm')}
        </button>
      </div>
    </div>
  );
};

export const GroupInfoSheet: React.FC<{
  uid: string;
  group: GroupChat;
  onClose: () => void;
  onLeftOrDeleted: () => void;
}> = ({ uid, group, onClose, onLeftOrDeleted }) => {
  const { lang } = useLocaleText();
  const admin = isGroupAdmin(group, uid);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [addingMember, setAddingMember] = useState(false);
  const [sanataniId, setSanataniId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'leave' | 'delete' | 'remove:' | null>(null);
  const [removeTarget, setRemoveTarget] = useState('');
  const [copied, setCopied] = useState(false);

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      after?.();
    } catch {
      setError(gt(lang, 'error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const doRename = () =>
    run(async () => {
      await renameGroup(group.id, uid, newName);
      setRenaming(false);
    });

  const doAddMember = async () => {
    const clean = sanataniId.trim().toUpperCase();
    if (!/^SAN-[A-Z0-9]{6}$/.test(clean)) {
      setError(gt(lang, 'invite.join.error'));
      return;
    }
    await run(async () => {
      const q = query(collection(db, 'sanataniProfiles'), where('id', '==', clean), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('not found');
      const d = snap.docs[0].data();
      const otherUid = d.uid as string;
      if (otherUid === uid) throw new Error('self');
      const info: ChatParticipant = {
        uid: otherUid,
        displayName: (d.displayName as string) || 'Sanatani',
        sanataniId: clean,
        verificationTier: (d.verificationTier as string) || 'REGISTERED',
      };
      await addGroupMember(group.id, uid, info);
      setSanataniId('');
      setAddingMember(false);
    });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
    } catch {
      /* visible to copy manually */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sortedMembers = [...group.memberIds].sort((a, b) => {
    const aAdmin = group.adminIds.includes(a) ? 0 : 1;
    const bAdmin = group.adminIds.includes(b) ? 0 : 1;
    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
    return (group.memberInfo[a]?.displayName ?? '').localeCompare(group.memberInfo[b]?.displayName ?? '');
  });

  return (
    <Modal title={gt(lang, 'info.title')} onClose={onClose}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <GroupAvatar type={group.type} size={56} name={group.name} />
          <div className="flex-1 min-w-0">
            {renaming ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={60}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-stone-300 text-[15px] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={doRename}
                  disabled={busy}
                  className="rounded-xl bg-amber-700 text-amber-50 font-bold px-4 min-h-[44px] disabled:opacity-50"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-stone-900 truncate">{group.name}</h3>
                {admin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewName(group.name);
                      setRenaming(true);
                    }}
                    aria-label={gt(lang, 'info.rename')}
                    className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500"
                  >
                    ✎
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-stone-500">
              👥 {group.memberIds.length} {gt(lang, group.memberIds.length === 1 ? 'list.member' : 'list.members')}
            </p>
          </div>
        </div>
        {group.description && <p className="text-sm text-stone-600 leading-relaxed">{group.description}</p>}

        {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

        {/* Invite code */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
            {gt(lang, 'invite.title')}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-mono text-lg font-extrabold tracking-[0.15em] text-stone-900">
              {group.inviteCode}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg bg-amber-700 text-amber-50 text-xs font-bold px-3 py-2 min-h-[36px]"
            >
              {copied ? '✓' : gt(lang, 'invite.copy')}
            </button>
            {admin && (
              <button
                type="button"
                onClick={() => run(() => regenerateInviteCode(group.id, uid).then(() => {}))}
                disabled={busy}
                className="rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-bold px-3 py-2 min-h-[36px] disabled:opacity-50"
              >
                {gt(lang, 'invite.regenerate')}
              </button>
            )}
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5">{gt(lang, 'invite.hint')}</p>
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-stone-800">
              {gt(lang, 'info.members')} ({group.memberIds.length})
            </span>
            {admin && (
              <button
                type="button"
                onClick={() => setAddingMember((s) => !s)}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 min-h-[36px] px-2"
              >
                + {gt(lang, 'info.addMember')}
              </button>
            )}
          </div>
          {addingMember && admin && (
            <div className="flex gap-2 mb-2">
              <input
                value={sanataniId}
                onChange={(e) => setSanataniId(e.target.value.toUpperCase())}
                placeholder="SAN-XXXXXX"
                maxLength={10}
                autoCapitalize="characters"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-stone-300 font-mono text-sm tracking-widest min-h-[44px]"
              />
              <button
                type="button"
                onClick={doAddMember}
                disabled={busy || !sanataniId.trim()}
                className="rounded-xl bg-amber-700 text-amber-50 font-bold px-4 min-h-[44px] disabled:opacity-50"
              >
                {gt(lang, 'create.add')}
              </button>
            </div>
          )}
          <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
            {sortedMembers.map((mid) => {
              const person = group.memberInfo[mid] ?? { uid: mid, displayName: 'Sanatani' };
              const isAdmin = group.adminIds.includes(mid);
              const isMe = mid === uid;
              return (
                <li key={mid} className="flex items-center gap-2.5 py-2">
                  <ChatAvatar person={person} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-stone-900 truncate">
                        {person.displayName}
                        {isMe && <span className="text-stone-400 font-medium"> ({gt(lang, 'info.you')})</span>}
                      </span>
                      {isAdmin && (
                        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                          {gt(lang, 'info.admin')}
                        </span>
                      )}
                    </div>
                    {person.sanataniId && (
                      <div className="text-[11px] font-mono text-stone-400">{person.sanataniId}</div>
                    )}
                  </div>
                  {admin && !isMe && (
                    <div className="flex gap-1 shrink-0">
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => run(() => promoteMember(group.id, uid, mid))}
                          disabled={busy}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-900 px-2 min-h-[36px] disabled:opacity-50"
                        >
                          {gt(lang, 'info.promote')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveTarget(mid);
                          setConfirming('remove:');
                        }}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 px-2 min-h-[36px]"
                      >
                        {gt(lang, 'info.remove')}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {confirming === 'remove:' && (
            <ConfirmRow
              message={gt(lang, 'info.remove.confirm')}
              busy={busy}
              onCancel={() => {
                setConfirming(null);
                setRemoveTarget('');
              }}
              onConfirm={() =>
                run(() => removeGroupMember(group.id, uid, removeTarget), () => {
                  setConfirming(null);
                  setRemoveTarget('');
                })
              }
            />
          )}
        </div>

        {/* Leave / Delete */}
        <div className="border-t border-stone-200 pt-3 space-y-2">
          {confirming === 'leave' ? (
            <ConfirmRow
              message={gt(lang, 'info.leave.confirm')}
              busy={busy}
              onCancel={() => setConfirming(null)}
              onConfirm={() => run(() => leaveGroup(group.id, uid), onLeftOrDeleted)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirming('leave')}
              className="w-full rounded-xl border border-stone-300 text-stone-700 font-bold py-3 min-h-[48px] hover:bg-stone-50"
            >
              {gt(lang, 'info.leave')}
            </button>
          )}
          {admin &&
            (confirming === 'delete' ? (
              <ConfirmRow
                message={gt(lang, 'info.delete.confirm')}
                danger
                busy={busy}
                onCancel={() => setConfirming(null)}
                onConfirm={() => run(() => deleteGroup(group.id, uid), onLeftOrDeleted)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setConfirming('delete')}
                className="w-full rounded-xl border border-red-300 text-red-700 font-bold py-3 min-h-[48px] hover:bg-red-50"
              >
                {gt(lang, 'info.delete')}
              </button>
            ))}
        </div>

        <p className="text-[11px] text-stone-400 text-center">
          <T
            en="Groups are private — only invited members see messages."
            bn="গ্রুপ ব্যক্তিগত — শুধু আমন্ত্রিত সদস্যরাই বার্তা দেখতে পান।"
            hi="समूह निजी हैं — केवल आमंत्रित सदस्य संदेश देखते हैं।"
          />
        </p>
      </div>
    </Modal>
  );
};
