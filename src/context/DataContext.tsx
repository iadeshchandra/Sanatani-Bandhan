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
  BhoomiProperty,
  BhoomiRentReceipt,
  FleetVehicle,
  FleetFuelLog,
  FleetServiceRecord,
  SevaSubscription,
} from '../types';
import { trackTreasuryPurchase, trackSignUp, trackGenerateLead } from '../utils/gtm';
import { nextReceiptSeq, formatReceiptNumber } from '../utils/receiptNumbers';
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


// Master Initial Datasets
export const INITIAL_DEVOTEES: DevoteeMember[] = [
  {
    id: 'dev-101',
    workspaceId: 'ws-mandir',
    fullName: 'Sri Rameshwar Shastri',
    spiritualName: 'Ramesh Das',
    phone: '+91 98765 11223',
    email: 'rameshwar.shastri@gmail.com',
    pin: '1081',
    role: 'MANAGER',
    sevaIndex: 920,
    sevaTier: 'Ratna',
    gotra: 'Shandilya',
    pravara: 'Shandilya, Asita, Devala',
    varnaKul: 'Rigvedic Brahmin',
    address: 'Near Dasaswamedh Ghat, Varanasi',
    birthDate: '1975-08-15',
    activeStatus: 'Active',
    totalDonated: 150000,
    volunteerHours: 340,
    qrCodeRef: 'QR-SB-DEV101',
    joinedDate: '2021-03-10',
  },
  {
    id: 'dev-102',
    workspaceId: 'ws-mandir',
    fullName: 'Smt. Gayatri Devi Sharma',
    spiritualName: 'Gayatri Seva Dasi',
    phone: '+91 98220 33445',
    email: 'gayatrisharma@yahoo.com',
    pin: '2108',
    role: 'DEVOTEE',
    sevaIndex: 780,
    sevaTier: 'Vishesh',
    gotra: 'Kashyapa',
    pravara: 'Kashyapa, Avatsara, Naidhruva',
    varnaKul: 'Saraswat',
    address: 'Chowk, Varanasi',
    birthDate: '1982-11-04',
    activeStatus: 'Active',
    totalDonated: 65000,
    volunteerHours: 190,
    qrCodeRef: 'QR-SB-DEV102',
    joinedDate: '2022-01-20',
  },
  {
    id: 'dev-103',
    workspaceId: 'ws-mandir',
    fullName: 'Sri Vikramaditya Rathore',
    phone: '+91 94140 77889',
    email: 'rathore.vikram@gmail.com',
    pin: '3344',
    role: 'SUPER_ADMIN',
    sevaIndex: 850,
    sevaTier: 'Ratna',
    gotra: 'Vatsa',
    pravara: 'Bhargava, Chyavana, Apnavana, Aurva, Jamadagnya',
    varnaKul: 'Kshatriya Solar',
    address: 'Durga Kund Road, Varanasi',
    birthDate: '1968-04-12',
    activeStatus: 'Active',
    totalDonated: 500000,
    volunteerHours: 420,
    qrCodeRef: 'QR-SB-DEV103',
    joinedDate: '2020-05-15',
  },
  {
    id: 'dev-104',
    workspaceId: 'ws-goshala',
    fullName: 'Pt. Hariprasad Dwivedi',
    phone: '+91 98110 55667',
    email: 'hari.dwivedi@vrindavan.org',
    pin: '1008',
    role: 'SUPER_ADMIN',
    sevaIndex: 940,
    sevaTier: 'Ratna',
    gotra: 'Bharadwaja',
    varnaKul: 'Kanyakubja Brahmin',
    address: 'Parikrama Marg, Raman Reti, Vrindavan',
    activeStatus: 'Active',
    totalDonated: 240000,
    volunteerHours: 500,
    qrCodeRef: 'QR-SB-DEV104',
    joinedDate: '2021-08-10',
  },
  {
    id: 'dev-105',
    workspaceId: 'ws-gurukul',
    fullName: 'Acharya Vidyadhar Shukla',
    phone: '+91 94066 33221',
    email: 'acharyas@sandipanigurukul.edu.in',
    pin: '1008',
    role: 'SUPER_ADMIN',
    sevaIndex: 990,
    sevaTier: 'Ratna',
    gotra: 'Gautama',
    varnaKul: 'Madhyandina Shukla Yajurveda',
    address: 'Narmada Ghat Road, Ujjain',
    activeStatus: 'Active',
    totalDonated: 180000,
    volunteerHours: 600,
    qrCodeRef: 'QR-SB-DEV105',
    joinedDate: '2020-01-01',
  }
];

export const INITIAL_FAMILIES: FamilyHousehold[] = [
  {
    id: 'fam-01',
    workspaceId: 'ws-mandir',
    familyName: 'Shastri Parivar (Kashi)',
    kartaDevoteeId: 'dev-101',
    gotra: 'Shandilya',
    kuladevata: 'Kashi Vishwanath & Annapurna Devi',
    residenceAddress: 'B-14/88 Dasaswamedh, Varanasi',
    contactPhone: '+91 98765 11223',
    memberIds: ['dev-101', 'dev-102'],
    totalFamilyDonations: 215000,
    lastChandaDate: '2026-08-15',
    notes: 'Long-standing patron family supporting Nitya Annadanam and Veda Pathashala.',
  },
  {
    id: 'fam-02',
    workspaceId: 'ws-mandir',
    familyName: 'Rathore Royal Trust Family',
    kartaDevoteeId: 'dev-103',
    gotra: 'Vatsa',
    kuladevata: 'Maa Chamunda & Surya Bhagwan',
    residenceAddress: 'Durga Kund Manor, Varanasi',
    contactPhone: '+91 94140 77889',
    memberIds: ['dev-103'],
    totalFamilyDonations: 500000,
    lastChandaDate: '2026-08-01',
    notes: 'Sanatan heritage patron. Sponsored gold Kalash for temple shikhar.',
  },
];

