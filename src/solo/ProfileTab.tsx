import React, { useEffect, useRef, useState } from 'react';
import { useSolo } from './SoloContext';
import { useSoloStore } from './soloStore';
import { Card, T, Btn, Field, inputCls, useLocaleText } from './ui';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useMembership } from '../context/MembershipContext';
import { useToast } from '../context/ToastContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useMyPurohitIdentity } from '../components/purohit/useMyPurohitIdentity';
import { useMyJyotishIdentity } from '../jyotish/useMyJyotishIdentity';
import { useNavigate } from 'react-router-dom';
import { MySamskaras } from './MySamskaras';
import { SafetyList } from '../social/SafetyList';
import { SafetySection } from './SafetySection';
import { APP_VERSION, APP_BUILD_SHA } from '../lib/appVersion';
import { ProfileOrgHub } from './ProfileOrgHub';
import { NotificationSettings } from '../notifications/NotificationSettings';
import { DEFAULT_PREFS, mergePrefs, type NotificationPrefs } from '../notifications/preferences';
import { readPrefsDoc, writePrefsDoc } from '../notifications/delivery';
import { useSacredSound } from '../lib/sacredAudio';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark, WhatsThis } from '../components/guide';
import { TirthaDiarySheet, computeStats, syncTirtha } from '../tirtha';
import { VdaAliasSection } from './VdaAliasSection';
import { LanguageRegionSettings } from './LanguageRegionSettings';
import { SandhyaSettings } from '../components/common/SandhyaSettings';
import { PrivacyNoticeBody } from '../components/account/PrivacyNotice';
import { AiVoiceSettings } from '../ai/voice/components/AiVoiceSettings';
import { ASSISTANT_OPEN_EVENT } from '../ai/components/AskButton';
import { useNativeLanguage } from '../components/language/nativeBridge';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { LanguagePickerSheet } from '../components/language/LanguagePickerSheet';
import { getWallet, fmtWallet, type WalletCurrency } from '../lib/wallet';
import { openPlanUpgrade } from '../billing/PlanUpgradeFlow';

/* ProfileTab — the Sanatani ID card.
 * =====================================================================
 * SAN-XXXXXX display (tap to copy; LONG-PRESS copies the spoken VDA
 * alias instead), 4-group account structure (design 2026-10-18):
 *   🪔 Who I am · 📿 My details · 🗣️ How we speak with you ·
 *   🪔 Giving & system.
 * Gotra stays private — it is never rendered in any public context.
 */

/** Small-caps group header — the 4 account groups. */
const GroupHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    className="text-[12px] font-bold text-stone-400 mt-7 mb-1 px-1 tracking-[0.14em]"
    style={{ fontVariant: 'small-caps' }}
  >
    {children}
  </h2>
);

