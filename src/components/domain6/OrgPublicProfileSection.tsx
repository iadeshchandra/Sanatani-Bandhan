/**
 * Sanatani Bandhan — OrgPublicProfileSection (Pillar 3)
 *
 * Trustee-only card inside Workspace Settings: everything the world sees on
 * the public org page (/org/:orgId). Mirrors the OrgBrandingSection pattern.
 *
 * PUBLIC/PRIVATE SPLIT (see src/lib/orgPublic.ts):
 *   - Workspace-doc fields (tagline, website, publicSlug, darshanTimings,
 *     galleryUrls, address, phone, pincode) are saved to `workspaces/{id}`
 *     then projected to `orgPages/{id}` via syncOrgPage().
 *   - `upcomingEvents` is published content owned by the page itself — it is
 *     written DIRECTLY to `orgPages/{id}` (merge) so a re-sync never wipes
 *     trustee-published events.
 * Gallery binaries go to Storage `orgGallery/{orgId}/{ts}.{ext}` (public
 * read; trustee write — see storage.rules; owner pastes it in console).
 */
import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import {
  Globe, Save, Loader2, Plus, Trash2, ImagePlus, ExternalLink,
  Clock, CalendarDays, Link2, Lock, Sparkles,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { executeSafeUpdate } from '../../lib/dbUtils';
import { syncOrgPage } from '../../context/MembershipContext';
import {
  normalizePublicSlug,
  orgPublicPath,
  MAX_GALLERY_IMAGES,
  MAX_PUBLIC_EVENTS,
  type PublicTiming,
  type PublicEventItem,
} from '../../lib/orgPublic';

const GALLERY_MAX_BYTES = 3 * 1024 * 1024;
const GALLERY_MAX_PX = 1600;

/** Downscale a photo to ≤1600px on the long edge (keeps the page fast). */
function downscalePhoto(file: File): Promise<{ blob: Blob; ext: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, GALLERY_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('decode'));
      ctx.drawImage(img, 0, 0, w, h);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (b) => (b ? resolve({ blob: b, ext: mime === 'image/png' ? 'png' : 'jpg' }) : reject(new Error('encode'))),
        mime,
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

const inputCls =
  'w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-amber-600 focus:ring-4 focus:ring-amber-100 outline-none transition-all shadow-sm disabled:text-gray-500 disabled:cursor-not-allowed';
const labelCls = 'block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5';

export const OrgPublicProfileSection: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const { activeWorkspace, updateWorkspaceDetails } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const { showToast } = useToast();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);
  const fileRef = useRef<HTMLInputElement>(null);

  const orgId = activeWorkspace?.id || '';

  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [timings, setTimings] = useState<PublicTiming[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [events, setEvents] = useState<PublicEventItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugMsg, setSlugMsg] = useState('');

  // Load from the active workspace + its public projection.
  useEffect(() => {
    const ws: any = activeWorkspace;
    if (!ws?.id) return;
    setSlug(ws.publicSlug || '');
    setTagline(ws.tagline || '');
    setWebsite(ws.website || '');
    setPhone(ws.phone || '');
    setAddress(ws.address || '');
    setPincode(ws.pincode || '');
    setTimings(Array.isArray(ws.darshanTimings) ? ws.darshanTimings : []);
    setGallery(Array.isArray(ws.galleryUrls) ? ws.galleryUrls.slice(0, MAX_GALLERY_IMAGES) : []);
    (async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'orgPages', ws.id));
        const ev = (snap.data() as any)?.upcomingEvents;
        if (Array.isArray(ev)) setEvents(ev.slice(0, MAX_PUBLIC_EVENTS));
      } catch {
        /* public projection may not exist yet — events stay empty */
      }
    })();
  }, [activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSlugUnique = async (value: string): Promise<boolean> => {
    const s = normalizePublicSlug(value);
    if (!s) {
      setSlugMsg('');
      return true;
    }
    try {
      const qs = await getDocs(query(collection(db, 'orgPages'), where('publicSlug', '==', s), limit(5)));
      const clash = qs.docs.some((d) => d.id !== orgId);
      setSlugMsg(
        clash
          ? T('orgpp_slug_taken', 'This address is already taken.', 'এই ঠিকানাটি ইতিমধ্যে নেওয়া হয়েছে।', 'यह पता पहले से लिया गया है।')
          : ''
      );
      return !clash;
    } catch {
      return true; // offline / rules — let the save attempt decide
    }
  };

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files || !files.length || !isAdmin || !orgId) return;
    const room = MAX_GALLERY_IMAGES - gallery.length;
    if (room <= 0) {
      showToast(T('orgpp_gallery_full', `Gallery is full (max ${MAX_GALLERY_IMAGES} photos). Remove one first.`, `গ্যালারি পূর্ণ (সর্বোচ্চ ${MAX_GALLERY_IMAGES}টি ছবি)। আগে একটি সরান।`, `गैलरी भर गई है (अधिकतम ${MAX_GALLERY_IMAGES} फोटो)। पहले एक हटाएँ।`), 'error');
      return;
    }
    setUploading(true);
    try {
      const picked = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const f of picked) {
        if (!f.type.startsWith('image/')) throw new Error('type');
        if (f.size > GALLERY_MAX_BYTES) throw new Error('size');
        const { blob, ext } = await downscalePhoto(f);
        const path = `orgGallery/${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await uploadBytes(ref(storage, path), blob, { contentType: blob.type });
        urls.push(await getDownloadURL(ref(storage, path)));
      }
      setGallery((g) => [...g, ...urls].slice(0, MAX_GALLERY_IMAGES));
      showToast(T('orgpp_photo_added', 'Photo added to your public gallery.', 'আপনার পাবলিক গ্যালারিতে ছবি যোগ হয়েছে।', 'आपकी सार्वजनिक गैलरी में फोटो जुड़ गई।'), 'success');
    } catch (e: any) {
      const msg =
        e?.message === 'size'
          ? T('orgpp_too_big', 'Photo too large — please use an image under 3 MB.', 'ছবি অনেক বড় — 3 MB-এর কম ছবি ব্যবহার করুন।', 'फोटो बहुत बड़ी है — 3 MB से कम की इमेज़ उपयोग करें।')
          : T('orgpp_upload_fail', 'Could not upload the photo. Try again.', 'ছবি আপলোড করা যায়নি। আবার চেষ্টা করুন।', 'फोटो अपलोड नहीं हो सका। पुनः प्रयास करें।');
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!isAdmin || !orgId) return;
    const cleanSlug = normalizePublicSlug(slug);
    setSlug(cleanSlug);
    if (!(await checkSlugUnique(cleanSlug))) return;
    setSaving(true);
    try {
      const cleanTimings = timings
        .map((r) => ({ label: r.label.trim(), time: r.time.trim() }))
        .filter((r) => r.label || r.time);
      const cleanEvents: PublicEventItem[] = events
        .map((e) => ({
          title: e.title.trim(),
          date: e.date.trim(),
          time: (e.time || '').trim(),
          description: (e.description || '').trim(),
        }))
        .filter((e) => e.title)
        .slice(0, MAX_PUBLIC_EVENTS);

      // 1) workspace doc (private) — the source of truth.
      const wsUpdates: Record<string, any> = {
        tagline: tagline.trim(),
        website: website.trim(),
        publicSlug: cleanSlug,
        darshanTimings: cleanTimings,
        galleryUrls: gallery.slice(0, MAX_GALLERY_IMAGES),
        address: address.trim(),
        phone: phone.trim(),
        pincode: pincode.trim(),
      };
      updateWorkspaceDetails(wsUpdates as any);
      await executeSafeUpdate('workspaces', orgId, wsUpdates, 'update');

      // 2) events live on the public projection (merge — never clobbered).
      await setDoc(
        doc(db, 'orgPages', orgId),
        { orgId, upcomingEvents: cleanEvents, updatedAt: Date.now() },
        { merge: true }
      );

      // 3) re-project the public page.
      await syncOrgPage({ ...(activeWorkspace as any), ...wsUpdates });
      setEvents(cleanEvents);

      showToast(T('orgpp_saved', 'Public profile saved — your page is live.', 'পাবলিক প্রোফাইল সংরক্ষিত — আপনার পেজ লাইভ।', 'सार्वजनिक प्रोफ़ाइल सहेजी गई — आपका पेज लाइव है।'), 'success');
    } catch (e: any) {
      showToast(e?.message || T('orgpp_save_fail', 'Could not save. Try again.', 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।', 'सहेजा नहीं जा सका। पुनः प्रयास करें।'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewPath = orgPublicPath({ orgId, publicSlug: normalizePublicSlug(slug) || undefined });

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden ring-1 ring-black/5">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
      <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-2 uppercase tracking-widest">
        <Globe size={18} className="text-amber-600" />
        {T('orgpp_title', 'Public Profile', 'পাবলিক প্রোফাইল', 'सार्वजनिक प्रोफ़ाइल')}
      </h3>
      <p className="text-[11px] font-bold text-gray-500 leading-relaxed mb-6">
        {T(
          'orgpp_desc',
          'What the world sees on your public page. Only these fields are ever public — treasury, members and bank details can never appear here.',
          'আপনার পাবলিক পেজে বিশ্ব যা দেখবে। শুধু এই তথ্যগুলোই পাবলিক হবে — কোষাগার, সদস্য বা ব্যাংকের তথ্য এখানে কখনো আসবে না।',
          'आपके सार्वजनिक पेज पर दुनिया यही देखेगी। केवल यही जानकारियाँ सार्वजनिक होंगी — कोष, सदस्य या बैंक विवरण यहाँ कभी नहीं आएँगे।'
        )}
      </p>

      {!isAdmin && (
        <div className="flex items-center gap-2 text-xs font-black text-gray-500 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <Lock size={14} />
          {T('orgpp_viewonly', 'View only — Trustees can edit.', 'শুধু দেখুন — ট্রাস্টিরা সম্পাদনা করতে পারেন।', 'केवल देखें — ट्रस्टी संपादित कर सकते हैं।')}
        </div>
      )}

      <div className="space-y-5">
        {/* slug */}
        <div>
          <label className={labelCls}>
            {T('orgpp_slug', 'Public page address', 'পাবলিক পেজের ঠিকানা', 'सार्वजनिक पेज का पता')}
          </label>
          <div className="flex gap-2">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl pl-3.5 text-xs font-bold text-gray-400 shrink-0">
              /org/
            </div>
            <input
              value={slug}
              disabled={!isAdmin}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={(e) => checkSlugUnique(e.target.value)}
              placeholder="dakshineswar-kali-mandir"
              className={`${inputCls} font-mono`}
            />
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  const s = normalizePublicSlug(activeWorkspace?.name || '');
                  setSlug(s || `org-${orgId.slice(0, 6).toLowerCase()}`);
                }}
                className="shrink-0 px-4 min-h-[44px] rounded-xl bg-amber-100 text-amber-800 text-xs font-black hover:bg-amber-200 flex items-center gap-1.5"
                title={T('orgpp_suggest', 'Suggest from name', 'নাম থেকে সাজেশন', 'नाम से सुझाव')}
              >
                <Sparkles size={14} />
                {T('orgpp_suggest', 'Suggest', 'সাজেশন', 'सुझाव')}
              </button>
            )}
          </div>
          {slugMsg && <p className="text-[11px] font-bold text-red-600 mt-1.5">{slugMsg}</p>}
          <button
            type="button"
            onClick={() => window.open(previewPath, '_blank', 'noopener')}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-600 min-h-[44px]"
          >
            <ExternalLink size={13} />
            {T('orgpp_preview', 'View public page', 'পাবলিক পেজ দেখুন', 'सार्वजनिक पेज देखें')}
          </button>
        </div>

        {/* tagline + website */}
        <div>
          <label className={labelCls}>{T('orgpp_tagline', 'Tagline / Motto', 'ট্যাগলাইন / মূলমন্ত্র', 'टैगलाइन / आदर्श वाक्य')}</label>
          <input value={tagline} disabled={!isAdmin} onChange={(e) => setTagline(e.target.value)} placeholder="सर्वे भवन्तु सुखिनः" className={inputCls} maxLength={140} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{T('orgpp_website', 'Website', 'ওয়েবসাইট', 'वेबसाइट')}</label>
            <input value={website} disabled={!isAdmin} onChange={(e) => setWebsite(e.target.value)} placeholder="www.example.org" className={inputCls} inputMode="url" />
          </div>
          <div>
            <label className={labelCls}>{T('orgpp_phone', 'Public phone', 'পাবলিক ফোন', 'सार्वजनिक फ़ोन')}</label>
            <input value={phone} disabled={!isAdmin} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" className={inputCls} inputMode="tel" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{T('orgpp_address', 'Street address', 'রাস্তার ঠিকানা', 'पता')}</label>
            <input value={address} disabled={!isAdmin} onChange={(e) => setAddress(e.target.value)} placeholder="12 Temple Road…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{T('orgpp_pincode', 'PIN code', 'পিন কোড', 'पिन कोड')}</label>
            <input value={pincode} disabled={!isAdmin} onChange={(e) => setPincode(e.target.value)} placeholder="700001" className={inputCls} inputMode="numeric" />
          </div>
        </div>

        {/* timings */}
        <div>
          <label className={`${labelCls} flex items-center gap-1.5`}><Clock size={12} /> {T('orgpp_timings', 'Darshan Timings', 'দর্শনের সময়', 'दर्शन समय')}</label>
          <div className="space-y-2">
            {timings.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={row.label} disabled={!isAdmin}
                  onChange={(e) => setTimings((t) => t.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                  placeholder={T('orgpp_timing_label', 'Morning Aarti', 'সকালের আরতি', 'प्रातः आरती')}
                  className={inputCls} aria-label={T('orgpp_timing_label', 'Timing label', 'সময়ের নাম', 'समय का नाम')}
                />
                <input
                  value={row.time} disabled={!isAdmin}
                  onChange={(e) => setTimings((t) => t.map((r, j) => (j === i ? { ...r, time: e.target.value } : r)))}
                  placeholder="6:00 AM"
                  className={`${inputCls} max-w-[140px]`} aria-label={T('orgpp_timing_time', 'Time', 'সময়', 'समय')}
                />
                {isAdmin && (
                  <button type="button" onClick={() => setTimings((t) => t.filter((_, j) => j !== i))}
                    className="shrink-0 w-[44px] h-[44px] self-center rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                    aria-label={T('orgpp_remove', 'Remove', 'সরান', 'हटाएँ')}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <button type="button" onClick={() => setTimings((t) => [...t, { label: '', time: '' }])}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-600 min-h-[44px] px-1">
              <Plus size={14} /> {T('orgpp_add_timing', 'Add timing', 'সময় যোগ করুন', 'समय जोड़ें')}
            </button>
          )}
        </div>

        {/* gallery */}
        <div>
          <label className={labelCls}>
            {T('orgpp_gallery', 'Photo Gallery', 'ছবির গ্যালারি', 'फोटो गैलरी')} ({gallery.length}/{MAX_GALLERY_IMAGES})
          </label>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {gallery.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {isAdmin && (
                    <button type="button" onClick={() => setGallery((g) => g.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 w-[36px] h-[36px] rounded-full bg-black/60 text-white flex items-center justify-center"
                      aria-label={T('orgpp_remove', 'Remove', 'সরান', 'हटाएँ')}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {isAdmin && gallery.length < MAX_GALLERY_IMAGES && (
            <>
              <button
                type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border-2 border-dashed border-amber-300 text-amber-800 text-xs font-black hover:bg-amber-50 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                {uploading
                  ? T('orgpp_uploading', 'Uploading…', 'আপলোড হচ্ছে…', 'अपलोड हो रहा है…')
                  : T('orgpp_add_photos', 'Add photos', 'ছবি যোগ করুন', 'फोटो जोड़ें')}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleGalleryFiles(e.target.files)} />
            </>
          )}
        </div>

        {/* events */}
        <div>
          <label className={`${labelCls} flex items-center gap-1.5`}><CalendarDays size={12} /> {T('orgpp_events', 'Upcoming Events', 'আসন্ন অনুষ্ঠান', 'आगामी कार्यक्रम')} ({events.length}/{MAX_PUBLIC_EVENTS})</label>
          <div className="space-y-3">
            {events.map((ev, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 space-y-2.5">
                <div className="flex gap-2">
                  <input value={ev.title} disabled={!isAdmin}
                    onChange={(e) => setEvents((l) => l.map((x, j) => (j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x)))}
                    placeholder={T('orgpp_event_title', 'Event name', 'অনুষ্ঠানের নাম', 'कार्यक्रम का नाम')}
                    className={inputCls} aria-label={T('orgpp_event_title', 'Event name', 'অনুষ্ঠানের নাম', 'कार्यक्रम का नाम')} />
                  {isAdmin && (
                    <button type="button" onClick={() => setEvents((l) => l.filter((_, j) => j !== i))}
                      className="shrink-0 w-[44px] h-[44px] self-start rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                      aria-label={T('orgpp_remove', 'Remove', 'সরান', 'हटाएँ')}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={ev.date} disabled={!isAdmin}
                    onChange={(e) => setEvents((l) => l.map((x, j) => (j === i ? { ...x, date: (e.target as HTMLInputElement).value } : x)))}
                    placeholder="2026-11-05" className={inputCls} aria-label={T('orgpp_event_date', 'Date', 'তারিখ', 'तारीख')} />
                  <input value={ev.time || ''} disabled={!isAdmin}
                    onChange={(e) => setEvents((l) => l.map((x, j) => (j === i ? { ...x, time: (e.target as HTMLInputElement).value } : x)))}
                    placeholder="6:00 PM" className={inputCls} aria-label={T('orgpp_timing_time', 'Time', 'সময়', 'समय')} />
                </div>
                <input value={ev.description || ''} disabled={!isAdmin}
                  onChange={(e) => setEvents((l) => l.map((x, j) => (j === i ? { ...x, description: (e.target as HTMLInputElement).value } : x)))}
                  placeholder={T('orgpp_event_desc', 'Short description (optional)', 'সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)', 'संक्षिप्त विवरण (वैकल्पिक)')}
                  className={inputCls} aria-label={T('orgpp_event_desc', 'Short description (optional)', 'সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)', 'संक्षिप्त विवरण (वैकल्पिक)')} />
              </div>
            ))}
          </div>
          {isAdmin && events.length < MAX_PUBLIC_EVENTS && (
            <button type="button" onClick={() => setEvents((l) => [...l, { title: '', date: '', time: '', description: '' }])}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-600 min-h-[44px] px-1">
              <Plus size={14} /> {T('orgpp_add_event', 'Add event', 'অনুষ্ঠান যোগ করুন', 'कार्यक्रम जोड़ें')}
            </button>
          )}
        </div>

        {/* save */}
        {isAdmin && (
          <button
            type="button" onClick={handleSave} disabled={saving || uploading}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 text-white font-black text-sm shadow-md hover:brightness-105 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving
              ? T('orgpp_saving', 'Publishing…', 'প্রকাশ হচ্ছে…', 'प्रकाशित हो रहा है…')
              : T('orgpp_save', 'Save & Publish Public Profile', 'সংরক্ষণ ও প্রকাশ করুন', 'सहेजें और प्रकाशित करें')}
          </button>
        )}
        <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
          <Link2 size={11} />
          {T('orgpp_hint', 'Your page goes live instantly at /org/… — share it on WhatsApp.', 'আপনার পেজ সঙ্গে সঙ্গে /org/… ঠিকানায় লাইভ হবে — হোয়াটসঅ্যাপে শেয়ার করুন।', 'आपका पेज तुरंत /org/… पर लाइव होगा — व्हाट्सऐप पर साझा करें।')}
        </p>
      </div>
    </div>
  );
};
