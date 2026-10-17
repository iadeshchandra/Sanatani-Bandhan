import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, onAuthStateChanged, signOut, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DevoteeMember, UserRole, WorkspaceConfig, WorkspaceType, ROLE_MIGRATION_MAP } from '../types';
import { useInitialData } from './AppInitializer';
import { get, set, del } from 'idb-keyval';
import { generateSecureQRToken as buildSecureQRToken } from '../utils/qrUtils';
import {
  generatePinHash,
  verifyPinHash,
  pinAttemptAllowed,
  pinRetryAfterSec,
  recordPinFailure,
  clearPinFailures,
} from '../utils/pinCrypto';
import {
  isCloudEnabled,
  getJwtRefreshSkewSec,
  setAuthTokenProvider,
  setWorkspaceIdProvider,
  exchangeToken as exchangeFirebaseIdToken,
  refreshCloudToken as refreshCloudJwt,
} from '../services/cloudApiClient';

/** idb-keyval key for the persisted cloud JWT (never localStorage for tokens). */
const CLOUD_JWT_STORE_KEY = 'sanatani_cloud_jwt';

interface PersistedCloudJwt {
  token: string;
  expiry: number | null;
}

export const INITIAL_WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'DEMO_ws-mandir',
    name: 'Sri Sanatan Dharma Mandir',
    type: 'Mandir',
    tagline: 'Preserving Sanatan Samskriti & Sacred Darshan',
    address: 'Mandir Marg, Sector 4',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 98765 43210',
    email: 'seva@sanatanmandir.org',
    sampradaya: 'Smartha / Advaita Vedanta',
    kuladevata: 'Sri Kashi Vishwanath & Mata Annapurna',
    taxExemptionNumber: 'CIT(E)/80G/VAR-2024-991',
    trustRegNumber: 'TR/VNS/7762/2012',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  },
  {
    id: 'DEMO_ws-goshala',
    name: 'Surabhi Gau Seva Dham',
    type: 'Goshala',
    tagline: 'Sanctuary for 500+ Indigenous Desi Gir & Sahiwal Gomata',
    address: 'Govardhan Parikrama Marg',
    city: 'Vrindavan',
    state: 'Uttar Pradesh',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 98111 22334',
    email: 'gauseva@surabhidham.org',
    sampradaya: 'Gaudiya Vaishnava',
    kuladevata: 'Sri Radha Damodar & Kamadhenu',
    taxExemptionNumber: 'CIT(E)/80G/VRN-8821',
    trustRegNumber: 'TR/VRN/1109/2015',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  },
  {
    id: 'DEMO_ws-sangha',
    name: 'Bharat Dharma Raksha Sangha',
    type: 'Sangha',
    tagline: 'Youth Character Building, Shakha Discipline & Dharma Seva',
    address: 'Shivaji Marg, Keshav Kunj',
    city: 'Nagpur',
    state: 'Maharashtra',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 94220 55667',
    email: 'karyalaya@dharmasangha.in',
    sampradaya: 'Sanatan Rashtra Dharma',
    kuladevata: 'Bhagwan Sri Ramachandra',
    taxExemptionNumber: 'CIT(E)/80G/NGP-4402',
    trustRegNumber: 'TR/NGP/5501/2008',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  },
  {
    id: 'DEMO_ws-ashram',
    name: 'Ananda Kutir Spiritual Ashram',
    type: 'Ashram',
    tagline: 'Silent Meditation, Sadhana Retreats & Vedanta Study',
    address: 'Tapovan, Muni Ki Reti',
    city: 'Rishikesh',
    state: 'Uttarakhand',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 97566 88990',
    email: 'sadhana@anandakutir.org',
    sampradaya: 'Dashanami Sannyasa',
    kuladevata: 'Mata Ganga & Lord Shiva',
    taxExemptionNumber: 'CIT(E)/80G/RSH-3312',
    trustRegNumber: 'TR/UK/9921/2001',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  },
  {
    id: 'DEMO_ws-gurukul',
    name: 'Sandipani Veda Vidyapeeth',
    type: 'Gurukul',
    tagline: 'Reviving Vedic Recitation, Grammar, Nyaya & Shastras',
    address: 'Narmada Ghat Road',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 94066 11223',
    email: 'acharya@sandipanigurukul.edu.in',
    sampradaya: 'Rigveda & Yajurveda Shakha',
    kuladevata: 'Bhagwan Sri Krishna & Sandipani Muni',
    taxExemptionNumber: 'CIT(E)/80G/UJN-5519',
    trustRegNumber: 'TR/MP/3381/1998',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  },
  {
    id: 'DEMO_ws-trust',
    name: 'Shree Somnath Dharmada Trust',
    type: 'Trust',
    tagline: 'Preserving Sacred Tirthas & Vedic Heritage',
    address: 'Prabhas Patan',
    city: 'Veraval',
    state: 'Gujarat',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 98250 44556',
    email: 'trustee@somnathtrust.org',
    sampradaya: 'Pashupata Shaivism',
    kuladevata: 'Shree Somnath Jyotirlinga',
    taxExemptionNumber: 'CIT(E)/80G/GUJ-1102',
    trustRegNumber: 'TR/GJ/1004/1951',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  },
  {
    id: 'DEMO_ws-samaj',
    name: 'Sarvajanik Gaur Brahman Samaj',
    type: 'Samaj',
    tagline: 'Sanskrit Vidyapeeth, Matrimonial & Community Welfare',
    address: 'Brahman Mahasabha Bhawan',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'Bharat (India)',
    currency: 'INR',
    currencySymbol: '₹',
    phone: '+91 94140 88991',
    email: 'samaj@gaurbrahman.org',
    sampradaya: 'Vaidika Sanatan',
    kuladevata: 'Bhagwan Parashuram',
    taxExemptionNumber: 'CIT(E)/80G/RAJ-2291',
    trustRegNumber: 'TR/RJ/4412/1985',
    pinRequired: true,
    adminPin: '', // Server-managed via POST /api/auth/verify-pin - never hardcode
  }
];

export interface AuthWorkspaceContextType {
  // Required core state properties
  user: User | null;
  workspaceId: string | null;
  role: UserRole | null;
  isLoading: boolean;
  switchWorkspace: (newWorkspaceId: string) => Promise<boolean>;
  /**
   * P0-2: Exit the demo sandbox. Removes demo workspaces from state, clears
   * the demo workspace ID from storage, and switches to the user's first
   * real workspace (or empty, triggering onboarding). The demo is for
   * anonymous sessions only — authenticated users must never be trapped in it.
   */
  exitDemo: () => void;