export const ProfileTab: React.FC = () => {
  // Deep links: the assistant's voice_upgrade intent (#ai-voice) and the
  // VDA "claim your spoken ID" nudge (#vda-alias) scroll their cards into
  // view once the tab paints.
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#ai-voice' || window.location.hash === '#vda-alias')) {
      const id = window.location.hash.slice(1);
      const t = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);
  const { profile, updateProfile } = useSolo();
  const { state: soloState, exportJSON, importJSON } = useSoloStore();
  const { logout, enterPurohitSession, enterJyotishSession, switchWorkspace, exitSoloSession, workspaces, activeWorkspace, firebaseUser } = useAuthWorkspace();
  const { myMemberships, orgMembers, orgJoinRequests } = useMembership();
  const { identity: purohitIdentity } = useMyPurohitIdentity();
  const { identity: jyotishIdentity } = useMyJyotishIdentity();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const { muted: bellMuted, setMuted: setBellMuted, playBell } = useSacredSound();
  const { currentLang, changeLanguage, markLanguageChosen } = useNativeLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tirthaOpen, setTirthaOpen] = useState(false);
  const [tirthaStats, setTirthaStats] = useState({ visitCount: 0, templeCount: 0, yatraCount: 0 });
  const curLangNative = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName || currentLang;
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  // Quick Guide: the Sanatani identity explainer — invitational only.
  const profileGuide = useGuide('profile', (firebaseUser as { uid?: string } | null)?.uid || 'anon');

  // 🪔 Dana & wallet glance — lifetime dana (device-local ledger) + Seva
  // Wallet balance. Read-only glances; the tabs own the detail.
  const danaTotal = soloState.giving.reduce((s, g) => s + g.amount, 0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<WalletCurrency>('INR');
  useEffect(() => {
    let live = true;
    getWallet()
      .then((w) => {
        if (!live) return;
        setWalletBalance(w.balance);
        setWalletCurrency(w.currency);
      })
      .catch(() => {
        /* offline — the card simply shows the dana line */
      });
    return () => { live = false; };
  }, []);

  // Profile photo — device-local by design (the solo profile itself is
  // device-local until synced). Downscaled to 256px so it stays tiny in
  // storage. Keyed by uid so shared devices never leak photos across users.
  const photoKey = `sb_profile_photo_${profile?.uid || 'anon'}`;
  const [photo, setPhoto] = useState<string | null>(() => {
    try { return window.localStorage.getItem(photoKey); } catch { return null; }
  });
  const googlePhoto = ((firebaseUser as { photoURL?: string | null } | null)?.photoURL as string) || undefined;
  const avatarSrc = photo || googlePhoto;
  const monogram = (profile?.displayName || '?').trim().charAt(0).toUpperCase();

  const onPhotoPicked = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(tr('solo.profile.photoType', 'Please choose an image file', 'ছবির ফাইল বেছে নিন', 'छवि फ़ाइल चुनें'), 'error');
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        window.localStorage.setItem(photoKey, dataUrl);
        setPhoto(dataUrl);
        showToast(tr('solo.profile.photoSaved', 'Photo updated 🙏', 'ছবি আপডেট হয়েছে 🙏', 'फ़ोटो अपडेट हुई 🙏'), 'success');
      } catch {
        showToast(tr('solo.profile.photoFail', 'Could not save photo', 'ছবি সংরক্ষণ করা যায়নি', 'फ़ोटो सहेजी नहीं गई'), 'error');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast(tr('solo.profile.photoFail', 'Could not save photo', 'ছবি সংরক্ষণ করা যায়নি', 'फ़ोटो सहेजी नहीं गई'), 'error');
    };
    img.src = url;
  };

  const removePhoto = () => {
    try { window.localStorage.removeItem(photoKey); } catch { /* ignore */ }
    setPhoto(null);
  };

  const scrollToPhoto = () => {
    document.getElementById('profile-photo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Notification preferences (spec §3) — quiet hours, digest, per-topic
  // toggles. Loads lazily; the engine already honours every value via
  // decideRouting. Failures fall back to calm defaults (offline-safe).
  const prefsUid = profile?.uid || '';
  const tirthaUid = (firebaseUser as { uid?: string } | null)?.uid || '';
  useEffect(() => {
    if (!tirthaUid) return;
    void syncTirtha(tirthaUid).then(() => setTirthaStats(computeStats(tirthaUid)));
  }, [tirthaUid]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => ({
    ...DEFAULT_PREFS,
    quietHours: { ...DEFAULT_PREFS.quietHours },
  }));
  const openNotifSettings = async () => {
    if (prefsUid) {
      try {
        const stored = await readPrefsDoc(prefsUid);
        setPrefs(mergePrefs(stored as Partial<NotificationPrefs> | undefined));
      } catch {
        /* offline — keep defaults */
      }
    }
    setNotifOpen(true);
  };
  const onPrefsChange = (next: NotificationPrefs) => {
    setPrefs(next);
    if (prefsUid) {
      writePrefsDoc(prefsUid, next as unknown as Record<string, unknown>).catch(() => {
        /* offline — the engine reads the stored doc when it can */
      });
    }
  };

  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    gotra: profile?.gotra || '',
    homeRegion: profile?.homeRegion || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName: form.displayName.trim(),
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        gotra: form.gotra.trim() || undefined,
        homeRegion: form.homeRegion.trim() || undefined,
      });
      showToast(tr('solo.profile.saved', 'Profile saved', 'প্রোফাইল সংরক্ষিত', 'परिचय सहेजा गया'), 'success');
    } finally {
      setSaving(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(profile?.id || '');
      showToast(tr('solo.profile.copied', 'Sanatani ID copied', 'আইডি কপি হয়েছে', 'आईडी कॉपी हुई'), 'success');
    } catch {
      showToast(profile?.id || '', 'info');
    }
  };

  // Long-press the SAN number → copies the spoken VDA alias instead
  // (tap still copies the SAN-XXXXXX). The alias is the human word.
  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const copyAlias = async (): Promise<boolean> => {
    const alias = profile?.vdaAlias;
    if (!alias) return false;
    try {
      await navigator.clipboard.writeText(alias);
      showToast(tr('solo.profile.aliasCopied', 'Spoken ID copied — say it at any temple counter 🙏', 'কথ্য আইডি কপি হয়েছে 🙏', 'कथ्य आईडी कॉपी हुई 🙏'), 'success');
      return true;
    } catch {
      return false;
    }
  };
  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const doBackup = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sanatani-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doRestore = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const ok = importJSON(String(r.result || ''));
      showToast(
        ok
          ? tr('solo.profile.restored', 'Backup restored', 'ব্যাকআপ ফিরিয়ে আনা হয়েছে', 'बैकअप पुनर्स्थापित')
          : tr('solo.profile.badfile', 'Invalid backup file', 'অবৈধ ফাইল', 'अमान्य फ़ाइल'),
        ok ? 'success' : 'error'
      );
    };
    r.readAsText(file);
  };

  const openPurohitWorkspace = () => {
    if (!purohitIdentity) {
      showToast(
        tr('solo.profile.noPurohit', 'No purohit identity attached yet — use “Become a Purohit” in My Space.', 'এখনও পুরোহিত পরিচয় সংযুক্ত হয়নি — “পুরোহিত হোন” ব্যবহার করুন।', 'अभी पुरोहित पहचान जुड़ी नहीं — “पुरोहित बनें” उपयोग करें।'),
        'info'
      );
      return;
    }
    enterPurohitSession(purohitIdentity as any);
    showToast(tr('solo.profile.switchedPurohit', `Switched to Purohit Workspace (${purohitIdentity.id})`, `পুরোহিত ওয়ার্কস্পেসে স্যুইচ করা হয়েছে (${purohitIdentity.id})`, `पुरोहित कार्यक्षेत्र में स्विच किया गया (${purohitIdentity.id})`), 'success');
  };

  // Phase 2: open an organisation — the same flow as the Orgs tab's
  // Open button (exitSoloSession + switchWorkspace), so behaviour is
  // identical everywhere.
  const [openingOrg, setOpeningOrg] = useState<string | null>(null);
  const openOrg = async (wsId: string, wsName: string) => {
    setOpeningOrg(wsId);
    try {
      const ok = await switchWorkspace(wsId);
      if (ok) {
        exitSoloSession();
        showToast(`🙏 ${wsName}`, 'success');
      } else {
        showToast(tr('solo.profile.openOrgFailed', 'Could not open this organisation right now.', 'এই মুহূর্তে এই প্রতিষ্ঠান খোলা যাচ্ছে না।', 'इस समय यह संगठन नहीं खोला जा सका।'), 'error');
      }
    } finally {
      setOpeningOrg(null);
    }
  };

  const openJyotishWorkspace = () => {
    if (!jyotishIdentity) {
      showToast(
        tr('solo.profile.noJyotish', 'No jyotishi identity attached yet — use “Become a Jyotishi” in My Space.', 'এখনও জ্যোতিষী পরিচয় সংযুক্ত হয়নি।', 'अभी ज्योतिषी पहचान जुड़ी नहीं।'),
        'info'
      );
      return;
    }
    enterJyotishSession(jyotishIdentity as any);
    showToast(tr('solo.profile.switchedJyotish', `Switched to Jyotishi Workspace (${jyotishIdentity.id})`, `জ্যোতিষী ওয়ার্কস্পেসে স্যুইচ করা হয়েছে (${jyotishIdentity.id})`, `ज्योतिषी कार्यक्षेत्र में स्विच किया गया (${jyotishIdentity.id})`), 'success');
  };

  const openAssistant = () => {
    window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end -mb-2 pr-2 pt-1">
        <TourLink guide={GUIDES.profile} onRestart={profileGuide.restart} />
      </div>

      {/* ═══════════ 🪔 Who I am ═══════════ */}
      <GroupHeader>
        <T en="🪔 Who I am" bn="🪔 আমি কে" hi="🪔 मैं कौन हूँ" />
      </GroupHeader>

      {/* ID card — spec §2 hierarchy starts with the photo.
          Photo taps → scrolls to the upload in Personal details.
          SAN number: tap copies the ID; LONG-PRESS copies the spoken alias. */}
      <div className="rounded-3xl bg-gradient-to-br from-temple-950 via-stone-900 to-amber-950 text-amber-50 p-6" data-guide-anchor="profile-id">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={scrollToPhoto}
            aria-label={tr('solo.profile.photoJump', 'Go to profile photo settings', 'প্রোফাইল ছবির সেটিংসে যান', 'प्रोफ़ाइल फ़ोटो सेटिंग पर जाएँ')}
            className="shrink-0 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profile?.displayName || 'Profile photo'}
                className="w-[84px] h-[84px] rounded-full object-cover border-4 border-amber-400/40 shadow-lg"
              />
            ) : (
              <div
                className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-black text-white shadow-lg"
                aria-hidden
              >
                {monogram}
              </div>
            )}
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">
              ॥ <T en="Universal Sanatani ID" bn="ইউনিভার্সাল সনাতনী আইডি" hi="यूनिवर्सल सनातनी आईडी" /> ॥
            </div>
            <button
              onClick={() => { if (longFired.current) { longFired.current = false; return; } copyId(); }}
              onTouchStart={() => {
                longFired.current = false;
                clearPress();
                pressTimer.current = window.setTimeout(async () => {
                  longFired.current = true;
                  const ok = await copyAlias();
                  if (!ok) copyId();
                }, 600);
              }}
              onTouchEnd={clearPress}
              onTouchMove={clearPress}
              onContextMenu={(e) => { e.preventDefault(); copyAlias().then((ok) => { if (!ok) copyId(); }); }}
              className="font-mono text-2xl sm:text-3xl font-black text-amber-300 mt-1 hover:text-amber-200 select-none"
              title={tr('solo.profile.tapCopy', 'Tap to copy · long-press for spoken ID', 'কপি করতে চাপুন · কথ্য আইডির জন্য চেপে ধরুন', 'कॉपी हेतु दबाएँ · कथ्य आईडी हेतु दबाए रखें')}
            >
              {profile?.id || 'SAN-…'}
            </button>
          </div>
        </div>
        <div className="text-lg font-bold mt-3">{profile?.displayName}</div>
        <div className="mt-2 flex items-center gap-2">
          <VerificationBadge tier={profile?.verificationTier === 'VERIFIED' ? 'PLATFORM_VERIFIED' : 'REGISTERED'} />
          {!profile?.synced && (
            <span className="text-[10px] font-bold text-amber-200/70 border border-amber-200/30 rounded-full px-2 py-0.5">
              <T en="Saved on this device" bn="এই ডিভাইসে সংরক্ষিত" hi="इस डिवाइस पर सहेजा" />
            </span>
          )}
        </div>
      </div>

      {/* Your spoken ID — VDA-style alias on top of the canonical SAN-XXXXXX.
          Deep-link target for the "claim your spoken ID" nudge (#vda-alias). */}
      <div id="vda-alias" style={{ scrollMarginTop: 96 }}>
        <VdaAliasSection />
      </div>

      {/* My roles & workspaces — merged: one row per role, no duplication. */}
      <div data-guide-anchor="profile-identities">
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="My roles & workspaces" bn="আমার ভূমিকা ও কর্মক্ষেত্র" hi="मेरी भूमिकाएँ व कार्यक्षेत्र" />
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 min-h-[56px]">
            <span className="font-bold text-stone-700">🪔 <T en="Sanatani" bn="সনাতনী" hi="सनातनी" /></span>
            <span className="font-mono text-xs text-emerald-700 font-bold">{profile?.id}</span>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 min-h-[56px]">
            <span className="font-bold text-stone-700 min-w-0">
              🕉️ <T en="Purohit" bn="পুরোহিত" hi="पुरोहित" />
              {!purohitIdentity && (
                <span className="block text-[11px] font-medium text-stone-400">
                  <T en="Not attached yet" bn="এখনও সংযুক্ত নয়" hi="अभी जुड़ा नहीं" />
                </span>
              )}
            </span>
            {purohitIdentity ? (
              <Btn variant="ghost" onClick={openPurohitWorkspace}>
                <T en="Open" bn="খুলুন" hi="खोलें" />
              </Btn>
            ) : (
              <span className="font-mono text-xs font-bold text-stone-400">
                {profile?.roles?.purohitId || <T en="Not attached" bn="সংযুক্ত নয়" hi="जुड़ा नहीं" />}
              </span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 min-h-[56px]">
            <span className="font-bold text-stone-700 min-w-0">
              🔮 <T en="Jyotishi" bn="জ্যোতিষী" hi="ज्योतिषी" />
              {!jyotishIdentity && (
                <span className="block text-[11px] font-medium text-stone-400">
                  <T en="Coming soon" bn="শীঘ্রই" hi="शीघ्र" />
                </span>
              )}
            </span>
            {jyotishIdentity ? (
              <Btn variant="ghost" onClick={openJyotishWorkspace}>
                <T en="Open" bn="খুলুন" hi="खोलें" />
              </Btn>
            ) : (
              <span className="font-mono text-xs font-bold text-stone-400">
                {profile?.roles?.jyotishId || <T en="Coming soon" bn="শীঘ্রই" hi="शीघ्र" />}
              </span>
            )}
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 min-h-[56px]">
            <span className="font-bold text-stone-700 min-w-0">
              🏛️ <T en="Organisation view" bn="সংগঠন দৃশ্য" hi="संगठन दृश्य" />
            </span>
            <Btn variant="ghost" onClick={() => navigate('/app/orgs')}>
              <T en="My organisations" bn="আমার সংগঠন" hi="मेरे संगठन" />
            </Btn>
          </li>
        </ul>
        <p className="text-[11px] text-stone-400 mt-2">
          <T en="One account, many roles — your personal data never moves." bn="একটি অ্যাকাউন্ট, অনেক ভূমিকা — ব্যক্তিগত তথ্য কখনও সরবে না।" hi="एक खाता, अनेक भूमिकाएँ — आपका व्यक्तिगत डेटा कभी नहीं हटेगा।" />
        </p>
      </Card>
      </div>

      {/* My Organisations hub — role badge per org from the real membership
          edge; status line uses only real data (never invented). */}
      <ProfileOrgHub
        memberships={myMemberships}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace?.id}
        orgMembersCount={orgMembers.length}
        pendingRequestsCount={orgJoinRequests.length}
        openingOrgId={openingOrg}
        onOpen={openOrg}
        onJoin={() => navigate('/app/orgs/join')}
      />

      {/* ═══════════ 📿 My details ═══════════ */}
      <GroupHeader>
        <T en="📿 My details" bn="📿 আমার তথ্য" hi="📿 मेरा विवरण" />
      </GroupHeader>

      {/* Edit details */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="Personal details" bn="ব্যক্তিগত তথ্য" hi="व्यक्तिगत विवरण" />
        </h3>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          {/* Profile photo — device-local upload */}
          <div id="profile-photo" className="sm:col-span-2 flex items-center gap-4 rounded-2xl bg-stone-50 border border-stone-100 p-3" style={{ scrollMarginTop: 96 }}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-amber-200 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-black text-white shrink-0" aria-hidden>
                {monogram}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-800">
                <T en="Profile photo" bn="প্রোফাইল ছবি" hi="प्रोफ़ाइल फ़ोटो" />
              </p>
              <p className="text-[11px] text-stone-500">
                <T en="Only you see it — stored on this device." bn="শুধু আপনি দেখতে পাবেন — এই ডিভাইসে সংরক্ষিত।" hi="केवल आप देख सकते हैं — इस डिवाइस पर संग्रहीत।" />
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="min-h-[44px] px-4 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black"
                >
                  <T en="Upload photo" bn="ছবি আপলোড" hi="फ़ोटो अपलोड" />
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="min-h-[44px] px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold"
                  >
                    <T en="Remove" bn="সরান" hi="हटाएँ" />
                  </button>
                )}
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { onPhotoPicked(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
          </div>
          <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
            <input className={inputCls} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </Field>
          <Field label={<T en="Phone" bn="ফোন" hi="फ़ोन" />}>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={<T en="City" bn="শহর" hi="नगर" />}>
            <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label={<T en="Home region" bn="নিজ এলাকা" hi="गृह क्षेत्र" />}>
            <input className={inputCls} value={form.homeRegion} onChange={(e) => setForm({ ...form, homeRegion: e.target.value })} />
          </Field>
          <Field label={<><WhatsThis compact term="gotra" label={tr('solo.profile.gotra', 'Gotra', 'গোত্র', 'गोत्र')} /> <span className="text-stone-400 font-normal"><T en="(private)" bn="(গোপন)" hi="(निजी)" /></span></>}>
            <input className={inputCls} value={form.gotra} onChange={(e) => setForm({ ...form, gotra: e.target.value })} />
          </Field>
          {/* Language — the proper picker (own-script list), not free text. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-stone-600">
              <T en="Language" bn="ভাষা" hi="भाषा" />
            </span>
            <button
              type="button"
              onClick={() => setLangOpen(true)}
              className={`${inputCls} !flex !items-center !justify-between !text-left min-h-[44px]`}
            >
              <span className="text-stone-900 font-semibold">{curLangNative}</span>
              <span className="text-stone-400" aria-hidden>→</span>
            </button>
          </div>
          <div className="sm:col-span-2">
            <Btn type="submit" disabled={saving}>
              {saving ? <T en="Saving…" bn="সংরক্ষণ…" hi="सहेज रहे…" /> : <T en="Save details" bn="সংরক্ষণ করুন" hi="सहेजें" />}
            </Btn>
          </div>
        </form>
      </Card>
      <LanguagePickerSheet
        open={langOpen}
        currentLang={currentLang}
        chromeLang={currentLang}
        onSelect={(l) => { changeLanguage(l); markLanguageChosen(); setLangOpen(false); }}
        onClose={() => setLangOpen(false)}
      />

      {/* My Samskaras — tithi anniversaries */}
      <MySamskaras />

      {/* ═══════════ 🗣️ How we speak with you ═══════════ */}
      <GroupHeader>
        <T en="🗣️ How we speak with you" bn="🗣️ আমরা আপনার সঙ্গে কীভাবে কথা বলি" hi="🗣️ हम आपसे कैसे बात करते हैं" />
      </GroupHeader>

      {/* Language & region — the devotee's words, their choice, never overridden */}
      <LanguageRegionSettings />

      {/* VIBE B3 — Sandhya Mode: the dusk theme, the devotee's own
          choice (Off / On / Automatic at dusk), never forced. */}
      <SandhyaSettings />

      {/* Blueprint D — the privacy notice, always reachable from
          Profile (the one-time gate is only the introduction). */}
      <Card>
        <button
          type="button"
          onClick={() => setPrivacyOpen((v) => !v)}
          className="w-full flex items-center gap-3 text-left min-h-[64px] px-1"
          aria-expanded={privacyOpen}
        >
          <span className="text-2xl shrink-0" aria-hidden>🛡️</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-stone-900">
              <T en="Your privacy, in plain words" bn="আপনার গোপনীয়তা, সহজ ভাষায়" hi="आपकी गोपनीयता, सरल शब्दों में" />
            </span>
            <span className="block text-xs text-stone-500">
              <T
                en="What the app keeps, where it lives, and what is never public."
                bn="অ্যাপ যা রাখে, যেখানে থাকে, এবং যা কখনো প্রকাশ্য নয়।"
                hi="ऐप क्या रखता है, कहाँ रहता है, और क्या कभी सार्वजनिक नहीं होता।"
              />
            </span>
          </span>
          <span className="text-stone-400 shrink-0" aria-hidden>{privacyOpen ? '▾' : '▸'}</span>
        </button>
        {privacyOpen && (
          <div className="pt-2 pb-1">
            <PrivacyNoticeBody />
          </div>
        )}
      </Card>

      {/* Assistant — the on-device AI voice, permanent home.
          The one-time nudge points here ("Profile → 🗣️ How we speak with
          you"), so a devotee who dismissed it can always come back. */}
      <div id="ai-voice" style={{ scrollMarginTop: 96 }}>
        <AiVoiceSettings hideWhenUnsupported />
      </div>

      {/* 🙏 Ask — the assistant's named door on the account page. */}
      <Card>
        <button
          type="button"
          onClick={openAssistant}
          className="w-full flex items-center gap-3 text-left min-h-[64px] px-1"
        >
          <span className="text-2xl shrink-0" aria-hidden>🙏</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-stone-900">
              <T en="Ask — your assistant" bn="জিজ্ঞাসা — আপনার সহকারী" hi="पूछें — आपका सहायक" />
            </span>
            <span className="block text-[11px] text-stone-500 mt-0.5">
              <T
                en="Questions about the app, tithi, or your sadhana"
                bn="অ্যাপ, তিথি বা আপনার সাধনা সম্পর্কে প্রশ্ন"
                hi="ऐप, तिथि या आपकी साधना के बारे में प्रश्न"
              />
            </span>
          </span>
          <span className="text-amber-700 text-xl shrink-0" aria-hidden>→</span>
        </button>
      </Card>

      {/* ═══════════ 🪔 Giving & system ═══════════ */}
      <GroupHeader>
        <T en="🪔 Giving & system" bn="🪔 দান ও ব্যবস্থা" hi="🪔 दान व व्यवस्था" />
      </GroupHeader>

      {/* 🪔 Dana & wallet — the account page's money glance. Read-only;
          the Giving and Wallet tabs own their detail. */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-2">
          <T en="🪔 Dana & wallet" bn="🪔 দান ও ওয়ালেট" hi="🪔 दान व वॉलेट" />
        </h3>
        <button
          type="button"
          onClick={() => navigate('/app/home/giving')}
          className="w-full flex items-center justify-between gap-3 rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2.5 min-h-[56px] text-left hover:bg-amber-50 transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest">
              <T en="Lifetime dana" bn="সর্বমোট দান" hi="कुल दान" />
            </span>
            <span className="block text-lg font-extrabold text-stone-900">₹{danaTotal.toLocaleString('en-IN')}</span>
          </span>
          <span className="text-amber-700 text-xl shrink-0" aria-hidden>→</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/app/home/wallet')}
          className="mt-2 w-full flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5 min-h-[56px] text-left hover:bg-stone-100/70 transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest">
              <T en="Seva Wallet" bn="সেবা ওয়ালেট" hi="सेवा वॉलेट" />
            </span>
            <span className="block text-lg font-extrabold text-stone-900">
              {walletBalance === null ? '…' : fmtWallet(walletBalance, walletCurrency)}
            </span>
          </span>
          <span className="text-stone-400 text-xl shrink-0" aria-hidden>→</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/app/home/giving')}
          className="mt-1 w-full text-left text-xs font-bold text-amber-700 hover:underline min-h-[44px] px-1"
        >
          <T en="Giving history →" bn="দানের ইতিহাস →" hi="दान इतिहास →" />
        </button>
      </Card>

      {/* 🌱 Grow with Sanatani Bandhan — the plan-upgrade door for Solo users.
          Discoverability audit #3: every openPlanUpgrade() CTA lived in the
          org shell, so a solo devotee had no path to buy a plan. The flow is
          event-driven — PlanUpgradeHost is mounted globally (App shell via
          NotificationWiring) — and it files a personal claim
          (workspaceId falls back to 'personal' for solo accounts). */}
      <Card className="!p-0 overflow-hidden !border-amber-200">
        <button
          type="button"
          onClick={() => openPlanUpgrade()}
          className="w-full flex items-center gap-3 text-left min-h-[72px] px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
        >
          <span className="text-2xl shrink-0" aria-hidden>🌱</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-stone-900">
              <T en="Grow with Sanatani Bandhan" bn="সনাতনী বন্ধনের সঙ্গে এগিয়ে যান" hi="सनातनी बंधन के साथ आगे बढ़ें" />
            </span>
            <span className="block text-[11px] text-stone-500 mt-0.5">
              <T
                en="Standard, Premium & Purohit Pro — more room for your sadhana, sangha and seva."
                bn="স্ট্যান্ডার্ড, প্রিমিয়াম ও পুরোহিত প্রো — আপনার সাধনা, সঙ্গ ও সেবার জন্য আরও সুযোগ।"
                hi="स्टैंडर्ड, प्रीमियम व पुरोहित प्रो — आपकी साधना, संग व सेवा के लिए अधिक अवसर।"
              />
            </span>
          </span>
          <span className="text-amber-700 text-xl shrink-0" aria-hidden>→</span>
        </button>
      </Card>

      {/* 🪔 My Tirtha Diary — personal pilgrimage journal. Private: only this devotee. */}
      <Card>
        <button
          type="button"
          onClick={() => setTirthaOpen(true)}
          className="w-full flex items-center justify-between gap-3 text-left min-h-[60px] px-1"
        >
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-stone-900">
              <T en="🪔 My Tirtha Diary" bn="🪔 আমার তীর্থ ডায়েরি" hi="🪔 मेरी तीर्थ डायरी" />
            </span>
            <span className="block text-xs text-stone-500 mt-0.5">
              {tirthaStats.visitCount === 0 ? (
                <T en="Your personal pilgrimage journal — only you can see it" bn="আপনার ব্যক্তিগত তীর্থ ডায়েরি — শুধু আপনিই দেখতে পারবেন" hi="आपकी व्यक्तिगत तीर्थ डायरी — केवल आप देख सकते हैं" />
              ) : (
                <T
                  en={`${tirthaStats.templeCount} temples · ${tirthaStats.visitCount} visits`}
                  bn={`${tirthaStats.templeCount} মন্দির · ${tirthaStats.visitCount} ভ্রমণ`}
                  hi={`${tirthaStats.templeCount} मंदिर · ${tirthaStats.visitCount} यात्राएँ`}
                />
              )}
            </span>
          </span>
          <span className="text-amber-700 text-xl shrink-0" aria-hidden>→</span>
        </button>
      </Card>

      {/* Notifications — one calm row; the sheet is shared with Suchana's ⚙️. */}
      <Card>
        <button
          type="button"
          onClick={openNotifSettings}
          className="w-full flex items-center justify-between gap-3 text-left min-h-[60px] px-1"
        >
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-stone-900">
              🔔 <T en="Notifications" bn="বিজ্ঞপ্তি" hi="सूचनाएँ" />
            </span>
            <span className="block text-[11px] text-stone-500 mt-0.5">
              <T
                en="Gentle pings only, when you want them"
                bn="শুধু কোমল বার্তা, যখন আপনি চান"
                hi="केवल कोमल संदेश, जब आप चाहें"
              />
            </span>
          </span>
          <span className="text-stone-400 text-xl shrink-0" aria-hidden>→</span>
        </button>
      </Card>
      {notifOpen && (
        <NotificationSettings
          prefs={prefs}
          onChange={onPrefsChange}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {/* Preferences — small comforts, the user's own choice */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="Preferences" bn="পছন্দ" hi="वरीयताएँ" />
        </h3>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-bold text-stone-800">
              🔔 <T en="Temple bell on japa completion" bn="জপ শেষে মন্দিরের ঘণ্টা" hi="जप पूर्णता पर मंदिर घंटी" />
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              <T
                en="A soft bell sounds when you complete a mala (108 / 1008)."
                bn="মালা (১০৮ / ১০০৮) শেষ হলে মৃদু ঘণ্টা বাজবে।"
                hi="माला (108 / 1008) पूर्ण होने पर मृदु घंटी बजेगी।"
              />
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!bellMuted}
            aria-label={tr('solo.prefs.bell', 'Temple bell on japa completion', 'জপ শেষে মন্দিরের ঘণ্টা', 'जप पूर्णता पर मंदिर घंटी')}
            onClick={() => {
              const next = !bellMuted;
              setBellMuted(next);
              if (!next) playBell();
            }}
            className={`pressable shrink-0 min-w-[56px] min-h-[44px] px-3 rounded-full text-xs font-black transition-colors ${
              bellMuted ? 'bg-stone-200 text-stone-500' : 'bg-amber-500 text-temple-950'
            }`}
          >
            {bellMuted
              ? tr('solo.prefs.off', 'Off', 'বন্ধ', 'बंद')
              : tr('solo.prefs.on', 'On', 'চালু', 'चालू')}
          </button>
        </div>
      </Card>

      {/* Backup / sign out */}
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          <T en="Data & session" bn="তথ্য ও সেশন" hi="डेटा व सत्र" />
        </h3>

      {/* Step 5 (safety): blocked & muted management */}
      {tirthaUid && <SafetyList uid={tirthaUid} />}
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={doBackup}>
            ⬇ <T en="Download backup" bn="ব্যাকআপ নিন" hi="बैकअप लें" />
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            ⬆ <T en="Restore backup" bn="ব্যাকআপ ফেরান" hi="बैकअप लाएं" />
          </Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = ''; }} />
          <Btn variant="danger" onClick={() => logout()}>
            <T en="Sign out" bn="সাইন আউট" hi="साइन आउट" />
          </Btn>
        </div>
        {/* App version — lets support instantly tell if a user is on stale code */}
        <p className="mt-3 text-[11px] text-stone-400 select-all">
          {APP_VERSION}{APP_BUILD_SHA && APP_BUILD_SHA !== 'nogit' ? ` · ${APP_BUILD_SHA}` : ''}
        </p>
      </Card>

      {/* ═══════════ 🛡️ Safety ═══════════ */}
      {/* Family circle (SOS familyNotified phones), consent-first family
          linking, and the devotee's own SOS log — mounted 2026-10-20;
          previously the components existed with zero production mounts. */}
      <SafetySection />

      {/* Quick Guide: the Sanatani identity explainer — invitational only. */}
      {profileGuide.pillVisible && (
        <TourPill guide={GUIDES.profile} uid={(firebaseUser as { uid?: string } | null)?.uid || 'anon'} onStart={profileGuide.start} onDismiss={profileGuide.dismissPill} />
      )}
      {profileGuide.tourActive && <CoachMark guide={GUIDES.profile} onFinish={profileGuide.finish} />}
      {tirthaOpen && tirthaUid && (
        <TirthaDiarySheet uid={tirthaUid} onClose={() => { setTirthaOpen(false); setTirthaStats(computeStats(tirthaUid)); }} />
      )}
    </div>
  );
};
