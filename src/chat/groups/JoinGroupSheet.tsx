/**
 * groups/JoinGroupSheet.tsx — join a group via invite code.
 * ===========================================================
 * No discovery, no search — the code is the only door.
 */
import React, { useState } from 'react';
import { Modal, useLocaleText } from '../../solo/ui';
import type { ChatParticipant } from '../types';
import { joinGroupViaCode } from './groupService';
import { gt } from './i18n';

export const JoinGroupSheet: React.FC<{
  uid: string;
  selfInfo: ChatParticipant;
  onClose: () => void;
  onJoined: (groupId: string) => void;
}> = ({ uid, selfInfo, onClose, onJoined }) => {
  const { lang } = useLocaleText();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z2-9]{8}$/.test(clean)) {
      setError(gt(lang, 'invite.join.error'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const groupId = await joinGroupViaCode(uid, selfInfo, clean);
      onJoined(groupId);
    } catch {
      setError(gt(lang, 'invite.join.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={gt(lang, 'invite.join.title')} onClose={onClose}>
      <div className="text-center py-2">
        <div className="text-4xl mb-3" aria-hidden>
          🙏
        </div>
        <p className="text-sm text-stone-500 mb-4">{gt(lang, 'invite.hint')}</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
          placeholder={gt(lang, 'invite.join.ph')}
          maxLength={8}
          autoCapitalize="characters"
          className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white font-mono text-xl tracking-[0.3em] text-center text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[56px]"
        />
        {error && <p className="text-sm text-red-600 font-semibold mt-2">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy || code.trim().length < 8}
          className="mt-4 w-full rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-amber-50 font-bold py-3 min-h-[52px]"
        >
          {busy ? '…' : gt(lang, 'invite.join.submit')}
        </button>
      </div>
    </Modal>
  );
};
