export type WorkspaceType =
  | 'Mandir' | 'Goshala' | 'Sangha' | 'Ashram' | 'Gurukul'
  | 'Satsang' | 'Yoga' | 'Trust' | 'Vidyalaya' | 'Purohit'
  | 'Tirth' | 'Samaj' | 'AkshayaPatra' | 'KashiKshetra'
  | 'DharmadaTrust' | 'MahotsavSamiti' | 'PurohitSabha';

export type UserRole = 'SuperAdmin' | 'Trustee' | 'Priest' | 'Accountant' | 'Sevadar' | 'Devotee' | 'CSO';

export type LegacyUserRole =
  | 'SUPER_ADMIN'
  | 'TRUSTEE'
  | 'ACCOUNTANT'
  | 'PUROHIT'
  | 'VOLUNTEER'
  | 'DEVOTEE'
  | 'MANAGER'
  | 'CSO'
  | 'ANONYMOUS';

export type SubscriptionTier = 'LITE' | 'STANDARD' | 'ENTERPRISE';

export const ROLE_MIGRATION_MAP: Record<string, UserRole> = {
  admin: 'SuperAdmin',
  ADMIN: 'SuperAdmin',
  superadmin: 'SuperAdmin',
  SUPER_ADMIN: 'SuperAdmin',
  SuperAdmin: 'SuperAdmin',
  head_admin: 'SuperAdmin',
  master_admin: 'SuperAdmin',
  trustee: 'Trustee',
  TRUSTEE: 'Trustee',
  Trustee: 'Trustee',
  accountant: 'Accountant',
  ACCOUNTANT: 'Accountant',
  Accountant: 'Accountant',
  purohit: 'Priest',
  PUROHIT: 'Priest',
  Priest: 'Priest',
  priest: 'Priest',
  cso: 'CSO',
  CSO: 'CSO',
  'chief security officer': 'CSO',
  'Chief Security Officer': 'CSO',
  volunteer: 'Sevadar',
  VOLUNTEER: 'Sevadar',
  sevadar: 'Sevadar',
  Sevadar: 'Sevadar',
  manager: 'Sevadar',
  MANAGER: 'Sevadar',
  devotee: 'Devotee',
  DEVOTEE: 'Devotee',
  Devotee: 'Devotee',
  anonymous: 'Devotee',
  ANONYMOUS: 'Devotee',
};

export type AppLanguage = 'en' | 'bn' | 'hi' | 'sa';

export type SevaTier = 'Ratna' | 'Vishesh' | 'Karmi' | 'Sadharan';

/**
 * Normalizes a stored seva tier. 'Kormi' was a pre-2026-10-13 spelling of
 * 'Karmi' — legacy records are mapped forward so old data keeps working.
 */
export const normalizeSevaTier = (tier: string | undefined | null): SevaTier => {
  if (tier === 'Kormi') return 'Karmi';
  if (tier === 'Ratna' || tier === 'Vishesh' || tier === 'Karmi' || tier === 'Sadharan') return tier;
  return 'Sadharan';
};

