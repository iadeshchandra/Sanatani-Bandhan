import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SuchanaFeedLive } from '../components/suchana/SuchanaFeed';
import { T } from './ui';
import { SOLO_TAB_IDS, SoloTabId } from './HomeTab';

/* SuchanaPage — the full-page Suchana tab at /app/suchana.
 * =====================================================================
 * Renders the unified guidance feed (Panjika + module intelligence).
 * Action taps deep-link into the Home tab's sub-tabs; anything unknown
 * falls back to Panjika. Phase 3 replaces this with the unified feed UI
 * built on the same component.
 */
export const SuchanaPage: React.FC = () => {
  const navigate = useNavigate();

  const onAction = (route: string) => {
    const id = route as SoloTabId;
    navigate(
      (SOLO_TAB_IDS as readonly string[]).includes(id) ? `/app/home/${id}` : '/app/home/panjika'
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">
      <div className="text-center mb-5">
        <div className="text-4xl" aria-hidden>
          🪔
        </div>
        <h1 className="text-xl font-black text-stone-900 mt-2">
          <T en="Suchana" bn="সূচনা" hi="सूचना" />
        </h1>
        <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
          <T
            en="Gentle guidance for your path — festivals, observances and timely reminders, in one calm stream."
            bn="আপনার পথের মৃদু নির্দেশনা — উৎসব, ব্রত ও সময়োপযোগী স্মরণ, এক শান্ত ধারায়।"
            hi="आपके पथ हेतु सौम्य मार्गदर्शन — उत्सव, व्रत व समयोचित स्मरण, एक शांत धारा में।"
          />
        </p>
      </div>
      <SuchanaFeedLive role="solo" mode="full" daysAhead={30} onAction={onAction} />
    </div>
  );
};
