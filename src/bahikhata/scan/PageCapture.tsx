import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { bk, type BkLang } from '../copy';
import { blobToImage, imageToCanvas, canvasGray } from './preprocess';
import { laplacianVariance, looksBlurry } from './capture';

/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — page capture.                             */
/*                                                                     */
/* File-input capture (the Phase 1 path — no new permission surface).  */
/* The preview carries the page guides (corner brackets + centre rule) */
/* and a gentle blur warning BEFORE anything is saved; retake is free  */
/* and encouraged. Accepting hands the file UP — ScanImport saves the  */
/* evidence photo to the vault FIRST, only then reads.                 */
/* ------------------------------------------------------------------ */

interface Props {
  lang: BkLang;
  pageNo: number;
  busy?: boolean;
  onAccept: (file: File) => void;
}

export const PageCapture: React.FC<Props> = ({ lang, pageNo, busy, onAccept }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blurry, setBlurry] = useState<boolean | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setBlurry(null);
    try {
      const img = await blobToImage(f);
      const small = imageToCanvas(img, 480);
      const variance = laplacianVariance(canvasGray(small), small.width, small.height);
      setBlurry(looksBlurry(variance));
    } catch {
      setBlurry(null); // cannot judge — the sevadar's eyes decide
    }
  };

  const corner = 'absolute w-10 h-10 border-amber-400 pointer-events-none';

  return (
    <div className="space-y-3">
      <h3 className="font-black text-stone-900">{bk(lang, 'captureTitle', { page: pageNo })}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'captureHint')}</p>

      {!file && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-[72px] px-5 py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-base shadow"
        >
          <Camera className="w-6 h-6 inline mr-2" />
          {bk(lang, 'capturePick')}
        </button>
      )}

      {file && previewUrl && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-stone-900">
            <img src={previewUrl} alt={`Register page ${pageNo}`} className="w-full max-h-[60vh] object-contain" />
            <div className={`${corner} top-3 left-3 border-t-4 border-l-4 rounded-tl-xl`} />
            <div className={`${corner} top-3 right-3 border-t-4 border-r-4 rounded-tr-xl`} />
            <div className={`${corner} bottom-3 left-3 border-b-4 border-l-4 rounded-bl-xl`} />
            <div className={`${corner} bottom-3 right-3 border-b-4 border-r-4 rounded-br-xl`} />
            <div className="absolute left-3 right-3 top-1/2 border-t-2 border-dashed border-amber-400/70 pointer-events-none" />
          </div>
          {blurry && (
            <p className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5">
              ⚠ {bk(lang, 'captureBlurWarn')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => file && onAccept(file)}
              className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black disabled:opacity-50"
            >
              {bk(lang, 'captureRead')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setFile(null); setPreviewUrl(null); inputRef.current?.click(); }}
              className="min-h-[52px] px-4 py-3 rounded-xl bg-white border border-stone-300 font-bold text-stone-700 disabled:opacity-50"
            >
              {bk(lang, 'captureRetake')}
            </button>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePick} />
    </div>
  );
};