  // Backward-compatible and platform RBAC properties
  firebaseUser: User | null;
  activeWorkspaceId: string;
  activeWorkspace: WorkspaceConfig;
  workspaces: WorkspaceConfig[];
  currentRole: UserRole;
  currentDevotee: DevoteeMember | null;
  setCurrentDevotee: (devotee: DevoteeMember | null) => void;
  currentUser?: {
    id: string;
    name: string;
    fullName?: string;
    phone?: string;
    email?: string;
    role: UserRole;
  };
  isAuthenticated: boolean;
  viewMode: 'MANAGER' | 'MEMBER';
  setViewMode: (mode: 'MANAGER' | 'MEMBER') => void;
  /**
   * Purohit One session isolation.
   * 'org' = normal organisation/devotee session. 'purohit' = independent
   * purohit personal workspace. When 'purohit', AppContent renders ONLY the
   * purohit shell — no org switcher, no workspace desks, no org data. The two
   * sessions are mutually exclusive by construction (a single early-return
   * branch in AppContent), so neither can leak into the other.
   *
   * Solo Sanatani adds 'solo' = independent personal workspace (no org, no
   * profession). Same hard-guard pattern: when 'solo', AppContent renders
   * ONLY the solo shell. A solo user can progressively attach roles
   * (organisation membership, PUR-XXXXXX, JYO-XXXXXX) and switch sessions;
   * personal data (sadhana, saved, giving) lives in the solo store and
   * survives every upgrade.
   *
   * Jyotish One adds 'jyotish' = independent jyotishi personal workspace.
   * Same hard guard, same dual-identity model as purohit.
   */
  sessionKind: 'org' | 'purohit' | 'solo' | 'jyotish';
  purohitProfile: import('../types/purohit').PurohitIdentity | null;
  enterPurohitSession: (profile: import('../types/purohit').PurohitIdentity) => void;
  exitPurohitSession: () => void;
  jyotishProfile: import('../types/jyotish').JyotishIdentity | null;
  enterJyotishSession: (profile: import('../types/jyotish').JyotishIdentity) => void;
  exitJyotishSession: () => void;
  soloProfile: import('../solo/types').SanataniProfile | null;
  enterSoloSession: (profile: import('../solo/types').SanataniProfile) => void;
  exitSoloSession: () => void;
  updateWorkspaceType: (newType: WorkspaceType) => void;
  switchRole: (role: UserRole) => void;
  updateCurrentUserRole?: (role: UserRole) => void;
  checkPermission: (allowedRoles: (UserRole | string)[]) => boolean;
  /**
   * Phase 2 org spaces: the user's role in the CURRENT org, resolved from
   * the rules-enforced workspaceMembers edge (published by OrgSpaceShell
   * from myMemberships). When set, it drives checkPermission() and
   * effectiveRole for all org-session RBAC — the role pill and desk
   * filtering follow the actual per-org role, not the global role carried
   * from another session. Platform owners keep SuperAdmin clearance
   * regardless of the override. Cleared when the org session ends.
   */
  orgRoleOverride: string | null;
  setOrgRoleOverride: (role: string | null) => void;
  /** The role RBAC actually evaluates right now (override-aware). */
  effectiveRole: UserRole;
  loginWithPin: (pin: string, devoteeList: DevoteeMember[]) => Promise<boolean>;
  loginAsRole: (role: UserRole, customName?: string) => void;
  switchPersona: (role: UserRole, name: string, targetModule?: string) => void;
  logout: () => Promise<void>;
  saveCustomLogo: (base64: string) => void;
  updateWorkspaceDetails: (updates: Partial<WorkspaceConfig>) => void;
  addWorkspace: (workspace: WorkspaceConfig) => void;
  generateSecureQRToken: (member: DevoteeMember) => string;

  // Phase 21: Cloud production wiring (JWT auth + centralized sync)
  /** Current cloud control-plane JWT, or null when cloud is disabled / signed out. */
  cloudAccessToken: string | null;
  /** True when VITE_CLOUD_API_BASE_URL is configured (cloud mode). */
  cloudEnabled: boolean;
  /**
   * Proactively refreshes the cloud JWT (refresh endpoint). Returns the fresh
   * token, or null on failure (token cleared + 'sanatani:cloud-auth-required'
   * dispatched for a UI-level re-login nudge).
   */
  refreshCloudToken: () => Promise<string | null>;
  /** Authorization headers for direct cloud API calls from UI code. */
  getCloudAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthWorkspaceContext = createContext<AuthWorkspaceContextType | undefined>(undefined);

export const AuthWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = useInitialData();

