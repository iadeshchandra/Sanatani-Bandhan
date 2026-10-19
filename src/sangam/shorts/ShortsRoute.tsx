import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShortsViewer } from './ShortsViewer';
import { subscribeShorts } from './shortsService';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import type { Short } from './types';

/** Deep-link route: /shorts/:shortId opens the full-screen viewer at that short. */
export const ShortsRoute: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, currentRole } = useAuthWorkspace();
  const [shorts, setShorts] = useState<Short[]>([]);

  const viewerUid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';
  const viewerName = (firebaseUser as { displayName?: string } | null)?.displayName || 'Devotee';
  const isAdmin = currentRole === 'SuperAdmin';

  useEffect(() => subscribeShorts(setShorts, 50), []);

  if (!shorts.length) return null;
  return (
    <ShortsViewer
      shorts={shorts}
      lang="en"
      viewerUid={viewerUid}
      viewerName={viewerName}
      isAdmin={isAdmin}
      initialShortId={shortId}
      onClose={() => navigate(-1)}
    />
  );
};
