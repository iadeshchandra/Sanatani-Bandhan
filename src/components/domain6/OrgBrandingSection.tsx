/**
 * Sanatani Bandhan — OrgBrandingSection (Pillar 1)
 *
 * Trustee-only institution branding card inside Org Settings:
 *   - logo upload with validation (png/jpg/webp, ≤2MB) + client-side
 *     square crop (trustees aren't designers — every upload looks good)
 *   - upload to Firebase Storage `orgLogos/{orgId}/logo.{ext}`,
 *     URL + uploadedAt persisted on the workspace doc
 *   - THE PREMIUM MOMENT: the instant the upload completes, the trustee
 *     sees their logo rendered on a live letterhead preview AND can open
 *     a real sample 80G receipt PDF (watermarked SAMPLE PREVIEW) —
 *     the "this is ours" moment that sells the product.
 *
 * Trilingual via <T> (en/bn/hi). All touch targets ≥44px. Works offline
 * after first load (logo data-URL is cached in IndexedDB).
 */
import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { appLocale } from '../../lib/format';
import {
  Camera,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { T } from '../../solo/ui';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { executeSafeUpdate } from '../../lib/dbUtils';
import {
  uploadOrgLogo,
  cacheBrandingMeta,
  brandingFromWorkspace,
  letterheadAddressLine,
  monogramLetter,
} from '../../lib/orgBranding';
import { OrgLogo, OrgMonogram } from '../common/OrgLogo';

export interface BrandingSectionHandle {
  openPicker: () => void;
}

interface Props {
  /** Called after a successful upload+save so the parent can sync its form state. */
  onLogoSaved?: (logoUrl: string, uploadedAt: string) => void;
}

type Phase = 'idle' | 'validating' | 'cropping' | 'uploading' | 'saving' | 'done' | 'error';

const PHASE_LABEL: Record<Exclude<Phase, 'idle' | 'done' | 'error'>, { en: string; bn: string; hi: string }> = {
  validating: { en: 'Checking image…', bn: 'ছবি যাচাই হচ্ছে…', hi: 'छवि जाँची जा रही है…' },
  cropping: { en: 'Framing your logo…', bn: 'লোগো সাজানো হচ্ছে…', hi: 'आपका लोगो सजाया जा रहा है…' },
  uploading: { en: 'Uploading…', bn: 'আপলোড হচ্ছে…', hi: 'अपलोड हो रहा है…' },
  saving: { en: 'Saving…', bn: 'সংরক্ষণ হচ্ছে…', hi: 'सहेजा जा रहा है…' },
};

export const OrgBrandingSection = forwardRef<BrandingSectionHandle, Props>(({ onLogoSaved }, ref) => {
  const { activeWorkspace, updateWorkspaceDetails, checkPermission, currentUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<{ en: string; bn: string; hi: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState(activeWorkspace?.logoUrl || '');
  const [uploadedAt, setUploadedAt] = useState((activeWorkspace as any)?.logoUploadedAt || '');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isAdmin = checkPermission(['TRUSTEE']);
  const orgId = activeWorkspace?.id || '';
  const orgName = activeWorkspace?.name || 'Sanatani Institution';

  useImperativeHandle(ref, () => ({
    openPicker: () => fileRef.current?.click(),
  }));

  const fail = (en: string, bn: string, hi: string) => {
    setError({ en, bn, hi });
    setPhase('error');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeWorkspace) return;
    if (!isAdmin) {
      return fail(
        'Only Trustees can update the institution logo.',
        'শুধুমাত্র ট্রাস্টিরা প্রতিষ্ঠানের লোগো পরিবর্তন করতে পারেন।',
        'केवल ट्रस्टी ही संस्था का लोगो बदल सकते हैं।'
      );
    }
    if (orgId.startsWith('DEMO_') || !orgId) {
      return fail(
        'Logos can only be uploaded for real organisations, not the demo.',
        'ডেমো নয়, শুধুমাত্র আসল প্রতিষ্ঠানের জন্য লোগো আপলোড করা যায়।',
        'लोगो केवल वास्तविक संस्थाओं के लिए अपलोड किया जा सकता है, डेमो के लिए नहीं।'
      );
    }

    setError(null);
    try {
      setPhase('validating');
      // uploadOrgLogo validates (png/jpg/webp, ≤2MB), square-crops, uploads.
      setPhase('cropping');
      await new Promise((r) => setTimeout(r, 30)); // let the UI paint the phase
      setPhase('uploading');
      const uploaded = await uploadOrgLogo(orgId, file);

      setPhase('saving');
      const updates = {
        logoUrl: uploaded.downloadUrl,
        logoUploadedAt: uploaded.uploadedAt,
        brandingUpdatedBy: (currentUser as any)?.uid || (currentUser as any)?.id || 'trustee',
      };
      await executeSafeUpdate('workspaces', orgId, updates, 'update');
      updateWorkspaceDetails(updates as any);

      // Refresh branding caches so receipts + header pick it up instantly.
      const branding = brandingFromWorkspace({ ...activeWorkspace, ...updates }, orgId);
      cacheBrandingMeta(branding);

      setLogoUrl(uploaded.downloadUrl);
      setUploadedAt(uploaded.uploadedAt);
      onLogoSaved?.(uploaded.downloadUrl, uploaded.uploadedAt);
      setPhase('done');
      setShowPreview(true);
      showToast('Institution logo updated', 'success');
    } catch (err: any) {
      const code = err?.message || 'upload';
      if (code === 'type') {
        fail(
          'Please choose a PNG, JPG or WebP image.',
          'অনুগ্রহ করে PNG, JPG বা WebP ছবি বেছে নিন।',
          'कृपया PNG, JPG या WebP छवि चुनें।'
        );
      } else if (code === 'size') {
        fail(
          'Image is too large — please use a file under 2 MB.',
          'ছবিটি অনেক বড় — অনুগ্রহ করে ২ MB-এর কম ফাইল ব্যবহার করুন।',
          'छवि बहुत बड़ी है — कृपया 2 MB से छोटी फ़ाइल चुनें।'
        );
      } else if (code === 'decode') {
        fail(
          'That image could not be read. Please try another file.',
          'ছবিটি পড়া যায়নি। অন্য ফাইল চেষ্টা করুন।',
          'वह छवि पढ़ी नहीं जा सकी। कृपया कोई अन्य फ़ाइल आज़माएँ।'
        );
      } else {
        console.error('Logo upload failed', err);
        fail(
          'Upload failed. Check your connection and try again.',
          'আপলোড ব্যর্থ হয়েছে। সংযোগ দেখে আবার চেষ্টা করুন।',
          'अपलोड विफल रहा। अपना कनेक्शन जाँचकर पुनः प्रयास करें।'
        );
      }
    }
  };

  const openSampleReceipt = async () => {
    if (!activeWorkspace) return;
    setPreviewLoading(true);
    try {
      const { generate80GTaxReceipt } = await import('../../utils/pdfGenerator');
      const today = new Date().toISOString().split('T')[0];
      const sampleTx = {
        id: 'SAMPLE001',
        devoteeName: 'Sample Devotee',
        donorName: 'Sample Devotee',
        devoteePan: 'ABCDE1234F',
        donorPan: 'ABCDE1234F',
        amount: 11000,
        date: today,
        taxReceiptNumber: 'SAMPLE-0001',
        receiptNo: 'SAMPLE-0001',
        paymentMode: 'UPI',
        referenceNo: 'SAMPLE-UTR-0001',
        purpose: 'Mandir Seva Fund',
        handledBy: 'Trustee',
      };
      // The live engine (same code path as production receipts).
      const url = (await generate80GTaxReceipt(
        sampleTx,
        { ...activeWorkspace, logoUrl: logoUrl || (activeWorkspace as any).logoUrl },
        { download: false, returnType: 'bloburl', isSamplePreview: true }
      )) as string;
      setPreviewUrl(url);
    } catch (err) {
      console.error('Sample receipt preview failed', err);
      showToast('Could not generate the sample receipt.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        /* ignore */
      }
    }
    setPreviewUrl(null);
  };

  const branding = brandingFromWorkspace({ ...activeWorkspace, logoUrl }, orgId);
  const addressLine = letterheadAddressLine(branding);
  const regLine = [
    branding.trustRegNumber ? `Reg. No: ${branding.trustRegNumber}` : '',
    branding.trust80GRegistered && branding.trust80GURN ? `80G: ${branding.trust80GURN}` : '',
  ]
    .filter(Boolean)
    .join('  •  ');

  const busy = phase === 'validating' || phase === 'cropping' || phase === 'uploading' || phase === 'saving';

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 ring-1 ring-black/5 overflow-hidden">
      <div className="px-6 sm:px-8 pt-6 pb-2">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={18} className="text-amber-600" />
          <T en="Institution Branding" bn="প্রতিষ্ঠানের ব্র্যান্ডিং" hi="संस्था ब्रांडिंग" />
        </h3>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          <T
            en="Your logo appears on every receipt, letterhead and your org header — this is what makes the app yours."
            bn="আপনার লোগো প্রতিটি রসিদ, লেটারহেড ও সংস্থার হেডারে দেখা যাবে — এটাই অ্যাপটিকে আপনার করে তোলে।"
            hi="आपका लोगो हर रसीद, लेटरहेड और आपकी संस्था के हेडर पर दिखेगा — यही ऐप को आपका बनाता है।"
          />
        </p>
      </div>

      <div className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center gap-6">
        {/* Current mark */}
        <div className="shrink-0 text-center">
          <OrgLogo name={orgName} logoUrl={logoUrl} size={96} />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
            <T en="Current mark" bn="বর্তমান চিহ্ন" hi="वर्तमान चिह्न" />
          </p>
        </div>

        <div className="flex-1 w-full space-y-3">
          {!logoUrl && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <OrgMonogram name={orgName} size={40} />
              <p className="text-xs text-amber-900 font-medium">
                <T
                  en={`No logo yet — we show this dignified ${monogramLetter(orgName)} monogram until you upload one.`}
                  bn="এখনও লোগো নেই — আপনি আপলোড না করা পর্যন্ত এই মর্যাদাপূর্ণ মনোগ্রামটি দেখানো হবে।"
                  hi="अभी कोई लोगो नहीं है — आपके अपलोड करने तक यह गरिमामय मोनोग्राम दिखाया जाएगा।"
                />
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3" role="alert">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 font-semibold">
                <T en={error.en} bn={error.bn} hi={error.hi} />
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy || !isAdmin}
              className="min-h-[44px] px-5 inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-black shadow-sm transition-colors"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              {busy ? (
                <T en={PHASE_LABEL[phase as keyof typeof PHASE_LABEL].en} bn={PHASE_LABEL[phase as keyof typeof PHASE_LABEL].bn} hi={PHASE_LABEL[phase as keyof typeof PHASE_LABEL].hi} />
              ) : logoUrl ? (
                <T en="Change logo" bn="লোগো বদলান" hi="लोगो बदलें" />
              ) : (
                <T en="Upload logo" bn="লোগো আপলোড করুন" hi="लोगो अपलोड करें" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFile}
              aria-label="Upload institution logo"
            />
            {phase === 'done' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
                <CheckCircle2 size={16} />
                <T en="Saved" bn="সংরক্ষিত" hi="सहेजा गया" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            <T en="PNG, JPG or WebP • up to 2 MB • auto-framed to a square" bn="PNG, JPG বা WebP • সর্বোচ্চ ২ MB • স্বয়ংক্রিয়ভাবে বর্গাকারে সাজানো" hi="PNG, JPG या WebP • अधिकतम 2 MB • स्वतः वर्गाकार में सजाया जाता है" />
          </p>
        </div>
      </div>

      {/* Live letterhead preview — the premium moment */}
      {(showPreview || logoUrl) && (
        <div className="mx-6 sm:mx-8 mb-6 rounded-2xl border-2 border-amber-200 bg-[#FFFBEB] overflow-hidden">
          <div className="px-4 py-2 bg-amber-100/70 border-b border-amber-200 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-900">
              <T en="Live letterhead preview" bn="লাইভ লেটারহেড প্রিভিউ" hi="लाइव लेटरहेड प्रीव्यू" />
            </p>
            <button
              type="button"
              onClick={openSampleReceipt}
              disabled={previewLoading}
              className="min-h-[44px] px-4 inline-flex items-center gap-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-black hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              <T en="Preview sample receipt" bn="নমুনা রসিদ দেখুন" hi="नमूना रसीद देखें" />
            </button>
          </div>
          {/* Letterhead mock — mirrors the PDF letterhead layout */}
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="shrink-0">
              <OrgLogo name={orgName} logoUrl={logoUrl} size={64} rounded="xl" />
            </div>
            <div className="min-w-0 flex-1 text-center">
              <p className="font-black text-amber-800 text-base sm:text-lg leading-tight truncate">
                {branding.name.toUpperCase()}
              </p>
              {branding.tagline && (
                <p className="text-[11px] italic text-stone-600 truncate">{branding.tagline}</p>
              )}
              <p className="text-[10px] text-amber-700 font-semibold mt-0.5">॥ श्री गणेशाय नमः ॥</p>
              {addressLine && <p className="text-[10px] text-stone-500 truncate">{addressLine}</p>}
              {branding.phone && <p className="text-[10px] text-stone-500">Ph: {branding.phone}</p>}
              {regLine && <p className="text-[10px] font-bold text-stone-700 truncate">{regLine}</p>}
            </div>
            <div className="w-16 shrink-0" aria-hidden />
          </div>
          <div className="h-1 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700" />
          {uploadedAt && (
            <p className="px-5 py-2 text-[10px] text-stone-400 font-medium">
              <T en="Logo updated" bn="লোগো হালনাগাদ" hi="लोगो अद्यतन" /> • {new Date(uploadedAt).toLocaleDateString(appLocale())}
            </p>
          )}
        </div>
      )}

      {/* Sample receipt PDF modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Sample receipt preview">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-black text-gray-900">
                <T en="Sample receipt — how your letterhead prints" bn="নমুনা রসিদ — আপনার লেটারহেড যেমন ছাপা হবে" hi="नमूना रसीद — आपका लेटरहेड ऐसे छपेगा" />
              </p>
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close preview"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <iframe src={previewUrl} title="Sample receipt preview" className="flex-1 w-full min-h-[60vh] bg-gray-50" />
            <p className="px-5 py-3 text-[11px] text-gray-500 font-medium border-t border-gray-100">
              <T
                en="Watermarked SAMPLE — real receipts are generated from actual donations with your registration details."
                bn="জলছাপযুক্ত নমুনা — আসল রসিদ আপনার নিবন্ধন বিবরণসহ প্রকৃত দান থেকে তৈরি হয়।"
                hi="वॉटरमार्क वाला नमूना — असली रसीदें आपके पंजीकरण विवरण के साथ वास्तविक दान से बनती हैं।"
              />
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

OrgBrandingSection.displayName = 'OrgBrandingSection';
