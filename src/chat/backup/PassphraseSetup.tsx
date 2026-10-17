/**
 * chat/backup/PassphraseSetup.tsx — sealing-words creation.
 * ==========================================================
 * Gentle two-field flow (create + confirm). Sanatani tone, never technical.
 * The passphrase is returned to the caller and never stored.
 *
 * Note: each backup mints its own one-time recovery key, shown right after
 * sealing — so setup only needs the words.
 */
import React, { useState } from 'react';
import { useBackupStrings } from './strings';

export const PassphraseSetup: React.FC<{
  onComplete: (passphrase: string) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const { tr } = useBackupStrings();
  const [words, setWords] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (words.trim().length < 8) {
      setError(tr.passphraseTooShort);
      return;
    }
    if (words !== confirm) {
      setError(tr.passphraseMismatch);
      return;
    }
    setError('');
    onComplete(words);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2" aria-hidden>
          🪔
        </div>
        <h3 className="text-base font-extrabold text-stone-900">{tr.passphraseTitle}</h3>
        <p className="text-sm text-stone-600 mt-1 leading-relaxed">{tr.passphraseDesc}</p>
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">{tr.passphrasePlaceholder}</span>
          <input
            type="password"
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder={tr.passphrasePlaceholder}
            autoComplete="new-password"
            className="w-full min-h-[44px] rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>
        <label className="block">
          <span className="sr-only">{tr.passphraseConfirm}</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={tr.passphraseConfirm}
            autoComplete="new-password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            className="w-full min-h-[44px] rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-600"
        >
          {tr.back}
        </button>
        <button
          type="button"
          onClick={submit}
          className="flex-[2] min-h-[44px] rounded-2xl bg-gradient-to-br from-amber-700 to-orange-700 text-white text-sm font-extrabold shadow"
        >
          {tr.continue} →
        </button>
      </div>
    </div>
  );
};