  // Core Authentication & Tenant State
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    return initialData.sanatani_active_workspace_id || 'DEMO_ws-mandir';
  });
  const [role, setRole] = useState<UserRole | null>(() => {
    return (initialData.sanatani_user_role as UserRole) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cached User Profile Document from Firestore
  const [userDocData, setUserDocData] = useState<any>(null);

  // Application Workspaces & View States
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>(() => {
    return initialData.sanatani_workspaces || INITIAL_WORKSPACES;
  });
  const [viewMode, setViewMode] = useState<'MANAGER' | 'MEMBER'>('MEMBER');
  // Purohit One: independent-purohit session. Mutually exclusive with org
  // sessions — see the AppContent guard. Persisted so a refresh keeps the
  // purohit in their personal workspace (profile rehydrated by PurohitContext).
  const [sessionKind, setSessionKind] = useState<'org' | 'purohit' | 'solo' | 'jyotish'>(() => {
    try {
      return (localStorage.getItem('sb_session_kind') as 'org' | 'purohit' | 'solo' | 'jyotish') || 'org';
    } catch {
      return 'org';
    }
  });
  const [purohitProfile, setPurohitProfile] = useState<import('../types/purohit').PurohitIdentity | null>(null);

  const enterPurohitSession = (profile: import('../types/purohit').PurohitIdentity) => {
    setPurohitProfile(profile);
    setSessionKind('purohit');
    try {
      localStorage.setItem('sb_session_kind', 'purohit');
    } catch {
      /* storage unavailable */
    }
  };
  const exitPurohitSession = () => {
    setPurohitProfile(null);
    setSessionKind('org');
    try {
      localStorage.removeItem('sb_session_kind');
    } catch {
      /* storage unavailable */
    }
  };
  // Solo Sanatani: independent personal session. Mirrors the purohit hard
  // guard — entering solo never mounts org UI; the solo profile is rehydrated
  // by SoloContext on refresh (session kind persisted like purohit).
  const [soloProfile, setSoloProfile] = useState<import('../solo/types').SanataniProfile | null>(null);
  const enterSoloSession = (profile: import('../solo/types').SanataniProfile) => {
    setSoloProfile(profile);
    setSessionKind('solo');
    try {
      localStorage.setItem('sb_session_kind', 'solo');
    } catch {
      /* storage unavailable */
    }
  };
  const exitSoloSession = () => {
    setSoloProfile(null);
    setSessionKind('org');
    try {
      localStorage.removeItem('sb_session_kind');
    } catch {
      /* storage unavailable */
    }
  };
  // Phase 2 org spaces: per-org role override. Set by OrgSpaceShell from
  // the workspaceMembers membership edge; null means "no override — use
  // the global role". Never persisted (re-derived per org entry).
  const [orgRoleOverride, setOrgRoleOverride] = useState<string | null>(null);
  // Jyotish One: independent jyotishi session. Mirrors the purohit hard
  // guard — entering jyotish never mounts org UI; the jyotish profile is
  // rehydrated by JyotishContext on refresh (session kind persisted).
  const [jyotishProfile, setJyotishProfile] = useState<import('../types/jyotish').JyotishIdentity | null>(null);
  const enterJyotishSession = (profile: import('../types/jyotish').JyotishIdentity) => {
    setJyotishProfile(profile);
    setSessionKind('jyotish');
    try {
      localStorage.setItem('sb_session_kind', 'jyotish');
    } catch {
      /* storage unavailable */
    }
  };
  const exitJyotishSession = () => {
    setJyotishProfile(null);
    setSessionKind('org');
    try {
      localStorage.removeItem('sb_session_kind');
    } catch {
      /* storage unavailable */
    }
  };
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return initialData.sanatani_active_workspace_id || 'DEMO_ws-mandir';
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return (initialData.sanatani_user_role as UserRole) || 'Devotee';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentDevotee, setCurrentDevotee] = useState<DevoteeMember | null>(() => {
    return initialData.sanatani_current_devotee || null;
  });
  const [personaUser, setPersonaUser] = useState<{
    id: string;
    name: string;
    fullName: string;
    phone?: string;
    email?: string;
    role: UserRole;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Phase 21: Cloud production wiring (JWT auth + centralized sync)
  // ---------------------------------------------------------------------------
  /** Resolved once at mount from `import.meta.env` — env vars are static at runtime. */
  const cloudEnabledRef = useRef<boolean>(isCloudEnabled());
  const [cloudEnabled] = useState<boolean>(() => cloudEnabledRef.current);
  const [cloudAccessToken, setCloudAccessToken] = useState<string | null>(null);
  const [cloudTokenExpiry, setCloudTokenExpiry] = useState<number | null>(null);

  /** Ref mirror of the cloud token so the globally-registered provider never goes stale. */
  const cloudTokenRef = useRef<{ token: string | null; expiry: number | null }>({
    token: null,
    expiry: null,
  });
  /** Deduplicates concurrent refresh attempts (sync flush + UI + auth-required event). */
  const cloudRefreshInFlightRef = useRef<Promise<string | null> | null>(null);
  /** Mirrors activeWorkspaceId for the X-Workspace-Id header provider. */
  const activeWorkspaceIdRef = useRef<string>(initialData.sanatani_active_workspace_id || 'DEMO_ws-mandir');
  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);

  /** Persists the cloud JWT to idb-keyval (never localStorage for tokens). */
  const persistCloudToken = useCallback(async (token: string | null, expiry: number | null) => {
    try {
      if (token) {
        await set(CLOUD_JWT_STORE_KEY, { token, expiry } satisfies PersistedCloudJwt);
      } else {
        await del(CLOUD_JWT_STORE_KEY);
      }
    } catch (err) {
      console.warn('[CloudAuth] Failed to persist cloud JWT:', err);
    }
  }, []);

  const applyCloudToken = useCallback(
    async (token: string | null, expiry: number | null) => {
      cloudTokenRef.current = { token, expiry };
      setCloudAccessToken(token);
      setCloudTokenExpiry(expiry);
      await persistCloudToken(token, expiry);
    },
    [persistCloudToken]
  );

  /**
   * Refreshes the cloud JWT. When `notifyOnFailure` is true and the refresh
   * fails, the token is cleared and 'sanatani:cloud-auth-required' is
   * dispatched so the UI can nudge the user to re-login.
   */
  const refreshCloudTokenInternal = useCallback(
    async (notifyOnFailure: boolean): Promise<string | null> => {
      if (!cloudEnabledRef.current) return null;
      if (cloudRefreshInFlightRef.current) return cloudRefreshInFlightRef.current;

      const attempt = (async (): Promise<string | null> => {
        try {
          const result = await refreshCloudJwt();
          await applyCloudToken(result.accessToken, result.expiresAt);
          console.log('[CloudAuth] Cloud JWT refreshed.');
          return result.accessToken;
        } catch (err) {
          console.warn('[CloudAuth] Cloud JWT refresh failed:', err);
          await applyCloudToken(null, null);
          if (notifyOnFailure) {
            window.dispatchEvent(new CustomEvent('sanatani:cloud-auth-required'));
          }
          return null;
        } finally {
          cloudRefreshInFlightRef.current = null;
        }
      })();

      cloudRefreshInFlightRef.current = attempt;
      return attempt;
    },
    [applyCloudToken]
  );

  /** Public refresh: failure notifies the rest of the app via event. */
  const refreshCloudToken = useCallback(
    (): Promise<string | null> => refreshCloudTokenInternal(true),
    [refreshCloudTokenInternal]
  );

  /**
   * Returns a valid cloud JWT, refreshing it first when expired or inside the
   * configured refresh-skew window. Registered as cloudApiClient's token provider.
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!cloudEnabledRef.current) return null;
    const { token, expiry } = cloudTokenRef.current;
    const skewMs = getJwtRefreshSkewSec() * 1000;
    if (token && expiry !== null && expiry - Date.now() > skewMs) {
      return token;
    }
    if (token && expiry === null) {
      // Token of unknown expiry (e.g. restored before expiry metadata) — trust it.
      return token;
    }
    return refreshCloudTokenInternal(true);
  }, [refreshCloudTokenInternal]);

  /** Authorization headers for direct cloud API calls from UI code. */
  const getCloudAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getValidToken]);

  /**
   * Clears the cloud session: state, idb-keyval persistence, and the globally
   * registered token provider. Called on logout and on sign-out transitions.
   */
  const clearCloudSession = useCallback(async () => {
    await applyCloudToken(null, null);
    setAuthTokenProvider(null);
  }, [applyCloudToken]);

  // Restore a previously persisted cloud JWT + register providers (once).
  useEffect(() => {
    if (!cloudEnabledRef.current) return;

    (async () => {
      try {
        const stored = await get<PersistedCloudJwt>(CLOUD_JWT_STORE_KEY);
        if (stored?.token) {
          cloudTokenRef.current = { token: stored.token, expiry: stored.expiry ?? null };
          setCloudAccessToken(stored.token);
          setCloudTokenExpiry(stored.expiry ?? null);
        }
      } catch (err) {
        console.warn('[CloudAuth] Failed to restore persisted cloud JWT:', err);
      }
    })();

    setAuthTokenProvider(() => getValidToken());
    setWorkspaceIdProvider(() => activeWorkspaceIdRef.current);

    return () => {
      setAuthTokenProvider(null);
      setWorkspaceIdProvider(null);
    };
    // Intentionally once: getValidToken is ref-stable and env is static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One silent refresh attempt when any cloud call reports 401; if that fails,
  // toast the user via the 'sanatani:toast' event (ToastContext listens).
  // NOTE: this path uses notifyOnFailure=false to avoid re-dispatching the
  // same event from inside refreshCloudTokenInternal (event loop guard).
  useEffect(() => {
    const handler = async () => {
      const token = await refreshCloudTokenInternal(false);
      if (!token) {
        window.dispatchEvent(
          new CustomEvent('sanatani:toast', {
            detail: {
              message: 'Cloud session expired — please re-login',
              type: 'warning',
              title: 'Cloud Sync',
            },
          })
        );
      }
    };
    window.addEventListener('sanatani:cloud-auth-required', handler);
    return () => window.removeEventListener('sanatani:cloud-auth-required', handler);
  }, [refreshCloudTokenInternal]);

  // Keep workspaceId and activeWorkspaceId synchronized
  useEffect(() => {
    if (workspaceId && workspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
  }, [workspaceId, activeWorkspaceId]);

  // Sync state to IndexedDB / Local Storage for persistence
  useEffect(() => {
    set('sanatani_workspaces', workspaces);
  }, [workspaces]);

  useEffect(() => {
    set('sanatani_active_workspace_id', activeWorkspaceId);
    if (isAuthenticated) {
      localStorage.setItem(
        'sanatani_web_session',
        JSON.stringify({
          communityId: activeWorkspaceId,
          role: role || currentRole,
          devoteeId: currentDevotee?.id || null,
        })
      );
    } else {
      localStorage.removeItem('sanatani_web_session');
    }
  }, [activeWorkspaceId, role, currentRole, currentDevotee, isAuthenticated]);

  /**
   * 1. State Management & 2. Firestore Binding
   * Detect logins via onAuthStateChanged and fetch doc(db, 'users', user.uid)
   */
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseAuthUser) => {
      setUser(firebaseAuthUser);

      if (firebaseAuthUser) {
        // Handle anonymous sandboxed demo sessions
        if (firebaseAuthUser.isAnonymous) {
          setIsAuthenticated(true);
          // SECURITY (C-2): anonymous sessions are credential-less by definition
          // and must NEVER inherit a persisted privileged role (e.g. a
          // SuperAdmin role left behind on a shared temple computer). Any
          // elevated demo access is granted explicitly via loginAsRole, which
          // runs after this branch and sets role state directly.
          const fallbackRole: UserRole = 'Devotee';
          setRole(fallbackRole);
          setCurrentRole(fallbackRole);
          setIsLoading(false);
          return;
        }

        try {
          // Fetch authoritative user profile from Firestore 'users' collection
          const userDocRef = doc(db, 'users', firebaseAuthUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserDocData(data);

            // Extract default workspace ID first (needed for creator check)
            // P0-2 FIX: Never inherit a demo workspace on sign-in. If the user
            // doc doesn't specify a workspace and the current workspace is a
            // demo sandbox, clear it — authenticated users must see org
            // onboarding, not the demo. The demo is for anonymous sessions only.
            const currentIsDemo = activeWorkspaceId?.startsWith('DEMO_');
            const targetWorkspaceId: string =
              data.defaultWorkspaceId || data.workspaceId || (!currentIsDemo ? activeWorkspaceId : '') || '';

            // Extract role and cast to UserRole with legacy normalizer.
            // H-11: no valid stored role → the recorded workspace creator is
            // its administrator (Trustee); everyone else is Devotee.
            const VALID_ROLES = ['SuperAdmin', 'Trustee', 'Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO'];
            const rawRole = String(data.role || '');
            const normalized = (ROLE_MIGRATION_MAP[rawRole] || rawRole) as UserRole;
            let resolvedRole: UserRole = 'Devotee';
            if (rawRole && (VALID_ROLES as string[]).includes(normalized)) {
              resolvedRole = normalized;
            } else {
              // Freshest persisted registry (avoids the stale closure — the
              // effect below runs once with empty deps).
              let persistedWs: WorkspaceConfig[] = workspaces;
              try {
                const stored = await get('sanatani_workspaces');
                if (Array.isArray(stored) && stored.length > 0) persistedWs = stored;
              } catch { /* fall back to closure state */ }
              const creatorWs = persistedWs.find((w) => w.id === targetWorkspaceId);
              if (creatorWs && (creatorWs as any).createdBy === firebaseAuthUser.uid) {
                resolvedRole = 'Trustee';
              }
            }
            setRole(resolvedRole);
            setCurrentRole(resolvedRole);

            // P0-2: If the resolved workspace is empty (user has no workspace
            // and was in demo), purge demo workspaces so the user sees org
            // onboarding instead of being trapped in the demo sandbox.
            if (!targetWorkspaceId) {
              setWorkspaces((prev) => {
                const real = prev.filter((w) => !w.id.startsWith('DEMO_'));
                try {
                  set('sanatani_workspaces', real);
                  localStorage.removeItem('sanatani_active_workspace_id');
                  localStorage.removeItem('sb_pending_demo_conversion');
                } catch { /* storage unavailable */ }
                return real;
              });
            }

            setWorkspaceId(targetWorkspaceId);
            setActiveWorkspaceId(targetWorkspaceId);
            setIsAuthenticated(true);
            setViewMode('MANAGER');
          } else {
            // New user registration or document pending creation
            const defaultRole: UserRole = 'Devotee';
            setRole(defaultRole);
            setCurrentRole(defaultRole);
            // FIX (2026-10-17): New users must never inherit a demo workspace.
            // Clear any demo workspaces from state and storage before marking
            // authenticated — otherwise the fallback lands them in the demo.
            setWorkspaces((prev) => {
              const real = prev.filter((w) => !w.id.startsWith('DEMO_'));
              try {
                set('sanatani_workspaces', real);
                localStorage.removeItem('sanatani_active_workspace_id');
                localStorage.removeItem('sb_pending_demo_conversion');
              } catch { /* storage unavailable */ }
              return real;
            });
            setWorkspaceId('');
            setActiveWorkspaceId('');
            setIsAuthenticated(true);
          }
        } catch (err: any) {
          console.warn('Notice: Firestore user document lookup fallback:', err?.message || err);
          setIsAuthenticated(true);
        } finally {
          setIsLoading(false);
        }

        // Phase 21: Exchange the Firebase ID token for a cloud control-plane JWT.
        // Anonymous demo sessions skip this — an anonymous ID token carries no
        // real identity the cloud API can trust.
        if (cloudEnabledRef.current) {
          try {
            const idToken = await firebaseAuthUser.getIdToken();
            const result = await exchangeFirebaseIdToken(idToken);
            await applyCloudToken(result.accessToken, result.expiresAt);
            console.log('[CloudAuth] Cloud JWT acquired via Firebase ID token exchange.');
          } catch (exchangeErr) {
            console.warn(
              '[CloudAuth] JWT exchange failed — continuing in Firebase-direct mode:',
              exchangeErr
            );
          }
        }
      } else {
        // Signed out state
        setUser(null);
        setRole(null);
        setCurrentRole('Devotee');
        setUserDocData(null);
        setCurrentDevotee(null);
        setIsAuthenticated(false);
        setWorkspaceId('DEMO_ws-mandir');
        setActiveWorkspaceId('DEMO_ws-mandir');
        setIsLoading(false);
        // Phase 21: drop any cloud JWT + unregister the token provider.
        void clearCloudSession();
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * 3. Tenant Switching Logic
   * - SuperAdmin can switch to ANY workspace without restriction.
   * - Other admins (Trustees) verify multi-branch / workspace membership access before switching.
   */
  const switchWorkspace = useCallback(
    async (newWorkspaceId: string): Promise<boolean> => {
      if (!newWorkspaceId) return false;

      // Sandbox Demo workspaces are always switchable for preview & QA
      if (newWorkspaceId.startsWith('DEMO_')) {
        setWorkspaceId(newWorkspaceId);
        setActiveWorkspaceId(newWorkspaceId);
        set('sanatani_active_workspace_id', newWorkspaceId);
        return true;
      }

      // Check SuperAdmin unrestricted privileges
      const effectiveRole = role || currentRole;
      const isSuperAdmin =
        effectiveRole === 'SuperAdmin' ||
        userDocData?.role === 'SuperAdmin' ||
        userDocData?.role === 'SUPER_ADMIN' ||
        userDocData?.isGlobalAdmin === true;

      if (isSuperAdmin) {
        setWorkspaceId(newWorkspaceId);
        setActiveWorkspaceId(newWorkspaceId);
        set('sanatani_active_workspace_id', newWorkspaceId);
        return true;
      }

      // Non-SuperAdmin tenant access verification via Firestore
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const freshSnap = await getDoc(userDocRef);
          const uData = freshSnap.exists() ? freshSnap.data() : userDocData || {};

          // Verify access via assigned memberships, branches, or default workspace
          const accessibleList: string[] = [
            uData.workspaceId,
            uData.defaultWorkspaceId,
            ...(Array.isArray(uData.accessibleWorkspaces) ? uData.accessibleWorkspaces : []),
            ...(Array.isArray(uData.memberships) ? uData.memberships : []),
            ...(Array.isArray(uData.branches) ? uData.branches : []),
          ].filter(Boolean);

          // Membership sprint: the rules-enforced workspaceMembers edge also
          // grants access (join-request approvals and invite acceptances land
          // here — clients can never forge it, Trustees write it).
          let hasMemberEdge = false;
          try {
            const memSnap = await getDoc(
              doc(db, 'workspaceMembers', `${newWorkspaceId}_${user.uid}`)
            );
            hasMemberEdge = memSnap.exists();
          } catch {
            hasMemberEdge = false;
          }

          const hasAccess =
            uData.role === 'SuperAdmin' ||
            uData.role === 'SUPER_ADMIN' ||
            uData.isGlobalAdmin === true ||
            hasMemberEdge ||
            accessibleList.includes(newWorkspaceId);

          if (hasAccess) {
            setWorkspaceId(newWorkspaceId);
            setActiveWorkspaceId(newWorkspaceId);
            set('sanatani_active_workspace_id', newWorkspaceId);
            return true;
          } else {
            console.warn(`Production workspace switch denied for ${newWorkspaceId}: Insufficient tenant clearance.`);
            return false;
          }
        } catch (error) {
          console.error('Error verifying tenant switch authorization:', error);
          return false;
        }
      }

      // If user is not authenticated for production workspace
      console.warn('Production workspace switch denied: User is not authenticated.');
      return false;
    },
    [user, role, currentRole, userDocData]
  );

  /**
   * P0-2: Exit the demo sandbox. Removes demo workspaces from the list,
   * clears the persisted demo workspace ID, and switches to the first real
   * workspace. If no real workspace exists, the ID is cleared (empty string)
   * which triggers the org onboarding flow — the user is never trapped in demo.
   *
   * FIX (2026-10-17): The old version used a stale `workspaces` closure to
   * compute the target, and the activeWorkspace fallback would land on
   * INITIAL_WORKSPACES[0] (a DEMO workspace) when the list was empty —
   * trapping the user in demo. This version computes the target atomically
   * from the filtered list and explicitly avoids demo fallbacks.
   */
  const exitDemo = useCallback(() => {
    // Compute the real (non-demo) workspaces from the freshest persisted
    // state, not the potentially stale React closure.
    // CRITICAL: Write to storage SYNCHRONOUSLY first — callers may trigger
    // an immediate page reload (window.location.href), and React state
    // updates are async. Storage is the source of truth on reload.
    let real: WorkspaceConfig[] = [];
    try {
      const stored = localStorage.getItem('sanatani_workspaces');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          real = parsed.filter((w) => w.id && !w.id.startsWith('DEMO_'));
        }
      }
      // Persist synchronously BEFORE any state update or navigation
      set('sanatani_workspaces', real);
      localStorage.removeItem('sb_pending_demo_conversion');
      const activeWs = localStorage.getItem('sanatani_active_workspace_id');
      if (!activeWs || activeWs.startsWith('DEMO_')) {
        localStorage.removeItem('sanatani_active_workspace_id');
      }
    } catch { /* storage unavailable — fall through to state */ }

    // Update React state to match (for the current session if no reload)
    setWorkspaces(real);
    // Find the first real workspace, or empty (triggers onboarding).
    // CRITICAL: never fall back to a DEMO workspace here.
    const targetId = real[0]?.id || '';
    setWorkspaceId(targetId);
    setActiveWorkspaceId(targetId);
    try {
      if (targetId) {
        set('sanatani_active_workspace_id', targetId);
      }
    } catch { /* storage unavailable */ }
  }, []);

  const activeWorkspace = useMemo(() => {
    const found =
      workspaces.find((w) => w.id === activeWorkspaceId) ||
      workspaces[0];
    if (found) return found;
    // FIX (2026-10-17): Never fall back to a DEMO workspace for authenticated
    // users — that's the exit-demo trap. Authenticated users with no workspace
    // get a SAFE EMPTY workspace (triggers org onboarding); anonymous users
    // get the demo.
    // HOTFIX (2026-10-17): returning undefined crashed dozens of components
    // that read activeWorkspace.id on boot. The empty workspace has id: ''
    // so every "no workspace" check still works, and no DEMO id is present.
    if (isAuthenticated) {
      return {
        id: '',
        name: '',
        type: 'Mandir',
        tagline: '',
        address: '',
        city: '',
        state: '',
        country: '',
        currency: 'INR',
        currencySymbol: '₹',
        sampradaya: '',
        kuladevata: '',
        pinRequired: false,
        planId: 'LITE',
      } as WorkspaceConfig;
    }
    return INITIAL_WORKSPACES[0];
  }, [workspaces, activeWorkspaceId, isAuthenticated]);

  const updateWorkspaceType = (newType: WorkspaceType) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspaceId ? { ...w, type: newType } : w))
    );
  };

  const updateWorkspaceDetails = (updates: Partial<WorkspaceConfig>) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspaceId ? { ...w, ...updates } : w))
    );
  };

  const switchRole = (newRole: UserRole) => {
    // Client-side role switching is allowed for DEMO / development environments
    if (!activeWorkspaceId.startsWith('DEMO_')) {
      console.warn('Role switching is disabled for production tenant workspaces.');
      return;
    }
    const normalized: UserRole = (ROLE_MIGRATION_MAP[newRole] || newRole) as UserRole;
    setRole(normalized);
    setCurrentRole(normalized);
    set('sanatani_user_role', normalized);
  };

  /**
   * Phase 2 org spaces: RBAC evaluates the effective role — the per-org
   * override from the workspaceMembers edge when present (a Trustee in org
   * A who is a Devotee in org B is a Devotee while inside org B), otherwise
   * the pre-existing global role logic. SuperAdmin keeps platform clearance
   * everywhere.
   */
  const effectiveRole = useMemo((): UserRole => {
    const globalRole = (role || currentRole) as UserRole;
    if (globalRole === 'SuperAdmin') return 'SuperAdmin';
    if (orgRoleOverride) {
      return (ROLE_MIGRATION_MAP[orgRoleOverride] || orgRoleOverride) as UserRole;
    }
    return globalRole;
  }, [orgRoleOverride, role, currentRole]);

  const checkPermission = useCallback(
    (allowedRoles: (UserRole | string)[]): boolean => {
      const eff = effectiveRole;
      if (eff === 'SuperAdmin') return true;

      return allowedRoles.some((allowed) => {
        const normalizedAllowed = ROLE_MIGRATION_MAP[allowed] || allowed;
        if (normalizedAllowed === eff || allowed === eff) return true;
        // Trustee hierarchy grants operational leadership clearance
        if (eff === 'Trustee' && ['Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO'].includes(normalizedAllowed)) {
          return true;
        }
        return false;
      });
    },
    [effectiveRole]
  );

  /**
   * V6 RBAC: the raw orgRoleOverride setter must never be handed to arbitrary
   * components — whoever holds it can escalate privilege (it drives
   * checkPermission() via effectiveRole). The context exposes this guarded
   * wrapper instead: it passes through null (session clear) and recognized
   * role values from ROLE_MIGRATION_MAP, and rejects arbitrary strings.
   * Sole legitimate publisher remains OrgSpaceShell (membership edge role).
   */
  const setOrgRoleOverrideSafe = useCallback((next: string | null) => {
    if (next === null || ROLE_MIGRATION_MAP[next]) {
      setOrgRoleOverride(next);
      return;
    }
    console.warn('[RBAC] setOrgRoleOverride rejected unrecognized role value; ignoring.');
  }, []);

  /**
   * PIN login — Phase 21S hardened, Spark-plan fallback added.
   * - Devotee personal PINs stay client-side (low privilege, no escalation).
   *   Verification prefers PBKDF2-SHA256 (`pinSalt`/`pinHash`) when present,
   *   falling back to the legacy plaintext compare for old records.
   * - Admin/master PINs are verified by the server FIRST
   *   (POST /api/auth/verify-pin, peppered hash, custom-token session).
   * - Server-FALLBACK (Spark plan, no server): when the API is unreachable,
   *   the PIN is checked against a PBKDF2 hash cached on THIS DEVICE from a
   *   previous successful server verification. This is a DEVICE-LOCK grade
   *   check — it proves the device saw this PIN before, not server identity.
   *   UI copy must say so. Client-side rate limit: 5 attempts → 60s cooldown.
   */
