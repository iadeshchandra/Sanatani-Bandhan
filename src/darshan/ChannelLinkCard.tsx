/**
 * darshan/ChannelLinkCard.tsx — org admin links their YouTube channel.
 * Lives in org settings. Validates before saving.
 */
import React, { useState } from 'react';
import { parseChannelInput } from './channel';
import { dt, type Lang } from './i18n';

interface Props {
  orgId: string;
  orgName: string;
  currentChannelId?: string;
  lang?: Lang;
  /** Persist the validated channel ID to the org doc. */
  onSave: (channelId: string) => Promise<void>;
}

export const ChannelLinkCard: React.FC<Props> = ({
  orgId,
  orgName,
  currentChannelId,
  lang = 'en',
  onSave,
}) => {
  const [input, setInput] = useState(currentChannelId || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const parsed = parseChannelInput(input);
    if (!parsed.ok) {
      setError(
        parsed.reason === 'handle_needs_api'
          ? dt('darshan.handleNeedsApi', lang)
          : dt('darshan.invalidChannel', lang),
      );
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(parsed.channelId!);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5" data-org={orgId}>
      <h3 className="font-extrabold text-stone-900 mb-1">
        📹 {dt('darshan.linkChannel', lang)}
      </h3>
      <p className="text-sm text-stone-500 mb-4">{dt('darshan.channelHint', lang)}</p>
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError('');
        }}
        placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
        className="w-full px-4 py-3 rounded-xl border border-stone-300 font-mono text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-500"
        aria-label={dt('darshan.linkChannel', lang)}
      />
      {error && <p className="text-sm text-red-600 font-semibold mt-2">{error}</p>}
      {saved && (
        <p className="text-sm text-emerald-700 font-bold mt-2">✓ {orgName}</p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving || !input.trim()}
        className="mt-3 px-6 py-3 min-h-[48px] rounded-2xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-amber-50 font-bold text-sm"
      >
        {saving ? '…' : dt('darshan.linkChannel', lang)}
      </button>
    </div>
  );
};
