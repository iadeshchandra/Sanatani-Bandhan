/**
 * sangam/stories/CreateStorySheet.tsx — share a 24h moment.
 * ============================================================================
 * Photo (File Vault upload, public visibility) or Text (5 warm backgrounds,
 * 120 chars). Preview before sharing. Stories vanish after 24h — no archive.
 */
import React, { useRef, useState } from 'react';
import { Modal } from '../ui';
import { uploadFile, resolveVaultUrl } from '../../lib/fileVault';
import { createStory } from './storyService';
import { backgroundCss, STORY_BACKGROUNDS, STORY_CAPTION_MAX, STORY_TEXT_MAX, type StoryBackgroundId, type StoryMediaType } from './types';
import { st, type StoryLang } from './i18n';

interface Props {
  uid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
  lang: StoryLang;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateStorySheet: React.FC<Props> = ({
  uid, authorName, authorAvatar, authorSanId, lang, onClose, onCreated,
}) => {
  const [mode, setMode] = useState<StoryMediaType>('photo');
  const [text, setText] = useState('');
  const [bg, setBg] = useState<StoryBackgroundId>('saffron');
  const [caption, setCaption] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    setUploading(true);
    try {
      const res = await uploadFile(f, { visibility: 'public', category: 'gallery', ownerUid: uid });
      setPhotoUrl(res.url);
      const src = await resolveVaultUrl(res.url).catch(() => null);
      setPreviewSrc(src);
    } catch {
      setError('upload');
    } finally {
      setUploading(false);
    }
  };

  const canShare = mode === 'photo' ? !!photoUrl && !uploading : text.trim().length > 0 && text.trim().length <= STORY_TEXT_MAX;

  const share = async () => {
    if (!canShare || sharing) return;
    setSharing(true);
    setError('');
    try {
      await createStory({
        authorUid: uid,
        authorName,
        authorAvatar,
        authorSanId,
        mediaType: mode,
        mediaUrl: mode === 'photo' ? photoUrl! : undefined,
        text: mode === 'text' ? text.trim() : undefined,
        backgroundId: mode === 'text' ? bg : undefined,
        caption: mode === 'photo' && caption.trim() ? caption.trim() : undefined,
      });
      onCreated();
      onClose();
    } catch {
      setError('share');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal title={st('stories.title', lang)} onClose={onClose}>
      <p className="text-xs text-stone-500 italic mb-4">{st('stories.vanish', lang)}</p>

      {/* Mode picker */}
      <div className="flex gap-2 mb-4" role="tablist">
        {(['photo', 'text'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl py-3 text-sm font-bold min-h-[48px] transition-colors ${
              mode === m ? 'bg-orange-600 text-white shadow' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {m === 'photo' ? `🖼️ ${st('stories.photo', lang)}` : `✏️ ${st('stories.text', lang)}`}
          </button>
        ))}
      </div>

      {mode === 'photo' ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          {previewSrc ? (
            <div className="relative rounded-2xl overflow-hidden mb-3">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={previewSrc} className="w-full max-h-64 object-cover" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold rounded-full px-3 py-2 min-h-[44px]"
              >
                {st('stories.choosePhoto', lang)}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 py-10 text-sm font-bold text-stone-500 min-h-[120px] disabled:opacity-50"
            >
              {uploading ? st('stories.uploading', lang) : `📷 ${st('stories.choosePhoto', lang)}`}
            </button>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, STORY_CAPTION_MAX))}
            placeholder={st('stories.caption', lang)}
            maxLength={STORY_CAPTION_MAX}
            className="w-full mt-3 px-4 py-3 rounded-xl border border-stone-200 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      ) : (
        <div>
          <div
            className="rounded-2xl min-h-[200px] flex items-center justify-center p-6 mb-3 transition-all"
            style={{ background: backgroundCss(bg) }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, STORY_TEXT_MAX))}
              placeholder={st('stories.writeSomething', lang)}
              rows={4}
              maxLength={STORY_TEXT_MAX}
              className="w-full bg-transparent text-white text-xl font-bold text-center placeholder:text-white/60 focus:outline-none resize-none"
            />
          </div>
          <p className="text-xs font-bold text-stone-500 mb-2">{st('stories.background', lang)}</p>
          <div className="flex gap-2 mb-1">
            {STORY_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBg(b.id)}
                aria-label={b.en}
                aria-pressed={bg === b.id}
                className={`w-11 h-11 rounded-full min-w-[44px] min-h-[44px] transition-transform ${bg === b.id ? 'ring-2 ring-offset-2 ring-orange-600 scale-110' : ''}`}
                style={{ background: b.css }}
              />
            ))}
          </div>
          <p className="text-[11px] text-stone-400 text-right">{text.length}/{STORY_TEXT_MAX}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 font-semibold mt-2">⚠️ {error}</p>}

      <button
        type="button"
        onClick={share}
        disabled={!canShare || sharing}
        className="mt-4 w-full rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-extrabold py-3.5 min-h-[52px] shadow"
      >
        {sharing ? st('stories.uploading', lang) : `🪔 ${st('stories.share', lang)}`}
      </button>
    </Modal>
  );
};
