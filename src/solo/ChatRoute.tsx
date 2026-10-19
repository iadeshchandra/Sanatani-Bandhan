/**
 * solo/ChatRoute.tsx — the /app/chat route: Messages as a real route.
 * =====================================================================
 * AUDIT FIX #5: `/app/chat?with=` was a dead route — DevoteeProfile's
 * "Message" button created the chat then navigated nowhere, stranding
 * the user. Notification deep-links (`/chat/${chatId}`) were dead too.
 *
 * This route renders the same Chat overlay SoloHome uses, opened to the
 * thread from `?with=<chatId>` when present. Closing returns to Home.
 */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chat } from '../chat/Chat';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import type { ChatParticipant } from '../chat/types';

export const ChatRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firebaseUser } = useAuthWorkspace();

  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const initialChatId = searchParams.get('with') || undefined;
  // Closing the route's chat goes back (or home if no history).
  const [closed, setClosed] = useState(false);

  const selfInfo: ChatParticipant = {
    uid,
    displayName: ((firebaseUser as { displayName?: string } | null)?.displayName as string) || 'Sanatani',
    photoUrl: ((firebaseUser as { photoURL?: string } | null)?.photoURL as string) || undefined,
  };

  if (closed || uid === 'anon') {
    // Not signed in — nothing to show. Bounce home.
    navigate('/app/home', { replace: true });
    return null;
  }

  return (
    <Chat
      uid={uid}
      selfInfo={selfInfo}
      initialChatId={initialChatId}
      onClose={() => {
        setClosed(true);
        navigate('/app/home', { replace: true });
      }}
    />
  );
};
