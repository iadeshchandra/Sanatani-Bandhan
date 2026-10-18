/**
 * solo/VdaAliasSection.tsx — "Your spoken ID 🪔" (Phase 2).
 * ========================================================
 * A VDA-style alias (`aarav@kashi`): speakable, QR-friendly, claimed
 * first-write-wins in Firestore's `vdaAliases` registry. SAN-XXXXXX stays
 * the canonical key — this is the friendly layer on top, honoured
 * everywhere the profile travels.
 *
 * States: unclaimed → claim form with live availability; claimed → display
 * + tap-to-copy + QR of the alias payload + release (frees the name for
 * others — said plainly in the UI).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSolo } from './SoloContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { Card, T, Btn, Field, inputCls, useLocaleText } from './ui';
import { copyTextToClipboard } from '../lib/orgPublic';
import { GUIDES, useGuide, TourPill, CoachMark } from '../components/guide';
import {
  claimVdaAlias,
  isVdaAliasAvailable,
  normalizeVdaAlias,
  suggestVdaAlias,
  validateVdaAlias,
  releaseVdaAlias,
} from '../lib/vda';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const SUGGESTED_SCOPES = ['bandhan', 'kashi', 'vrindavan', 'tirupati', 'puri'];

export const VdaAliasSection: React.FC = () => {
  const { profile, updateProfile, refresh } = useSolo();
  const { firebaseUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const uid = (firebaseUser as { uid?: string } | null)?.uid;

  const guide = useGuide('vda', uid || 'anon');

  const [input, setInput] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [claiming, setClaiming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const claimed = profile?.vdaAlias || '';

  const normalized = useMemo(() => normalizeVdaAlias(input), [input]);

  // Live availability — debounced; reads the public claim registry.
  useEffect(() => {
    if (claimed) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!normalized) {
      setAvailability('idle');
      return;
    }
    if (validateVdaAlias(normalized)) {
      setAvailability('invalid');
      return;
    }
    setAvailability('checking');
    debounceRef.current = window.setTimeout(async () => {
      try {
        const free = await isVdaAliasAvailable(normalized);
        setAvailability(free ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [normalized, claimed]);

  const doClaim = useCallback(async () => {
    if (!uid || !profile || claiming || availability !== 'available') return;
    setClaiming(true);
    try {
      await claimVdaAlias(normalized, uid, profile.id);
      await updateProfile({ vdaAlias: normalized });
      setInput('');
      showToast(
        tr('solo.vda.claimed', `🪔 ${normalized} is yours — say it at any temple counter!`, `🪔 ${normalized} আপনার — যেকোনো মন্দির কাউন্টারে বলুন!`, `🪔 ${normalized} आपका हुआ — किसी भी मंदिर काउंटर पर बोलें!`),
        'success',
      );
    } catch (err) {
      const msg =
        (err as Error).message === 'taken'
          ? tr('solo.vda.takenRace', 'Just taken! Someone claimed it a moment ago — try another.', 'এইমাত্র নেওয়া হয়েছে! অন্য একটি চেষ্টা করুন।', 'अभी-अभी लिया गया! कोई और आज़माएँ।')
          : tr('solo.vda.claimFail', 'Could not claim this ID — please try again.', 'আইডি নেওয়া যায়নি — আবার চেষ্টা করুন।', 'यह ID नहीं ली जा सकी — पुनः प्रयास करें।');
      showToast(msg, 'error');
    } finally {
      setClaiming(false);
    }
  }, [uid, profile, claiming, availability, normalized, updateProfile, showToast, tr]);

  const doCopy = useCallback(async () => {
    if (!claimed) return;
    const ok = await copyTextToClipboard(claimed);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }, [claimed]);

  const doRelease = useCallback(async () => {
    if (!uid || !claimed || releasing) return;
    setReleasing(true);
    try {
      await releaseVdaAlias(claimed);
      await updateDoc(doc(db, 'sanataniProfiles', uid), {
        vdaAlias: deleteField(),
        updatedAt: serverTimestamp(),
      });
      await refresh();
      setConfirmingRelease(false);
      showToast(
        tr('solo.vda.released', 'Released — that name is free for anyone now.', 'ছেড়ে দেওয়া হয়েছে — নামটি এখন সবার জন্য উন্মুক্ত।', 'छोड़ दिया गया — यह नाम अब सबके लिए खुला है।'),
        'success',
      );
    } catch {
      showToast(
        tr('solo.vda.releaseFail', 'Could not release — please try again.', 'ছাড়া যায়নি — আবার চেষ্টা করুন।', 'छोड़ा नहीं जा सका — पुनः प्रयास करें।'),
        'error',
      );
    } finally {
      setReleasing(false);
    }
  }, [uid, claimed, releasing, refresh, showToast, tr]);

  const suggestFor = (scope: string) => {
    setInput(suggestVdaAlias(profile?.displayName || '', scope));
  };

  return (
    <>
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/60" >
        <div data-guide-anchor="vda-alias">
          <h3 className="font-extrabold text-stone-900 flex items-center gap-2">
            <span aria-hidden>🪔</span>
            <T en="Your spoken ID" bn="আপনার বলার মতো আইডি" hi="आपकी बोली जाने वाली ID" />
          </h3>
          <p className="text-xs text-stone-500 mt-1 mb-4">
            <T
              en="An ID you can say aloud at the temple counter — instead of spelling out SAN-XXXXXX."
              bn="মন্দির কাউন্টারে মুখে বলার মতো একটি আইডি — SAN-XXXXXX বানান করার বদলে।"
              hi="मंदिर काउंटर पर ज़ुबानी बताने वाली ID — SAN-XXXXXX का हिज्जे करने के बजाय।"
            />
          </p>

          {claimed ? (
            <div>
              <button
                onClick={doCopy}
                className="w-full rounded-2xl bg-gradient-to-br from-temple-950 via-stone-900 to-amber-950 text-amber-50 p-5 text-center hover:brightness-110 transition-all min-h-[44px]"
                title={tr('solo.vda.tapCopy', 'Tap to copy', 'কপি করতে চাপুন', 'कॉपी हेतु दबाएँ')}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">॥ VDA ॥</div>
                <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 mt-1 break-all">{claimed}</div>
                <div className="text-[11px] font-bold text-amber-200/70 mt-2">
                  {copied
                    ? tr('solo.vda.copied', 'Copied! 🙏', 'কপি হয়েছে! 🙏', 'कॉपी हो गया! 🙏')
                    : tr('solo.vda.tapToCopy', 'Tap to copy', 'কপি করতে চাপুন', 'कॉपी हेतु दबाएँ')}
                </div>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                <div className="bg-white rounded-2xl border border-amber-200 p-3 shadow-sm">
                  <QRCodeSVG value={claimed} size={148} level="M" aria-label={tr('solo.vda.qrLabel', 'QR code of your spoken ID', 'আপনার বলার মতো আইডির QR কোড', 'आपकी बोली जाने वाली ID का QR कोड')} />
                </div>
                <p className="text-xs text-stone-500 leading-relaxed flex-1">
                  <T
                    en="Show this QR at any connected counter — they will know you instantly, no forms to fill."
                    bn="যেকোনো সংযুক্ত কাউন্টারে এই QR দেখান — ফর্ম ছাড়াই তারা আপনাকে চিনে নেবে।"
                    hi="किसी भी जुड़े काउंटर पर यह QR दिखाएँ — बिना फॉर्म भरे वे आपको पहचान लेंगे।"
                  />
                </p>
              </div>

              {!confirmingRelease ? (
                <button
                  onClick={() => setConfirmingRelease(true)}
                  className="mt-4 text-xs font-bold text-stone-400 underline underline-offset-2 hover:text-red-600 min-h-[44px]"
                >
                  <T en="Release this ID" bn="এই আইডি ছেড়ে দিন" hi="यह ID छोड़ें" />
                </button>
              ) : (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3">
                  <p className="text-xs text-red-800 font-bold">
                    <T
                      en={`Release “${claimed}”? It becomes free for anyone else to claim. This cannot be undone.`}
                      bn={`“${claimed}” ছেড়ে দেবেন? এটি অন্য যে কারো জন্য উন্মুক্ত হয়ে যাবে। এটি ফেরানো যাবে না।`}
                      hi={`“${claimed}” छोड़ें? यह किसी और के लिए खुल जाएगा। यह वापस नहीं होगा।`}
                    />
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Btn variant="danger" onClick={doRelease} disabled={releasing}>
                      {releasing
                        ? <T en="Releasing…" bn="ছাড়া হচ্ছে…" hi="छोड़ा जा रहा…" />
                        : <T en="Yes, release it" bn="হ্যাঁ, ছেড়ে দিন" hi="हाँ, छोड़ें" />}
                    </Btn>
                    <Btn variant="ghost" onClick={() => setConfirmingRelease(false)}>
                      <T en="Keep it" bn="রেখে দিন" hi="रखें" />
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Field label={<T en="Choose your spoken ID" bn="আপনার বলার মতো আইডি বেছে নিন" hi="अपनी बोली जाने वाली ID चुनें" />}>
                <input
                  className={`${inputCls} font-mono`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="aarav@kashi"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  maxLength={61}
                  aria-describedby="vda-hint"
                />
              </Field>
              <p id="vda-hint" className="text-[11px] text-stone-400 mt-1.5">
                <T
                  en="Lowercase letters, numbers, dots and underscores — 3–30 characters on each side of @."
                  bn="ছোট হাতের অক্ষর, সংখ্যা, ডট ও আন্ডারস্কোর — @-এর দুই পাশে ৩–৩০ অক্ষর।"
                  hi="छोटे अक्षर, अंक, बिंदु और अंडरस्कोर — @ के दोनों ओर 3–30 अक्षर।"
                />
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {SUGGESTED_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => suggestFor(scope)}
                    className="px-4 py-1.5 min-h-[44px] min-w-[44px] rounded-full bg-amber-100/70 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors"
                  >
                    @{scope}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Btn onClick={doClaim} disabled={availability !== 'available' || claiming || !uid}>
                  {claiming
                    ? <T en="Claiming…" bn="নেওয়া হচ্ছে…" hi="ली जा रही…" />
                    : <T en="Claim this ID 🪔" bn="এই আইডি নিন 🪔" hi="यह ID लें 🪔" />}
                </Btn>
                <span className="text-xs font-bold" role="status">
                  {availability === 'checking' && <span className="text-stone-400"><T en="Checking…" bn="দেখা হচ্ছে…" hi="जाँचा जा रहा…" /></span>}
                  {availability === 'available' && (
                    <span className="text-emerald-700">
                      <T en={`✨ ${normalized} is free!`} bn={`✨ ${normalized} খালি আছে!`} hi={`✨ ${normalized} खाली है!`} />
                    </span>
                  )}
                  {availability === 'taken' && (
                    <span className="text-red-600">
                      <T en="Taken — try another 🙏" bn="নেওয়া হয়েছে — অন্য চেষ্টা করুন 🙏" hi="लिया जा चुका — कोई और आज़माएँ 🙏" />
                    </span>
                  )}
                  {availability === 'invalid' && normalized && (
                    <span className="text-red-600">
                      <T en="Use the name@scope form above" bn="উপরের name@scope রূপটি ব্যবহার করুন" hi="ऊपर दिया name@scope रूप प्रयोग करें" />
                    </span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-3">
                <T
                  en="One spoken ID per devotee. Your SAN-XXXXXX stays your permanent identity underneath — this is just its friendly voice."
                  bn="প্রতি ভক্তের একটি বলার মতো আইডি। আপনার SAN-XXXXXX স্থায়ী পরিচয় হিসেবেই থাকবে — এটি শুধু তার বন্ধুসুলভ রূপ।"
                  hi="प्रत्येक भक्त की एक बोली जाने वाली ID। आपकी SAN-XXXXXX स्थायी पहचान बनी रहेगी — यह केवल उसका मित्रवत रूप है।"
                />
              </p>
            </div>
          )}
        </div>
      </Card>

      {guide.pillVisible && (
        <div className="mt-2">
          <TourPill guide={GUIDES.vda} uid={uid || 'anon'} onStart={guide.start} onDismiss={guide.dismissPill} />
        </div>
      )}
      {guide.tourActive && <CoachMark guide={GUIDES.vda} onFinish={guide.finish} />}
    </>
  );
};
