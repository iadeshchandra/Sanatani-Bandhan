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
} from '../../types';
import { DemoUpsell } from './quotaEngine';

export interface DataContextType {
  // Global loading state for initial data payload
  isDataLoading: boolean;

  // Core tenant-scoped datasets
  devotees: DevoteeMember[];
  puja_bookings: PoojaBooking[];
  donations: TreasuryTransaction[];
  inventory_items: InventoryItem[];

  // Aliases for platform backward compatibility
  poojaBookings: PoojaBooking[];
  poojas: PoojaBooking[];
  treasury: TreasuryTransaction[];
  inventory: InventoryItem[];

  // Ancillary tenant-scoped datasets
  families: FamilyHousehold[];
  vanshavali: VanshavaliNode;
  guests: GuestRecord[];
  assets: AssetRecord[];
  residentPujas: ResidentPujaSchedule[];
  purohits: PurohitProfile[];
  pitruRecords: PitruRecord[];
  cows: GoshalaCowRecord[];
  annadanamList: AnnadanamSponsorship[];
  rooms: AshramKutirRoom[];
  gurukulStudents: GurukulStudent[];
  campaigns: CampaignCrowdfund[];
  matrimonyProfiles: MatrimonyProfile[];
  shlokas: ShlokaCardItem[];
  resolutions: TrusteeResolution[];
  shifts: SevadarDutyShift[];

  // Phase 20: Bhoomi (Real Estate) & Vahan (Fleet) datasets
  bhoomiProperties: BhoomiProperty[];
  rentReceipts: BhoomiRentReceipt[];
  fleetVehicles: FleetVehicle[];
  fuelLogs: FleetFuelLog[];
  serviceRecords: FleetServiceRecord[];

  // Mutators
  seedDemoData: (workspaceId: string, type: string) => void;
  addDevotee: (devotee: Omit<DevoteeMember, 'id' | 'qrCodeRef' | 'joinedDate'>) => string | boolean;
  updateDevotee: (id: string, updates: Partial<DevoteeMember>) => void;
  deleteDevotee: (id: string) => void;
  addFamily: (family: Omit<FamilyHousehold, 'id'>) => boolean;
  updateVanshavali: (tree: VanshavaliNode) => void;
  addGuest: (guest: Omit<GuestRecord, 'id' | 'visitDate'>) => boolean;
  promoteGuestToMember: (guestId: string) => void;
  addTreasuryTransaction: (tx: Omit<TreasuryTransaction, 'id' | 'auditVerified' | 'createdAt' | 'updatedAt'> & Partial<TenantScoped>) => boolean;
  updateTreasuryTransaction: (id: string, updates: Partial<TreasuryTransaction>) => void;
  /** M-18: next sequential receipt number for a series (SB-80G / SB-CHANDA), per workspace+year. */
  getNextReceiptNumber: (prefix: 'SB-80G' | 'SB-CHANDA') => string;
  addAsset: (asset: Omit<AssetRecord, 'id'>) => boolean;
  updateInventoryStock: (id: string, newStock: number) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastRestockedDate'>) => boolean;
  addPoojaBooking: (booking: Omit<PoojaBooking, 'id' | 'receiptRef' | 'status' | 'paymentStatus'>) => boolean;
  updatePoojaStatus: (id: string, status: PoojaBooking['status'], additionalUpdates?: Partial<PoojaBooking>) => void;
  addCow: (cow: Omit<GoshalaCowRecord, 'id'>) => boolean;
  adoptCow: (cowId: string, sponsorName: string, sponsorGotra?: string, sponsorPhone?: string) => void;
  addAnnadanam: (ann: Omit<AnnadanamSponsorship, 'id'>) => boolean;
  addResolution: (res: Omit<TrusteeResolution, 'id'>) => boolean;
  voteOnResolution: (id: string, type: 'favor' | 'against') => void;
  addShift: (shift: Omit<SevadarDutyShift, 'id'>) => boolean;
  addCampaignDonation: (campaignId: string, donorName: string, amount: number, city: string) => void;
  addResidentPuja: (puja: Omit<ResidentPujaSchedule, 'id'>) => boolean;
  addPitruRecord: (record: Omit<PitruRecord, 'id'>) => boolean;
  addGurukulStudent: (student: Omit<GurukulStudent, 'id'>) => boolean;
  updateGurukulStudent: (id: string, updates: Partial<GurukulStudent>) => void;
  purgeAutoDeleteRecords: () => void;

  // Phase 20: Bhoomi (Real Estate) mutators
  addBhoomiProperty: (prop: Omit<BhoomiProperty, 'id'>) => boolean;
  updateBhoomiProperty: (id: string, updates: Partial<BhoomiProperty>) => void;
  deleteBhoomiProperty: (id: string) => void;
  addRentReceipt: (receipt: Omit<BhoomiRentReceipt, 'id'>) => boolean;

  // Phase 20: Vahan (Fleet) mutators
  addFleetVehicle: (vehicle: Omit<FleetVehicle, 'id'>) => boolean;
  updateFleetVehicle: (id: string, updates: Partial<FleetVehicle>) => void;
  deleteFleetVehicle: (id: string) => void;
  addFuelLog: (log: Omit<FleetFuelLog, 'id'>) => boolean;
  addServiceRecord: (record: Omit<FleetServiceRecord, 'id'>) => boolean;

  // Recurring Seva Subscriptions
  sevaSubscriptions: SevaSubscription[];
  addSevaSubscription: (sub: Omit<SevaSubscription, 'id' | 'totalCollected' | 'paymentsCount'> & { silent?: boolean }) => boolean;
  updateSevaSubscription: (id: string, updates: Partial<SevaSubscription>) => void;
  recordSubscriptionPayment: (subId: string, amount: number, date: string, mode: string) => boolean;

  // Demo Playground Conversion Engine
  demoUpsellModule: DemoUpsell | null;
  closeDemoUpsell: () => void;
  getDemoStats: () => { totalCreates: number; perModule: Record<string, number> };
  resetDemoWorkspace: () => void;
  convertDemoToReal: (demoWorkspaceId: string, newWorkspaceId: string) => number;

  // Multi-branch (v1) — invisible for single-organisation workspaces.
  // activeBranchId is 'ALL' (consolidated) or a branch id; branches is the
  // workspace's configured locations ([] for single-org).
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  branches: BranchInfo[];
  isMultiBranch: boolean;
  mainBranchId: string | undefined;
  /** Filter any branch-scoped records to one branch ('ALL' = no filtering). */
  recordsForBranch: <T extends { branchId?: string }>(records: T[], branch: string) => T[];
  /** How many scoped records reference a branch (guards branch deletion). */
  getBranchRecordCount: (branchId: string) => number;
  /**
   * Per-branch RBAC (v2). null = unrestricted (sees every branch);
   * otherwise the branch ids this member may access. Enforced in
   * matchesActiveBranch/recordsForBranch — not just the UI.
   */
  myBranchIds: string[] | null;
  /** True when the current member may view a branch's records. */
  isBranchAccessible: (branchId: string | undefined) => boolean;
}