export const INITIAL_VANSHAVALI: VanshavaliNode = {
  id: 'node-root-01',
  name: 'Maharshi Shandilya Gotra Parivar (Adi Purusha: Pt. Bholanath Shastri)',
  generation: 1,
  gotra: 'Shandilya',
  birthYear: '1880',
  deathYear: '1952',
  relation: 'Progenitor / Mula Purusha',
  spouse: 'Mata Saraswati Devi (1888-1960)',
  location: 'Varanasi Kshetra',
  notes: 'Revered Pandit of Kashi Sanskrit Mahavidyalaya and Rigvedic Scholar.',
  children: [
    {
      id: 'node-gen2-01',
      name: 'Pt. Dinabandhu Shastri',
      generation: 2,
      gotra: 'Shandilya',
      birthYear: '1912',
      deathYear: '1984',
      relation: 'Eldest Son',
      spouse: 'Mata Janaki Devi',
      location: 'Varanasi',
      notes: 'Astrologer to Kashi Naresh & Trustee of Annapurna Mandir.',
      children: [
        {
          id: 'node-gen3-01',
          name: 'Pt. Loknath Shastri',
          generation: 3,
          gotra: 'Shandilya',
          birthYear: '1945',
          relation: 'Son',
          spouse: 'Smt. Shanti Devi',
          location: 'Varanasi',
          children: [
            {
              id: 'node-gen4-01',
              name: 'Sri Rameshwar Shastri (Karta)',
              generation: 4,
              gotra: 'Shandilya',
              birthYear: '1975',
              relation: 'Current Karta (Registered Devotee #101)',
              spouse: 'Smt. Gayatri Devi',
              location: 'Varanasi',
              children: [
                {
                  id: 'node-gen5-01',
                  name: 'Batuk Raghav Shastri',
                  generation: 5,
                  gotra: 'Shandilya',
                  birthYear: '2008',
                  relation: 'Son (Gurukul Veda Vidyarthi)',
                  location: 'Sandipani Gurukul, Ujjain',
                },
                {
                  id: 'node-gen5-02',
                  name: 'Kumari Ananya Shastri',
                  generation: 5,
                  gotra: 'Shandilya',
                  birthYear: '2012',
                  relation: 'Daughter',
                  location: 'Varanasi',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'node-gen2-02',
      name: 'Pt. Kedarnath Shastri',
      generation: 2,
      gotra: 'Shandilya',
      birthYear: '1918',
      deathYear: '1995',
      relation: 'Second Son',
      spouse: 'Mata Parvati Devi',
      location: 'Prayagraj',
      notes: 'Sanskrit Grammar Scholar at Allahabad University.',
      children: [
        {
          id: 'node-gen3-02',
          name: 'Dr. Anand Shastri',
          generation: 3,
          gotra: 'Shandilya',
          birthYear: '1952',
          relation: 'Son',
          location: 'Prayagraj / Delhi',
        },
      ],
    },
  ],
};

export const INITIAL_GUESTS: GuestRecord[] = [
  {
    id: 'gst-01',
    workspaceId: 'ws-mandir',
    name: 'Smt. Sunita Singhania',
    phone: '+91 98110 44321',
    city: 'Kanpur',
    purpose: 'Pooja Inquiry',
    visitDate: '2026-08-24',
    referredBy: 'Pt. Loknath Shastri',
    status: 'Lead',
    assignedSevadar: 'Sri Subhash Banerjee',
    notes: 'Inquired about Mahamrityunjaya Anushthan for family welfare.',
  },
  {
    id: 'gst-02',
    workspaceId: 'ws-mandir',
    name: 'Sri Alok Mukherjee',
    phone: '+91 94330 99887',
    city: 'Kolkata',
    purpose: 'Darshan',
    visitDate: '2026-08-23',
    status: 'Visited',
    notes: 'Interested in sponsoring Nitya Annadanam on Ekadashi.',
  },
];

export const INITIAL_TREASURY: TreasuryTransaction[] = [
  {
    id: 'tx-01',
    workspaceId: 'ws-mandir',
    date: '2026-08-24',
    type: 'Income',
    category: 'Pooja Dakshina',
    amount: 5100,
    handledBy: 'Acharya Devendra Shastri',
    devoteeName: 'Smt. Gayatri Devi Sharma',
    devoteeId: 'dev-102',
    paymentMode: 'UPI / QR',
    purpose: 'Maha Rudrabhishek with Bilva Patra Archana',
    is80GEligible: true,
    taxReceiptIssued: true,
    taxReceiptNumber: 'SB-80G-2026-0042',
    auditVerified: true,
  },
  {
    id: 'tx-02',
    workspaceId: 'ws-mandir',
    date: '2026-08-23',
    type: 'Income',
    category: 'Gau Seva Donation',
    amount: 11000,
    handledBy: 'Sri Vikramaditya Rathore',
    devoteeName: 'Sri Rajesh Agrawal',
    paymentMode: 'Bank Transfer (NEFT)',
    purpose: 'Monthly Goshala Green Fodder & Vet Care Sponsorship',
    is80GEligible: true,
    taxReceiptIssued: true,
    taxReceiptNumber: 'SB-80G-2026-0043',
    auditVerified: true,
  },
  {
    id: 'tx-03',
    workspaceId: 'ws-mandir',
    date: '2026-08-22',
    type: 'Expense',
    category: 'Annadanam Provisions',
    amount: 28500,
    handledBy: 'Kitchen Supervisor (Sri Ram Das)',
    vendorName: 'Kashi Desi Ghee & Grain Bhandar',
    paymentMode: 'Bank Transfer (NEFT)',
    purpose: 'Pure Desi Bilona Ghee, Basmati Rice & Moong Dal for Bhandara',
    auditVerified: true,
  },
  {
    id: 'tx-04',
    workspaceId: 'ws-mandir',
    date: '2026-08-20',
    type: 'Income',
    category: 'Mandir Nirman / Crowdfund',
    amount: 100000,
    handledBy: 'Trustee Board Desk',
    devoteeName: 'Sri Vikramaditya Rathore',
    devoteeId: 'dev-103',
    paymentMode: 'Cheque (Clear)',
    purpose: 'Vedic Yajnashala Roof Renovation and Copper Chhatra',
    is80GEligible: true,
    taxReceiptIssued: true,
    taxReceiptNumber: 'SB-80G-2026-0044',
    auditVerified: true,
  },
  {
    id: 'tx-05',
    workspaceId: 'ws-mandir',
    date: '2026-08-18',
    type: 'Expense',
    category: 'Purohit Sambhavana',
    amount: 15000,
    handledBy: 'Mandir Secretary',
    vendorName: 'Rigveda Parayana Acharyas (5 Pandits)',
    paymentMode: 'Cash / Voucher',
    purpose: 'Shravana Somwar Vedic Chant and Archana Sambhavana',
    auditVerified: true,
  },
  {
    id: 'tx-06',
    workspaceId: 'ws-goshala',
    date: '2026-08-23',
    type: 'Income',
    category: 'Gau Seva Donation',
    amount: 25000,
    handledBy: 'Pt. Hariprasad Dwivedi',
    devoteeName: 'Brajbhumi Seva Mandal',
    paymentMode: 'UPI / QR',
    purpose: 'Green Grass and Mineral Feed for 50 Gir Cows',
    is80GEligible: true,
    taxReceiptIssued: true,
    taxReceiptNumber: 'SB-80G-2026-0045',
    auditVerified: true,
  }
];

export const INITIAL_ASSETS: AssetRecord[] = [
  {
    id: 'ast-01',
    workspaceId: 'ws-mandir',
    name: 'Ashtadhatu Sri Radha Krishna Vigrahas',
    category: 'Sacred Vigrahas & Deities',
    valuation: 2500000,
    acquisitionDate: '1998-05-10',
    condition: 'Pristine / Daily Seva',
    custodian: 'Head Priest (Mukhya Pujari)',
    location: 'Garbhagriha (Sanctum Sanctorum)',
    notes: 'Ancient Ashtadhatu Murtis sanctified with Prana Pratishtha rituals.',
  },
  {
    id: 'ast-02',
    workspaceId: 'ws-mandir',
    name: 'Solid Silver Yajnashala Havan Kunda (25 kg)',
    category: 'Pooja Implements (Silver/Gold)',
    valuation: 2100000,
    acquisitionDate: '2015-11-12',
    condition: 'Excellent',
    custodian: 'Trustee Board Secretary',
    location: 'Sacred Vault Room #1',
  },
  {
    id: 'ast-03',
    workspaceId: 'ws-mandir',
    name: 'JBL Commercial Mandir Sound System & Microphones',
    category: 'Electronics',
    valuation: 350000,
    acquisitionDate: '2023-01-10',
    condition: 'Good',
    custodian: 'Audio-Visual Sevadar',
    location: 'Main Prayer Hall',
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-01',
    workspaceId: 'ws-mandir',
    itemName: 'Pure Desi Vedic Cow Ghee (Bilona)',
    category: 'Ghee & Oils',
    currentStock: 85,
    unit: 'liters',
    minReorderLevel: 25,
    costPerUnit: 1200,
    lastRestockedDate: '2026-08-15',
    supplierName: 'Surabhi Goshala Gaudiya Trust',
  },
  {
    id: 'inv-02',
    workspaceId: 'ws-mandir',
    itemName: 'Bhimseni Pure Camphor (Karpuram)',
    category: 'Camphor & Dhoop',
    currentStock: 18,
    unit: 'kg',
    minReorderLevel: 10,
    costPerUnit: 950,
    lastRestockedDate: '2026-08-10',
    supplierName: 'Kashi Sugandhi Store',
  },
  {
    id: 'inv-03',
    workspaceId: 'ws-mandir',
    itemName: 'Basmati Rice for Mahaprasad',
    category: 'Rice & Grains',
    currentStock: 350,
    unit: 'kg',
    minReorderLevel: 100,
    costPerUnit: 85,
    lastRestockedDate: '2026-08-18',
    supplierName: 'Shri Ram Food Grain Mandi',
  },
  {
    id: 'inv-04',
    workspaceId: 'ws-mandir',
    itemName: 'Kesar (Pure Kashmir Saffron)',
    category: 'Prasad Supplies',
    currentStock: 450,
    unit: 'pieces',
    minReorderLevel: 100,
    costPerUnit: 250,
    lastRestockedDate: '2026-07-25',
    supplierName: 'Pampore Heritage Traders',
  },
];

export const INITIAL_POOJA_BOOKINGS: PoojaBooking[] = [
  {
    id: 'pb-01',
    workspaceId: 'ws-mandir',
    devoteeId: 'dev-102',
    devoteeName: 'Smt. Gayatri Devi Sharma',
    phone: '+91 98220 33445',
    poojaName: 'Maha Rudrabhishek & Bilva Patra Archanam',
    tithiDate: '2026-08-25',
    timeSlot: '07:30 AM - 09:00 AM',
    gotra: 'Kashyapa',
    nakshatra: 'Pushya',
    rashi: 'Karka',
    sankalpaIntention: 'Family Health, Spiritual Protection & Moksha Marg',
    assignedPurohit: 'Pt. Loknath Shastri',
    dakshinaAmount: 5100,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    receiptRef: 'RCP-MR-2026-881',
    liveStreamRequested: true,
  },
  {
    id: 'pb-02',
    workspaceId: 'ws-mandir',
    devoteeId: 'dev-103',
    devoteeName: 'Sri Vikramaditya Rathore',
    phone: '+91 94140 77889',
    poojaName: 'Sahasra Chandi Yajna & Navagraha Shanti',
    tithiDate: '2026-08-28',
    timeSlot: '08:00 AM - 01:00 PM',
    gotra: 'Vatsa',
    nakshatra: 'Rohini',
    rashi: 'Vrishabha',
    sankalpaIntention: 'Global Sanatan Dharma Sanrakshan & Shatru Samhara',
    assignedPurohit: 'Acharya Vidyadhar Shukla',
    dakshinaAmount: 21000,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    receiptRef: 'RCP-SC-2026-904',
    liveStreamRequested: true,
  },
];

export const INITIAL_RESIDENT_PUJAS: ResidentPujaSchedule[] = [
  {
    id: 'rp-01',
    pujaName: 'Mangala Aarti & Suprabhatam',
    timings: '05:00 AM - 05:45 AM',
    leadPurohit: 'Mukhya Pujari Sri Ramanuj Das',
    darshanStatus: 'Open for Devotees',
    dressCode: 'Traditional Dhoti / Sari',
    dailyAttendanceAvg: 120,
  },
  {
    id: 'rp-02',
    pujaName: 'Madhyahna Bhoga Aarti',
    timings: '12:00 PM - 12:30 PM',
    leadPurohit: 'Pt. Keshav Shastri',
    darshanStatus: 'Live Sanctum Bhog',
    dressCode: 'Modest Indian Attire',
    dailyAttendanceAvg: 250,
  },
  {
    id: 'rp-03',
    pujaName: 'Sandhya Maha Aarti with Shankhanaad & Dhoop',
    timings: '07:00 PM - 07:45 PM',
    leadPurohit: 'Acharya Devendra Shastri',
    darshanStatus: 'High Energy Darshan',
    dressCode: 'Traditional',
    dailyAttendanceAvg: 600,
  },
  {
    id: 'rp-04',
    pujaName: 'Shayana Aarti & Ekanta Seva',
    timings: '09:30 PM - 10:00 PM',
    leadPurohit: 'Mukhya Pujari Sri Ramanuj Das',
    darshanStatus: 'Closing Sanctum',
    dressCode: 'Devotee Silence Requested',
    dailyAttendanceAvg: 80,
  },
];

export const INITIAL_PUROHIT_MARKET: PurohitProfile[] = [
  {
    id: 'pur-01',
    name: 'Pt. Radheshyam Dwivedi',
    vedicQualification: 'Veda Vibhushan (Shukla Yajurveda), Sampurnanand Sanskrit Univ.',
    sampradaya: 'Shaiva / Smartha',
    gotra: 'Bharadwaja',
    languages: ['Sanskrit', 'Hindi', 'Bhojpuri', 'English'],
    city: 'Varanasi',
    experienceYears: 24,
    rating: 4.95,
    reviewCount: 310,
    suggestedDakshina: 5100,
    specializations: ['Maharudrabhishek', 'Vastu Shanti', 'Navagraha Havan', 'Vivah Samskara'],
    verifiedByMandirTrust: true,
  },
  {
    id: 'pur-02',
    name: 'Acharya Mukund Mohan Goswami',
    vedicQualification: 'Acharya in Jyotish & Karmakanda (Kashi Vidyapeeth)',
    sampradaya: 'Gaudiya Vaishnava',
    gotra: 'Kashyapa',
    languages: ['Bengali', 'Hindi', 'Sanskrit', 'English'],
    city: 'Kolkata / Nabadwip',
    experienceYears: 18,
    rating: 4.9,
    reviewCount: 240,
    suggestedDakshina: 4500,
    specializations: ['Bhagavatam Katha', 'Satyanarayan Vrat Katha', 'Nama Samskar', 'Sudharshana Homam'],
    verifiedByMandirTrust: true,
  },
];

export const INITIAL_PITRU_RECORDS: PitruRecord[] = [
  {
    id: 'pit-01',
    workspaceId: 'ws-mandir',
    devoteeName: 'Sri Rameshwar Shastri',
    devoteePhone: '+91 98765 11223',
    ancestorName: 'Late Pt. Dinabandhu Shastri (Father)',
    relation: 'Father',
    gotra: 'Shandilya',
    tithiOfDemise: 'Ashwin Krishna Amavasya (Sarva Pitru)',
    nakshatra: 'Hasta',
    lastShradhPerformed: '2025-10-02',
    shradhLocation: 'Gaya Kshetra (Vishnupada)',
    nextScheduledReminder: '2026-09-21',
  },
];

export const INITIAL_COWS: GoshalaCowRecord[] = [
  {
    id: 'cow-01',
    workspaceId: 'ws-goshala',
    name: 'Gauri (Maa Kamadhenu)',
    tagNumber: 'SB-COW-001',
    breed: 'Gir (Desi Indigenous)',
    ageYears: 5,
    gender: 'Female',
    healthStatus: 'Healthy',
    dailyMilkLiters: 14,
    adoptedByDevotee: 'Sri Vikramaditya Rathore',
    monthlyFodderCost: 3500,
    photoUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600',
    notes: 'Very gentle and motherly temperament. High butterfat Vedic A2 milk used for sanctum Abhishek.',
  },
  {
    id: 'cow-02',
    workspaceId: 'ws-goshala',
    name: 'Nandi Surabhi',
    tagNumber: 'SB-COW-002',
    breed: 'Sahiwal',
    ageYears: 4,
    gender: 'Female',
    healthStatus: 'Healthy',
    dailyMilkLiters: 12,
    adoptedByDevotee: 'Smt. Gayatri Devi Sharma',
    monthlyFodderCost: 3200,
    photoUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'cow-03',
    workspaceId: 'ws-goshala',
    name: 'Surya (Veer Nandi)',
    tagNumber: 'SB-BULL-003',
    breed: 'Tharparkar',
    ageYears: 6,
    gender: 'Male',
    healthStatus: 'Healthy',
    dailyMilkLiters: 0,
    monthlyFodderCost: 4000,
    photoUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600',
    notes: 'Magnificent pedigree breeding bull preserving pure indigenous Tharparkar lineage.',
  },
];

export const INITIAL_ANNADANAM: AnnadanamSponsorship[] = [
  {
    id: 'ann-01',
    workspaceId: 'ws-mandir',
    sponsorName: 'Sri Vikramaditya Rathore',
    sponsorPhone: '+91 94140 77889',
    gotra: 'Vatsa',
    date: '2026-08-25',
    mealType: 'Mahaprasad Lunch Bhandara',
    devoteeCountProjected: 500,
    contributionAmount: 25000,
    status: 'Booked',
    occasion: 'Birth Anniversary of Late Father Pt. Brijmohan Rathore',
  },
  {
    id: 'ann-02',
    workspaceId: 'ws-mandir',
    sponsorName: 'Smt. Gayatri Devi Sharma',
    sponsorPhone: '+91 98220 33445',
    gotra: 'Kashyapa',
    date: '2026-08-28',
    mealType: 'Morning Kheer & Puri Prasad',
    devoteeCountProjected: 250,
    contributionAmount: 11000,
    status: 'Booked',
    occasion: 'Ekadashi Seva & Family Prosperity',
  },
];

export const INITIAL_ROOMS: AshramKutirRoom[] = [
  {
    id: 'room-101',
    workspaceId: 'ws-ashram',
    roomNumber: 'Kutir 101 (Ganga Kutir)',
    roomType: 'Sadhana Kutir',
    capacity: 2,
    isOccupied: false,
    suggestedDonationPerDay: 800,
    cleaningStatus: 'Ready',
  },
  {
    id: 'room-102',
    workspaceId: 'ws-ashram',
    roomNumber: 'Kutir 102 (Shiva Kutir)',
    roomType: 'Sadhana Kutir',
    capacity: 2,
    isOccupied: true,
    currentGuestName: 'Swami Niranjananda',
    checkInDate: '2026-08-20',
    checkOutDate: '2026-08-30',
    suggestedDonationPerDay: 800,
    cleaningStatus: 'Ready',
  },
  {
    id: 'room-201',
    workspaceId: 'ws-tirth',
    roomNumber: 'Bhavan Suite 201',
    roomType: 'Family Suite',
    capacity: 5,
    isOccupied: false,
    suggestedDonationPerDay: 1200,
    cleaningStatus: 'Ready',
  },
];

export const INITIAL_GURUKUL_STUDENTS: GurukulStudent[] = [
  {
    id: 'gur-01',
    workspaceId: 'ws-gurukul',
    studentName: 'Batuk Raghav Shastri',
    rollNo: 'VED-2024-001',
    courseLevel: 'Prathama (Grammar)',
    sandhyaVandanaRegularity: 98,
    shlokaRecitationScore: 95,
    guardianName: 'Sri Rameshwar Shastri',
    guardianPhone: '+91 98765 11223',
    dateOfUpanayanam: '2016-04-14',
    attendancePct: 99,
  },
  {
    id: 'gur-02',
    workspaceId: 'ws-gurukul',
    studentName: 'Batuk Chinmay Acharya',
    rollNo: 'VED-2023-014',
    courseLevel: 'Madhyama (Shastras)',
    sandhyaVandanaRegularity: 92,
    shlokaRecitationScore: 88,
    guardianName: 'Sri Keshav Acharya',
    guardianPhone: '+91 94220 99881',
    dateOfUpanayanam: '2015-05-10',
    attendancePct: 96,
  },
];

export const INITIAL_CAMPAIGNS: CampaignCrowdfund[] = [
  {
    id: 'cmp-01',
    workspaceId: 'ws-mandir',
    title: '50kW Solar Rooftop Installation for Zero-Carbon Mandir Sabha Mandap',
    description: 'Transforming our sacred temple campus into 100% green solar powered sanctum with Net Metering.',
    targetAmount: 2500000,
    collectedAmount: 1850000,
    donorsCount: 420,
    bannerUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=800',
    status: 'Active',
    category: 'Eco Mandir / Solar',
    topDonors: [
      { name: 'Sri Vikramaditya Rathore', amount: 500000, city: 'Varanasi' },
      { name: 'Smt. Shanti Devi Trust', amount: 250000, city: 'Kanpur' },
      { name: 'Shri Ram Seva Samiti', amount: 100000, city: 'Lucknow' },
    ],
  },
  {
    id: 'cmp-02',
    workspaceId: 'ws-goshala',
    title: 'Modern Ayurvedic Veterinary Hospital for Desi Cows (Gau Chikitsalaya)',
    description: 'Building a specialized inpatient emergency trauma and herbal care unit for 200 indigenous abandoned cows.',
    targetAmount: 1500000,
    collectedAmount: 920000,
    donorsCount: 290,
    bannerUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=800',
    status: 'Active',
    category: 'Gau Seva / Healthcare',
    topDonors: [
      { name: 'Pt. Hariprasad Dwivedi', amount: 200000, city: 'Vrindavan' },
      { name: 'Brajbhumi Seva Mandal', amount: 150000, city: 'Mathura' },
    ],
  },
];

export const INITIAL_MATRIMONY: MatrimonyProfile[] = [
  {
    id: 'mat-01',
    fullName: 'Sri Aditya Shastri (B.Tech IIT, MS USA)',
    gender: 'Male',
    birthDate: '1995-04-20',
    birthTime: '06:45 AM',
    birthPlace: 'Varanasi',
    gotra: 'Shandilya',
    nakshatra: 'Rohini',
    rashi: 'Vrishabha',
    manglikStatus: 'Non-Manglik',
    education: 'B.Tech IIT Kanpur, MS Computer Science (USA)',
    profession: 'Senior AI Engineer at Tech Company',
    location: 'Bengaluru / US H1B',
    familyBackground: 'Father Veda scholar in Kashi, mother homemaker. High cultural values.',
    contactFamilyPerson: 'Sri Rameshwar Shastri (Father)',
    contactPhone: '+91 98765 11223',
    verified: true,
    photoMasked: false,
  },
  {
    id: 'mat-02',
    fullName: 'Dr. Priyadarshini Sharma (MBBS, MD Pediatrics)',
    gender: 'Female',
    birthDate: '1998-09-12',
    birthTime: '11:20 AM',
    birthPlace: 'Jaipur',
    gotra: 'Vatsa',
    nakshatra: 'Pushya',
    rashi: 'Karka',
    manglikStatus: 'Anshik Manglik',
    education: 'MD Pediatrics, Resident Doctor at AIIMS',
    profession: 'Doctor / Pediatrician',
    location: 'New Delhi / Jaipur',
    familyBackground: 'Reputed Gaur Brahman family with Sanatani traditions.',
    contactFamilyPerson: 'Pt. Omprakash Sharma (Uncle)',
    contactPhone: '+91 94140 11223',
    verified: true,
    photoMasked: false,
  },
];

export const INITIAL_SHLOKAS: ShlokaCardItem[] = [
  {
    id: 'shl-01',
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
    transliteration: 'karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo \'stv akarmaṇi ||',
    source: 'Bhagavad Gita - Chapter 2, Verse 47',
    category: 'Karma Yoga',
    englishMeaning: 'You have a divine right to perform your duty, but never to its fruits. Let not the fruits of action be your motive, nor let your attachment be to inaction.',
    hindiMeaning: 'तुम्हारा अधिकार केवल कर्म करने में है, उसके फलों में कभी नहीं। कर्मफल के हेतु मत बनो और न ही तुम्हारी अकर्मण्यता में आसक्ति हो।',
    bengaliMeaning: 'কর্মেতেই তোমার অধিকার, তার ফলে কখনো নয়। কর্মফলের হেতু হয়ো না এবং নিষ্কর্মতায় যেন তোমার আসক্তি না ঘটে।',
  },
  {
    id: 'shl-02',
    sanskrit: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः ।\nसर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत् ॥',
    transliteration: 'sarve bhavantu sukhinaḥ sarve santu nirāmayāḥ | sarve bhadrāṇi paśyantu mā kaścid-duḥkha-bhāg-bhavet ||',
    source: 'Brihadaranyaka Upanishad - Shanti Mantra',
    category: 'Peace & Harmony',
    englishMeaning: 'May all sentient beings be happy, may all be free from illness. May all perceive auspiciousness everywhere, may no one suffer grief.',
    hindiMeaning: 'सब सुखी हों, सब रोगमुक्त रहें, सब मंगलमय घटनाओं के साक्षी बनें और किसी को भी दुःख का भागी न बनना पड़े।',
    bengaliMeaning: 'সকলে সুখী হোক, সকলে রোগমুক্ত থাকুক, সকলে মঙ্গল দর্শন করুক এবং কেউ যেন দুঃখভোগ না করে।',
  },
  {
    id: 'shl-03',
    sanskrit: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत ।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ॥',
    transliteration: 'yadā yadā hi dharmasya glānir bhavati bhārata | abhyutthānam adharmasya tadātmānaṁ sṛjāmy aham ||',
    source: 'Bhagavad Gita - Chapter 4, Verse 7',
    category: 'Dharma',
    englishMeaning: 'Whenever and wherever there is a decline in Dharma, O descendant of Bharata, and a predominant rise of Adharma—at that time I manifest Myself.',
    hindiMeaning: 'हे भारत! जब-जब धर्म की हानि और अधर्म का उत्थान होता है, तब-तब मैं स्वयं को प्रकट करता हूँ।',
    bengaliMeaning: 'হে ভারত! যখনই ধর্মের গ্লানি এবং অধর্মের অভ্যুত্থান হয়, তখনই আমি নিজেকে সৃষ্টি বা প্রকট করি।',
  },
];

export const INITIAL_RESOLUTIONS: TrusteeResolution[] = [
  {
    id: 'res-01',
    workspaceId: 'ws-mandir',
    resolutionNumber: 'RES-2026/04',
    date: '2026-08-01',
    title: 'Sanction for 50kW Solar Rooftop Installation over Sabha Mandap',
    proposedBy: 'Sri Vikramaditya Rathore (Trustee)',
    secondedBy: 'Sri Rameshwar Shastri (Secretary)',
    votesInFavor: 7,
    votesAgainst: 0,
    status: 'Passed',
    quorumMet: true,
    details: 'Unanimously resolved to accept solar vendor tender to achieve 100% green energy for Mandir sanctum and kitchen.',
  },
  {
    id: 'res-02',
    workspaceId: 'ws-mandir',
    resolutionNumber: 'RES-2026/05',
    date: '2026-08-15',
    title: 'Establishment of Free Ayurvedic Dispensary for Pilgrims',
    proposedBy: 'Dr. Anand Mahadevan (Trustee)',
    secondedBy: 'Smt. Gayatri Devi (Trustee)',
    votesInFavor: 6,
    votesAgainst: 1,
    status: 'Passed',
    quorumMet: true,
    details: 'Allocating Ground Floor Room 4 for daily Ayurvedic Vaidya consultation and free herbal medicine distribution.',
  },
];

export const INITIAL_SHIFTS: SevadarDutyShift[] = [
  {
    id: 'shf-01',
    workspaceId: 'ws-mandir',
    sevadarName: 'Sri Subhash Banerjee',
    phone: '+91 93310 44556',
    role: 'Prasad Distribution',
    date: '2026-08-25',
    shiftTiming: 'Morning (05:00 - 11:00)',
    attended: true,
  },
  {
    id: 'shf-02',
    workspaceId: 'ws-mandir',
    sevadarName: 'Sri Rahul Tiwari',
    phone: '+91 98100 22334',
    role: 'Crowd Control',
    date: '2026-08-25',
    shiftTiming: 'Evening (17:00 - 22:00)',
    attended: false,
  },
];

// ---------------------------------------------------------------------------
// Demo Playground Conversion Engine — Quota v2
// ---------------------------------------------------------------------------
// Demo workspaces get exactly DEMO_CREATES_PER_MODULE free creates per
// module. Seed records never count. Quota applies ONLY to demo workspaces
// (id starts with DEMO_); registered workspaces are unlimited.
// Record convention: seed sets `isDemoSeed: true`; user-created records
// leave it absent/false, which is how reset/convert distinguish them.
const DEMO_QUOTA_KEY_PREFIX = 'sb_demo_count_';
const DEMO_CREATES_PER_MODULE = 5;
const PENDING_DEMO_CONVERSION_KEY = 'sb_pending_demo_conversion';
const AUTO_PURGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours auto-delete retention window

/**
 * SECURITY (C-4): the 24h auto-purge TTL is a DEMO-sandbox mechanism only.
 * Real workspaces must NEVER receive an `_expiresAt` stamp — the sweeper
 * would otherwise delete a temple's real records with no recovery.
 * Spread the result into a new record literal: `...demoTtlFields(wsId)`.
 */
const demoTtlFields = (workspaceId: string | undefined | null): { _expiresAt?: number } => {
  if (typeof workspaceId === 'string' && workspaceId.startsWith('DEMO_')) {
    return { _expiresAt: Date.now() + AUTO_PURGE_TTL_MS };
  }
  return {};
};

export interface QuotaResult {
  allowed: boolean;
  /** Creates remaining in this module (0 when at limit). */
  remaining: number;
  /** True only on the call that transitions the module to the limit. */
  justHitLimit: boolean;
}

export interface DemoUpsell {
  module: string;
  displayName: string;
  entityLabel: string;
}

/** Display metadata for quota-tracked modules. */
const DEMO_MODULE_META: Record<string, { display: string; entityPlural: string }> = {
  devotees: { display: 'Devotees', entityPlural: 'devotees' },
  families: { display: 'Families', entityPlural: 'families' },
  guests: { display: 'Guests', entityPlural: 'guests' },
  treasury: { display: 'Treasury', entityPlural: 'donations' },
  assets: { display: 'Assets', entityPlural: 'assets' },
  inventory: { display: 'Inventory', entityPlural: 'items' },
  pooja: { display: 'Pooja Bookings', entityPlural: 'bookings' },
  goshala: { display: 'Goshala', entityPlural: 'cow records' },
  bhoomi: { display: 'Bhoomi', entityPlural: 'properties' },
  vahan: { display: 'Vahan Fleet', entityPlural: 'fleet records' },
  'seva-subscriptions': { display: 'Recurring Seva', entityPlural: 'subscriptions' },
  annadanam: { display: 'Annadanam', entityPlural: 'sponsorships' },
  resolutions: { display: 'Resolutions', entityPlural: 'resolutions' },
  residentPujas: { display: 'Resident Pujas', entityPlural: 'schedules' },
  pitruRecords: { display: 'Pitru Records', entityPlural: 'records' },
  gurukulStudents: { display: 'Gurukul', entityPlural: 'students' },
  shifts: { display: 'Sevadar Shifts', entityPlural: 'shifts' },
};

const DEMO_QUOTA_MODULES = Object.keys(DEMO_MODULE_META);

const demoModuleMeta = (moduleName: string) =>
  DEMO_MODULE_META[moduleName] || { display: moduleName, entityPlural: 'records' };

interface DataContextType {
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspaceId, activeWorkspace, currentRole, isAuthenticated, firebaseUser } = useAuthWorkspace();
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

  const devotees = useMemo(() => {
    return isGodMode
      ? allDevotees
      : allDevotees.filter((d) => !d.workspaceId || d.workspaceId === currentWsId);
  }, [allDevotees, currentWsId, isGodMode]);

  const puja_bookings = useMemo(() => {
    return isGodMode
      ? allPoojaBookings
      : allPoojaBookings.filter((p) => !p.workspaceId || p.workspaceId === currentWsId);
  }, [allPoojaBookings, currentWsId, isGodMode]);

  const donations = useMemo(() => {
    return isGodMode
      ? allTreasury
      : allTreasury.filter((t) => !t.workspaceId || t.workspaceId === currentWsId);
  }, [allTreasury, currentWsId, isGodMode]);

  const inventory_items = useMemo(() => {
    return isGodMode
      ? allInventory
      : allInventory.filter((i) => !i.workspaceId || i.workspaceId === currentWsId);
  }, [allInventory, currentWsId, isGodMode]);

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
    return isGodMode
      ? allAssets
      : allAssets.filter((a) => !a.workspaceId || a.workspaceId === currentWsId);
  }, [allAssets, currentWsId, isGodMode]);

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
      const studentSeed: Array<[string, string, string, string, number]> = [
        // name, rollNo, courseLevel, guardian, attendancePct
        ['Aditya Sharma', 'GS-2026-001', 'Prathama (Grammar)', 'Ramesh Sharma', 96],
        ['Krishna Patel', 'GS-2026-002', 'Prathama (Grammar)', 'Mohan Patel', 92],
        ['Rama Iyer', 'GS-2025-014', 'Madhyama (Shastras)', 'Suresh Iyer', 98],
        ['Arjun Nair', 'GS-2025-015', 'Madhyama (Shastras)', 'Gopal Nair', 89],
        ['Veda Vyas', 'GS-2024-007', 'Shastri (Philosophy)', 'Narayan Rao', 94],
        ['Shiva Menon', 'GS-2024-008', 'Shastri (Philosophy)', 'Kumar Menon', 91],
      ];
      setAllGurukulStudents((prev) => [
        ...studentSeed.map(([studentName, rollNo, courseLevel, guardianName, attendancePct], i) => ({
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
    const newMember: any = {
      ...data,
      id,
      workspaceId: data.workspaceId || activeWorkspace.id,
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
    const newTx: any = {
      ...tx,
      id,
      workspaceId: wsId,
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
    const newAst: any = {
      ...asset,
      id,
      workspaceId: asset.workspaceId || activeWorkspace.id,
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
    const newInv: any = {
      ...item,
      id,
      workspaceId: item.workspaceId || activeWorkspace.id,
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
    const newBooking: any = {
      ...booking,
      id,
      workspaceId: booking.workspaceId || activeWorkspace.id,
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
      }), [isDataLoading, devotees, puja_bookings, donations, inventory_items, poojaBookings, treasury, inventory, families, vanshavali, guests, assets, residentPujas, purohits, pitruRecords, cows, annadanamList, rooms, gurukulStudents, campaigns, matrimonyProfiles, shlokas, resolutions, shifts, bhoomiProperties, rentReceipts, fleetVehicles, fuelLogs, serviceRecords, sevaSubscriptions, seedDemoData, addDevotee, updateDevotee, deleteDevotee, addFamily, updateVanshavali, addGuest, promoteGuestToMember, addTreasuryTransaction, updateTreasuryTransaction, getNextReceiptNumber, addAsset, updateInventoryStock, addInventoryItem, addPoojaBooking, updatePoojaStatus, addCow, adoptCow, addAnnadanam, addResolution, voteOnResolution, addShift, addCampaignDonation, addResidentPuja, addPitruRecord, addGurukulStudent, purgeAutoDeleteRecords, addBhoomiProperty, updateBhoomiProperty, deleteBhoomiProperty, addRentReceipt, addFleetVehicle, updateFleetVehicle, deleteFleetVehicle, addFuelLog, addServiceRecord, addSevaSubscription, updateSevaSubscription, recordSubscriptionPayment, demoUpsellModule, closeDemoUpsell, getDemoStats, resetDemoWorkspace, convertDemoToReal]);

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