export interface TenantScoped {
  workspaceId: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export interface Workspace extends TenantScoped {
  id: string;
  name: string;
  type: WorkspaceType;
  tagline: string;
  address: string;
  tier: SubscriptionTier;
  enabledDesks: string[];
  city: string;
  state: string;
  country: string;
  currency: string;
  currencySymbol: string;
  phone?: string;
  sponsorPhone?: string;
  email?: string;
  sampradaya: string;
  kuladevata: string;
  logoUrl?: string;
  bannerUrl?: string;
  taxExemptionNumber?: string;
  enabledModules?: string[];
  trustRegNumber?: string;
  // H-1: 80G registration gate — receipts must never be issued with a
  // fabricated URN. Real receipts require trust80GRegistered=true + the
  // workspace's genuine URN from the Income Tax portal.
  trust80GRegistered?: boolean;
  trust80GURN?: string;
  trust80GRegNo?: string;
  // P2: statutory compliance checklist — 12A registration + trust PAN.
  trust12ARegistered?: boolean;
  trust12ANumber?: string;
  trustPAN?: string;
  pinRequired: boolean;
  adminPin: string;
  superAdmins?: string[];
  bloodGroup?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  idCardValidThru?: string;
  idCardIssuedOn?: string;
  gotra?: string;
  planId?: string;
}

export interface WorkspaceConfig extends Partial<TenantScoped> {
  id: string;
  name: string;
  type: WorkspaceType;
  tagline: string;
  address: string;
  tier?: SubscriptionTier;
  enabledDesks?: string[];
  city: string;
  state: string;
  country: string;
  currency: string;
  currencySymbol: string;
  phone?: string;
  sponsorPhone?: string;
  email?: string;
  sampradaya: string;
  kuladevata: string;
  logoUrl?: string;
  bannerUrl?: string;
  taxExemptionNumber?: string;
  enabledModules?: string[];
  trustRegNumber?: string;
  // H-1: 80G registration gate (see Workspace above).
  trust80GRegistered?: boolean;
  trust80GURN?: string;
  trust80GRegNo?: string;
  // P2: statutory compliance checklist (see Workspace above).
  trust12ARegistered?: boolean;
  trust12ANumber?: string;
  trustPAN?: string;
  // H-11: uid of the Firebase user who provisioned this workspace.
  // The creator is the workspace's administrator; recorded at registration
  // (a rules-allowed field) so re-logins resolve back to Trustee.
  createdBy?: string;
  pinRequired: boolean;
  adminPin: string;
  superAdmins?: string[];
  bloodGroup?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  idCardValidThru?: string;
  idCardIssuedOn?: string;
  gotra?: string;
  /**
   * Monetization plan (C-6): 'DEMO' for sandbox workspaces, otherwise
   * 'LITE' | 'STANDARD' | 'ENTERPRISE' from PLAN_PRICING. Written at
   * workspace creation; usePlanGate defaults a missing value to 'LITE'.
   */
  planId?: string;
}

export interface AuditLog extends TenantScoped {
  id: string;
  actorId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  collectionName: string;
  documentId: string;
  changes: Record<string, any>;
  ipAddress: string;
  actorEmail?: string;
  actorRole?: UserRole | string;
  timestamp?: number | string;
}

export interface PanchayatPoll extends TenantScoped {
  id: string;
  title: string;
  description: string;
  options: string[];
  status: 'OPEN' | 'CLOSED';
  createdBy: string;
  resolutionNumber?: string;
  votesCount?: Record<string, number>;
  deadline?: number;
  quorumRequired?: number;
}

export interface PollVote extends TenantScoped {
  id: string;
  pollId: string;
  userId: string;
  selectedOption: string;
  votedAt: number;
}

export interface CrisisEvent extends TenantScoped {
  id: string;
  type: 'MEDICAL' | 'CROWD_SURGE' | 'LOST_CHILD' | 'FIRE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  location: string;
  status: 'ACTIVE' | 'RESOLVED';
  reportedBy: string;
  notes?: string;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface IngestedDevoteeRow {
  fullName?: string;
  name?: string;
  phone?: string;
  sponsorPhone?: string;
  gotra: string;
  sevaTier?: SevaTier;
  address?: string;
  pin?: string;
  email?: string;
  activeStatus?: 'Active' | 'Inactive' | 'Patron';
}

export interface PanchangDetails {
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  vaara: string;
  rahuKaal: string;
  abhijitMuhurat: string;
  samvat: string;
  shaka: string;
  masa: string;
  ritu?: string;
}

export interface DevoteeMember extends TenantScoped {
  id: string;
  userId?: string;
  fullName?: string;
  name?: string;
  spiritualName?: string;
  phone?: string;
  sponsorPhone?: string;
  email?: string;
  /**
   * C-7: DEPRECATED — plaintext PIN is never written to storage anymore.
   * Kept optional for (a) the one-time in-memory reveal after regeneration and
   * (b) reading legacy records until the AppInitializer migration clears them.
   * Verification must use pinHash/pinSalt via src/utils/pinCrypto.ts.
   */
  pin?: string;
  /** PBKDF2-SHA256 hash of `pin` (100k iterations) — preferred for verification. */
  pinSalt?: string;
  /** Hex-encoded PBKDF2 output; see src/utils/pinCrypto.ts. */
  pinHash?: string;
  /** C-7: revocation sentinel. Plaintext `pin` is never written to storage;
      revoked credentials are marked here and the hash/salt are cleared. */
  pinRevoked?: boolean;
  role: UserRole | LegacyUserRole | string;
  sevaIndex: number;
  sevaTier: SevaTier;
  gotra: string;
  pravara?: string;
  varnaKul?: string;
  kuladevata?: string;
  culturalDistinction?: string;
  familyId?: string;
  isHeadOfFamily?: boolean;
  avatarUrl?: string;
  photoUrl?: string;
  address: string;
  bloodGroup?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  idCardValidThru?: string;
  idCardIssuedOn?: string;
  panNumber?: string;
  birthDate?: string;
  anniversaryDate?: string;
  dikshaGuru?: string;
  dikshaDate?: string;
  activeStatus: 'Active' | 'Inactive' | 'Patron';
  totalDonated: number;
  volunteerHours: number;
  qrCodeRef: string;
  qrSecretVaultToken?: string;
  isQrPublic?: boolean;
  joinedDate: string;
}

export type Devotee = DevoteeMember;

export interface FamilyHousehold extends TenantScoped {
  id: string;
  familyName: string;
  kartaDevoteeId: string;
  kartaId?: string;
  gotra: string;
  kuladevata: string;
  residenceAddress: string;
  contactPhone?: string;
  devoteePhone?: string;
  shradhLocation?: string;
  nextScheduledReminder?: string;
  memberIds: string[];
  totalFamilyDonations: number;
  lastChandaDate?: string;
  notes?: string;
  photoUrl?: string;
}

export type Household = FamilyHousehold;

export interface VanshavaliNode {
  id: string;
  name: string;
  generation: number;
  gotra: string;
  birthYear?: string;
  deathYear?: string;
  relation: string;
  spouse?: string;
  location?: string;
  notes?: string;
  photoUrl?: string;
  children?: VanshavaliNode[];
}

export interface GuestRecord extends TenantScoped {
  id: string;
  name: string;
  phone?: string;
  sponsorPhone?: string;
  city: string;
  gotra?: string;
  purpose: 'Darshan' | 'Pooja Inquiry' | 'Volunteer' | 'Guest' | 'Sponsorship' | string;
  visitDate: string;
  referredBy?: string;
  status: 'Lead' | 'Follow-Up' | 'Promoted' | 'Visited' | string;
  assignedSevadar?: string;
  notes?: string;
  photoUrl?: string;
}

export interface TreasuryTransaction extends TenantScoped {
  id: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  subcategory?: string;
  eventName?: string;
  amount: number;
  handledBy: string;
  vendorName?: string;
  devoteeId?: string;
  devoteeName?: string;
  devoteePan?: string;
  paymentMode: 'UPI / QR' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card' | string;
  referenceNo?: string;
  memoImageUrl?: string;
  purpose: string;
  is80GEligible?: boolean;
  taxReceiptIssued?: boolean;
  taxReceiptNumber?: string;
  auditVerified: boolean;
  isRecurring?: boolean;
  recurringInterval?: 'Monthly' | 'Annually';
}

export type TreasuryLedger = TreasuryTransaction;
export type TreasuryLedgerRecord = TreasuryTransaction;

export interface DonationRecord extends TenantScoped {
  id: string;
  donorId?: string;
  devoteeId?: string;
  devoteeName?: string;
  donorName?: string;
  amount: number;
  purpose: string;
  category: string;
  paymentMode: 'UPI / QR' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card' | string;
  status: 'pledged' | 'completed' | 'failed' | 'pending';
  receiptNumber?: string;
  is80GEligible?: boolean;
  date: string;
}

export type Donation = DonationRecord;

export interface TaxReceipt extends TenantScoped {
  id: string;
  receiptNumber: string;
  donorId?: string;
  devoteeId?: string;
  donorName: string;
  panNumber?: string;
  donorAddress?: string;
  donorPhone?: string;
  donorEmail?: string;
  amount: number;
  amountInWords?: string;
  paymentMode: string;
  transactionRef?: string;
  financialYear: string;
  exemptionSection: '80G' | '10(23C)' | '12A' | string;
  trustRegNumber?: string;
  issuedAt: number;
  issuedBy: string;
  pdfUrl?: string;
  status: 'ISSUED' | 'CANCELLED';
}

export interface AssetRecord extends TenantScoped {
  id: string;
  name: string;
  category:
    | 'Land & Building'
    | 'Deity Ornaments & Gold'
    | 'Vahan / Vehicle'
    | 'Electronics'
    | 'Utensils & Furniture'
    | 'Sacred Relics'
    | 'Utensils & Bhandara'
    | 'Other'
    | string;
  valuation: number;
  acquisitionDate: string;
  condition:
    | 'Pristine'
    | 'Good'
    | 'Needs Restoration'
    | 'Under Maintenance'
    | 'Retired'
    | 'Needs Repair'
    | string;
  custodian: string;
  location: string;
  donorName?: string;
  notes?: string;
  photoUrl?: string;
  imageCompressed?: string;
}

export type Asset = AssetRecord;
export type FixedAsset = AssetRecord;

// ============================================
// PHASE 20: BHOOMI (Real Estate & Leases)
// ============================================

export interface BhoomiProperty extends TenantScoped {
  id: string;
  name: string;
  propertyType:
    | 'Commercial Shop'
    | 'Office Space'
    | 'Community Hall'
    | 'Agricultural Land'
    | 'Residential Flat'
    | 'Warehouse'
    | string;
  address: string;
  areaSqFt?: number;
  monthlyRent: number;
  depositAmount?: number;
  tenantName?: string;
  tenantPhone?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  escalationPercent?: number;
  status: 'Occupied' | 'Vacant' | 'Under Maintenance' | string;
  documentRef?: string;
  notes?: string;
}

export interface BhoomiRentReceipt extends TenantScoped {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  rentMonth: string; // YYYY-MM
  amount: number;
  paidDate: string;
  paymentMode: 'UPI / QR' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card' | string;
  receiptNo: string;
  collectedBy: string;
  notes?: string;
}

// ============================================
// PHASE 20: VAHAN (Fleet & Transport)
// ============================================

export interface FleetVehicle extends TenantScoped {
  id: string;
  registrationNo: string; // unique
  vehicleType: 'Yatra Bus' | 'Tractor' | 'Truck' | 'Van' | 'Car' | 'Ambulance' | string;
  makeModel: string;
  yearOfMfg?: number;
  fuelType: 'Diesel' | 'Petrol' | 'CNG' | 'Electric' | string;
  odometerKm: number;
  rtoExpiryDate: string;
  insuranceExpiryDate: string;
  pucExpiryDate: string;
  fitnessExpiryDate?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'Active' | 'In Service' | 'Retired' | string;
  notes?: string;
}

export interface FleetFuelLog extends TenantScoped {
  id: string;
  vehicleId: string;
  registrationNo: string;
  logDate: string;
  odometerKm: number;
  litersFilled: number;
  costPerLiter: number;
  totalCost: number;
  fuelStation?: string;
  loggedBy: string;
}

export interface FleetServiceRecord extends TenantScoped {
  id: string;
  vehicleId: string;
  registrationNo: string;
  serviceDate: string;
  serviceType: 'Routine Service' | 'Repair' | 'Tyre Replacement' | 'Insurance Renewal' | 'RTO Renewal' | string;
  cost: number;
  vendorName?: string;
  odometerKm?: number;
  nextDueDate?: string;
  notes?: string;
}

export interface InventoryItem extends TenantScoped {
  id: string;
  itemName: string;
  category:
    | 'Ghee & Oils'
    | 'Camphor & Dhoop'
    | 'Rice & Grains'
    | 'Prasad Supplies'
    | 'Books & Stationery'
    | 'Medical / Fodder'
    | 'Spices & Dry Fruits'
    | 'General Stores'
    | string;
  currentStock: number;
  unit: 'kg' | 'liters' | 'packets' | 'boxes' | 'pieces' | 'quintals' | string;
  minReorderLevel: number;
  costPerUnit: number;
  lastRestockedDate: string;
  supplierName: string;
}

export interface PoojaBooking extends TenantScoped {
  id: string;
  devoteeId?: string;
  userId?: string;
  devoteeName: string;
  phone?: string;
  poojaName: string;
  tithiDate?: string;
  bookingDate?: string;
  timeSlot: string;
  gotra: string;
  nakshatra?: string;
  rashi?: string;
  sankalpDescription?: string;
  sankalpText?: string;
  sankalpaIntention?: string;
  purohitAssigned?: string;
  assignedPurohit?: string;
  priestAssigned?: string;
  liveStreamUrl?: string;
  liveStreamRequested?: boolean;
  dakshinaAmount: number;
  status: 'Confirmed' | 'Completed' | 'Standby' | 'Cancelled' | string;
  paymentStatus: 'Paid' | 'Pending' | string;
  receiptRef: string;
  bookingType?: 'Individual' | 'Organization';
  organizationName?: string;
  cancellationReason?: string;
}

export type PujaBooking = PoojaBooking;
export type PoojaBookingRecord = PoojaBooking;

export interface ResidentPujaSchedule extends Partial<TenantScoped> {
  id: string;
  ritualName?: string;
  pujaName?: string;
  time?: string;
  timings?: string;
  priestName?: string;
  leadPurohit?: string;
  deity?: string;
  samagriList?: string[];
  isOpenForPublic?: boolean;
  darshanStatus?: string;
  dressCode?: string;
  dailyAttendanceAvg?: number;
}

export interface PurohitProfile extends Partial<TenantScoped> {
  id: string;
  fullName?: string;
  name?: string;
  vidwatTitle?: string;
  vedicQualification?: string;
  specializations: string[];
  sampradaya?: string;
  vedicBranch?: 'Rigveda' | 'Yajurveda' | 'Samaveda' | 'Atharvaveda' | 'Smartha' | 'Tantrik';
  city: string;
  gotra?: string;
  phone?: string;
  sponsorPhone?: string;
  email?: string;
  languages: string[];
  experienceYears: number;
  rating: number;
  reviewCount?: number;
  isKycVerified?: boolean;
  verifiedByMandirTrust?: boolean;
  availability?: 'Available' | 'On Call' | 'Traveling';
  dakshinaRange?: string;
  suggestedDakshina?: number;
}

export interface PitruRecord extends TenantScoped {
  id: string;
  devoteeId?: string;
  devoteeName: string;
  ancestorName: string;
  relationship?: string;
  relation?: string;
  tithiLunar?: string;
  tithiOfDemise?: string;
  nakshatra?: string;
  paksha?: 'Shukla' | 'Krishna';
  deathGregorianDate?: string;
  gotra: string;
  annualShradhAlert?: boolean;
  pindaDaanBooked?: boolean;
  lastShradhPerformed?: string;
  contactPhone?: string;
  devoteePhone?: string;
  shradhLocation?: string;
  nextScheduledReminder?: string;
}

export interface GoshalaCowRecord extends TenantScoped {
  id: string;
  cowTagId?: string;
  tagNumber?: string;
  name: string;
  breed:
    | 'Gir'
    | 'Sahiwal'
    | 'Tharparkar'
    | 'Rathi'
    | 'Kankrej'
    | 'Red Sindhi'
    | 'Desi Indigenous'
    | string;
  gender:
    | 'Gomata'
    | 'Nandi'
    | 'Calf (Female)'
    | 'Calf (Male)'
    | 'Gau Mata (Cow)'
    | 'Nandi (Bull)'
    | 'Vatsa (Calf)'
    | string;
  dateOfBirth?: string;
  ageYears?: number;
  healthStatus:
    | 'Excellent'
    | 'Under Treatment'
    | 'Pregnant'
    | 'Lactating'
    | 'Retired'
    | 'Healthy'
    | 'Under Veterinary Care'
    | 'Critical'
    | string;
  lactationStage?: 'Lactating' | 'Dry' | 'Pregnant' | 'Calf' | string;
  dailyMilkYieldLiters?: number;
  dailyMilkLiters?: number;
  adoptedByDevotee?: string;
  adoptionSponsor?: string;
  sponsorGotra?: string;
  sponsorPhone?: string;
  monthlyAdoptionFee?: number;
  monthlyCareCost?: number;
  adoptionStartDate?: string;
  lastVetCheckup?: string;
  monthlyFodderCost?: number;
  notes?: string;
  photoUrl?: string;
}

export type CowRecord = GoshalaCowRecord;
export type GaushalaCattle = GoshalaCowRecord;

export interface AnnadanamSponsorship extends TenantScoped {
  id: string;
  sponsorName: string;
  gotra?: string;
  phone?: string;
  sponsorPhone?: string;
  occasion: string;
  date: string;
  mealType:
    | 'Mahaprasad Lunch'
    | 'Bhandara Dinner'
    | 'Morning Bal Bhog'
    | 'Mahaprasad Lunch Bhandara'
    | 'Morning Kheer & Puri Prasad';
  devoteeCountProjected: number;
  contributionAmount: number;
  specialSankalp?: string;
  status?: string;
}

export interface AshramKutirRoom extends TenantScoped {
  id: string;
  roomNumber: string;
  roomType: 'Sadhana Kutir' | 'Dharamshala Deluxe' | 'Family Suite' | 'Dormitory Bed';
  capacity: number;
  isOccupied: boolean;
  currentGuestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  suggestedDonationPerDay: number;
  cleaningStatus: 'Ready' | 'Needs Cleaning' | 'Maintenance';
}

export type DharamshalaRoom = AshramKutirRoom;

export interface GurukulStudent extends TenantScoped {
  id: string;
  studentName: string;
  rollNo: string;
  courseLevel:
    | 'Prathama (Grammar)'
    | 'Madhyama (Shastras)'
    | 'Shastri (Philosophy)'
    | 'Acharya (Vedanta)';
  sandhyaVandanaRegularity: number;
  shlokaRecitationScore: number;
  guardianName: string;
  guardianPhone: string;
  dateOfUpanayanam?: string;
  attendancePct: number;
}

export interface CampaignCrowdfund extends TenantScoped {
  id: string;
  title: string;
  bannerUrl?: string;
  description?: string;
  category:
    | 'Mandir Nirman'
    | 'Murti Pran Pratishtha'
    | 'Goshala Expansion'
    | 'Annakshetra Fund'
    | 'Festival Mahotsav'
    | 'Eco Mandir / Solar'
    | 'Gau Seva / Healthcare';
  targetAmount: number;
  collectedAmount: number;
  startDate?: string;
  endDate?: string;
  donorsCount: number;
  status: 'Active' | 'Completed' | 'Upcoming';
  topDonors: { name: string; amount: number; city: string }[];
}

export interface MatrimonyProfile extends Partial<TenantScoped> {
  id: string;
  fullName?: string;
  name?: string;
  gender: 'Male' | 'Female';
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  gotra: string;
  nakshatra: string;
  rashi: string;
  manglikStatus: 'Manglik' | 'Non-Manglik' | 'Anshik Manglik';
  education: string;
  profession: string;
  location: string;
  familyBackground: string;
  contactFamilyPerson: string;
  contactPhone?: string;
  devoteePhone?: string;
  shradhLocation?: string;
  nextScheduledReminder?: string;
  verified: boolean;
  photoMasked: boolean;
}

export interface PanjikaFestival {
  id: string;
  festivalName: string;
  festivalNameHi: string;
  festivalNameBn: string;
  dateGregorian: string;
  tithi: string;
  nakshatra: string;
  rituals: string;
  significance: string;
  fastingRecommended: boolean;
  auspiciousMuhurat: string;
}

export interface ShlokaCardItem extends Partial<TenantScoped> {
  id: string;
  sanskrit: string;
  transliteration: string;
  source: string;
  englishMeaning: string;
  hindiMeaning: string;
  bengaliMeaning: string;
  audioUrl?: string;
  category: 'Karma Yoga' | 'Bhakti' | 'Jnana' | 'Dharma' | 'Peace & Harmony';
}

export interface TrusteeResolution extends TenantScoped {
  id: string;
  resolutionNumber: string;
  date: string;
  title: string;
  bannerUrl?: string;
  description?: string;
  proposedBy: string;
  secondedBy: string;
  votesInFavor: number;
  votesAgainst: number;
  status: 'Passed' | 'Pending Review' | 'Deferred' | 'Rejected';
  quorumMet: boolean;
  details: string;
  expiresAt?: number;
}

export interface SevadarDutyShift extends TenantScoped {
  id: string;
  sevadarName: string;
  phone?: string;
  sponsorPhone?: string;
  role:
    | 'Crowd Control'
    | 'Prasad Distribution'
    | 'Shoe Counter'
    | 'VIP Escort'
    | 'Sanitation'
    | 'Kitchen Seva';
  date: string;
  shiftTiming:
    | 'Morning (05:00 - 11:00)'
    | 'Afternoon (11:00 - 17:00)'
    | 'Evening (17:00 - 22:00)'
    | 'Night Vigil';
  attended: boolean;
}

export interface TelemetryEventLog {
  id: string;
  timestamp: string;
  event: string;
  payload: Record<string, any>;
}

export interface ConsentRecord extends TenantScoped {
  id: string;
  devoteeId: string;
  purpose: string[];
  grantedAt: string;
  expiresAt?: string;
  withdrawnAt?: string;
  version: string;
}

// Recurring Seva Subscriptions — Nitya Seva / standing donor mandates (Phase 21)
export interface SevaSubscription extends TenantScoped {
  id: string;
  devoteeId?: string;
  devoteeName: string;
  devoteePhone?: string;
  planName: 'Nitya Annadanam' | 'Gau Seva Monthly' | 'Deep Seva' | 'Nitya Pushpanjali' | 'Custom' | string;
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Annually';
  startDate: string;
  nextDueDate: string;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Completed';
  totalCollected: number;
  paymentsCount: number;
  paymentMode: 'UPI / QR' | 'Cash' | 'Bank Transfer' | 'Cheque' | 'Card' | string;
  notes?: string;
  isSample?: boolean;
}

// B2C & Ecosystem Types (Phase 9)
export * from './types/b2c';

