import { useInitialData } from './AppInitializer';
import { set } from 'idb-keyval';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DevoteeMember,
  FamilyHousehold,
  VanshavaliNode,
  GuestRecord,
  TreasuryTransaction,
  AssetRecord,
  InventoryItem,
  PoojaBooking,
  ResidentPujaSchedule,
  PurohitProfile,
  PitruRecord,
  GoshalaCowRecord,
  AnnadanamSponsorship,
  AshramKutirRoom,
  GurukulStudent,
  CampaignCrowdfund,
  MatrimonyProfile,
  PanjikaFestival,
  ShlokaCardItem,
  TrusteeResolution,
  SevadarDutyShift,
  TenantScoped,
  BranchInfo,
  BhoomiProperty,
  BhoomiRentReceipt,
  FleetVehicle,
  FleetFuelLog,
  FleetServiceRecord,
  SevaSubscription,
} from '../types';
import { trackTreasuryPurchase, trackSignUp, trackGenerateLead } from '../utils/gtm';
import { nextReceiptSeq, formatReceiptNumber } from '../utils/receiptNumbers';
import { resolveBranchIds } from '../utils/branchAccess';
import { useAuthWorkspace } from './AuthWorkspaceContext';
import { useToast } from './ToastContext';
import { db } from '../lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { offlineSyncManager } from '../services/OfflineSyncManager';



