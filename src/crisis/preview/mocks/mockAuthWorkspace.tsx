/**
 * preview/mocks/mockAuthWorkspace.tsx — DEV-ONLY AuthWorkspaceContext stub.
 */
import React, { createContext, useContext } from 'react';

const Ctx = createContext<unknown>(null);

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Ctx.Provider
    value={{
      activeWorkspace: { id: 'preview-org', name: 'Preview Mandir' },
      firebaseUser: { uid: 'preview-coord' },
      currentUser: { id: 'preview-coord', fullName: 'Preview Guardian', name: 'Preview Guardian' },
      isAuthenticated: true,
      isLoading: false,
      activeWorkspaceId: 'preview-org',
      checkPermission: () => true,
    }}
  >
    {children}
  </Ctx.Provider>
);

export function useAuthWorkspace(): {
  activeWorkspace: { id: string; name: string };
  firebaseUser: { uid: string };
  currentUser: { id: string; fullName: string; name: string };
  isAuthenticated: boolean;
  isLoading: boolean;
  activeWorkspaceId: string;
  checkPermission: () => boolean;
} {
  return useContext(Ctx) as never;
}

export default useAuthWorkspace;