type TriCopy = { en: string; bn: string; hi: string };
/**
 * Warm trilingual resolver for auth toasts. Reads the active language from
 * localStorage at call time (the language can change at runtime and toasts
 * fire from non-render paths), falling back to English.
 */
const trAuth = (copy: TriCopy): string => {
  try {
    const lang = localStorage.getItem('sanatani_lang') || 'en';
    if (lang === 'bn') return copy.bn;
    if (lang === 'hi') return copy.hi;
  } catch {
    /* sandboxed iframe — fall through to English */
  }
  return copy.en;
};
const PIN_TRY_AGAIN_MSG: TriCopy = {
  en: "This PIN didn't open the door — please try again.",
  bn: 'এই পিন দিয়ে দরজা খুলল না — আবার চেষ্টা করুন।',
  hi: 'इस पिन से द्वार नहीं खुला — कृपया फिर से प्रयास करें।',
};
const PIN_TRY_AGAIN_TITLE: TriCopy = {
  en: 'Please try again',
  bn: 'আবার চেষ্টা করুন',
  hi: 'कृपया पुनः प्रयास करें',
};
const pinDeniedToast = (
  toastEvent: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void
) => toastEvent(trAuth(PIN_TRY_AGAIN_MSG), 'error', trAuth(PIN_TRY_AGAIN_TITLE));
  const loginWithPin = async (pin: string, devoteeList: DevoteeMember[]): Promise<boolean> => {
    const toastEvent = (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sanatani:toast', { detail: { message, type, title } })
        );
      }
    };

    const cleanPin = (pin || '').trim();
    const rlKey = `pin-login:${activeWorkspaceId}`;

    // Client-side rate limit for every fallback path below.
    if (!pinAttemptAllowed(rlKey)) {
      const wait = pinRetryAfterSec(rlKey);
      toastEvent(
        `Too many PIN attempts. Try again in ${wait} seconds.`,
        'error',
        'Rate Limited'
      );
      return false;
    }

    // 1. Devotee personal PIN lookup (client-side, no privilege escalation).
    //    Prefer the PBKDF2 hash when the record carries one; phone-suffix
    //    login keeps its legacy behavior (suffix alone is the credential).
    const match = devoteeList.find(
      (d) => d.pin === pin || (typeof d.phone === 'string' && d.phone.endsWith(pin))
    );
    if (match) {
      let verified: boolean;
      if (match.pin === pin && match.pinSalt && match.pinHash) {
        verified = await verifyPinHash(cleanPin, match.pinSalt, match.pinHash);
      } else {
        verified = true; // legacy plaintext / phone-suffix credential
      }
      if (!verified) {
        recordPinFailure(rlKey);
        pinDeniedToast(toastEvent);
        return false;
      }
      clearPinFailures(rlKey);
      setCurrentDevotee(match);
      const matchedRole = (ROLE_MIGRATION_MAP[match.role] || match.role || 'Devotee') as UserRole;
      setRole(matchedRole);
      setCurrentRole(matchedRole);
      setIsAuthenticated(true);
      signInAnonymously(auth).catch(console.error);
      set('sanatani_current_devotee', match);
      return true;
    }

    // 2. Admin PIN — server verification FIRST. No hardcoded fallback exists.
    if (cleanPin.length < 4 || cleanPin.length > 32) {
      recordPinFailure(rlKey);
      pinDeniedToast(toastEvent);
      return false;
    }

    try {
      const resp = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin, workspaceId: activeWorkspaceId }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.ok) {
        if (resp.status === 429) {
          toastEvent('Too many PIN attempts. Please wait 15 minutes.', 'error', 'Rate Limited');
        } else {
          recordPinFailure(rlKey);
          pinDeniedToast(toastEvent);
        }
        return false;
      }

      // Verified server-side: establish a claims-bearing Firebase session.
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      } else {
        await signInAnonymously(auth).catch(console.error);
      }

      // Remember a PBKDF2 hash of this verified PIN on THIS DEVICE ONLY,
      // so a future offline login can do a device-lock grade check.
      try {
        const remembered = await generatePinHash(cleanPin);
        localStorage.setItem(
          `sb_admin_pin_hash_${activeWorkspaceId}`,
          JSON.stringify(remembered)
        );
      } catch {
        /* storage unavailable — offline fallback simply won't exist */
      }

      clearPinFailures(rlKey);
      const normalized = 'SuperAdmin' as UserRole;
      setRole(normalized);
      setCurrentRole(normalized);
      setIsAuthenticated(true);
      setViewMode('MANAGER');
      set('sanatani_user_role', normalized);
      toastEvent('Administrator session verified.', 'success', 'Welcome');
      return true;
    } catch (err) {
      console.error('[Auth] PIN verification request failed:', err);
      // 3. Server unreachable → device-lock grade fallback. Honest copy:
      //    this only proves the PIN matched one remembered by THIS device.
      let remembered: { salt: string; hash: string } | null = null;
      try {
        const raw = localStorage.getItem(`sb_admin_pin_hash_${activeWorkspaceId}`);
        remembered = raw ? JSON.parse(raw) : null;
      } catch {
        remembered = null;
      }
      if (
        remembered &&
        typeof remembered.salt === 'string' &&
        typeof remembered.hash === 'string' &&
        (await verifyPinHash(cleanPin, remembered.salt, remembered.hash))
      ) {
        clearPinFailures(rlKey);
        await signInAnonymously(auth).catch(console.error);
        const normalized = 'SuperAdmin' as UserRole;
        setRole(normalized);
        setCurrentRole(normalized);
        setIsAuthenticated(true);
        setViewMode('MANAGER');
        set('sanatani_user_role', normalized);
        toastEvent(
          'Verified against this device\u2019s remembered PIN (device-lock grade) — server verification unavailable.',
          'warning',
          'Offline Admin Access'
        );
        return true;
      }
      recordPinFailure(rlKey);
      toastEvent(
        remembered
          ? trAuth(PIN_TRY_AGAIN_MSG)
          : 'PIN verification unavailable (temple server unreachable) and no remembered PIN on this device. Check your connection and try again.',
        'error',
        remembered ? trAuth(PIN_TRY_AGAIN_TITLE) : 'Access Denied'
      );
      return false;
    }
  };

  const loginAsRole = (asRole: UserRole, customName?: string) => {
    if (!activeWorkspaceId.startsWith('DEMO_')) {
      setActiveWorkspaceId('DEMO_ws-mandir');
      setWorkspaceId('DEMO_ws-mandir');
    }
    const normalized: UserRole = (ROLE_MIGRATION_MAP[asRole] || asRole) as UserRole;
    setRole(normalized);
    setCurrentRole(normalized);
    setIsAuthenticated(true);
    setViewMode('MANAGER');
    signInAnonymously(auth).catch(console.error);

    if (normalized === 'Devotee') {
      setCurrentDevotee({
        id: 'dev-demo-self',
        workspaceId: activeWorkspaceId,
        fullName: customName || 'Sri Anand Acharya',
        spiritualName: 'Ananda Das',
        phone: '+91 98765 00108',
        email: 'anand@sanatan.org',
        pin: '1008',
        role: 'Devotee',
        sevaIndex: 780,
        sevaTier: 'Vishesh',
        gotra: 'Kashyapa',
        pravara: 'Kashyapa, Avatsara, Naidhruva',
        varnaKul: 'Suryavanshi',
        address: 'Bhadra Ghat, Varanasi',
        activeStatus: 'Active',
        totalDonated: 45000,
        volunteerHours: 120,
        qrCodeRef: 'QR-SB-DEV108',
        joinedDate: '2023-01-15',
      });
    } else {
      setCurrentDevotee(null);
    }
    if (customName) {
      setPersonaUser({
        id: `user-${normalized.toLowerCase()}`,
        name: customName,
        fullName: customName,
        phone: '+91 98765 43210',
        email: `${normalized.toLowerCase()}@sanatanmandir.org`,
        role: normalized,
      });
    } else {
      setPersonaUser(null);
    }
  };

  const switchPersona = useCallback(
    (newRole: UserRole, customName: string, targetModule?: string) => {
      if (!activeWorkspaceId.startsWith('DEMO_')) {
        setActiveWorkspaceId('DEMO_ws-mandir');
        setWorkspaceId('DEMO_ws-mandir');
      }
      const normalized: UserRole = (ROLE_MIGRATION_MAP[newRole] || newRole) as UserRole;
      setRole(normalized);
      setCurrentRole(normalized);
      setIsAuthenticated(true);
      set('sanatani_user_role', normalized);

      const personaObj = {
        id: `persona-${normalized.toLowerCase()}`,
        name: customName,
        fullName: customName,
        phone: '+91 98765 43210',
        email: `${normalized.toLowerCase()}@sanatanmandir.org`,
        role: normalized,
      };
      setPersonaUser(personaObj);

      if (normalized === 'Devotee') {
        setViewMode('MEMBER');
        const devProfile: DevoteeMember = {
          id: 'dev-arun-sharma',
          workspaceId: activeWorkspaceId,
          fullName: customName || 'Arun Sharma',
          spiritualName: 'Arun Das',
          phone: '+91 98765 43210',
          email: 'arun.sharma@sanatan.org',
          pin: '1008',
          role: 'Devotee',
          sevaIndex: 920,
          sevaTier: 'Ratna',
          gotra: 'Bharadwaja',
          pravara: 'Angirasa, Barhaspatya, Bharadwaja',
          varnaKul: 'Suryavanshi',
          address: 'Kashi Vishwanath Corridor, Varanasi',
          activeStatus: 'Active',
          totalDonated: 151000,
          volunteerHours: 340,
          qrCodeRef: 'QR-SB-DEV-ARUN',
          joinedDate: '2022-04-10',
        };
        setCurrentDevotee(devProfile);
        set('sanatani_current_devotee', devProfile);
      } else {
        setViewMode('MANAGER');
        setCurrentDevotee(null);
      }

      const destModule =
        targetModule ||
        (normalized === 'Devotee'
          ? 'devoteePortal'
          : normalized === 'Priest'
          ? 'sanctum-hud'
          : normalized === 'Accountant'
          ? 'treasury-audit'
          : normalized === 'CSO'
          ? 'tactical-radar'
          : 'dashboard');

      // Dispatch global custom event for instant navigation
      window.dispatchEvent(
        new CustomEvent('sanatani:navigate', {
          detail: { module: destModule, role: normalized, user: customName },
        })
      );
    },
    [activeWorkspaceId]
  );

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
    // Phase 21: clear the cloud JWT (idb-keyval + state) and unregister the provider.
    await clearCloudSession();
    setUser(null);
    setRole(null);
    setCurrentRole('Devotee');
    setCurrentDevotee(null);
    setUserDocData(null);
    setIsAuthenticated(false);
    set('sanatani_current_devotee', null);
    localStorage.removeItem('sanatani_web_session');
    // SECURITY (C-2): a persisted privileged role must NEVER survive logout.
    // On shared temple computers the next visitor would otherwise inherit it
    // via the anonymous auto-login branch. Delete both the idb-keyval entry
    // and the legacy localStorage key written by the persona switcher.
    await del('sanatani_user_role');
    localStorage.removeItem('sanatani_user_role');
    setWorkspaceId('DEMO_ws-mandir');
    setActiveWorkspaceId('DEMO_ws-mandir');
    // Purohit One: a purohit-personal session must never survive logout.
    setPurohitProfile(null);
    setSessionKind('org');
    try {
      localStorage.removeItem('sb_session_kind');
    } catch {
      /* storage unavailable */
    }
  };

  const saveCustomLogo = (base64: string) => {
    set(`sb_logo_${activeWorkspaceId}`, base64);
    updateWorkspaceDetails({ logoUrl: base64 });
  };

  const addWorkspace = (newWorkspace: WorkspaceConfig) => {
    setWorkspaces((prev) => {
      const existing = prev.find((w) => w.id === newWorkspace.id);
      // C-6 (monetization): every workspace carries a plan. Demo sandboxes
      // are 'DEMO' (governed by the separate 5/module demo quota); every real
      // workspace defaults to 'LITE' (Seva Free) — never silently DEMO.
      const planId =
        newWorkspace.planId ||
        existing?.planId ||
        (newWorkspace.id.startsWith('DEMO_') ? 'DEMO' : 'LITE');
      const stamped: WorkspaceConfig = { ...newWorkspace, planId };
      if (existing) {
        return prev.map((w) => (w.id === newWorkspace.id ? stamped : w));
      }
      const updated = [...prev, stamped];
      set('sanatani_workspaces', updated);
      return updated;
    });
    setWorkspaceId(newWorkspace.id);
    setActiveWorkspaceId(newWorkspace.id);
  };

  // Identity-verification QR payload (PIN-free). Delegates to the hardened
  // qrUtils implementation — never embed credentials in a QR.
  const generateSecureQRToken = (member: DevoteeMember): string => {
    return buildSecureQRToken(member);
  };

  const currentUser = useMemo(() => {
    if (personaUser && personaUser.role === (role || currentRole)) {
      return {
        ...personaUser,
        role: role || currentRole,
      };
    }
    const displayName = currentDevotee?.fullName || user?.displayName || 'Acharya / Trustee Administrator';
    return {
      id: currentDevotee?.id || user?.uid || 'admin-root',
      name: displayName,
      fullName: displayName,
      phone: currentDevotee?.phone || user?.phoneNumber || '+91 98765 43210',
      email: currentDevotee?.email || user?.email || 'admin@sanatanmandir.org',
      role: role || currentRole,
    };
  }, [personaUser, currentDevotee, user, role, currentRole]);

  return (
    <AuthWorkspaceContext.Provider
      value={{
        user,
        workspaceId,
        role,
        isLoading,
        switchWorkspace,
        exitDemo,
        firebaseUser: user,
        activeWorkspaceId,
        activeWorkspace,
        workspaces,
        currentRole: role || currentRole,
        currentDevotee,
        setCurrentDevotee,
        currentUser,
        isAuthenticated,
        viewMode,
        setViewMode,
        sessionKind,
        purohitProfile,
        enterPurohitSession,
        exitPurohitSession,
        jyotishProfile,
        enterJyotishSession,
        exitJyotishSession,
        soloProfile,
        enterSoloSession,
        exitSoloSession,
        updateWorkspaceType,
        switchRole,
        updateCurrentUserRole: switchRole,
        checkPermission,
        orgRoleOverride,
        setOrgRoleOverride: setOrgRoleOverrideSafe,
        effectiveRole,
        loginWithPin,
        loginAsRole,
        switchPersona,
        logout,
        saveCustomLogo,
        updateWorkspaceDetails,
        addWorkspace,
        generateSecureQRToken,
        // Phase 21: cloud production wiring
        cloudAccessToken,
        cloudEnabled,
        refreshCloudToken,
        getCloudAuthHeaders,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-amber-100 selection:bg-amber-500">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 text-xl font-bold">🕉️</span>
            <span className="text-lg font-serif font-semibold tracking-wider text-amber-200">
              सनातन बन्धन (SANATANI BANDHAN)
            </span>
          </div>
          <p className="text-xs text-stone-400 font-sans tracking-wide">
            Initializing Sacred Workspace & Verifying RBAC Session...
          </p>
        </div>
      ) : (
        children
      )}
    </AuthWorkspaceContext.Provider>
  );
};

export const useAuthWorkspace = () => {
  const context = useContext(AuthWorkspaceContext);
  if (!context) {
    throw new Error('useAuthWorkspace must be used within an AuthWorkspaceProvider');
  }
  return context;
};
