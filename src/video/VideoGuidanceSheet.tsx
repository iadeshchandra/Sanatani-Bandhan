/**
 * video/VideoGuidanceSheet.tsx — warm guidance when a user picks a video file.
 * ============================================================================
 * We never host video (standing law — YouTube backbone). This sheet honors
 * the user's intent instead of cold-erroring: it explains our design choice
 * warmly and walks them through the 30-second YouTube path, ending with
 * their video shining in Watch.
 *
 * Tone law: never "you can't" — always "here's how you can."
 */
import React, { useState } from 'react';
import { Modal, Field, Btn } from '../sangam/ui';
import { useToast } from '../context/ToastContext';
import { extractYoutubeId, youtubeThumbnail } from '../sangam/watch/types';
import { safeOpenUrl } from '../lib/safeUrl';
import { shareVideo } from '../sangam/watch/watchService';
import type { AuthorInfo } from '../sangam/sangamStore';
import {
  resolveShareTarget,
  getRememberedChannelUrl,
  setRememberedChannelUrl,
  isPlausibleChannelUrl,
  type VideoUploadContext,
} from './uploadGuidance';
import { vg, type VideoGuideLang } from './i18n';

interface Props {
  context: VideoUploadContext;
  author: AuthorInfo;
  lang: VideoGuideLang;
  onClose: () => void;
  /** Called after a successful share-to-Watch (watch targets). */
  onShared?: () => void;
  /** Called with the validated URL for callback targets (service_card, chat). */
  onLinkReady?: (url: string) => void;
}

const HOW_ICONS = ['📱', '🎬', '🔗'];

