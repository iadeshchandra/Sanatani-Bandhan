import React, { useEffect, useState } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useSolo } from './SoloContext';
import { useToast } from '../context/ToastContext';
import { BecomePurohitModal } from '../components/purohit/BecomePurohitModal';
import { useMyPurohitIdentity } from '../components/purohit/useMyPurohitIdentity';
import { Card, T, Btn } from './ui';

/* JoinUpgrade — progressive joining from the solo account.
 * =====================================================================
 * Three one-tap upgrades, no new account, no data loss. Personal data
 * (sadhana, saved, giving) lives in the solo store and survives every
 * upgrade by construction — these flows never touch it.
 *
 *  - Join an Organisation → the public org directory (/orgs); the existing
 *    join-request flow (MembershipContext.requestToJoin) handles approval.
 *  - Become a Purohit → the existing BecomePurohitModal (devotee_upgrade
 *    path); mints PUR-XXXXXX and attaches it to the Sanatani ID.
 *  - Become a Jyotishi → Jyotish One is queued; honest "coming soon".
 */

export const JoinUpgrade: React.FC = () => {
  const { profile, attachRole } = useSolo();
  const { exitSoloSession } = useAuthWorkspace();
  const { showToast } = useToast();
  const { identity: purohitIdentity, refresh: refreshPurohit } = useMyPurohitIdentity();
  const [purohitOpen, setPurohitOpen] = useState(false);

  const hasPurohit = !!profile?.roles?.purohitId || !!purohitIdentity;
  const hasJyotish = !!profile?.roles?.jyotishId;

  // When the modal mints a PUR-XXXXXX, attach it to the Sanatani ID spine.
  useEffect(() => {
    if (purohitIdentity && profile && !profile.roles?.purohitId) {
      attachRole('purohit', purohitIdentity.id);
    }
  }, [purohitIdentity, profile, attachRole]);

  const closePurohitModal = async () => {
    setPurohitOpen(false);
    // Pick up a freshly minted identity and attach it to the Sanatani ID
    // spine. Runs even when the modal itself switched sessions, because the
    // attach is just an async call (no component state needed).
    try {
      const ident = await refreshPurohit();
      if (ident && !profile?.roles?.purohitId) {
        await attachRole('purohit', ident.id);
        showToast(`Purohit identity ${ident.id} attached to your Sanatani ID`, 'success');
      }
    } catch {
      /* attachment is best-effort; the PUR identity itself is already minted */
    }
  };

  const goJoinOrg = () => {
    // Leave the solo session; the public org directory + join-request flow
    // take over (trustee approval, workspace appears — existing machinery).
    exitSoloSession();
    window.location.href = '/orgs';
  };

  return (
    <Card>
      <h3 className="font-extrabold text-stone-900 mb-1">
        <T en="Grow your journey" bn="যাত্রা এগিয়ে নিন" hi="यात्रा आगे बढ़ाएँ" />
      </h3>
      <p className="text-xs text-stone-500 mb-4">
        <T
          en="One account, many roles. Everything personal stays yours."
          bn="একটি অ্যাকাউন্ট, অনেক ভূমিকা। ব্যক্তিগত সবকিছু আপনারই থাকবে।"
          hi="एक खाता, अनेक भूमिकाएँ। आपकी व्यक्तिगत चीज़ें आपकी ही रहेंगी।"
        />
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-200 p-4 flex flex-col">
          <div className="text-2xl mb-2">🏛️</div>
          <div className="font-bold text-sm text-stone-900">
            <T en="Join an Organisation" bn="সংগঠনে যোগ দিন" hi="संगठन से जुड़ें" />
          </div>
          <p className="text-xs text-stone-500 mt-1 mb-3 flex-1">
            <T
              en="Become a member/devotee of a Mandir, Goshala, Ashram or Sangha."
              bn="মন্দির, গোশালা, আশ্রম বা সংঘের সদস্য/ভক্ত হোন।"
              hi="मंदिर, गोशाला, आश्रम या संघ के सदस्य/भक्त बनें।"
            />
          </p>
          <Btn variant="ghost" onClick={goJoinOrg}>
            <T en="Browse organisations" bn="সংগঠন দেখুন" hi="संगठन देखें" />
          </Btn>
        </div>
        <div className="rounded-2xl border border-stone-200 p-4 flex flex-col">
          <div className="text-2xl mb-2">🕉️</div>
          <div className="font-bold text-sm text-stone-900">
            <T en="Become a Purohit" bn="পুরোহিত হোন" hi="पुरोहित बनें" />
          </div>
          <p className="text-xs text-stone-500 mt-1 mb-3 flex-1">
            {hasPurohit ? (
              <T
                en={`Attached: ${profile?.roles?.purohitId || purohitIdentity?.id}. Switch from the ⇄ menu anytime.`}
                bn={`${profile?.roles?.purohitId || purohitIdentity?.id} সংযুক্ত। ⇄ মেনু থেকে যেকোনো সময় বদলান।`}
                hi={`${profile?.roles?.purohitId || purohitIdentity?.id} जुड़ा है। ⇄ मेनू से कभी भी बदलें।`}
              />
            ) : (
              <T
                en="Get your Universal Purohit ID and a personal purohit workspace."
                bn="ইউনিভার্সাল পুরোহিত আইডি ও ব্যক্তিগত ওয়ার্কস্পেস পান।"
                hi="यूनिवर्सल पुरोहित आईडी और व्यक्तिगत वर्कस्पेस पाएं।"
              />
            )}
          </p>
          {!hasPurohit && (
            <Btn variant="ghost" onClick={() => setPurohitOpen(true)}>
              <T en="Start application" bn="আবেদন শুরু করুন" hi="आवेदन शुरू करें" />
            </Btn>
          )}
        </div>
        <div className="rounded-2xl border border-dashed border-stone-300 p-4 flex flex-col bg-stone-50/50">
          <div className="text-2xl mb-2">🔮</div>
          <div className="font-bold text-sm text-stone-900">
            <T en="Become a Jyotishi" bn="জ্যোতিষী হোন" hi="ज्योतिषी बनें" />
          </div>
          <p className="text-xs text-stone-500 mt-1 mb-3 flex-1">
            {hasJyotish ? (
              <T en={`Attached: ${profile?.roles?.jyotishId}.`} bn={`${profile?.roles?.jyotishId} সংযুক্ত।`} hi={`${profile?.roles?.jyotishId} जुड़ा है।`} />
            ) : (
              <T
                en="Jyotish One is on the way — your Sanatani ID will carry it."
                bn="জ্যোতিষ ওয়ান আসছে — আপনার সনাতনী আইডি তা বহন করবে।"
                hi="ज्योतिष वन आ रहा है — आपकी सनातनी आईडी इसे धारण करेगी।"
              />
            )}
          </p>
          {!hasJyotish && (
            <Btn
              variant="ghost"
              onClick={() => showToast('Jyotish One is coming soon — your Sanatani ID is ready for it.', 'info')}
            >
              <T en="Coming soon" bn="শীঘ্রই আসছে" hi="शीघ्र आ रहा है" />
            </Btn>
          )}
        </div>
      </div>
      {purohitOpen && (
        <BecomePurohitModal
          isOpen={purohitOpen}
          onClose={closePurohitModal}
        />
      )}
    </Card>
  );
};