// Split data modules (see src/context/data/)
import {
  INITIAL_DEVOTEES,
  INITIAL_FAMILIES,
  INITIAL_VANSHAVALI,
  INITIAL_GUESTS,
  INITIAL_TREASURY,
  INITIAL_ASSETS,
  INITIAL_INVENTORY,
  INITIAL_POOJA_BOOKINGS,
  INITIAL_RESIDENT_PUJAS,
  INITIAL_PUROHIT_MARKET,
  INITIAL_PITRU_RECORDS,
  INITIAL_COWS,
  INITIAL_ANNADANAM,
  INITIAL_ROOMS,
  INITIAL_GURUKUL_STUDENTS,
  INITIAL_CAMPAIGNS,
  INITIAL_MATRIMONY,
  INITIAL_SHLOKAS,
  INITIAL_RESOLUTIONS,
  INITIAL_SHIFTS,
} from './data/seedData';
import {
  DEMO_QUOTA_KEY_PREFIX,
  DEMO_CREATES_PER_MODULE,
  PENDING_DEMO_CONVERSION_KEY,
  demoTtlFields,
  DEMO_QUOTA_MODULES,
  demoModuleMeta,
  QuotaResult,
  DemoUpsell,
} from './data/quotaEngine';
import { DataContextType } from './data/types';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspaceId, activeWorkspace, currentRole, isAuthenticated, firebaseUser, currentUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const initialData = useInitialData();

  const [allDevotees, setAllDevotees] = useState<DevoteeMember[]>(() => {
    const s = initialData.sb_devotees;
    return s ? s : INITIAL_DEVOTEES;
  });

  const [allFamilies, setAllFamilies] = useState<FamilyHousehold[]>(() => {
    const s = initialData.sb_families;
    return s ? s : INITIAL_FAMILIES;
  });

  const [vanshavali, setVanshavali] = useState<VanshavaliNode>(() => {
    const s = initialData.sb_vanshavali;
    return s ? s : INITIAL_VANSHAVALI;
  });

  const [allGuests, setAllGuests] = useState<GuestRecord[]>(() => {
    const s = initialData.sb_guests;
    return s ? s : INITIAL_GUESTS;
  });

  const [allTreasury, setAllTreasury] = useState<TreasuryTransaction[]>(() => {
    const s = initialData.sb_treasury;
    return s ? s : INITIAL_TREASURY;
  });

  const [allAssets, setAllAssets] = useState<AssetRecord[]>(() => {
    const s = initialData.sb_assets;
    return s ? s : INITIAL_ASSETS;
  });

  const [allInventory, setAllInventory] = useState<InventoryItem[]>(() => {
    const s = initialData.sb_inventory;
    return s ? s : INITIAL_INVENTORY;
  });

  const [allPoojaBookings, setAllPoojaBookings] = useState<PoojaBooking[]>(() => {
    const s = initialData.sb_pooja_bookings;
    return s ? s : INITIAL_POOJA_BOOKINGS;
  });

  const [allResidentPujas, setAllResidentPujas] = useState<ResidentPujaSchedule[]>(() => { const s = (initialData as any).sb_residentPujas; return s ? s : INITIAL_RESIDENT_PUJAS; });
  const [allPurohits] = useState<PurohitProfile[]>(INITIAL_PUROHIT_MARKET);
  const [allPitruRecords, setAllPitruRecords] = useState<PitruRecord[]>(() => { const s = (initialData as any).sb_pitruRecords; return s ? s : INITIAL_PITRU_RECORDS; });
  const [allCows, setAllCows] = useState<GoshalaCowRecord[]>(() => { const s = (initialData as any).sb_cows; return s ? s : INITIAL_COWS; });
  const [allAnnadanamList, setAllAnnadanamList] = useState<AnnadanamSponsorship[]>(() => { const s = (initialData as any).sb_annadanam; return s ? s : INITIAL_ANNADANAM; });
  const [allRooms] = useState<AshramKutirRoom[]>(INITIAL_ROOMS);
  const [allGurukulStudents, setAllGurukulStudents] = useState<GurukulStudent[]>(() => { const s = (initialData as any).sb_students; return s ? s : INITIAL_GURUKUL_STUDENTS; });
  const [allCampaigns, setAllCampaigns] = useState<CampaignCrowdfund[]>(() => { const s = (initialData as any).sb_campaigns; return s ? s : INITIAL_CAMPAIGNS; });
  const [allMatrimonyProfiles] = useState<MatrimonyProfile[]>(INITIAL_MATRIMONY);
  const [allShlokas] = useState<ShlokaCardItem[]>(INITIAL_SHLOKAS);
  const [allResolutions, setAllResolutions] = useState<TrusteeResolution[]>(INITIAL_RESOLUTIONS);
  const [allShifts, setAllShifts] = useState<SevadarDutyShift[]>(INITIAL_SHIFTS);
  const [allBhoomiProperties, setAllBhoomiProperties] = useState<BhoomiProperty[]>(() => { const s = (initialData as any).sb_bhoomiProperties; return s ? s : []; });
  const [allRentReceipts, setAllRentReceipts] = useState<BhoomiRentReceipt[]>(() => { const s = (initialData as any).sb_rentReceipts; return s ? s : []; });
  const [allFleetVehicles, setAllFleetVehicles] = useState<FleetVehicle[]>(() => { const s = (initialData as any).sb_fleetVehicles; return s ? s : []; });
  const [allFuelLogs, setAllFuelLogs] = useState<FleetFuelLog[]>(() => { const s = (initialData as any).sb_fuelLogs; return s ? s : []; });
  const [allServiceRecords, setAllServiceRecords] = useState<FleetServiceRecord[]>(() => { const s = (initialData as any).sb_serviceRecords; return s ? s : []; });
  const [allSevaSubscriptions, setAllSevaSubscriptions] = useState<SevaSubscription[]>(() => { const s = (initialData as any).sb_sevaSubscriptions; return s ? s : []; });

  // Global loading state for initial data payload across core collections
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // ----------------------------------------------------
  // TENANT-SCOPED REAL-TIME DATA SUBSCRIPTIONS
  // Sets up onSnapshot listeners for core collections:
  // devotees, puja_bookings, donations, and inventory_items.
  // Every query MUST include .where('workspaceId', '==', activeWorkspaceId)
  // to prevent cross-tenant data leaks and minimize read costs.
  // ----------------------------------------------------
  useEffect(() => {
    // If the user is unauthenticated or activeWorkspaceId does not exist
    if (!isAuthenticated || !activeWorkspaceId) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);

    const pendingCollections = new Set<string>([
      'devotees',
      'puja_bookings',
      'treasury',
      'inventory_items',
    ]);

    const markResolved = (colName: string) => {
      pendingCollections.delete(colName);
      if (pendingCollections.size === 0) {
        setIsDataLoading(false);
      }
    };

    // 1. Core query: devotees
    const devoteesQuery = query(
      collection(db, 'devotees'),
      where('workspaceId', '==', activeWorkspaceId)
    );
    const unsubDevotees = onSnapshot(
      devoteesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        } as DevoteeMember));
        if (items.length > 0 || !activeWorkspaceId.startsWith('DEMO_')) {
          setAllDevotees(items);
        }
        markResolved('devotees');
      },
      (err) => {
        console.warn('[Firestore] devotees listener error:', err);
        markResolved('devotees');
      }
    );

    // 2. Core query: puja_bookings
    const pujaBookingsQuery = query(
      collection(db, 'puja_bookings'),
      where('workspaceId', '==', activeWorkspaceId)
    );
    const unsubPujaBookings = onSnapshot(
      pujaBookingsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        } as PoojaBooking));
        if (items.length > 0 || !activeWorkspaceId.startsWith('DEMO_')) {
          setAllPoojaBookings(items);
        }
        markResolved('puja_bookings');
      },
      (err) => {
        console.warn('[Firestore] puja_bookings listener error:', err);
        markResolved('puja_bookings');
      }
    );

    // 3. Core query: treasury (canonical collection — all treasury writes go
    // here; the legacy 'donations' read path was removed in M-1 because it
    // read a different collection than the one being written to)
    const treasuryQuery = query(
      collection(db, 'treasury'),
      where('workspaceId', '==', activeWorkspaceId)
    );
    const unsubTreasury = onSnapshot(
      treasuryQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        } as TreasuryTransaction));
        if (items.length > 0 || !activeWorkspaceId.startsWith('DEMO_')) {
          setAllTreasury(items);
        }
        markResolved('treasury');
      },
      (err) => {
        console.warn('[Firestore] treasury listener error:', err);
        markResolved('treasury');
      }
    );

    // 4. Core query: inventory_items
    const inventoryItemsQuery = query(
      collection(db, 'inventory_items'),
      where('workspaceId', '==', activeWorkspaceId)
    );
    const unsubInventory = onSnapshot(
      inventoryItemsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        } as InventoryItem));
        if (items.length > 0 || !activeWorkspaceId.startsWith('DEMO_')) {
          setAllInventory(items);
        }
        markResolved('inventory_items');
      },
      (err) => {
        console.warn('[Firestore] inventory_items listener error:', err);
        markResolved('inventory_items');
      }
    );

    // Cleanup function that calls all unsubscribe methods to prevent memory leaks
    return () => {
      unsubDevotees();
      unsubPujaBookings();
      unsubTreasury();
      unsubInventory();
    };
  }, [activeWorkspaceId, isAuthenticated]);

  // Helper to push to firestore
  const pushToFirestore = (colName: string, id: string, data: any) => {
    setDoc(doc(db, colName, id), data, { merge: true }).catch((err: any) => {
      console.warn(`[Firestore sync] ${colName} offline or restricted:`, err?.message || err);
    });
  };


  // ----------------------------------------------------
  // AUTOMATIC DATA DELETION / SANDBOX PURGE CYCLE
  // Temporary DEMO-sandbox records are marked with _createdAt / _expiresAt
  // timestamps and cleaned on expiration (default 60 mins).
  // SECURITY (C-4/C-5): the purge predicate additionally requires the record's
  // workspaceId to start with 'DEMO_'. This protects real-workspace records
  // that were stamped with _expiresAt before the demo-gating fix.
  // ----------------------------------------------------
  const purgeAutoDeleteRecords = useCallback(() => {
    const now = Date.now();
    const isLive = (item: any) =>
      !item._expiresAt ||
      item._expiresAt > now ||
      !(typeof item.workspaceId === 'string' && item.workspaceId.startsWith('DEMO_'));

    setAllDevotees((prev) => prev.filter(isLive));
    setAllTreasury((prev) => prev.filter(isLive));
    setAllPoojaBookings((prev) => prev.filter(isLive));
    setAllInventory((prev) => prev.filter(isLive));
    setAllAssets((prev) => prev.filter(isLive));
    setAllCows((prev) => prev.filter(isLive));
    setAllAnnadanamList((prev) => prev.filter(isLive));
    setAllGuests((prev) => prev.filter(isLive));
    setAllFamilies((prev) => prev.filter(isLive));
    setAllResolutions((prev) => prev.filter(isLive));
    setAllShifts((prev) => prev.filter(isLive));
  }, []);

  // Run auto-purge timer every 60 seconds
  useEffect(() => {
    purgeAutoDeleteRecords();
    const interval = setInterval(purgeAutoDeleteRecords, 60000);
    return () => clearInterval(interval);
  }, [purgeAutoDeleteRecords]);

  // Quota v2: exactly 5 free creates per module, demo workspaces only.
  // Returns a result object; drives toasts + the upsell modal.
  const demoUpsellShownRef = useRef<Set<string>>(new Set());
  const [demoUpsellModule, setDemoUpsellModule] = useState<DemoUpsell | null>(null);

  const isDemoWorkspace = (wsId?: string) =>
    (wsId || activeWorkspace?.id || '').startsWith('DEMO_');

  const checkAndIncrementModuleQuota = (moduleName: string): QuotaResult => {
    const roleUpper = (currentRole || '').toUpperCase();
    const exempt = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN';

    // Registered workspaces (and super-admins) are unlimited — never count.
    if (!isDemoWorkspace() || exempt) {
      return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, justHitLimit: false };
    }

    const meta = demoModuleMeta(moduleName);
    const key = `${DEMO_QUOTA_KEY_PREFIX}${activeWorkspace.id}_${moduleName}`;
    const currentCount = parseInt(localStorage.getItem(key) || '0', 10);

    // Already at the limit: block. Inline toast only — never re-spam the modal.
    if (currentCount >= DEMO_CREATES_PER_MODULE) {
      showToast(
        `Demo limit reached for ${meta.display} — create a free account for unlimited.`,
        'info',
        'Demo Sandbox'
      );
      return { allowed: false, remaining: 0, justHitLimit: false };
    }

    const newCount = currentCount + 1;
    localStorage.setItem(key, newCount.toString());
    const remaining = DEMO_CREATES_PER_MODULE - newCount;
    const justHitLimit = remaining === 0;

    // One free add left: nudge toward registration.
    if (remaining === 1) {
      showToast(
        `1 free add left in ${meta.display} — create a free account for unlimited.`,
        'info',
        'Demo Sandbox'
      );
    }

    // Fifth create: celebrate + trigger the upsell modal (once per module per session).
    if (justHitLimit) {
      if (!demoUpsellShownRef.current.has(moduleName)) {
        demoUpsellShownRef.current.add(moduleName);
        setDemoUpsellModule({
          module: moduleName,
          displayName: meta.display,
          entityLabel: meta.entityPlural,
        });
      } else {
        showToast(
          `Demo limit reached for ${meta.display} — create a free account for unlimited.`,
          'info',
          'Demo Sandbox'
        );
      }
    }

    return { allowed: true, remaining, justHitLimit };
  };

  const closeDemoUpsell = useCallback(() => setDemoUpsellModule(null), []);

  /** Live demo stats for the banner: total user creates + per-module counts. */
  const getDemoStats = useCallback((): { totalCreates: number; perModule: Record<string, number> } => {
    const perModule: Record<string, number> = {};
    let totalCreates = 0;
    if (!isDemoWorkspace()) return { totalCreates, perModule };
    for (const mod of DEMO_QUOTA_MODULES) {
      const n = parseInt(localStorage.getItem(`${DEMO_QUOTA_KEY_PREFIX}${activeWorkspace.id}_${mod}`) || '0', 10);
      perModule[mod] = n;
      totalCreates += n;
    }
    return { totalCreates, perModule };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  /**
   * Demo → real conversion: copy all NON-seed records of the demo workspace
   * into the new real workspace, with fresh ids. Returns # records moved.
   * Covers the core collections; seed records stay behind.
   * (Plain function, not useCallback: must always see the latest state.)
   */
  const convertDemoToReal = (demoWorkspaceId: string, newWorkspaceId: string): number => {
    if (!demoWorkspaceId || !newWorkspaceId || demoWorkspaceId === newWorkspaceId) return 0;
    let moved = 0;
    const now = Date.now();
    const migrate = <T extends { id?: string; workspaceId?: string }>(
      records: T[],
      setRecords: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const mine = records.filter((r) => r && r.workspaceId === demoWorkspaceId && !(r as any).isDemoSeed);
      if (mine.length === 0) return;
      moved += mine.length;
      const copies = mine.map((r, i) => {
        // SECURITY (C-4): strip the demo auto-purge TTL — migrated records
        // belong to a real workspace and must never expire.
        const { _expiresAt, ...rest } = r as any;
        return {
          ...rest,
          id: `${r.id || 'rec'}_migrated_${now}_${i}`,
          workspaceId: newWorkspaceId,
          isDemoSeed: false,
          _createdAt: now,
          _migratedFromDemo: demoWorkspaceId,
        };
      });
      setRecords((prev) => [...copies, ...prev]);
    };
    migrate(allDevotees, setAllDevotees);
    migrate(allFamilies, setAllFamilies);
    migrate(allGuests, setAllGuests);
    migrate(allTreasury, setAllTreasury);
    migrate(allAssets, setAllAssets);
    migrate(allInventory, setAllInventory);
    migrate(allPoojaBookings, setAllPoojaBookings);
    migrate(allResidentPujas, setAllResidentPujas);
    migrate(allPitruRecords, setAllPitruRecords);
    migrate(allCows, setAllCows);
    migrate(allAnnadanamList, setAllAnnadanamList);
    migrate(allGurukulStudents, setAllGurukulStudents);
    migrate(allCampaigns, setAllCampaigns);
    migrate(allResolutions, setAllResolutions);
    migrate(allShifts, setAllShifts);
    migrate(allBhoomiProperties, setAllBhoomiProperties);
    migrate(allRentReceipts, setAllRentReceipts);
    migrate(allFleetVehicles, setAllFleetVehicles);
    migrate(allFuelLogs, setAllFuelLogs);
    migrate(allServiceRecords, setAllServiceRecords);
    migrate(allSevaSubscriptions, setAllSevaSubscriptions);
    return moved;
  };

  // Pending demo conversion: after the user registers (new real workspace
  // becomes active), move their demo records over exactly once.
  useEffect(() => {
    const pendingDemoId = localStorage.getItem(PENDING_DEMO_CONVERSION_KEY);
    if (!pendingDemoId) return;
    const currentId = activeWorkspaceId || activeWorkspace?.id;
    if (!currentId || currentId === pendingDemoId || currentId.startsWith('DEMO_')) return;
    // Clear first so StrictMode double-effects can't convert twice.
    localStorage.removeItem(PENDING_DEMO_CONVERSION_KEY);
    const moved = convertDemoToReal(pendingDemoId, currentId);
    clearDemoQuotaKeys(pendingDemoId);
    showToast(
      moved > 0
        ? `Welcome! Your ${moved} demo record${moved === 1 ? '' : 's'} came with you — free forever.`
        : 'Welcome! Your new workspace is ready.',
      'success',
      'Account Created'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  /** Remove all demo quota keys for a workspace. */
  const clearDemoQuotaKeys = useCallback((workspaceId: string) => {
    for (const mod of DEMO_QUOTA_MODULES) {
      localStorage.removeItem(`${DEMO_QUOTA_KEY_PREFIX}${workspaceId}_${mod}`);
    }
  }, []);

  /**
   * Reset the demo workspace: clear quota counters, remove user-created
   * (non-seed) records for that workspace, and re-seed fresh mock data.
   */
  const resetDemoWorkspace = useCallback(() => {
    const wsId = activeWorkspace.id;
    if (!isDemoWorkspace(wsId)) return;
    clearDemoQuotaKeys(wsId);
    localStorage.removeItem(`sb_demo_seeded_${wsId}`);
    // Clear versioned seed flags too (any version).
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb_demo_seeded_v') && k.endsWith(`_${wsId}`))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    demoUpsellShownRef.current.clear();
    setDemoUpsellModule(null);
    const isUserRecord = (r: any) => r && r.workspaceId === wsId && !r.isDemoSeed;
    const isWsRecord = (r: any) => r && r.workspaceId === wsId;
    // Reset clears EVERYTHING for this workspace (user records AND old seeds),
    // then seedDemoData lays down a fresh seed set — no duplication.
    setAllDevotees((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllFamilies((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllGuests((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllTreasury((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllAssets((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllInventory((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllPoojaBookings((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllResidentPujas((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllPitruRecords((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllCows((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllAnnadanamList((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllGurukulStudents((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllCampaigns((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllResolutions((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllShifts((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllBhoomiProperties((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllRentReceipts((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllFleetVehicles((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllFuelLogs((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllServiceRecords((prev) => prev.filter((r) => !isWsRecord(r)));
    setAllSevaSubscriptions((prev) => prev.filter((r) => !isWsRecord(r)));
    seedDemoData(wsId, activeWorkspace.type || 'Mandir');
    showToast('Demo workspace reset with fresh sample data.', 'success', 'Demo Sandbox');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, clearDemoQuotaKeys]);

  // Sync to local storage
  useEffect(() => {
    set('sb_devotees', allDevotees);
  }, [allDevotees]);

  useEffect(() => {
    set('sb_families', allFamilies);
  }, [allFamilies]);

  useEffect(() => {
    set('sb_treasury', allTreasury);
  }, [allTreasury]);

  useEffect(() => {
    set('sb_assets', allAssets);
  }, [allAssets]);

  useEffect(() => {
    set('sb_inventory', allInventory);
  }, [allInventory]);

  useEffect(() => {
    set('sb_pooja_bookings', allPoojaBookings);
  }, [allPoojaBookings]);

  // ----------------------------------------------------
  // STRICT WORKSPACE TENANT DATA ISOLATION
  // Each organization can ONLY see its own data.
  // Superadmin / God Mode is exempted to allow sovereign control.
  // ----------------------------------------------------
  const isGodMode = false; // Strictly disabled to enforce organization data isolation
  const currentWsId = activeWorkspaceId || activeWorkspace.id;

  // ----------------------------------------------------
  // MULTI-BRANCH (v1) — optional location layer.
  // DESIGN PRINCIPLE: a single-organisation workspace (no `branches` array,
  // or a single entry) must NEVER see the word "branch" or any branch UI.
  // activeBranchId is 'ALL' (consolidated) or a branch id; it only filters
  // when the workspace actually has 2+ branches.
  // ----------------------------------------------------
  const [activeBranchId, setActiveBranchId] = useState<string>('ALL');
  const branches: BranchInfo[] = activeWorkspace?.branches || [];
  const isMultiBranch = branches.length > 1;
  const mainBranchId: string | undefined =
    branches.find((b) => b.isMain)?.id || branches[0]?.id;

  // ---- Per-branch RBAC (v2) ----
  // The current member's allowed branches, resolved from
  // activeWorkspace.branchAccess via resolveBranchIds (deny-by-default:
  // unmatched identities get ZERO branches when restrictions exist).
  // null = unrestricted (SuperAdmin, or no branchAccess configured —
  // backward compatible: workspaces without branchAccess behave as before).
  const myBranchIds = useMemo<string[] | null>(() => {
    const uid = currentUser?.id || (firebaseUser as { uid?: string } | null)?.uid;
    const email =
      currentUser?.email || (firebaseUser as { email?: string } | null)?.email || '';
    return resolveBranchIds(
      activeWorkspace?.branchAccess,
      uid,
      email,
      currentRole === 'SuperAdmin'
    );
  }, [
    activeWorkspace?.branchAccess,
    currentUser?.id,
    currentUser?.email,
    (firebaseUser as { uid?: string } | null)?.uid,
    (firebaseUser as { email?: string } | null)?.email,
    currentRole,
  ]);

  /** True when the current member may view a branch's records. */
  const isBranchAccessible = useCallback(
    (branchId: string | undefined): boolean => {
      if (!isMultiBranch) return true;
      if (myBranchIds === null) return true;
      return myBranchIds.includes(branchId || mainBranchId || '');
    },
    [isMultiBranch, myBranchIds, mainBranchId]
  );

  // Reset to the consolidated view whenever the workspace changes.
  useEffect(() => {
    setActiveBranchId('ALL');
  }, [currentWsId]);

  /**
   * Branch selection guarded by per-branch RBAC: switching to an
   * inaccessible branch is silently ignored (the switcher never offers it).
   */
  const selectBranch = useCallback(
    (id: string) => {
      if (isMultiBranch && id !== 'ALL' && !isBranchAccessible(id)) return;
      setActiveBranchId(id);
    },
    [isMultiBranch, isBranchAccessible]
  );

  // Clamp the active branch when the restriction changes (e.g. a Trustee
  // narrowed this member's access while they were viewing another branch).
  useEffect(() => {
    if (isMultiBranch && activeBranchId !== 'ALL' && !isBranchAccessible(activeBranchId)) {
      setActiveBranchId('ALL');
    }
  }, [isMultiBranch, activeBranchId, isBranchAccessible]);

  /** Branch a record belongs to: explicit branchId, else the main branch. */
  const branchOf = useCallback(
    (r: { branchId?: string }): string | undefined => r.branchId || mainBranchId,
    [mainBranchId]
  );

  /** True when a record is visible under the current branch selection. */
  const matchesActiveBranch = useCallback(
    (r: { branchId?: string }): boolean => {
      if (!isMultiBranch) return true; // invisible layer for single-org
      // Per-branch RBAC (v2): a restricted member never sees other branches'
      // records — enforced here in the query layer, not just the UI.
      if (myBranchIds !== null && !myBranchIds.includes(branchOf(r) || '')) return false;
      if (activeBranchId === 'ALL') return true;
      return branchOf(r) === activeBranchId;
    },
    [isMultiBranch, activeBranchId, branchOf, myBranchIds]
  );

  /**
   * Public selector: filter any branch-scoped record list to one branch
   * (or 'ALL' for the consolidated view). No-op for single-branch
   * workspaces — queries behave exactly as before. Per-branch RBAC: a
   * restricted member's 'ALL' only aggregates their allowed branches, and
   * an inaccessible branch id yields an empty list.
   */
  const recordsForBranch = useCallback(
    <T extends { branchId?: string }>(records: T[], branch: string): T[] => {
      if (!isMultiBranch) return records;
      const scoped =
        myBranchIds === null
          ? records
          : records.filter((r) => myBranchIds.includes(r.branchId || mainBranchId || ''));
      if (branch === 'ALL') return scoped;
      if (myBranchIds !== null && !myBranchIds.includes(branch)) return [];
      return scoped.filter((r) => (r.branchId || mainBranchId) === branch);
    },
    [isMultiBranch, mainBranchId, myBranchIds]
  );

  /**
   * Stamp for new records. Single-branch workspaces get `undefined`
   * (the field is never written — zero UX/data tax). Multi-branch:
   * explicit choice wins, else the viewed branch, else the main branch
   * when viewing ALL (the UI says so via the switcher caption).
   */
  const stampBranchId = useCallback(
    (provided?: string): string | undefined => {
      if (!isMultiBranch) return undefined;
      if (provided) return provided;
      if (activeBranchId !== 'ALL') return activeBranchId;
      return mainBranchId;
    },
    [isMultiBranch, activeBranchId, mainBranchId]
  );

  /** Guard for branch deletion: how many scoped records reference a branch. */
  const getBranchRecordCount = useCallback(
    (branchId: string): number => {
      if (!isMultiBranch) return 0;
      const inBranch = (r: { branchId?: string; workspaceId?: string }) =>
        (!r.workspaceId || r.workspaceId === currentWsId) &&
        (r.branchId || mainBranchId) === branchId;
      return (
        allDevotees.filter(inBranch).length +
        allTreasury.filter(inBranch).length +
        allPoojaBookings.filter(inBranch).length +
        allInventory.filter(inBranch).length +
        allAssets.filter(inBranch).length
      );
    },
    [isMultiBranch, currentWsId, mainBranchId, allDevotees, allTreasury, allPoojaBookings, allInventory, allAssets]
  );

  const devotees = useMemo(() => {
    const wsFiltered = isGodMode
      ? allDevotees
      : allDevotees.filter((d) => !d.workspaceId || d.workspaceId === currentWsId);
    return wsFiltered.filter(matchesActiveBranch);
  }, [allDevotees, currentWsId, isGodMode, matchesActiveBranch]);

  const puja_bookings = useMemo(() => {
    const wsFiltered = isGodMode
      ? allPoojaBookings
      : allPoojaBookings.filter((p) => !p.workspaceId || p.workspaceId === currentWsId);
    return wsFiltered.filter(matchesActiveBranch);
  }, [allPoojaBookings, currentWsId, isGodMode, matchesActiveBranch]);

  const donations = useMemo(() => {
    const wsFiltered = isGodMode
      ? allTreasury
      : allTreasury.filter((t) => !t.workspaceId || t.workspaceId === currentWsId);
    return wsFiltered.filter(matchesActiveBranch);
  }, [allTreasury, currentWsId, isGodMode, matchesActiveBranch]);

  const inventory_items = useMemo(() => {
    const wsFiltered = isGodMode
      ? allInventory
      : allInventory.filter((i) => !i.workspaceId || i.workspaceId === currentWsId);
    return wsFiltered.filter(matchesActiveBranch);
  }, [allInventory, currentWsId, isGodMode, matchesActiveBranch]);

  const poojaBookings = puja_bookings;
  const poojas = puja_bookings;
  const treasury = donations;
  const inventory = inventory_items;

  const families = useMemo(() => {
    return isGodMode
      ? allFamilies
      : allFamilies.filter((f) => !f.workspaceId || f.workspaceId === currentWsId);
  }, [allFamilies, currentWsId, isGodMode]);

  const guests = useMemo(() => {
    return isGodMode
      ? allGuests
      : allGuests.filter((g) => !g.workspaceId || g.workspaceId === currentWsId);
  }, [allGuests, currentWsId, isGodMode]);

  const assets = useMemo(() => {
    const wsFiltered = isGodMode
      ? allAssets
      : allAssets.filter((a) => !a.workspaceId || a.workspaceId === currentWsId);
    return wsFiltered.filter(matchesActiveBranch);
  }, [allAssets, currentWsId, isGodMode, matchesActiveBranch]);

  const pitruRecords = useMemo(() => {
    return isGodMode
      ? allPitruRecords
      : allPitruRecords.filter((p) => !p.workspaceId || p.workspaceId === currentWsId);
  }, [allPitruRecords, currentWsId, isGodMode]);

  const cows = useMemo(() => {
    return isGodMode
      ? allCows
      : allCows.filter((c) => !c.workspaceId || c.workspaceId === activeWorkspace.id);
  }, [allCows, activeWorkspace.id, isGodMode]);

  // Phase 20: Bhoomi & Vahan workspace-scoped memos
  const bhoomiProperties = useMemo(() => {
    return isGodMode
      ? allBhoomiProperties
      : allBhoomiProperties.filter((p) => !p.workspaceId || p.workspaceId === activeWorkspace.id);
  }, [allBhoomiProperties, activeWorkspace.id, isGodMode]);

  const rentReceipts = useMemo(() => {
    return isGodMode
      ? allRentReceipts
      : allRentReceipts.filter((r) => !r.workspaceId || r.workspaceId === activeWorkspace.id);
  }, [allRentReceipts, activeWorkspace.id, isGodMode]);

  const fleetVehicles = useMemo(() => {
    return isGodMode
      ? allFleetVehicles
      : allFleetVehicles.filter((v) => !v.workspaceId || v.workspaceId === activeWorkspace.id);
  }, [allFleetVehicles, activeWorkspace.id, isGodMode]);

  const fuelLogs = useMemo(() => {
    return isGodMode
      ? allFuelLogs
      : allFuelLogs.filter((l) => !l.workspaceId || l.workspaceId === activeWorkspace.id);
  }, [allFuelLogs, activeWorkspace.id, isGodMode]);

  const serviceRecords = useMemo(() => {
    return isGodMode
      ? allServiceRecords
      : allServiceRecords.filter((s) => !s.workspaceId || s.workspaceId === activeWorkspace.id);
  }, [allServiceRecords, activeWorkspace.id, isGodMode]);

  const sevaSubscriptions = useMemo(() => {
    return isGodMode
      ? allSevaSubscriptions
      : allSevaSubscriptions.filter((s) => !s.workspaceId || s.workspaceId === activeWorkspace.id);
  }, [allSevaSubscriptions, activeWorkspace.id, isGodMode]);

  const annadanamList = useMemo(() => {
    return isGodMode
      ? allAnnadanamList
      : allAnnadanamList.filter((a) => !a.workspaceId || a.workspaceId === activeWorkspace.id);
  }, [allAnnadanamList, activeWorkspace.id, isGodMode]);

  const rooms = useMemo(() => {
    return isGodMode
      ? allRooms
      : allRooms.filter((r) => !r.workspaceId || r.workspaceId === activeWorkspace.id);
  }, [allRooms, activeWorkspace.id, isGodMode]);

  const gurukulStudents = useMemo(() => {
    return isGodMode
      ? allGurukulStudents
      : allGurukulStudents.filter((g) => !g.workspaceId || g.workspaceId === activeWorkspace.id);
  }, [allGurukulStudents, activeWorkspace.id, isGodMode]);

  const campaigns = useMemo(() => {
    return isGodMode
      ? allCampaigns
      : allCampaigns.filter((c) => !c.workspaceId || c.workspaceId === activeWorkspace.id);
  }, [allCampaigns, activeWorkspace.id, isGodMode]);

  const resolutions = useMemo(() => {
    return isGodMode
      ? allResolutions
      : allResolutions.filter((r) => !r.workspaceId || r.workspaceId === activeWorkspace.id);
  }, [allResolutions, activeWorkspace.id, isGodMode]);

  
  const residentPujas = useMemo(() => {
    return isGodMode ? allResidentPujas : allResidentPujas.filter(p => !p.workspaceId || p.workspaceId === activeWorkspace.id);
  }, [allResidentPujas, activeWorkspace.id, isGodMode]);

  const purohits = useMemo(() => {
    return isGodMode ? allPurohits : allPurohits.filter(p => !p.workspaceId || p.workspaceId === activeWorkspace.id);
  }, [allPurohits, activeWorkspace.id, isGodMode]);

  const matrimonyProfiles = useMemo(() => {
    return isGodMode ? allMatrimonyProfiles : allMatrimonyProfiles.filter(p => !p.workspaceId || p.workspaceId === activeWorkspace.id);
  }, [allMatrimonyProfiles, activeWorkspace.id, isGodMode]);

  const shlokas = useMemo(() => {
    return isGodMode ? allShlokas : allShlokas.filter(s => !s.workspaceId || s.workspaceId === activeWorkspace.id);
  }, [allShlokas, activeWorkspace.id, isGodMode]);

  const shifts = useMemo(() => {
    return isGodMode
      ? allShifts
      : allShifts.filter((s) => !s.workspaceId || s.workspaceId === activeWorkspace.id);
  }, [allShifts, activeWorkspace.id, isGodMode]);

  // ----------------------------------------------------
  // MUTATOR IMPLEMENTATIONS (With Tenant Tagging & Auto-Delete Expiration)
  // ----------------------------------------------------

  const seedDemoData = (workspaceId: string, type: string) => {
    // Seed version: bump when seed content changes so existing demos pick up
    // new seeds. Old-version flags are ignored, and stale seeds are cleared
    // below before re-seeding (no duplication).
    const DEMO_SEED_VERSION = 3;
    const seedFlag = `sb_demo_seeded_v${DEMO_SEED_VERSION}_${workspaceId}`;
    if (localStorage.getItem(seedFlag) === '1') return;
    // Clear any previous-version seeds for this workspace first.
    const isStaleSeed = (r: any) => r && r.isDemoSeed && r.workspaceId === workspaceId;
    setAllDevotees((prev) => prev.filter((r) => !isStaleSeed(r)));
    setAllTreasury((prev) => prev.filter((r) => !isStaleSeed(r)));
    setAllGurukulStudents((prev) => prev.filter((r) => !isStaleSeed(r)));
    setAllCows((prev) => prev.filter((r) => !isStaleSeed(r)));
    setAllGuests((prev) => prev.filter((r) => !isStaleSeed(r)));
    setAllCampaigns((prev) => prev.filter((r) => !isStaleSeed(r)));
    localStorage.setItem(seedFlag, '1');

    const ts = Date.now();
    const day = 86400000;
    const isoDaysAgo = (n: number) => new Date(ts - n * day).toISOString();
    const isoDaysAhead = (n: number) => new Date(ts + n * day).toISOString();
    const seedTag = { isDemoSeed: true, workspaceId } as const;

    // ---- 10 devotees: a thriving community on first load ----
    const devoteeSeed: Array<[string, string, string, string, string, string, number, string[]]> = [
      // name, phone, gotra, city, tier, address, joinedDaysAgo, skills
      ['Ananya Iyer', '+91 98410 22334', 'Kashyapa', 'Kashi', 'lifetime', 'Godowlia, Varanasi', 340, ['Volunteer', 'Pooja']],
      ['Vikram Malhotra', '+91 98110 44556', 'Bharadwaja', 'Ayodhya', 'patron', 'Naya Ghat, Ayodhya', 300, ['Donor', 'Seva']],
      ['Meera Nair', '+91 98470 11223', 'Vashishtha', 'Mathura', 'annual', 'Krishna Janmabhoomi Rd', 260, ['Bhajan', 'Accounts']],
      ['Arjun Deshmukh', '+91 98220 33445', 'Gautama', 'Ujjain', 'lifetime', 'Mahakal Marg, Ujjain', 220, ['Volunteer', 'Crowd Control']],
      ['Lakshmi Venkat', '+91 98400 55667', 'Atri', 'Kashi', 'annual', 'Assi Ghat, Varanasi', 180, ['Prasadam', 'Seva']],
      ['Rohan Kulkarni', '+91 98230 77889', 'Kaushika', 'Vrindavan', 'annual', 'Parikrama Marg', 140, ['Kirtan', 'Volunteer']],
      ['Divya Reddy', '+91 98490 99001', 'Shandilya', 'Haridwar', 'patron', 'Har Ki Pauri', 100, ['Donor', 'Annadanam']],
      ['Karan Singhania', '+91 98120 12121', 'Gargya', 'Ayodhya', 'annual', 'Ram Path, Ayodhya', 70, ['Seva', 'Logistics']],
      ['Pooja Bhatt', '+91 98330 34343', 'Bharadwaja', 'Mathura', 'lifetime', 'Dwarkadhish Rd', 40, ['Pooja', 'Volunteer']],
      ['Suresh Menon', '+91 98460 56565', 'Kashyapa', 'Ujjain', 'annual', 'Harsiddhi Rd', 15, ['Accounts', 'Audit']],
    ];
    setAllDevotees((prev) => [
      ...devoteeSeed.map(([name, phone, gotra, city, tier, address, joinedAgo, skills], i) => ({
        id: `dev_${ts}_seed_${i + 1}`,
        ...seedTag,
        name,
        fullName: name,
        phone,
        gotra,
        joinedDate: isoDaysAgo(joinedAgo),
        skills,
        address: `${address}, ${city}`,
        city,
        isActive: true,
        membershipTier: tier,
        qrCodeRef: `SB-${1001 + i}`,
      }) as unknown as DevoteeMember),
      ...prev,
    ]);

    // ---- P2: org-aware seeds. Each organisation type gets its own flavour —
    // no cross-contamination (e.g. no Hundi rows in a Goshala demo). The
    // devotee seed above stays universal: every org has a community.
    type SeedProfile = 'mandir' | 'goshala' | 'ashram' | 'gurukul' | 'sangha' | 'trust' | 'tirth';
    const seedProfile: SeedProfile = (() => {
      const t = (type || 'Mandir').toLowerCase();
      if (['goshala'].includes(t)) return 'goshala';
      if (['ashram'].includes(t)) return 'ashram';
      if (['gurukul', 'vidyalaya'].includes(t)) return 'gurukul';
      if (['sangha', 'samaj', 'satsang', 'yoga', 'mahotsavsamiti'].includes(t)) return 'sangha';
      if (['trust', 'dharmadatrust', 'akshayapatra'].includes(t)) return 'trust';
      if (['tirth'].includes(t)) return 'tirth';
      return 'mandir'; // Mandir, KashiKshetra, PurohitSabha, Purohit + fallback
    })();

    // amount, type, category, description, method, handledBy, daysAgo
    type TxRow = [number, string, string, string, string, string, number];
    const TX_BY_PROFILE: Record<SeedProfile, TxRow[]> = {
      mandir: [
        [11000, 'Income', 'Hundi', 'Morning hundi collection', 'UPI', 'Demo Admin', 1],
        [1101, 'Income', 'Archana', 'Archana ticket sales', 'Cash', 'Demo Admin', 2],
        [5100, 'Income', 'Annadanam', 'Annadanam sponsorship — Meera Nair', 'UPI', 'Demo Admin', 4],
        [2500, 'Expense', 'Flowers', 'Daily flower decoration', 'Cash', 'Demo Admin', 5],
        [21000, 'Income', 'Hundi', 'Evening hundi collection', 'Cash', 'Demo Admin', 7],
        [8000, 'Expense', 'Prasadam', 'Prasadam ingredients (weekly)', 'Cash', 'Demo Admin', 8],
        [2100, 'Income', 'Goshala', 'Gau-seva donation — Divya Reddy', 'UPI', 'Demo Admin', 10],
        [51000, 'Income', 'Hundi', 'Festival day hundi collection', 'UPI', 'Demo Admin', 12],
        [15000, 'Expense', 'Maintenance', 'Sanctum electrical repair', 'UPI', 'Demo Admin', 14],
        [501, 'Income', 'Archana', 'Special archana — Karthik month', 'Cash', 'Demo Admin', 16],
        [11000, 'Income', 'Annadanam', 'Annadanam sponsorship — Vikram Malhotra', 'UPI', 'Demo Admin', 20],
        [4500, 'Expense', 'Utilities', 'Temple electricity bill', 'UPI', 'Demo Admin', 22],
        [25000, 'Income', 'Donation', 'Corpus donation — anonymous', 'UPI', 'Demo Admin', 26],
        [101, 'Income', 'Hundi', 'Small offerings tray', 'Cash', 'Demo Admin', 29],
      ],
      goshala: [
        [5100, 'Income', 'Gau Seva', 'Gau-seva sponsorship — Divya Reddy', 'UPI', 'Demo Admin', 1],
        [8200, 'Income', 'Milk & Products', 'A2 milk & ghee sales (weekly)', 'Cash', 'Demo Admin', 3],
        [12500, 'Expense', 'Fodder', 'Green fodder & dry hay (monthly)', 'UPI', 'Demo Admin', 4],
        [2100, 'Income', 'Godaan', 'Godaan sankalp — Vikram Malhotra', 'UPI', 'Demo Admin', 6],
        [3400, 'Expense', 'Veterinary', 'Vaccination drive — 40 cattle', 'Cash', 'Demo Admin', 8],
        [15000, 'Income', 'Gau Seva', 'Monthly patron — Karan Singhania', 'UPI', 'Demo Admin', 11],
        [2800, 'Expense', 'Shed upkeep', 'Goshala shed repairs', 'Cash', 'Demo Admin', 13],
        [5100, 'Income', 'Milk & Products', 'Panchagavya product sales', 'UPI', 'Demo Admin', 16],
        [9100, 'Expense', 'Fodder', 'Concentrate feed stock', 'UPI', 'Demo Admin', 19],
        [11000, 'Income', 'Donation', 'Corpus donation — anonymous', 'UPI', 'Demo Admin', 24],
        [1200, 'Expense', 'Utilities', 'Water & electricity', 'Cash', 'Demo Admin', 27],
      ],
      ashram: [
        [11000, 'Income', 'Guru Dakshina', 'Guru Purnima dakshina collection', 'UPI', 'Demo Admin', 2],
        [8100, 'Income', 'Bhojan', 'Annakshetra sponsorship — Meera Nair', 'UPI', 'Demo Admin', 5],
        [6200, 'Expense', 'Bhojan', 'Daily bhojan prasadam (weekly)', 'Cash', 'Demo Admin', 6],
        [5100, 'Income', 'Satsang', 'Satsang hall contributions', 'Cash', 'Demo Admin', 9],
        [4500, 'Expense', 'Utilities', 'Ashram electricity & water', 'UPI', 'Demo Admin', 12],
        [21000, 'Income', 'Donation', 'Corpus donation — Vikram Malhotra', 'UPI', 'Demo Admin', 15],
        [7800, 'Expense', 'Upkeep', 'Kutir & hall maintenance', 'Cash', 'Demo Admin', 18],
        [3100, 'Income', 'Publications', 'Ashram bookstall sales', 'Cash', 'Demo Admin', 22],
        [2500, 'Expense', 'Sadhana', 'Yajnashala samagri', 'Cash', 'Demo Admin', 26],
      ],
      gurukul: [
        [21000, 'Income', 'Vidyadaan', 'Vidyadaan sponsorship — Vikram Malhotra', 'UPI', 'Demo Admin', 2],
        [5500, 'Income', 'Shulka', 'Monthly vidyarthi shulka collection', 'Cash', 'Demo Admin', 5],
        [12000, 'Expense', 'Acharya', 'Acharya honorarium (monthly)', 'UPI', 'Demo Admin', 7],
        [4100, 'Income', 'Annadanam', 'Student meal sponsorship — Meera Nair', 'UPI', 'Demo Admin', 10],
        [6800, 'Expense', 'Kitchen', 'Gurukul kitchen provisions', 'Cash', 'Demo Admin', 12],
        [3200, 'Expense', 'Books', 'Shastra granthas & pathashala material', 'UPI', 'Demo Admin', 16],
        [15000, 'Income', 'Donation', 'Corpus donation — anonymous', 'UPI', 'Demo Admin', 21],
        [2800, 'Expense', 'Utilities', 'Pathashala electricity & water', 'Cash', 'Demo Admin', 25],
      ],
      sangha: [
        [11000, 'Income', 'Membership', 'Annual membership — 22 families', 'UPI', 'Demo Admin', 3],
        [25000, 'Income', 'Mahotsav', 'Mahotsav sponsorships — local patrons', 'UPI', 'Demo Admin', 6],
        [18000, 'Expense', 'Mahotsav', 'Mahotsav stage, sound & prasadam', 'Cash', 'Demo Admin', 8],
        [5100, 'Income', 'Chanda', 'Monthly sangha chanda', 'Cash', 'Demo Admin', 12],
        [4200, 'Expense', 'Seva', 'Community seva drive expenses', 'UPI', 'Demo Admin', 15],
        [8100, 'Income', 'Events', 'Cultural evening ticket contributions', 'Cash', 'Demo Admin', 19],
        [3600, 'Expense', 'Hall', 'Community hall upkeep', 'Cash', 'Demo Admin', 24],
      ],
      trust: [
        [100000, 'Income', 'Corpus', 'Corpus donation — Vikram Malhotra', 'UPI', 'Demo Admin', 4],
        [50000, 'Income', 'CSR', 'CSR grant — first tranche', 'UPI', 'Demo Admin', 9],
        [75000, 'Expense', 'Projects', 'Seva project disbursement — Q3', 'UPI', 'Demo Admin', 13],
        [25000, 'Income', 'Campaigns', 'Crowdfund collections — Annadanam', 'UPI', 'Demo Admin', 17],
        [12000, 'Expense', 'Admin', 'Trust office & compliance costs', 'UPI', 'Demo Admin', 21],
        [51000, 'Income', 'Corpus', 'Corpus donation — anonymous', 'UPI', 'Demo Admin', 26],
      ],
      tirth: [
        [15000, 'Income', 'Yatri Seva', 'Yatri niwas contributions (weekly)', 'Cash', 'Demo Admin', 2],
        [9100, 'Expense', 'Bhojan', 'Yatri bhojanalaya provisions', 'Cash', 'Demo Admin', 4],
        [8100, 'Income', 'Darshan', 'Special darshan seva contributions', 'UPI', 'Demo Admin', 7],
        [6200, 'Expense', 'Transport', 'Yatra bus upkeep & fuel', 'UPI', 'Demo Admin', 10],
        [21000, 'Income', 'Donation', 'Tirth development donation', 'UPI', 'Demo Admin', 14],
        [5400, 'Expense', 'Upkeep', 'Ghat & premises cleaning', 'Cash', 'Demo Admin', 18],
        [11000, 'Income', 'Yatri Seva', 'Group yatra facilitation', 'UPI', 'Demo Admin', 23],
      ],
    };
    const txSeed = TX_BY_PROFILE[seedProfile];
    setAllTreasury((prev) => [
      ...txSeed.map(([amount, type, category, description, paymentMethod, handledBy, daysAgo], i) => ({
        id: `tx_${ts}_seed_${i + 1}`,
        ...seedTag,
        date: isoDaysAgo(daysAgo),
        amount,
        type,
        category,
        description,
        paymentMethod,
        referenceId: paymentMethod === 'UPI' ? `UPI-SEED-${1001 + i}` : undefined,
        handledBy,
        auditVerified: true,
      }) as unknown as TreasuryTransaction),
      ...prev,
    ]);

    // ---- campaigns, flavour-matched per org ----
    const CAMP_BY_PROFILE: Record<SeedProfile, Array<[string, string, number, number, string]>> = {
      mandir: [
        ['Mandir Jirnoddhar', 'Renovation of the main sanctum and gopuram', 5000000, 1250000, 'Mandir Nirman'],
        ['Goshala Fodder Fund', 'Monthly fodder for 120 desi cows', 200000, 145000, 'Gau Seva / Healthcare'],
        ['Annadanam Maha Yajna', 'Daily free meals for 2000 pilgrims this Kartik', 1000000, 320000, 'Annakshetra Fund'],
      ],
      goshala: [
        ['Goshala Fodder Fund', 'Monthly fodder for 120 desi cattle', 200000, 145000, 'Gau Seva / Healthcare'],
        ['Nandi Care Shed', 'New shaded paddock for 20 nandis', 350000, 98000, 'Gau Seva / Healthcare'],
        ['Panchagavya Unit', 'A2 ghee & panchagavya processing setup', 500000, 210000, 'Gau Seva / Healthcare'],
      ],
      ashram: [
        ['Annakshetra Expansion', 'Daily free meals capacity — 500 to 1000', 800000, 310000, 'Annakshetra Fund'],
        ['Kutir Renovation', 'Renovating 12 sadhak kutirs', 1200000, 420000, 'Ashram Nirman'],
        ['Granthalaya', 'Ashram library — shastra collection', 300000, 95000, 'Vidya Fund'],
      ],
      gurukul: [
        ['Vidyarthi Sponsorship', 'Full-year sponsorship for 25 vidyarthis', 750000, 280000, 'Vidya Fund'],
        ['Pathashala Hall', 'New Veda pathashala hall construction', 2000000, 640000, 'Vidya Fund'],
        ['Acharya Nidhi', 'Acharya honorarium corpus', 1000000, 350000, 'Vidya Fund'],
      ],
      sangha: [
        ['Mahotsav 2026', 'Annual community mahotsav fund', 600000, 240000, 'Mahotsav Fund'],
        ['Seva Van', 'Community ambulance & seva van', 900000, 310000, 'Seva Fund'],
        ['Yuva Kendra', 'Youth skill & dharma kendra', 400000, 120000, 'Seva Fund'],
      ],
      trust: [
        ['Annadanam Maha Yajna', 'Daily free meals for 2000 pilgrims', 1000000, 320000, 'Annakshetra Fund'],
        ['Vidya Corpus', 'Scholarship corpus for dharmic education', 2500000, 780000, 'Vidya Fund'],
        ['Arogya Seva', 'Mobile medical seva for villages', 1500000, 460000, 'Arogya Fund'],
      ],
      tirth: [
        ['Yatri Niwas', 'Dharamshala rooms for 200 yatris', 3000000, 890000, 'Tirth Vikas'],
        ['Ghat Restoration', 'Heritage ghat steps restoration', 1800000, 520000, 'Tirth Vikas'],
        ['Yatra Seva Kendra', 'Drinking water & rest shelters on parikrama marg', 700000, 230000, 'Tirth Vikas'],
      ],
    };
    const campSeed = CAMP_BY_PROFILE[seedProfile];
    setAllCampaigns((prev) => [
      ...campSeed.map(([title, description, targetAmount, collectedAmount, category], i) => ({
        id: `camp_${ts}_seed_${i + 1}`,
        ...seedTag,
        title,
        description,
        category,
        targetAmount,
        collectedAmount,
        currency: 'INR',
        startDate: isoDaysAgo(20),
        endDate: isoDaysAhead(70),
        status: 'active',
        recentDonors: [],
      }) as unknown as CampaignCrowdfund),
      ...prev,
    ]);

    // ---- festivals / gatherings: mandir-flavoured only for mandir-likes ----
    if (seedProfile === 'mandir') {
      const festSeed: Array<[string, string, string, string, number]> = [
        ['Kartik Purnima Deepotsav', 'Ganga Aarti Sthal', 'Grand deepotsav with 51,000 diyas', 'Sri Vishwanath Shastri', 6],
        ['Annakut Mahotsav', 'Main Mandapam', 'Chhappan bhog offering and bhandara', 'Sri Raghunath Acharya', 18],
        ['Gita Jayanti Yajna', 'Yajnashala', '108-kundiya Gayatri mahayajna', 'Sri Devkinandan Ji', 34],
        ['Makara Sankranti Mela', 'Temple Courtyard', 'Kite festival, til-gud prasadam, Gau-puja', 'Sri Vishwanath Shastri', 55],
      ];
      setAllResidentPujas((prev) => [
        ...festSeed.map(([pujaName, venue, description, leadPurohit, daysAhead], i) => ({
          id: `fest_${ts}_seed_${i + 1}`,
          ...seedTag,
          pujaName,
          ritualName: pujaName,
          deity: 'Sri Vishwanath',
          timings: isoDaysAhead(daysAhead),
          time: '06:00 AM',
          leadPurohit,
          priestName: leadPurohit,
          isOpenForPublic: true,
          samagriList: [],
        }) as unknown as ResidentPujaSchedule),
        ...prev,
      ]);

      // ---- pooja bookings: mandir-only concept ----
      const bookingSeed: Array<[string, string, string, string, string, number, string, number]> = [
        ['Ananya Iyer', '+91 98410 22334', 'Rudrabhishek', 'Kashyapa', '06:00 - 08:00', 2100, 'Confirmed', 3],
        ['Vikram Malhotra', '+91 98110 44556', 'Satyanarayan Katha', 'Bharadwaja', '10:00 - 13:00', 5100, 'Confirmed', 5],
        ['Meera Nair', '+91 98470 11223', 'Archana (Sahasranama)', 'Vashishtha', '08:00 - 09:00', 1101, 'Confirmed', 8],
        ['Arjun Deshmukh', '+91 98220 33445', 'Maha Mrityunjaya Jaap', 'Gautama', '05:00 - 07:00', 11000, 'Standby', 11],
        ['Divya Reddy', '+91 98490 99001', 'Gau Puja & Godaan', 'Shandilya', '09:00 - 10:00', 5100, 'Confirmed', 14],
      ];
      setAllPoojaBookings((prev) => [
        ...bookingSeed.map(([devoteeName, phone, poojaName, gotra, timeSlot, dakshinaAmount, status, daysAgo], i) => ({
          id: `pbk_${ts}_seed_${i + 1}`,
          ...seedTag,
          devoteeName,
          phone,
          poojaName,
          gotra,
          timeSlot,
          dakshinaAmount,
          status,
          paymentStatus: 'Paid',
          receiptRef: `RCPT-SEED-${2001 + i}`,
          bookingDate: isoDaysAgo(daysAgo),
          tithiDate: isoDaysAhead(2),
        }) as unknown as PoojaBooking),
        ...prev,
      ]);
    }

    // ---- org-specific entity seeds ----
    if (seedProfile === 'goshala') {
      const cowSeed: Array<[string, string, string, string, number]> = [
        // name, breed, gender, tag, ageYears
        ['Kamdhenu', 'Gir', 'Gomata', 'GSH-001', 7],
        ['Nandini', 'Sahiwal', 'Gomata', 'GSH-002', 5],
        ['Dharma', 'Tharparkar', 'Nandi', 'GSH-003', 6],
        ['Ganga', 'Kankrej', 'Gomata', 'GSH-004', 4],
        ['Tulsi', 'Red Sindhi', 'Calf (Female)', 'GSH-005', 1],
        ['Vrishabha', 'Rathi', 'Nandi', 'GSH-006', 8],
      ];
      setAllCows((prev) => [
        ...cowSeed.map(([name, breed, gender, tagNumber, ageYears], i) => ({
          id: `cow_${ts}_seed_${i + 1}`,
          ...seedTag,
          name,
          breed,
          gender,
          tagNumber,
          ageYears,
          healthStatus: 'Healthy',
          milkYieldLitres: gender === 'Gomata' ? 8 + (i % 5) : 0,
        }) as unknown as GoshalaCowRecord),
        ...prev,
      ]);
    }

    if (seedProfile === 'gurukul') {
      const studentSeed: Array<[string, string, string, string, number, string, string[]]> = [
        // name, rollNo, courseLevel, guardian, attendancePct, upanayanamDate, otherSamskaras
        ['Aditya Sharma', 'GS-2026-001', 'Prathama (Grammar)', 'Ramesh Sharma', 96, '2024-04-22', ['Namakarana', 'Annaprashana']],
        ['Krishna Patel', 'GS-2026-002', 'Prathama (Grammar)', 'Mohan Patel', 92, '2024-05-10', ['Namakarana', 'Chudakarana (Mundana)']],
        ['Rama Iyer', 'GS-2025-014', 'Madhyama (Shastras)', 'Suresh Iyer', 98, '2022-03-18', ['Namakarana', 'Annaprashana', 'Chudakarana (Mundana)']],
        ['Arjun Nair', 'GS-2025-015', 'Madhyama (Shastras)', 'Gopal Nair', 89, '2022-06-02', ['Namakarana', 'Vedarambha']],
        ['Veda Vyas', 'GS-2024-007', 'Shastri (Philosophy)', 'Narayan Rao', 94, '2020-04-30', ['Namakarana', 'Annaprashana', 'Chudakarana (Mundana)', 'Vedarambha']],
        ['Shiva Menon', 'GS-2024-008', 'Shastri (Philosophy)', 'Kumar Menon', 91, '2020-05-14', ['Namakarana', 'Vedarambha']],
      ];
      setAllGurukulStudents((prev) => [
        ...studentSeed.map(([studentName, rollNo, courseLevel, guardianName, attendancePct, upanayanamDate, otherSamskaras], i) => ({
          id: `stu_${ts}_seed_${i + 1}`,
          ...seedTag,
          studentName,
          rollNo,
          courseLevel,
          guardianName,
          guardianPhone: `+91 98${String(10000000 + i * 1111111).slice(0, 8)}`,
          sandhyaVandanaRegularity: 85 + (i % 12),
          shlokaRecitationScore: 80 + (i % 15),
          attendancePct,
          // R-1 (Gurukul vibe): demo shishya carry samskara journeys.
          dateOfUpanayanam: upanayanamDate,
          samskaras: otherSamskaras.map((name) => ({ name, date: upanayanamDate })),
        }) as unknown as GurukulStudent),
        ...prev,
      ]);
    }

    if (seedProfile === 'ashram' || seedProfile === 'tirth') {
      const guestPurpose = seedProfile === 'ashram' ? 'Satsang' : 'Darshan';
      const guestSeed: Array<[string, string, string, number]> = [
        ['Rahul Verma', '+91 98111 22233', 'Kashi', 2],
        ['Sunita Rao', '+91 98222 33344', 'Pune', 5],
        ['Amit Joshi', '+91 98333 44455', 'Jaipur', 9],
        ['Kavita Das', '+91 98444 55566', 'Kolkata', 14],
        ['Mohan Lal', '+91 98555 66677', 'Lucknow', 20],
      ];
      setAllGuests((prev) => [
        ...guestSeed.map(([name, phone, city, daysAgo], i) => ({
          id: `gst_${ts}_seed_${i + 1}`,
          ...seedTag,
          name,
          phone,
          city,
          purpose: guestPurpose,
          visitDate: isoDaysAgo(daysAgo),
          status: 'Visited',
        }) as unknown as GuestRecord),
        ...prev,
      ]);
    }

  };

  const addDevotee = (data: Omit<DevoteeMember, 'id' | 'qrCodeRef' | 'joinedDate'>): string | boolean => {
    if (!checkAndIncrementModuleQuota('devotees').allowed) return false;

    const id = `dev-${Date.now()}`;
    const now = Date.now();
    // Multi-branch: stamp the active branch (no-op → undefined for single-org).
    const _branchId = stampBranchId((data as any).branchId);
    const newMember: any = {
      ...data,
      id,
      workspaceId: data.workspaceId || activeWorkspace.id,
      ...(_branchId ? { branchId: _branchId } : {}),
      qrCodeRef: `QR-SB-${id.slice(-6).toUpperCase()}`,
      joinedDate: new Date().toISOString().slice(0, 10),
      _createdAt: now,
      ...demoTtlFields(data.workspaceId || activeWorkspace.id),
    };

    setAllDevotees((prev) => [newMember, ...prev]);
    trackSignUp({ memberId: newMember.id, gotra: newMember.gotra || '', sevaTier: 'Devotee', workspaceType: activeWorkspace.type, workspaceId: activeWorkspace.id });
    // SECURITY (C-4): the auto-purge note is shown ONLY for demo sandboxes —
    // real workspaces never expire records.
    const enrolledWs = data.workspaceId || activeWorkspace.id;
    showToast(
      enrolledWs.startsWith('DEMO_')
        ? `${data.fullName} enrolled into ${activeWorkspace.name}. (Auto-purge scheduled in 24h)`
        : `${data.fullName} enrolled into ${activeWorkspace.name}.`,
      'success'
    );
    return id;
  };

  const updateDevotee = (id: string, updates: Partial<DevoteeMember>) => {
    setAllDevotees((prev) =>
      prev.map((d, idx) => (d.id === id ? { ...d, ...updates } : d))
    );
    showToast('Devotee record updated', 'success');
  };

  const deleteDevotee = (id: string) => {
    setAllDevotees((prev) => prev.filter((d) => d.id !== id));
    deleteDoc(doc(db, 'devotees', id)).catch((err: any) => {
      console.warn('[Firestore sync] delete devotee offline or restricted:', err?.message || err);
    });
    showToast('Member removed from directory', 'info');
  };

  const addFamily = (family: Omit<FamilyHousehold, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('families').allowed) return false;

    const id = `fam-${Date.now()}`;
    const now = Date.now();
    const newFam: any = {
      ...family,
      id,
      workspaceId: family.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(family.workspaceId || activeWorkspace.id),
    };
    setAllFamilies((prev) => [newFam, ...prev]);
    showToast(`Household "${family.familyName}" recorded`, 'success');
    return true;
  };

  const updateVanshavali = (tree: VanshavaliNode) => {
    setVanshavali(tree);
    set('sb_vanshavali', tree);
    showToast('Lineage genealogical tree saved', 'success');
  };

  const addGuest = (guest: Omit<GuestRecord, 'id' | 'visitDate'>): boolean => {
    if (!checkAndIncrementModuleQuota('guests').allowed) return false;

    const id = `gst-${Date.now()}`;
    const now = Date.now();
    const newGuest: any = {
      ...guest,
      id,
      workspaceId: guest.workspaceId || activeWorkspace.id,
      visitDate: new Date().toISOString().slice(0, 10),
      _createdAt: now,
      ...demoTtlFields(guest.workspaceId || activeWorkspace.id),
    };
    setAllGuests((prev) => [newGuest, ...prev]);
    trackGenerateLead({ leadName: newGuest.name, purpose: newGuest.purpose, city: newGuest.city, workspaceType: activeWorkspace.type, workspaceId: activeWorkspace.id });
    showToast(`Guest entry created for ${guest.name}`, 'success');
    return true;
  };

  const promoteGuestToMember = (guestId: string) => {
    const guest = allGuests.find((g) => g.id === guestId);
    if (!guest) return;

    addDevotee({
      workspaceId: activeWorkspace.id,
      fullName: guest.name,
      phone: guest.phone,
      pin: '1008',
      role: 'DEVOTEE',
      sevaIndex: 150,
      sevaTier: 'Sadharan',
      gotra: 'Kashyapa',
      varnaKul: 'Sanatan',
      address: guest.city,
      activeStatus: 'Active',
      totalDonated: 0,
      volunteerHours: 0,
    });

    setAllGuests((prev) =>
      prev.map((g, idx) => (g.id === guestId ? { ...g, status: 'Promoted' as const } : g))
    );
    showToast(`Guest ${guest.name} promoted to enrolled Member!`, 'success');
  };

  const addTreasuryTransaction = (tx: Omit<TreasuryTransaction, 'id' | 'auditVerified' | 'createdAt' | 'updatedAt'> & Partial<TenantScoped>): boolean => {
    if (!checkAndIncrementModuleQuota('treasury').allowed) return false;
    const id = `tx-${Date.now()}`;
    const now = Date.now();
    // M-18: sequential, gap-detectable receipt numbers per workspace+year.
    // Respect a caller-provided taxReceiptNumber (e.g. QuickChandaPOS prints
    // the same number it stores — fixes the SB-CHANDA vs SB-80G mismatch);
    // otherwise assign the next sequence. Never timestamp fragments.
    const year = new Date().getFullYear();
    const wsId = tx.workspaceId || activeWorkspace.id;
    const existingNumbers = allTreasury
      .filter((t) => (t.workspaceId || '') === wsId)
      .map((t) => t.taxReceiptNumber);
    const autoReceipt = tx.is80GEligible
      ? formatReceiptNumber('SB-80G', year, nextReceiptSeq(existingNumbers, 'SB-80G', year))
      : undefined;
    // Multi-branch: stamp the active branch (no-op → undefined for single-org).
    const _branchId = stampBranchId((tx as any).branchId);
    const newTx: any = {
      ...tx,
      id,
      workspaceId: wsId,
      ...(_branchId ? { branchId: _branchId } : {}),
      createdAt: tx.createdAt || now,
      updatedAt: tx.updatedAt || now,
      auditVerified: true,
      taxReceiptNumber: tx.taxReceiptNumber || autoReceipt,
      _createdAt: now,
      ...demoTtlFields(wsId),
    };
    
    // Optimistic UI Update
    setAllTreasury((prev) => [newTx, ...prev]);
    
    // Firestore DB Write
    try {
      addDoc(collection(db, 'treasury'), {
        ...newTx,
        timestamp: serverTimestamp()
      }).catch((err: any) => {
        console.warn("Firebase Treasury Write Notice:", err?.message || err);
      });
    } catch(e: any) {
      console.warn("Firebase Treasury local fallback notice:", e?.message || e);
    }

    if (tx.type === 'Income') {
      trackTreasuryPurchase({
        transactionId: id,
        value: tx.amount,
        currency: activeWorkspace.currency,
        category: tx.category,
        handledBy: tx.handledBy,
        paymentMode: tx.paymentMode,
        workspaceType: activeWorkspace.type,
        workspaceId: activeWorkspace.id,
        userRole: currentRole,
      });

      // Update devotee total if linked
      if (tx.devoteeId) {
        const devotee = allDevotees.find(d => d.id === tx.devoteeId);
        if (devotee) {
          const oldTotal = devotee.totalDonated || 0;
          const newTotal = oldTotal + tx.amount;
          const milestones = [100000, 500000, 1000000, 5000000, 10000000];
          for (const m of milestones) {
            if (oldTotal < m && newTotal >= m) {
              setTimeout(() => {
                showToast(`🏆 Milestone Alert! ${devotee.fullName} crossed ₹${m.toLocaleString()} in lifetime donations!`, 'success', 'Major Contributor');
              }, 1500);
            }
          }
        }

        setAllDevotees((prev) =>
          prev.map((d, idx) =>
            d.id === tx.devoteeId
              ? {
                  ...d,
                  totalDonated: (d.totalDonated || 0) + tx.amount,
                  sevaIndex: Math.min(1000, (d.sevaIndex || 0) + Math.floor(tx.amount / 100)),
                }
              : d
          )
        );
      }
    }

    showToast(
      `${tx.type === 'Income' ? 'Chanda / Income' : 'Expense'} of ${activeWorkspace.currencySymbol} ${tx.amount.toLocaleString()} logged.`,
      'success',
      'Double-Entry Ledger Updated'
    );
    return true;
  };

  /**
   * M-18: next sequential receipt number for a series, per active workspace
   * and current year. POS desks call this BEFORE posting so the printed
   * receipt and the stored record carry the same number.
   */
  const getNextReceiptNumber = useCallback((prefix: 'SB-80G' | 'SB-CHANDA'): string => {
    const year = new Date().getFullYear();
    const wsId = activeWorkspace?.id;
    const existing = allTreasury
      .filter((t) => (t.workspaceId || '') === wsId)
      .map((t) => t.taxReceiptNumber);
    return formatReceiptNumber(prefix, year, nextReceiptSeq(existing, prefix, year));
  }, [allTreasury, activeWorkspace?.id]);

  const updateTreasuryTransaction = (id: string, updates: Partial<TreasuryTransaction>) => {
    setAllTreasury((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    try {
      // M-1: 'treasury' is the canonical collection (reads and writes).
      // The legacy duplicate write to 'donations' was removed.
      setDoc(doc(db, 'treasury', id), { ...updates, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
    } catch (e) {
      console.warn('Update treasury transaction error:', e);
    }
  };

  const addAsset = (asset: Omit<AssetRecord, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('assets').allowed) return false;

    const id = `ast-${Date.now()}`;
    const now = Date.now();
    // Multi-branch: stamp the active branch (no-op → undefined for single-org).
    const _branchId = stampBranchId((asset as any).branchId);
    const newAst: any = {
      ...asset,
      id,
      workspaceId: asset.workspaceId || activeWorkspace.id,
      ...(_branchId ? { branchId: _branchId } : {}),
      _createdAt: now,
      ...demoTtlFields(asset.workspaceId || activeWorkspace.id),
    };
    setAllAssets((prev) => [{ ...newAst }, ...prev]);
    showToast(`Asset "${asset.name}" added to ledger`, 'success');
    return true;
  };

  const updateInventoryStock = (id: string, newStock: number) => {
    setAllInventory((prev) =>
      prev.map((item, idx) =>
        item.id === id
          ? { ...item, currentStock: newStock, lastRestockedDate: new Date().toISOString().slice(0, 10) }
          : item
      )
    );
    showToast('Inventory stock balance updated', 'success');
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id' | 'lastRestockedDate'>): boolean => {
    if (!checkAndIncrementModuleQuota('inventory').allowed) return false;

    const id = `inv-${Date.now()}`;
    const now = Date.now();
    // Multi-branch: stamp the active branch (no-op → undefined for single-org).
    const _branchId = stampBranchId((item as any).branchId);
    const newInv: any = {
      ...item,
      id,
      workspaceId: item.workspaceId || activeWorkspace.id,
      ...(_branchId ? { branchId: _branchId } : {}),
      lastRestockedDate: new Date().toISOString().slice(0, 10),
      _createdAt: now,
      ...demoTtlFields(item.workspaceId || activeWorkspace.id),
    };
    setAllInventory((prev) => [newInv, ...prev]);
    showToast(`Item "${item.itemName}" added to store`, 'success');
    return true;
  };

  const addPoojaBooking = (
    booking: Omit<PoojaBooking, 'id' | 'receiptRef' | 'status' | 'paymentStatus'>
  ): boolean => {
    if (!checkAndIncrementModuleQuota('pooja').allowed) return false;

    const id = `pb-${Date.now()}`;
    const now = Date.now();
    // Multi-branch: stamp the active branch (no-op → undefined for single-org).
    const _branchId = stampBranchId((booking as any).branchId);
    const newBooking: any = {
      ...booking,
      id,
      workspaceId: booking.workspaceId || activeWorkspace.id,
      ...(_branchId ? { branchId: _branchId } : {}),
      receiptRef: `RCP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      _createdAt: now,
      ...demoTtlFields(booking.workspaceId || activeWorkspace.id),
    };
    setAllPoojaBookings((prev) => [newBooking, ...prev]);

    // Automatically log to treasury ledger
    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'Income',
      category: 'Pooja Dakshina',
      amount: booking.dakshinaAmount,
      handledBy: 'Pooja Sankalp Desk',
      devoteeName: booking.devoteeName,
      paymentMode: 'UPI / QR',
      purpose: `${booking.poojaName} - Gotra: ${booking.gotra}`,
      is80GEligible: true,
      taxReceiptIssued: false,
    });

    showToast(`Sankalp reserved for ${booking.devoteeName}. Slip generated.`, 'success', 'Pooja Confirmed');
    return true;
  };

  const updatePoojaStatus = (id: string, status: PoojaBooking['status'], additionalUpdates?: Partial<PoojaBooking>) => {
    setAllPoojaBookings((prev) =>
      prev.map((b, idx) => (b.id === id ? { ...b, status, ...additionalUpdates } : b))
    );
    showToast(`Pooja status updated to ${status}`, 'success');
  };

  const addCow = (cow: Omit<GoshalaCowRecord, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('goshala').allowed) return false;

    const id = `cow-${Date.now()}`;
    const now = Date.now();
    const newCow: any = {
      ...cow,
      id,
      workspaceId: cow.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(cow.workspaceId || activeWorkspace.id),
    };
    setAllCows((prev) => [newCow, ...prev]);
    showToast(`Gomata/Nandi record added: ${cow.name}`, 'success');
    return true;
  };

  const adoptCow = (cowId: string, sponsorName: string, sponsorGotra?: string, sponsorPhone?: string) => {
    setAllCows((prev) =>
      prev.map((c, idx) =>
        c.id === cowId
          ? {
              ...c,
              adoptedByDevotee: sponsorName,
              adoptionSponsor: sponsorName,
              sponsorGotra,
              sponsorPhone,
              adoptionStartDate: new Date().toISOString().slice(0, 10),
            }
          : c
      )
    );
    showToast(`Gomata successfully adopted by ${sponsorName}!`, 'success', 'Gau Seva Adoption');
  };

  // ============================================
  // PHASE 20: BHOOMI (Real Estate) MUTATORS
  // ============================================

  const addBhoomiProperty = (prop: Omit<BhoomiProperty, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('bhoomi').allowed) return false;

    const id = `bhoomi-${Date.now()}`;
    const now = Date.now();
    const newProp: any = {
      ...prop,
      id,
      workspaceId: prop.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(prop.workspaceId || activeWorkspace.id),
    };
    setAllBhoomiProperties((prev) => [newProp, ...prev]);
    showToast(`Property registered: ${prop.name}`, 'success', 'Bhoomi Registry');
    return true;
  };

  const updateBhoomiProperty = (id: string, updates: Partial<BhoomiProperty>) => {
    setAllBhoomiProperties((prev) =>
      prev.map((p, idx) => (p.id === id ? { ...p, ...updates } : p))
    );
    showToast('Property record updated', 'success');
  };

  const deleteBhoomiProperty = (id: string) => {
    setAllBhoomiProperties((prev) => prev.filter((p) => p.id !== id));
    setAllRentReceipts((prev) => prev.filter((r) => r.propertyId !== id));
    showToast('Property removed from registry', 'info', 'Bhoomi Registry');
  };

  const addRentReceipt = (receipt: Omit<BhoomiRentReceipt, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('bhoomi').allowed) return false;

    const id = `rent-${Date.now()}`;
    const now = Date.now();
    const newReceipt: any = {
      ...receipt,
      id,
      workspaceId: receipt.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(receipt.workspaceId || activeWorkspace.id),
    };
    setAllRentReceipts((prev) => [newReceipt, ...prev]);
    // M-2: rent is a financial record — persist the income leg to the treasury
    // ledger (real Firestore write path) alongside the local rent receipt.
    const posted = addTreasuryTransaction({
      workspaceId: newReceipt.workspaceId,
      date: receipt.paidDate || new Date().toISOString().slice(0, 10),
      type: 'Income',
      category: 'BHOOMI_RENT',
      subcategory: receipt.propertyName || 'Property Rent',
      amount: receipt.amount,
      handledBy: receipt.collectedBy || 'Bhoomi Desk',
      paymentMode: receipt.paymentMode || 'Cash',
      referenceNo: receipt.receiptNo || newReceipt.id,
      purpose: `Rent collected from ${receipt.tenantName} (${receipt.rentMonth})`,
    });
    showToast(
      posted
        ? `Rent collected: ₹${receipt.amount.toLocaleString()} from ${receipt.tenantName}`
        : `Rent recorded on this device, but the ledger posting was blocked (quota reached).`,
      posted ? 'success' : 'warning',
      'Rent Collection'
    );
    return true;
  };

  // ============================================
  // PHASE 20: VAHAN (Fleet) MUTATORS
  // ============================================

  const addFleetVehicle = (vehicle: Omit<FleetVehicle, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('vahan').allowed) return false;

    const duplicate = allFleetVehicles.some(
      (v) => v.registrationNo.trim().toLowerCase() === vehicle.registrationNo.trim().toLowerCase()
    );
    if (duplicate) {
      showToast(`Registration ${vehicle.registrationNo} already exists in the fleet`, 'error', 'Vahan Fleet');
      return false;
    }

    const id = `vahan-${Date.now()}`;
    const now = Date.now();
    const newVehicle: any = {
      ...vehicle,
      id,
      workspaceId: vehicle.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(vehicle.workspaceId || activeWorkspace.id),
    };
    setAllFleetVehicles((prev) => [newVehicle, ...prev]);
    showToast(`Vehicle registered: ${vehicle.registrationNo}`, 'success', 'Vahan Fleet');
    return true;
  };

  const updateFleetVehicle = (id: string, updates: Partial<FleetVehicle>) => {
    setAllFleetVehicles((prev) =>
      prev.map((v, idx) => (v.id === id ? { ...v, ...updates } : v))
    );
    showToast('Vehicle record updated', 'success');
  };

  const deleteFleetVehicle = (id: string) => {
    setAllFleetVehicles((prev) => prev.filter((v) => v.id !== id));
    showToast('Vehicle removed from fleet register', 'info', 'Vahan Fleet');
  };

  const addFuelLog = (log: Omit<FleetFuelLog, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('vahan').allowed) return false;

    const id = `fuel-${Date.now()}`;
    const now = Date.now();
    const newLog: any = {
      ...log,
      id,
      totalCost: log.litersFilled * log.costPerLiter,
      workspaceId: log.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(log.workspaceId || activeWorkspace.id),
    };
    setAllFuelLogs((prev) => [newLog, ...prev]);
    // Keep the vehicle's live odometer in sync with the newest log
    setAllFleetVehicles((prev) =>
      prev.map((v) =>
        v.id === log.vehicleId && log.odometerKm > v.odometerKm
          ? { ...v, odometerKm: log.odometerKm }
          : v
      )
    );
    showToast(`Fuel logged: ${log.litersFilled}L @ ₹${newLog.totalCost.toLocaleString()} — ${log.registrationNo}`, 'success', 'Vahan Fleet');
    return true;
  };

  const addServiceRecord = (record: Omit<FleetServiceRecord, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('vahan').allowed) return false;

    const id = `svc-${Date.now()}`;
    const now = Date.now();
    const newRecord: any = {
      ...record,
      id,
      workspaceId: record.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(record.workspaceId || activeWorkspace.id),
    };
    setAllServiceRecords((prev) => [newRecord, ...prev]);
    showToast(`Service logged (${record.serviceType}) — ${record.registrationNo}`, 'success', 'Vahan Fleet');
    return true;
  };

  // Advance an ISO date string by N months, clamping to month-end (e.g. Jan 31 + 1mo -> Feb 28/29)
  const advanceDateByMonths = (isoDate: string, months: number): string => {
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return isoDate;
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0); // clamp to last day of previous month
    return d.toISOString().slice(0, 10);
  };

  const addSevaSubscription = (sub: Omit<SevaSubscription, 'id' | 'totalCollected' | 'paymentsCount'> & { silent?: boolean }): boolean => {
    if (!checkAndIncrementModuleQuota('seva-subscriptions').allowed) return false;
    if (!sub.devoteeName?.trim() || !(sub.amount > 0)) {
      showToast('Devotee name and a positive amount are required.', 'warning', 'Invalid Subscription');
      return false;
    }

    const id = `seva-${Date.now()}`;
    const now = Date.now();
    const { silent, ...rest } = sub;
    const newSub: any = {
      ...rest,
      id,
      totalCollected: 0,
      paymentsCount: 0,
      status: sub.status || 'Active',
      workspaceId: sub.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(sub.workspaceId || activeWorkspace.id),
    };
    setAllSevaSubscriptions((prev) => [newSub, ...prev]);
    if (!silent) {
      showToast(`Seva subscription started: ${sub.devoteeName} — ₹${Number(sub.amount).toLocaleString('en-IN')}/${sub.frequency}`, 'success', 'Nitya Seva');
    }
    return true;
  };

  const updateSevaSubscription = (id: string, updates: Partial<SevaSubscription>) => {
    setAllSevaSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s))
    );
  };

  const recordSubscriptionPayment = (subId: string, amount: number, date: string, mode: string): boolean => {
    const sub = allSevaSubscriptions.find((s) => s.id === subId);
    if (!sub) {
      showToast('Subscription not found.', 'error', 'Payment Failed');
      return false;
    }
    if (sub.status !== 'Active') {
      showToast(`Cannot collect: subscription is ${sub.status}.`, 'warning', 'Payment Blocked');
      return false;
    }
    if (!(amount > 0)) {
      showToast('Payment amount must be positive.', 'warning', 'Invalid Payment');
      return false;
    }

    // 1. Auto-post Treasury Income (double-entry into the audited ledger)
    const posted = addTreasuryTransaction({
      type: 'Income',
      category: 'Recurring Seva',
      date: date || new Date().toISOString().slice(0, 10),
      amount: Number(amount),
      handledBy: (activeWorkspace as any)?.custodianName || 'Seva Coordinator',
      paymentMode: mode || sub.paymentMode,
      purpose: `Recurring Seva — ${sub.planName} — ${sub.devoteeName} (${sub.frequency})`,
      devoteeName: sub.devoteeName,
      devoteeId: sub.devoteeId,
      workspaceId: sub.workspaceId,
    });
    if (!posted) return false;

    // 2. Advance the billing cycle
    const months = sub.frequency === 'Quarterly' ? 3 : sub.frequency === 'Annually' ? 12 : 1;
    const nextDue = advanceDateByMonths(sub.nextDueDate, months);

    setAllSevaSubscriptions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? {
              ...s,
              totalCollected: (s.totalCollected || 0) + Number(amount),
              paymentsCount: (s.paymentsCount || 0) + 1,
              nextDueDate: nextDue,
              updatedAt: Date.now(),
            }
          : s
      )
    );
    showToast(`₹${Number(amount).toLocaleString('en-IN')} collected from ${sub.devoteeName} — next due ${nextDue}`, 'success', 'Seva Payment');
    return true;
  };

  const addAnnadanam = (ann: Omit<AnnadanamSponsorship, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('annadanam').allowed) return false;

    const id = `ann-${Date.now()}`;
    const now = Date.now();
    const newAnn: any = {
      ...ann,
      id,
      workspaceId: ann.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(ann.workspaceId || activeWorkspace.id),
    };
    setAllAnnadanamList((prev) => [newAnn, ...prev]);
    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: ann.date,
      type: 'Income',
      category: 'Annadanam Sponsorship',
      amount: ann.contributionAmount,
      handledBy: 'Annakshetra Desk',
      devoteeName: ann.sponsorName,
      paymentMode: 'UPI / QR',
      purpose: `Bhandara for ${ann.devoteeCountProjected} devotees`,
      is80GEligible: true,
      taxReceiptIssued: false,
    });
    showToast(`Annadanam sponsored for ${ann.devoteeCountProjected} devotees!`, 'success');
    return true;
  };

  const addResolution = (res: Omit<TrusteeResolution, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('resolutions').allowed) return false;

    const id = `res-${Date.now()}`;
    const now = Date.now();
    const newRes: any = {
      ...res,
      id,
      workspaceId: res.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(res.workspaceId || activeWorkspace.id),
    };
    setAllResolutions((prev) => [newRes, ...prev]);
    showToast(`Resolution ${res.resolutionNumber} saved to governance ledger`, 'success');
    return true;
  };

  const voteOnResolution = (id: string, type: 'favor' | 'against') => {
    setAllResolutions(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          votesInFavor: type === 'favor' ? r.votesInFavor + 1 : r.votesInFavor,
          votesAgainst: type === 'against' ? r.votesAgainst + 1 : r.votesAgainst
        };
      }
      return r;
    }));
  };

  const addResidentPuja = (puja: Omit<ResidentPujaSchedule, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('residentPujas').allowed) return false;
    const id = `rpuja-${Date.now()}`;
    const now = Date.now();
    const newPuja: any = {
      ...puja,
      id,
      workspaceId: puja.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(puja.workspaceId || activeWorkspace.id),
    };
    setAllResidentPujas((prev) => [newPuja, ...prev]);
    showToast('Resident Puja Schedule added', 'success');
    return true;
  };

  const addPitruRecord = (record: Omit<PitruRecord, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('pitruRecords').allowed) return false;
    const id = `pitru-${Date.now()}`;
    const now = Date.now();
    const newRecord: any = {
      ...record,
      id,
      workspaceId: record.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(record.workspaceId || activeWorkspace.id),
    };
    setAllPitruRecords((prev) => [newRecord, ...prev]);
    showToast('Pitru Shradh Record added', 'success');
    return true;
  };

  const addGurukulStudent = (student: Omit<GurukulStudent, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('gurukulStudents').allowed) return false;
    const id = `stu-${Date.now()}`;
    const now = Date.now();
    const newStudent: any = {
      ...student,
      id,
      workspaceId: student.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(student.workspaceId || activeWorkspace.id),
    };
    setAllGurukulStudents((prev) => [newStudent, ...prev]);
    showToast('Gurukul Vidyarthi Enrolled', 'success');
    return true;
  };

  // R-1 (Gurukul vibe): partial update for shishya records — used for
  // samskara recording. IndexedDB-local + Firestore merge write, mirroring
  // the updateDevotee pattern.
  const updateGurukulStudent = (id: string, updates: Partial<GurukulStudent>) => {
    setAllGurukulStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    showToast('Shishya record updated', 'success');
  };

  const addShift = (shift: Omit<SevadarDutyShift, 'id'>): boolean => {
    if (!checkAndIncrementModuleQuota('shifts').allowed) return false;

    const id = `shf-${Date.now()}`;
    const now = Date.now();
    const newShift: any = {
      ...shift,
      id,
      workspaceId: shift.workspaceId || activeWorkspace.id,
      _createdAt: now,
      ...demoTtlFields(shift.workspaceId || activeWorkspace.id),
    };
    setAllShifts((prev) => [newShift, ...prev]);
    showToast(`Sevadar shift assigned for ${shift.sevadarName}`, 'success');
    return true;
  };

  const addCampaignDonation = (campaignId: string, donorName: string, amount: number, city: string) => {
    setAllCampaigns((prev) =>
      prev.map((c, idx) =>
        c.id === campaignId
          ? {
              ...c,
              collectedAmount: c.collectedAmount + amount,
              donorsCount: c.donorsCount + 1,
              topDonors: [{ name: donorName, amount, city }, ...(c.topDonors || [])].slice(0, 5),
            }
          : c
      )
    );

    addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'Income',
      category: 'Mandir Campaigns',
      amount,
      handledBy: 'Crowdfund Seva Desk',
      devoteeName: donorName,
      paymentMode: 'UPI / QR',
      purpose: `Campaign Seva Contribution`,
      is80GEligible: true,
      taxReceiptIssued: true,
    });

    showToast(`Sacred contribution of ₹${amount.toLocaleString()} received from ${donorName}!`, 'success', 'Mandir Nirman Donation');
  };

  // M-3: memoize the provider value — the inline object literal used to
  // re-create on every render (including the 60s purge tick), re-rendering
  // every consumer. Deps are the full field list.
  const contextValue: DataContextType = useMemo(() => ({

        isDataLoading,
        devotees,
        puja_bookings,
        donations,
        inventory_items,
        poojaBookings,
        poojas: poojaBookings,
        treasury,
        inventory,
        families,
        vanshavali,
        guests,
        assets,
        residentPujas,
        purohits,
        pitruRecords,
        cows,
        annadanamList,
        rooms,
        gurukulStudents,
        campaigns,
        matrimonyProfiles,
        shlokas,
        resolutions,
        shifts,
        bhoomiProperties,
        rentReceipts,
        fleetVehicles,
        fuelLogs,
        serviceRecords,
        sevaSubscriptions,
        seedDemoData,
        addDevotee,
        updateDevotee,
        deleteDevotee,
        addFamily,
        updateVanshavali,
        addGuest,
        promoteGuestToMember,
        addTreasuryTransaction,
        updateTreasuryTransaction,
        getNextReceiptNumber,
        addAsset,
        updateInventoryStock,
        addInventoryItem,
        addPoojaBooking,
        updatePoojaStatus,
        addCow,
        adoptCow,
        addAnnadanam,
        addResolution,
        voteOnResolution,
        addShift,
        addCampaignDonation,
        addResidentPuja,
        addPitruRecord,
        addGurukulStudent,
        updateGurukulStudent,
        purgeAutoDeleteRecords,
        addBhoomiProperty,
        updateBhoomiProperty,
        deleteBhoomiProperty,
        addRentReceipt,
        addFleetVehicle,
        updateFleetVehicle,
        deleteFleetVehicle,
        addFuelLog,
        addServiceRecord,
        addSevaSubscription,
        updateSevaSubscription,
        recordSubscriptionPayment,
        demoUpsellModule,
        closeDemoUpsell,
        getDemoStats,
        resetDemoWorkspace,
        convertDemoToReal,
        activeBranchId,
        setActiveBranchId: selectBranch,
        branches,
        isMultiBranch,
        mainBranchId,
        recordsForBranch,
        getBranchRecordCount,
        myBranchIds,
        isBranchAccessible,
      }), [isDataLoading, devotees, puja_bookings, donations, inventory_items, poojaBookings, treasury, inventory, families, vanshavali, guests, assets, residentPujas, purohits, pitruRecords, cows, annadanamList, rooms, gurukulStudents, campaigns, matrimonyProfiles, shlokas, resolutions, shifts, bhoomiProperties, rentReceipts, fleetVehicles, fuelLogs, serviceRecords, sevaSubscriptions, seedDemoData, addDevotee, updateDevotee, deleteDevotee, addFamily, updateVanshavali, addGuest, promoteGuestToMember, addTreasuryTransaction, updateTreasuryTransaction, getNextReceiptNumber, addAsset, updateInventoryStock, addInventoryItem, addPoojaBooking, updatePoojaStatus, addCow, adoptCow, addAnnadanam, addResolution, voteOnResolution, addShift, addCampaignDonation, addResidentPuja, addPitruRecord, addGurukulStudent, updateGurukulStudent, purgeAutoDeleteRecords, addBhoomiProperty, updateBhoomiProperty, deleteBhoomiProperty, addRentReceipt, addFleetVehicle, updateFleetVehicle, deleteFleetVehicle, addFuelLog, addServiceRecord, addSevaSubscription, updateSevaSubscription, recordSubscriptionPayment, demoUpsellModule, closeDemoUpsell, getDemoStats, resetDemoWorkspace, convertDemoToReal, activeBranchId, branches, isMultiBranch, mainBranchId, recordsForBranch, getBranchRecordCount, selectBranch, myBranchIds, isBranchAccessible]);

  return (
    <DataContext.Provider
      value={{
        isDataLoading,
        devotees,
        puja_bookings,
        donations,
        inventory_items,
        poojaBookings,
        poojas: poojaBookings,
        treasury,
        inventory,
        families,
        vanshavali,
        guests,
        assets,
        residentPujas,
        purohits,
        pitruRecords,
        cows,
        annadanamList,
        rooms,
        gurukulStudents,
        campaigns,
        matrimonyProfiles,
        shlokas,
        resolutions,
        shifts,
        bhoomiProperties,
        rentReceipts,
        fleetVehicles,
        fuelLogs,
        serviceRecords,
        sevaSubscriptions,
        seedDemoData,
        addDevotee,
        updateDevotee,
        deleteDevotee,
        addFamily,
        updateVanshavali,
        addGuest,
        promoteGuestToMember,
        addTreasuryTransaction,
        updateTreasuryTransaction,
        getNextReceiptNumber,
        addAsset,
        updateInventoryStock,
        addInventoryItem,
        addPoojaBooking,
        updatePoojaStatus,
        addCow,
        adoptCow,
        addAnnadanam,
        addResolution,
        voteOnResolution,
        addShift,
        addCampaignDonation,
        addResidentPuja,
        addPitruRecord,
        addGurukulStudent,
        updateGurukulStudent,
        purgeAutoDeleteRecords,
        addBhoomiProperty,
        updateBhoomiProperty,
        deleteBhoomiProperty,
        addRentReceipt,
        addFleetVehicle,
        updateFleetVehicle,
        deleteFleetVehicle,
        addFuelLog,
        addServiceRecord,
        addSevaSubscription,
        updateSevaSubscription,
        recordSubscriptionPayment,
        demoUpsellModule,
        closeDemoUpsell,
        getDemoStats,
        resetDemoWorkspace,
        convertDemoToReal,
        activeBranchId,
        setActiveBranchId: selectBranch,
        branches,
        isMultiBranch,
        mainBranchId,
        recordsForBranch,
        getBranchRecordCount,
        myBranchIds,
        isBranchAccessible,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Re-export split modules for backward compatibility
export * from './data/seedData';
export * from './data/quotaEngine';
export * from './data/types';