export const VideoGuidanceSheet: React.FC<Props> = ({
  context, author, lang, onClose, onShared, onLinkReady,
}) => {
  const { showToast } = useToast();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [showHow, setShowHow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');
  const [channelTouched, setChannelTouched] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const target = resolveShareTarget(context);
  const rememberedChannel = getRememberedChannelUrl();

  const youtubeId = extractYoutubeId(url);
  const urlError = touched && !youtubeId ? vg('vg.errInvalidUrl', lang) : null;
  const titleError =
    touched && target === 'watch' && (title.trim().length === 0 || title.trim().length > 120)
      ? vg('vg.errTitle', lang)
      : null;
  const channelError =
    remember && channelTouched && channelUrl.trim() && !isPlausibleChannelUrl(channelUrl.trim())
      ? vg('vg.errChannelUrl', lang)
      : null;

  const doShare = async () => {
    setTouched(true);
    if (!youtubeId || (target === 'watch' && (title.trim().length === 0 || title.trim().length > 120))) return;
    if (remember && channelUrl.trim()) {
      if (!isPlausibleChannelUrl(channelUrl.trim())) {
        setChannelTouched(true);
        return;
      }
      setRememberedChannelUrl(channelUrl.trim());
    }
    setBusy(true);
    try {
      if (target === 'watch') {
        await shareVideo({
          youtubeId,
          title: title.trim(),
          sharedBy: author.uid,
          sharedByName: author.name,
          sharedBySanId: author.sanId,
          category: 'shared',
        });
        showToast(vg('vg.sharedOk', lang), 'success');
        onShared?.();
      } else {
        onLinkReady?.(url.trim());
      }
      onClose();
    } catch {
      showToast(vg('vg.errInvalidUrl', lang), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openChannel = () => {
    const safe = safeOpenUrl(rememberedChannel);
    if (safe) window.open(safe, '_blank', 'noopener');
  };

  return (
    <Modal onClose={onClose} title={<span>🪔 {vg('vg.title', lang)}</span>}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600 leading-relaxed">{vg('vg.why', lang)}</p>

        {/* 3 steps */}
        <ol className="space-y-2">
          <li className="flex items-start gap-3 rounded-2xl bg-orange-50 border border-orange-100 p-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-600 text-white text-sm font-extrabold flex items-center justify-center">1</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-stone-800">{vg('vg.step1', lang)}</p>
              <button
                type="button"
                onClick={() => setShowHow((v) => !v)}
                className="text-xs font-bold text-orange-700 underline underline-offset-2 mt-1 min-h-[32px]"
              >
                {vg('vg.showHow', lang)} {showHow ? '▴' : '▾'}
              </button>
              {showHow && (
                <div className="mt-2 space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-start gap-2 rounded-xl bg-white border border-orange-100 p-2">
                      <span className="text-xl" aria-hidden>{HOW_ICONS[n - 1]}</span>
                      <div>
                        <p className="text-xs font-extrabold text-stone-800">{vg(`vg.how${n}t`, lang)}</p>
                        <p className="text-xs text-stone-600">{vg(`vg.how${n}b`, lang)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-2xl bg-stone-50 border border-stone-200 p-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-500 text-white text-sm font-extrabold flex items-center justify-center">2</span>
            <p className="text-sm font-bold text-stone-800 pt-1">{vg('vg.step2', lang)}</p>
          </li>
          <li className="flex items-start gap-3 rounded-2xl bg-stone-50 border border-stone-200 p-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-500 text-white text-sm font-extrabold flex items-center justify-center">3</span>
            <p className="text-sm font-bold text-stone-800 pt-1">{vg('vg.step3', lang)}</p>
          </li>
        </ol>

        {/* Remembered channel shortcut */}
        {rememberedChannel && (
          <button
            type="button"
            onClick={openChannel}
            className="w-full flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-left min-h-[56px]"
          >
            <span className="text-2xl" aria-hidden>▶️</span>
            <span>
              <span className="block text-xs font-extrabold text-stone-800">{vg('vg.recentUploads', lang)}</span>
              <span className="block text-xs text-orange-700 underline underline-offset-2">{vg('vg.openChannel', lang)}</span>
            </span>
          </button>
        )}

        {/* Paste field */}
        <Field label={vg('vg.urlLabel', lang)}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={vg('vg.urlPlaceholder', lang)}
            inputMode="url"
            autoComplete="off"
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm min-h-[44px]"
          />
          {urlError && <p className="text-xs text-red-600 mt-1">{urlError}</p>}
        </Field>

        {/* Preview */}
        {youtubeId && (
          <div className="rounded-2xl overflow-hidden border border-stone-200">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={youtubeThumbnail(youtubeId)} className="w-full aspect-video object-cover" loading="lazy" />
          </div>
        )}

        {/* Title (watch targets only) */}
        {target === 'watch' && (
          <Field label={vg('vg.titleLabel', lang)}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={vg('vg.titlePlaceholder', lang)}
              maxLength={120}
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm min-h-[44px]"
            />
            {titleError && <p className="text-xs text-red-600 mt-1">{titleError}</p>}
          </Field>
        )}

        {/* Remember channel */}
        <div>
          <label className="flex items-start gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-1 w-5 h-5 accent-orange-600"
            />
            <span className="text-xs text-stone-600">{vg('vg.remember', lang)}</span>
          </label>
          {remember && !rememberedChannel && (
            <div className="mt-2 ml-7">
              <Field label={vg('vg.channelLabel', lang)}>
                <input
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  onBlur={() => setChannelTouched(true)}
                  placeholder={vg('vg.channelPlaceholder', lang)}
                  inputMode="url"
                  autoComplete="off"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm min-h-[44px]"
                />
                {channelError && <p className="text-xs text-red-600 mt-1">{channelError}</p>}
              </Field>
            </div>
          )}
        </div>

        {target === 'watch' && (
          <p className="text-xs text-stone-500 leading-relaxed">{vg('vg.watchNote', lang)}</p>
        )}

        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose} className="flex-1 min-h-[48px]">
            {vg('vg.close', lang)}
          </Btn>
          <Btn onClick={doShare} disabled={busy} className="flex-1 min-h-[48px]">
            {busy ? '…' : target === 'watch' ? vg('vg.share', lang) : vg('vg.send', lang)}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

/** Persist the remembered channel URL (call when the user confirms it). */
export function rememberChannelUrl(url: string): boolean {
  if (!isPlausibleChannelUrl(url)) return false;
  setRememberedChannelUrl(url);
  return true;
}
