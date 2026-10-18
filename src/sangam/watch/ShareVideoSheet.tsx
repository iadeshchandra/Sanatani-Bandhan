/**
 * sangam/watch/ShareVideoSheet.tsx — share a YouTube video to Sangam Watch.
 * ============================================================================
 * Paste URL → validated inline → preview card → optional caption → post.
 * YouTube only. Sacred boundaries: the sharer affirms the content is
 * appropriate (no shraddha/funeral footage).
 */
import React, { useState } from 'react';
import { Modal, Field, Btn, inputCls, useLocaleText } from '../ui';
import { useToast } from '../../context/ToastContext';
import { extractYoutubeId, validateShare, youtubeThumbnail, type WatchVideoCategory } from './types';
import { shareVideo } from './watchService';
import { wt, type WatchLang } from './i18n';
import type { AuthorInfo } from '../sangamStore';

interface Props {
  author: AuthorInfo;
  lang: WatchLang;
  onClose: () => void;
  onShared: () => void;
}

export const ShareVideoSheet: React.FC<Props> = ({ author, lang, onClose, onShared }) => {
  const { showToast } = useToast();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<WatchVideoCategory>('shared');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const youtubeId = extractYoutubeId(url);
  const error = touched ? validateShare({ youtubeId, title, caption }) : null;

  const errorText =
    error === 'invalid_url'
      ? wt('watch.errInvalidUrl', lang)
      : error === 'title_required' || error === 'title_too_long'
        ? wt('watch.errTitle', lang)
        : null;

  const doShare = async () => {
    setTouched(true);
    const err = validateShare({ youtubeId, title, caption });
    if (err) return;
    setBusy(true);
    try {
      await shareVideo({
        youtubeId: youtubeId!,
        title: title.trim(),
        caption: caption.trim() || undefined,
        sharedBy: author.uid,
        sharedByName: author.name,
        sharedBySanId: author.sanId,
        category,
        providerUid: category === 'seva_demo' ? author.uid : undefined,
        providerTier: category === 'seva_demo' ? author.tier : undefined,
      });
      showToast(wt('watch.sharedOk', lang), 'success');
      onShared();
      onClose();
    } catch {
      showToast(wt('watch.errInvalidUrl', lang), 'error');
    } finally {
      setBusy(false);
    }
  };

  const isProvider = author.kind === 'purohit' || author.kind === 'jyotish';

  return (
    <Modal onClose={onClose} title={wt('watch.shareTitle', lang)}>
      <div className="space-y-4">
        <Field label={wt('watch.urlLabel', lang)}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={wt('watch.urlPlaceholder', lang)}
            inputMode="url"
            className={inputCls}
          />
        </Field>

        {youtubeId && (
          <div className="rounded-2xl overflow-hidden border border-stone-200">
            <img src={youtubeThumbnail(youtubeId)} alt="" className="w-full aspect-video object-cover" />
          </div>
        )}

        <Field label={wt('watch.titleLabel', lang)}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className={inputCls}
          />
        </Field>

        <Field label={wt('watch.captionLabel', lang)}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
            rows={2}
            className={inputCls}
          />
        </Field>

        {isProvider && (
          <Field label={wt('watch.categoryLabel', lang)}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('shared')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold min-h-[48px] ${category === 'shared' ? 'bg-orange-600 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}
              >
                {wt('watch.catShared', lang)}
              </button>
              <button
                type="button"
                onClick={() => setCategory('seva_demo')}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold min-h-[48px] ${category === 'seva_demo' ? 'bg-orange-600 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}
              >
                {wt('watch.catDemo', lang)}
              </button>
            </div>
          </Field>
        )}

        {errorText && <p className="text-sm text-red-600 font-semibold">{errorText}</p>}

        <Btn variant="primary" onClick={doShare} disabled={busy} className="w-full">
          {busy ? '…' : `🙏 ${wt('watch.post', lang)}`}
        </Btn>
      </div>
    </Modal>
  );
};
