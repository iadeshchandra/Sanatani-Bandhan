/**
 * chat/backup/PassphrasePrompt.tsx — "speak your sealing words" prompt.
 * =====================================================================
 * Used at backup-now time and restore time when the seal already exists.
 * The words are handed to the caller and never stored.
 */
import React, { useState } from 'react';
import { useBackupStrings } from './strings';

export const PassphrasePrompt: React.FC<{
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
  busy?: boolean;
}> = ({ onSubmit, onCancel, busy }) => {
  const { tr } = useBackupStrings();
  const [words, setWords] = useState('');

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2" aria-hidden>
          🪔
        </div>
        <h3 className="text-base font-extrabold text-stone-900">{tr.passphraseTitle}</h3>
        <p className="text-sm text-stone-600 mt-1 leading-relaxed">{tr.passphraseDesc}</p>
      </div>
      <label className="block">
        <span className="sr-only">{tr.passphrasePlaceholder}</span>
        <input
          type="password"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder={tr.passphrasePlaceholder}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && words.trim()) onSubmit(words);
          }}
          className="w-full min-h-[44px] rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 min-h-[44px] rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-600 disabled:opacity-50"
        >
          {tr.back}
        </button>
        <button
          type="button"
          onClick={() => words.trim() && onSubmit(words)}
          disabled={busy || !words.trim()}
          className="flex-[2] min-h-[44px] rounded-2xl bg-gradient-to-br from-amber-700 to-orange-700 text-white text-sm font-extrabold shadow disabled:opacity-50"
        >
          {busy ? tr.backingUp : tr.backupNow}
        </button>
      </div>
    </div>
  );
};
