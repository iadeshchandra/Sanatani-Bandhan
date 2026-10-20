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
import React, { useEffect, useState } from 'react';
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

  // Redirect bounce lives in an effect — navigate() is a side effect;
  // calling it during render risks "Cannot update a component while
  // rendering a different component" (StrictMode double-render).
  useEffect(() => {
    if (closed || uid === 'anon') navigate('/app/home', { replace: true });
  }, [closed, uid, navigate]);

  if (closed || uid === 'anon') {
    // Not signed in (or closed) — nothing to show. The effect above
    // performs the bounce home.
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
