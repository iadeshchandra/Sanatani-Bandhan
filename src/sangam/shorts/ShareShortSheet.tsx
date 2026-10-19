/**
 * sangam/shorts/ShareShortSheet.tsx — share a YouTube Short as a sacred moment.
 * ============================================================================
 * Paste URL → inline validation → thumbnail preview → title + caption → post.
 * Warm, simple, never more than one screen of decisions.
 */
import React, { useState } from 'react';
import { extractShortId, shortThumbnail, validateShortShare } from './types';
import { st, type ShortsLang } from './i18n';
import { shareShort } from './shortsService';

interface Props {
  lang: ShortsLang;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
  onShared: () => void;
  onClose: () => void;
}

export const ShareShortSheet: React.FC<Props> = ({
  lang,
  authorUid,
  authorName,
  authorAvatar,
  authorSanId,
  onShared,
  onClose,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewId = extractShortId(url);

  const submit = async () => {
    const v = validateShortShare(url, title, caption);
    if (!v.ok || !v.youtubeId) {
      const key =
        v.error === 'empty'
          ? 'shorts.errEmpty'
          : v.error === 'not_youtube'
            ? 'shorts.errNotYoutube'
            : v.error === 'bad_title'
              ? 'shorts.errTitle'
              : 'shorts.errCaption';
      setError(st(key, lang));
      return;
    }
    setError(null);
    setPosting(true);
    try {
      await shareShort({
        youtubeId: v.youtubeId,
        title,
        caption: caption || undefined,
        authorUid,
        authorName,
        authorAvatar,
        authorSanId,
      });
      onShared();
    } catch {
      setError(st('shorts.errNotYoutube', lang));
    }
    setPosting(false);
  };

  return (
    <div className="fixed inset-0 z-[9996] flex items-end sm:items-center justify-center" role="dialog">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="✕" />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-stone-800">⚡ {st('shorts.shareTitle', lang)}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 text-xl"
            aria-label="✕"
          >
            ✕
          </button>
        </div>

        <label className="block text-sm font-bold text-stone-700 mb-1">
          {st('shorts.urlLabel', lang)}
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={st('shorts.urlPlaceholder', lang)}
          inputMode="url"
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm min-h-[44px] mb-3"
        />

        {previewId && (
          <div className="flex gap-3 mb-3 p-2 rounded-2xl bg-stone-50">
            <img
              src={shortThumbnail(previewId)}
              alt=""
              className="w-16 h-24 object-cover rounded-xl bg-stone-200"
              loading="lazy"
            />
            <p className="text-xs text-stone-500 self-center">✓ YouTube Short</p>
          </div>
        )}

        <label className="block text-sm font-bold text-stone-700 mb-1">
          {st('shorts.titleLabel', lang)}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={st('shorts.titlePlaceholder', lang)}
          maxLength={120}
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm min-h-[44px] mb-3"
        />

        <label className="block text-sm font-bold text-stone-700 mb-1">
          {st('shorts.captionLabel', lang)}
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={st('shorts.captionPlaceholder', lang)}
          maxLength={200}
          rows={2}
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm mb-4"
        />

        {error && <p className="text-red-600 text-sm font-bold mb-3">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={posting}
          className="w-full min-h-[48px] rounded-2xl bg-amber-600 text-white font-extrabold disabled:opacity-50"
        >
          {posting ? st('shorts.posting', lang) : `🪔 ${st('shorts.post', lang)}`}
        </button>
      </div>
    </div>
  );
};
