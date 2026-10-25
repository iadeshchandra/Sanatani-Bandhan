import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShortsViewer } from './ShortsViewer';
import { subscribeShorts } from './shortsService';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import type { ShortsLang } from './i18n';
import type { Short } from './types';

/** Deep-link route: /shorts/:shortId opens the full-screen viewer at that short. */
export const ShortsRoute: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, currentRole } = useAuthWorkspace();
  // World-Readiness B4 (G-L3): the viewer used to be hard-wired to
  // English on this route. Its string table is trilingual (en/hi/bn);
  // clamp the global choice the way every trilingual surface does.
  const { currentLang } = useLanguage();
  const lang: ShortsLang = currentLang === 'hi' || currentLang === 'bn' ? currentLang : 'en';
  const [shorts, setShorts] = useState<Short[]>([]);

  const viewerUid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';
  const viewerName = (firebaseUser as { displayName?: string } | null)?.displayName || 'Devotee';
  const isAdmin = currentRole === 'SuperAdmin';

  useEffect(() => subscribeShorts(setShorts, 50), []);

  if (!shorts.length) return null;
  return (
    <ShortsViewer
      shorts={shorts}
      lang={lang}
      viewerUid={viewerUid}
      viewerName={viewerName}
      isAdmin={isAdmin}
      initialShortId={shortId}
      onClose={() => navigate(-1)}
    />
  );
};
