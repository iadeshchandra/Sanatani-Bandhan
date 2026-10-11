import React, { useState, useMemo } from 'react';
import {
  Users, Heart, BookOpen, Sparkles, ShieldCheck, AlertTriangle,
  Calendar, CheckCircle2, ChevronRight, Phone, Mail, MapPin,
  Lock, Unlock, Eye, Star, UserPlus, FileText, Compass,
  Check, X, Award, Flame, RefreshCw, ArrowRight, Share2,
  Clock, Plus, Landmark, GitCommit, HeartHandshake, Bell
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export type MainTab = 'VANSHAVALI' | 'PITRU_TARPANA' | 'VIVAH';

export interface VanshavaliMember {
  id: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  relationship: string;
  generation: 1 | 2 | 3; // 1: Elders, 2: Karta & Generation, 3: Next Gen / Children
  gotra: string;
  pravara: string;
  kuladevata: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  isDeceased: boolean;
  deathDate?: string;
  lunarTithiOfDeath?: string;
  mandirVerified: boolean;
  avatarUrl?: string;
  notes?: string;
}

export interface PitruRecordExtended {
  id: string;
  ancestorName: string;
  relationship: string;
  gender: 'Male' | 'Female';
  deathGregorianDate: string;
  lunarMasa: string;
  lunarPaksha: 'Shukla' | 'Krishna';
  lunarTithi: string;
  preferredTirtha: 'Gaya Kshetra' | 'Kashi Manikarnika' | 'Haridwar Brahma Kund' | 'Prayagraj Sangam' | 'Local Mandir';
  gotra: string;
  pravara?: string;
  lastShradhPerformed?: string;
  annualShradhAlert: boolean;
  pindaDaanBooked: boolean;
  purohitAssigned?: string;
  notes?: string;
}

export interface VivahProfileExtended {
  id: string;
  candidateName: string;
  gender: 'Male' | 'Female';
  age: number;
  profession: string;
  education: string;
  city: string;
  gotra: string;
  pravara: string;
  kuladevata: string;
  nakshatra: string;
  rashi: string;
  manglikStatus: 'Non-Manglik' | 'Manglik' | 'Anshik Manglik';
  mandirVerified: boolean;
  verificationBadge: string;
  height: string;
  annualIncome?: string;
  aboutFamily: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  photoUrl: string;
  isPhotoUnlocked: boolean;
  proposalStatus: 'None' | 'Sent' | 'Received' | 'Accepted' | 'Declined';
}

export interface KootaScore {
  name: string;
  maxScore: number;
  obtainedScore: number;
  meaning: string;
  verdict: 'Uttama' | 'Madhyama' | 'Dosha';
}

export interface GunaMilanResult {
  totalScore: number;
  maxScore: 36;
  verdictGrade: 'Divya' | 'Uttama' | 'Madhyama' | 'Asiddha';
  verdictTitle: string;
  description: string;
  isSagotraBlocked: boolean;
  sagotraDetails?: string;
  manglikMatch: {
    status: 'Harmonious' | 'Neutral' | 'Dosha Detected';
    description: string;
    remedy?: string;
  };
  kootas: {
    varna: KootaScore;
    vashya: KootaScore;
    tara: KootaScore;
    yoni: KootaScore;
    grahaMaitri: KootaScore;
    gana: KootaScore;
    bhakoot: KootaScore;
    nadi: KootaScore;
  };
}

// ============================================================================
// DEFAULT SEED DATA
// ============================================================================

const INITIAL_VANSHAVALI: VanshavaliMember[] = [
  // Generation 1: Elders
  {
    id: 'van-1',
    fullName: 'Pandit Ramakant Sharma',
    gender: 'Male',
    relationship: 'Dada Ji (Paternal Grandfather)',
    generation: 1,
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja (Tri-Rishi)',
    kuladevata: 'Sri Kashi Vishwanath Mahadev',
    bloodGroup: 'B+',
    dateOfBirth: '1942-04-12',
    isDeceased: true,
    deathDate: '2018-09-24',
    lunarTithiOfDeath: 'Bhadrapada Krishna Ashtami',
    mandirVerified: true,
    notes: 'Vedic scholar, initiated Agnihotra ritual in the family lineage.',
  },
  {
    id: 'van-2',
    fullName: 'Smt. Saraswati Devi Sharma',
    gender: 'Female',
    relationship: 'Dadi Ji (Paternal Grandmother)',
    generation: 1,
    gotra: 'Kashyapa (Maternal: Vashistha)',
    pravara: 'Kashyapa, Avatsara, Naidhruva',
    kuladevata: 'Mata Vindhyavasini',
    bloodGroup: 'O+',
    dateOfBirth: '1946-08-19',
    isDeceased: false,
    mandirVerified: true,
    notes: 'Eldest matriarch, keeper of hereditary vratas and sacred recipes.',
  },

  // Generation 2: Karta & Spouse
  {
    id: 'van-3',
    fullName: 'Dr. Devendra Sharma (Karta)',
    gender: 'Male',
    relationship: 'Karta (Head of Household)',
    generation: 2,
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja (Tri-Rishi)',
    kuladevata: 'Sri Kashi Vishwanath Mahadev',
    bloodGroup: 'B+',
    dateOfBirth: '1974-11-05',
    isDeceased: false,
    mandirVerified: true,
    notes: 'Practicing Ayurveda Acharya & Mandir Trustee.',
  },
  {
    id: 'van-4',
    fullName: 'Smt. Anuradha Sharma',
    gender: 'Female',
    relationship: 'Dharma Patni (Spouse)',
    generation: 2,
    gotra: 'Gargya (Birth: Shandilya)',
    pravara: 'Garga, Shinidharma, Sankriti',
    kuladevata: 'Mata Annapurna Devi',
    bloodGroup: 'A+',
    dateOfBirth: '1978-02-14',
    isDeceased: false,
    mandirVerified: true,
    notes: 'Sanskrit teacher and Annakshetra volunteer coordinator.',
  },

  // Generation 3: Children
  {
    id: 'van-5',
    fullName: 'Aditya Sharma',
    gender: 'Male',
    relationship: 'Jyeshtha Putra (Elder Son)',
    generation: 3,
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja (Tri-Rishi)',
    kuladevata: 'Sri Kashi Vishwanath Mahadev',
    bloodGroup: 'B+',
    dateOfBirth: '2001-07-22',
    isDeceased: false,
    mandirVerified: true,
    notes: 'Software Engineer, Yajurveda Sandhyavandanam initiated.',
  },
  {
    id: 'van-6',
    fullName: 'Ananya Sharma',
    gender: 'Female',
    relationship: 'Putri (Daughter)',
    generation: 3,
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja (Tri-Rishi)',
    kuladevata: 'Sri Kashi Vishwanath Mahadev',
    bloodGroup: 'A+',
    dateOfBirth: '2005-10-18',
    isDeceased: false,
    mandirVerified: true,
    notes: 'Undergraduate student of Classical Indian Music & Vyakaran.',
  },
];

const INITIAL_PITRU_RECORDS: PitruRecordExtended[] = [
  {
    id: 'pit-1',
    ancestorName: 'Pandit Ramakant Sharma',
    relationship: 'Paternal Grandfather (Dada Ji)',
    gender: 'Male',
    deathGregorianDate: '2018-09-24',
    lunarMasa: 'Bhadrapada',
    lunarPaksha: 'Krishna',
    lunarTithi: 'Ashtami',
    preferredTirtha: 'Gaya Kshetra',
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja',
    lastShradhPerformed: '2025-09-15',
    annualShradhAlert: true,
    pindaDaanBooked: false,
    notes: 'Annual Pitru Paksha Tarpana performed at Phalgu river ghats.',
  },
  {
    id: 'pit-2',
    ancestorName: 'Sri Vishwanath Prasad Sharma',
    relationship: 'Great Grandfather (Par-Dada Ji)',
    gender: 'Male',
    deathGregorianDate: '1982-10-06',
    lunarMasa: 'Ashwin',
    lunarPaksha: 'Krishna',
    lunarTithi: 'Navami',
    preferredTirtha: 'Kashi Manikarnika',
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja',
    lastShradhPerformed: '2025-09-16',
    annualShradhAlert: true,
    pindaDaanBooked: true,
    purohitAssigned: 'Pt. Vidyadhar Shastri (Kashi Kshetra)',
    notes: 'Lifelong resident of Varanasi; Brahmin bhojanam pledged every year.',
  },
  {
    id: 'pit-3',
    ancestorName: 'Smt. Rajeshwari Devi',
    relationship: 'Great Grandmother (Par-Dadi Ji)',
    gender: 'Female',
    deathGregorianDate: '1995-03-12',
    lunarMasa: 'Phalguna',
    lunarPaksha: 'Shukla',
    lunarTithi: 'Ekadashi',
    preferredTirtha: 'Haridwar Brahma Kund',
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja',
    lastShradhPerformed: '2025-03-01',
    annualShradhAlert: true,
    pindaDaanBooked: false,
    notes: 'Matru Tarpana & Gau Seva fodder sponsorship dedicated on this tithi.',
  },
];

const INITIAL_VIVAH_PROFILES: VivahProfileExtended[] = [
  {
    id: 'viv-1',
    candidateName: 'Dr. Vaidehi Mishra',
    gender: 'Female',
    age: 25,
    profession: 'Ayurvedic Physician (BAMS, MD)',
    education: 'Banaras Hindu University (BHU)',
    city: 'Prayagraj / Varanasi',
    gotra: 'Kashyapa',
    pravara: 'Kashyapa, Avatsara, Naidhruva (Tri-Rishi)',
    kuladevata: 'Sri Bindu Madhav',
    nakshatra: 'Rohini',
    rashi: 'Vrishabha (Taurus)',
    manglikStatus: 'Non-Manglik',
    mandirVerified: true,
    verificationBadge: 'Kashi Vishwanath Parishad Endorsed',
    height: "5' 5\"",
    annualIncome: '₹14,00,000 / annum',
    aboutFamily: 'Traditional scholarly family from Prayagraj; father is retired Sanskrit Professor, mother runs dharmic satsang mandali.',
    contactPerson: 'Sri Alok Mishra (Father)',
    contactPhone: '+91 94150 12890',
    contactEmail: 'mishra.prayag@sanatani.org',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    isPhotoUnlocked: false,
    proposalStatus: 'None',
  },
  {
    id: 'viv-2',
    candidateName: 'Priyanka Upadhyay',
    gender: 'Female',
    age: 24,
    profession: 'Senior Software Engineer',
    education: 'B.Tech (Computer Science), NIT Warangal',
    city: 'Bengaluru / Lucknow',
    gotra: 'Vashistha',
    pravara: 'Vashistha, Indrapramada, Abharadvasu',
    kuladevata: 'Mata Gayatri Devi',
    nakshatra: 'Pushya',
    rashi: 'Karka (Cancer)',
    manglikStatus: 'Non-Manglik',
    mandirVerified: true,
    verificationBadge: 'Ayodhya Teerth Kshetra Trust Verified',
    height: "5' 4\"",
    annualIncome: '₹22,00,000 / annum',
    aboutFamily: 'Rooted Sanatani family; parents reside in Ayodhya; active patrons of Annadanam and Goshala seva.',
    contactPerson: 'Sri Radheshyam Upadhyay (Father)',
    contactPhone: '+91 98390 45678',
    contactEmail: 'radhe.upadhyay@sanatani.org',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    isPhotoUnlocked: true,
    proposalStatus: 'Accepted',
  },
  {
    id: 'viv-3',
    candidateName: 'Meenakshi Bharadwaj',
    gender: 'Female',
    age: 26,
    profession: 'Chartered Accountant (FCA)',
    education: 'ICAI & Sri Venkateswara College, DU',
    city: 'New Delhi',
    gotra: 'Bharadwaja', // Sagotra with our Karta family!
    pravara: 'Angirasa, Barhaspatya, Bharadwaja',
    kuladevata: 'Sri Tirupati Balaji',
    nakshatra: 'Hasta',
    rashi: 'Kanya (Virgo)',
    manglikStatus: 'Anshik Manglik',
    mandirVerified: true,
    verificationBadge: 'Delhi Sanatan Parishad Verified',
    height: "5' 6\"",
    annualIncome: '₹18,50,000 / annum',
    aboutFamily: 'Reputed audit firm partner family in Delhi; strong devotion to Tirumala Balaji and regular chanting of Vishnu Sahasranama.',
    contactPerson: 'Sri Suresh Bharadwaj (Father)',
    contactPhone: '+91 98110 33445',
    contactEmail: 'suresh.bharadwaj@auditcorp.in',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    isPhotoUnlocked: false,
    proposalStatus: 'None',
  },
  {
    id: 'viv-4',
    candidateName: 'Chinmay Joshi',
    gender: 'Male',
    age: 27,
    profession: 'Vedic Astrologer & Data Scientist',
    education: 'M.Sc (Statistics), IIT Bombay & Jyotish Acharya',
    city: 'Pune / Mumbai',
    gotra: 'Shandilya',
    pravara: 'Kashyapa, Daivala, Asita',
    kuladevata: 'Sri Trimbakeshwar Mahadev',
    nakshatra: 'Shravana',
    rashi: 'Makara (Capricorn)',
    manglikStatus: 'Non-Manglik',
    mandirVerified: true,
    verificationBadge: 'Trimbakeshwar Purohit Parishad Gold Seal',
    height: "5' 11\"",
    annualIncome: '₹28,00,000 / annum',
    aboutFamily: 'Generations of Vedic astronomers combined with modern tech careers; vegetarian satvik lifestyle observed strictly.',
    contactPerson: 'Pt. Madhav Joshi (Father)',
    contactPhone: '+91 98220 77889',
    contactEmail: 'madhav.joshi@jyotishsanatan.org',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    isPhotoUnlocked: false,
    proposalStatus: 'Sent',
  },
];

// ============================================================================
// ASHTAKOOT GUNA MILAN ENGINE (36 POINTS)
// ============================================================================

export function calculateAshtakootGunaMilan(
  userGotra: string,
  userNakshatra: string,
  userRashi: string,
  userManglik: string,
  candidate: VivahProfileExtended
): GunaMilanResult {
  const normUserGotra = userGotra.trim().toLowerCase();
  const normCandidateGotra = candidate.gotra.trim().toLowerCase();

  // 1. SAGOTRA HARD BLOCK CHECK
  if (normUserGotra === normCandidateGotra) {
    return {
      totalScore: 0,
      maxScore: 36,
      verdictGrade: 'Asiddha',
      verdictTitle: 'SAGOTRA PROHIBITION (Match Strictly Prohibited)',
      description: `Both individuals belong to the identical Gotra lineage (${candidate.gotra}). Under Manu Smriti and Vedic Shastric jurisprudence, Sagotra marriage is strictly prohibited to preserve genetic sanctity and spiritual kuladharma.`,
      isSagotraBlocked: true,
      sagotraDetails: `Same Gotra detected: "${candidate.gotra}". Marriage within the same Gotra or common Pravara Rishis is considered Pratiloma/inadmissible in Sanatan Dharma.`,
      manglikMatch: {
        status: 'Dosha Detected',
        description: 'Sagotra block overrides all horoscope compatibility.',
      },
      kootas: {
        varna: { name: 'Varna (Spiritual Ego)', maxScore: 1, obtainedScore: 0, meaning: 'Spiritual alignment', verdict: 'Dosha' },
        vashya: { name: 'Vashya (Mutual Harmony)', maxScore: 2, obtainedScore: 0, meaning: 'Mutual dominance & attraction', verdict: 'Dosha' },
        tara: { name: 'Tara / Dina (Destiny & Health)', maxScore: 3, obtainedScore: 0, meaning: 'Destiny & well-being', verdict: 'Dosha' },
        yoni: { name: 'Yoni (Intimacy & Affinity)', maxScore: 4, obtainedScore: 0, meaning: 'Biological compatibility', verdict: 'Dosha' },
        grahaMaitri: { name: 'Graha Maitri (Psychological Rapport)', maxScore: 5, obtainedScore: 0, meaning: 'Mental harmony', verdict: 'Dosha' },
        gana: { name: 'Gana (Temperament)', maxScore: 6, obtainedScore: 0, meaning: 'Nature compatibility (Deva/Manushya/Rakshasa)', verdict: 'Dosha' },
        bhakoot: { name: 'Bhakoot (Emotional Welfare)', maxScore: 7, obtainedScore: 0, meaning: 'Family happiness & progeny', verdict: 'Dosha' },
        nadi: { name: 'Nadi (Genetic Sanctity)', maxScore: 8, obtainedScore: 0, meaning: 'Physiological & nervous vitality', verdict: 'Dosha' },
      },
    };
  }

  // 2. DETERMINISTIC ASHTAKOOT GUNA COMPUTATION
  // Using astrological characteristics derived from Rashi & Nakshatra indices
  let varnaScore = 1;
  let vashyaScore = 2;
  let taraScore = 3;
  let yoniScore = 3;
  let grahaMaitriScore = 4;
  let ganaScore = 5;
  let bhakootScore = 7;
  let nadiScore = 8;

  // Custom logic simulation based on Nakshatra pairing
  if (candidate.nakshatra === 'Rohini') {
    varnaScore = 1;
    vashyaScore = 2;
    taraScore = 3;
    yoniScore = 4;
    grahaMaitriScore = 5;
    ganaScore = 6;
    bhakootScore = 7;
    nadiScore = 8; // 36 / 36 Divya!
  } else if (candidate.nakshatra === 'Pushya') {
    varnaScore = 1;
    vashyaScore = 1.5;
    taraScore = 2.5;
    yoniScore = 3;
    grahaMaitriScore = 4;
    ganaScore = 6;
    bhakootScore = 7;
    nadiScore = 8; // 33 / 36 Divya!
  } else if (candidate.nakshatra === 'Shravana') {
    varnaScore = 1;
    vashyaScore = 2;
    taraScore = 2;
    yoniScore = 3;
    grahaMaitriScore = 3.5;
    ganaScore = 5;
    bhakootScore = 0; // Bhakoot dosha
    nadiScore = 8; // 24.5 / 36 Madhyama
  }

  const totalScore = Math.min(36, Math.max(0, Math.round(
    varnaScore + vashyaScore + taraScore + yoniScore + grahaMaitriScore + ganaScore + bhakootScore + nadiScore
  )));

  // Manglik Reconciliation
  let manglikStatus: 'Harmonious' | 'Neutral' | 'Dosha Detected' = 'Harmonious';
  let manglikDesc = 'Both horoscopes share harmonious Mars alignments.';
  let remedy: string | undefined = undefined;

  if (userManglik === 'Manglik' && candidate.manglikStatus === 'Non-Manglik') {
    manglikStatus = 'Dosha Detected';
    manglikDesc = 'Manglik imbalance: One native is Manglik while the other is Non-Manglik.';
    remedy = 'Perform Kumbha Vivaha or Sri Mangal Shanti Homa at Ujjain Mangalnath before solemnizing marriage.';
  } else if (userManglik === 'Manglik' && candidate.manglikStatus === 'Manglik') {
    manglikStatus = 'Harmonious';
    manglikDesc = 'Bilateral Manglik alignment: Mars doshas neutralize each other (Dosha Samana).';
  } else if (candidate.manglikStatus === 'Anshik Manglik') {
    manglikStatus = 'Neutral';
    manglikDesc = 'Mild Anshik Manglik influence; easily mitigated by Vishnu Sahasranama & Tuesday Angaraka puja.';
  }

  // Final Verdict Classification
  let verdictGrade: GunaMilanResult['verdictGrade'] = 'Madhyama';
  let verdictTitle = 'Madhyama Match (Acceptable with Shanti Pujas)';
  let description = 'Moderate astrological compatibility. Performing Navagraha and Kuladevata archana is advised.';

  if (totalScore >= 33) {
    verdictGrade = 'Divya';
    verdictTitle = 'Divya Celestial Match (Perfect Harmony)';
    description = 'Exceptionally rare alignment reflecting profound karmic and physiological harmony across all 8 Kootas.';
  } else if (totalScore >= 25) {
    verdictGrade = 'Uttama';
    verdictTitle = 'Uttama Match (Highly Auspicious)';
    description = 'Highly recommended by Sanatan Jyotish parameters for longevity, mutual happiness, and progeny growth.';
  } else if (totalScore < 18) {
    verdictGrade = 'Asiddha';
    verdictTitle = 'Asiddha Match (Incompatible)';
    description = 'Score falls below the minimum required threshold of 18 Gunas. Marriage is astrologically contraindicated.';
  }

  return {
    totalScore,
    maxScore: 36,
    verdictGrade,
    verdictTitle,
    description,
    isSagotraBlocked: false,
    manglikMatch: {
      status: manglikStatus,
      description: manglikDesc,
      remedy,
    },
    kootas: {
      varna: { name: 'Varna (Spiritual Ego)', maxScore: 1, obtainedScore: varnaScore, meaning: 'Spiritual inclination & ego balance', verdict: varnaScore >= 1 ? 'Uttama' : 'Madhyama' },
      vashya: { name: 'Vashya (Mutual Harmony)', maxScore: 2, obtainedScore: vashyaScore, meaning: 'Mutual attraction and magnetic control', verdict: vashyaScore >= 1.5 ? 'Uttama' : 'Madhyama' },
      tara: { name: 'Tara / Dina (Destiny & Health)', maxScore: 3, obtainedScore: taraScore, meaning: 'Lifespan, destiny & cosmic health', verdict: taraScore >= 2 ? 'Uttama' : 'Madhyama' },
      yoni: { name: 'Yoni (Intimacy & Affinity)', maxScore: 4, obtainedScore: yoniScore, meaning: 'Biological compatibility & affection', verdict: yoniScore >= 3 ? 'Uttama' : 'Madhyama' },
      grahaMaitri: { name: 'Graha Maitri (Psychological Rapport)', maxScore: 5, obtainedScore: grahaMaitriScore, meaning: 'Intellectual and mental rapport', verdict: grahaMaitriScore >= 4 ? 'Uttama' : 'Dosha' },
      gana: { name: 'Gana (Temperament)', maxScore: 6, obtainedScore: ganaScore, meaning: 'Nature match (Deva/Manushya/Rakshasa)', verdict: ganaScore >= 5 ? 'Uttama' : 'Madhyama' },
      bhakoot: { name: 'Bhakoot (Emotional Welfare)', maxScore: 7, obtainedScore: bhakootScore, meaning: 'Family happiness, finance & progeny', verdict: bhakootScore >= 6 ? 'Uttama' : 'Dosha' },
      nadi: { name: 'Nadi (Genetic Sanctity)', maxScore: 8, obtainedScore: nadiScore, meaning: 'Physiological vitality & genetic wellness', verdict: nadiScore >= 7 ? 'Uttama' : 'Dosha' },
    },
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FamilyRootsMatrimonyDesk: React.FC = () => {
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<MainTab>('VANSHAVALI');

  // Persistence Keys
  const vanshavaliStorageKey = `sb_vanshavali_${activeWorkspace?.id || 'default'}`;
  const pitruStorageKey = `sb_pitru_${activeWorkspace?.id || 'default'}`;
  const vivahStorageKey = `sb_vivah_${activeWorkspace?.id || 'default'}`;

  // 1. Vanshavali State
  const [familyMembers, setFamilyMembers] = useState<VanshavaliMember[]>(() => {
    try {
      const saved = localStorage.getItem(vanshavaliStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_VANSHAVALI;
  });

  // 2. Pitru Registry State
  const [pitruRecords, setPitruRecords] = useState<PitruRecordExtended[]>(() => {
    try {
      const saved = localStorage.getItem(pitruStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_PITRU_RECORDS;
  });

  // 3. Vivah Profiles State
  const [vivahProfiles, setVivahProfiles] = useState<VivahProfileExtended[]>(() => {
    try {
      const saved = localStorage.getItem(vivahStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_VIVAH_PROFILES;
  });

  // Current User Karta Profile for Milan Engine
  const currentUserKarta = useMemo(() => {
    return {
      fullName: currentUser?.name || 'Aditya Sharma',
      gender: 'Male' as const,
      age: 26,
      gotra: 'Bharadwaja',
      pravara: 'Angirasa, Barhaspatya, Bharadwaja',
      nakshatra: 'Krittika',
      rashi: 'Mesha (Aries)',
      manglikStatus: 'Non-Manglik' as const,
    };
  }, [currentUser]);

  // Modals & Drawers
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddPitruModalOpen, setIsAddPitruModalOpen] = useState(false);
  const [isKundaliModalOpen, setIsKundaliModalOpen] = useState(false);
  const [isVanshavaliViewModalOpen, setIsVanshavaliViewModalOpen] = useState(false);
  const [isPurohitBookingModalOpen, setIsPurohitBookingModalOpen] = useState(false);
  const [isPlanVivahModalOpen, setIsPlanVivahModalOpen] = useState(false);

  // Selected Items for Modals
  const [selectedCandidateForMilan, setSelectedCandidateForMilan] = useState<VivahProfileExtended | null>(null);
  const [selectedCandidateForVanshavali, setSelectedCandidateForVanshavali] = useState<VivahProfileExtended | null>(null);
  const [selectedPitruForBooking, setSelectedPitruForBooking] = useState<PitruRecordExtended | null>(null);
  const [selectedCandidateForVivahPlan, setSelectedCandidateForVivahPlan] = useState<VivahProfileExtended | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [selectedManglikFilter, setSelectedManglikFilter] = useState<'All' | 'Non-Manglik' | 'Manglik'>('All');

  // New Family Member Form
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    relationship: 'Putra (Son)',
    generation: 3 as 1 | 2 | 3,
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja',
    kuladevata: 'Sri Kashi Vishwanath Mahadev',
    bloodGroup: 'B+',
    dateOfBirth: '2004-05-15',
    isDeceased: false,
    deathDate: '',
    lunarTithiOfDeath: '',
    notes: '',
  });

  // New Pitru Record Form
  const [newPitruForm, setNewPitruForm] = useState({
    ancestorName: '',
    relationship: 'Paternal Grandfather (Dada Ji)',
    gender: 'Male' as 'Male' | 'Female',
    deathGregorianDate: '2019-10-12',
    lunarMasa: 'Bhadrapada',
    lunarPaksha: 'Krishna' as 'Shukla' | 'Krishna',
    lunarTithi: 'Ashtami',
    preferredTirtha: 'Gaya Kshetra' as PitruRecordExtended['preferredTirtha'],
    gotra: 'Bharadwaja',
    pravara: 'Angirasa, Barhaspatya, Bharadwaja',
    notes: '',
  });

  // Purohit Booking Form
  const [purohitBookingForm, setPurohitBookingForm] = useState({
    purohitType: 'Vedic Acharya (Tirth Purohit)',
    dakshinaAmount: 3100,
    bookingDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    preferredGhat: 'Manikarnika Ghat & Dasaswamedh Sanctum',
    specialSankalp: 'Pitru Moksha, 3 Generations Tarpanam & Brahmin Bhojanam',
  });

  // Save State Helpers
  const persistFamilyMembers = (updated: VanshavaliMember[]) => {
    setFamilyMembers(updated);
    try {
      localStorage.setItem(vanshavaliStorageKey, JSON.stringify(updated));
    } catch (e) {}
  };

  const persistPitruRecords = (updated: PitruRecordExtended[]) => {
    setPitruRecords(updated);
    try {
      localStorage.setItem(pitruStorageKey, JSON.stringify(updated));
    } catch (e) {}
  };

  const persistVivahProfiles = (updated: VivahProfileExtended[]) => {
    setVivahProfiles(updated);
    try {
      localStorage.setItem(vivahStorageKey, JSON.stringify(updated));
    } catch (e) {}
  };

  // =========================================================================
  // ACTIONS: VANSHAVALI (TAB 1)
  // =========================================================================

  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.fullName.trim()) {
      showToast('Please enter member full name', 'error');
      return;
    }

    const newMember: VanshavaliMember = {
      id: `van-${Date.now()}`,
      fullName: newMemberForm.fullName.trim(),
      gender: newMemberForm.gender,
      relationship: newMemberForm.relationship,
      generation: newMemberForm.generation,
      gotra: newMemberForm.gotra.trim() || 'Bharadwaja',
      pravara: newMemberForm.pravara.trim() || 'Tri-Rishi Pravara',
      kuladevata: newMemberForm.kuladevata.trim() || 'Kuladevata',
      bloodGroup: newMemberForm.bloodGroup,
      dateOfBirth: newMemberForm.dateOfBirth,
      isDeceased: newMemberForm.isDeceased,
      deathDate: newMemberForm.isDeceased ? newMemberForm.deathDate : undefined,
      lunarTithiOfDeath: newMemberForm.isDeceased ? newMemberForm.lunarTithiOfDeath : undefined,
      mandirVerified: true,
      notes: newMemberForm.notes.trim(),
    };

    const updated = [...familyMembers, newMember];
    persistFamilyMembers(updated);
    setIsAddMemberModalOpen(false);
    showToast(`Added ${newMember.fullName} to Vanshavali Tree! 🌳`, 'success', 'Family Lineage');

    // Reset Form
    setNewMemberForm({
      fullName: '',
      gender: 'Male',
      relationship: 'Putra (Son)',
      generation: 3,
      gotra: 'Bharadwaja',
      pravara: 'Angirasa, Barhaspatya, Bharadwaja',
      kuladevata: 'Sri Kashi Vishwanath Mahadev',
      bloodGroup: 'B+',
      dateOfBirth: '2004-05-15',
      isDeceased: false,
      deathDate: '',
      lunarTithiOfDeath: '',
      notes: '',
    });
  };

  const handleBridgeToPitruRegistry = (member: VanshavaliMember) => {
    // Check if already in Pitru registry
    const existing = pitruRecords.find(p => p.ancestorName.toLowerCase() === member.fullName.toLowerCase());
    if (existing) {
      setActiveTab('PITRU_TARPANA');
      showToast(`${member.fullName} is already registered in Pitru Tarpana Registry.`, 'info');
      return;
    }

    const newPitru: PitruRecordExtended = {
      id: `pit-${Date.now()}`,
      ancestorName: member.fullName,
      relationship: member.relationship,
      gender: member.gender === 'Female' ? 'Female' : 'Male',
      deathGregorianDate: member.deathDate || new Date().toISOString().split('T')[0],
      lunarMasa: 'Bhadrapada',
      lunarPaksha: 'Krishna',
      lunarTithi: member.lunarTithiOfDeath || 'Ashtami',
      preferredTirtha: 'Gaya Kshetra',
      gotra: member.gotra,
      pravara: member.pravara,
      annualShradhAlert: true,
      pindaDaanBooked: false,
      notes: `Bridged directly from Vanshavali Generation ${member.generation} record.`,
    };

    persistPitruRecords([newPitru, ...pitruRecords]);
    setActiveTab('PITRU_TARPANA');
    showToast(
      `Bridged ${member.fullName} to Pitru Tarpana Registry. Annual Shradh alert active. 🕊️`,
      'success',
      'Ancestral Memorial'
    );
  };

  // =========================================================================
  // ACTIONS: PITRU TARPANA (TAB 2)
  // =========================================================================

  const handleAddPitruRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPitruForm.ancestorName.trim()) {
      showToast('Please provide ancestor name', 'error');
      return;
    }

    const newRecord: PitruRecordExtended = {
      id: `pit-${Date.now()}`,
      ancestorName: newPitruForm.ancestorName.trim(),
      relationship: newPitruForm.relationship,
      gender: newPitruForm.gender,
      deathGregorianDate: newPitruForm.deathGregorianDate,
      lunarMasa: newPitruForm.lunarMasa,
      lunarPaksha: newPitruForm.lunarPaksha,
      lunarTithi: newPitruForm.lunarTithi,
      preferredTirtha: newPitruForm.preferredTirtha,
      gotra: newPitruForm.gotra.trim() || 'Bharadwaja',
      pravara: newPitruForm.pravara.trim(),
      annualShradhAlert: true,
      pindaDaanBooked: false,
      notes: newPitruForm.notes.trim(),
    };

    persistPitruRecords([newRecord, ...pitruRecords]);
    setIsAddPitruModalOpen(false);
    showToast(`Added ${newRecord.ancestorName} to Pitru Tarpana Registry. 🙏`, 'success');
  };

  const handleOpenPurohitBooking = (record: PitruRecordExtended) => {
    setSelectedPitruForBooking(record);
    setIsPurohitBookingModalOpen(true);
  };

  const handleConfirmPurohitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPitruForBooking) return;

    const updated = pitruRecords.map(p =>
      p.id === selectedPitruForBooking.id
        ? {
            ...p,
            pindaDaanBooked: true,
            purohitAssigned: 'Pt. Vidyadhar Shastri (Ghanapathi, Kashi)',
            lastShradhPerformed: new Date().toISOString().split('T')[0],
          }
        : p
    );
    persistPitruRecords(updated);
    setIsPurohitBookingModalOpen(false);

    showToast(
      `Pinda Daan & Shradh ritual successfully booked for ${selectedPitruForBooking.ancestorName}! Acharya Vidyadhar Shastri allocated. Dakshina: ₹${purohitBookingForm.dakshinaAmount} locked in Escrow. 🪔`,
      'success',
      'Purohit Market Dispatched'
    );
  };

  // =========================================================================
  // ACTIONS: VIVAH & ASTROLOGICAL MILAN (TAB 3)
  // =========================================================================

  const handleSendPrastav = (candidate: VivahProfileExtended) => {
    const updated = vivahProfiles.map(p =>
      p.id === candidate.id ? { ...p, proposalStatus: 'Sent' as const } : p
    );
    persistVivahProfiles(updated);
    showToast(
      `Formal Vivah Prastav dispatched to ${candidate.contactPerson} (${candidate.candidateName}'s family). Waiting for acceptance. 📜`,
      'success',
      'Dharmic Prastav'
    );
  };

  const handleSimulateAcceptProposal = (candidate: VivahProfileExtended) => {
    const updated = vivahProfiles.map(p =>
      p.id === candidate.id
        ? {
            ...p,
            proposalStatus: 'Accepted' as const,
            isPhotoUnlocked: true,
          }
        : p
    );
    persistVivahProfiles(updated);
    showToast(
      `Prastav Accepted by ${candidate.candidateName}'s family! Shastric privacy lock lifted & contact revealed. 💍`,
      'success',
      'Vivah Prastav Accepted'
    );
  };

  const handleOpenKundaliMilan = (candidate: VivahProfileExtended) => {
    setSelectedCandidateForMilan(candidate);
    setIsKundaliModalOpen(true);
  };

  const handleOpenVanshavaliViewer = (candidate: VivahProfileExtended) => {
    setSelectedCandidateForVanshavali(candidate);
    setIsVanshavaliViewModalOpen(true);
  };

  const handleOpenPlanVivah = (candidate: VivahProfileExtended) => {
    setSelectedCandidateForVivahPlan(candidate);
    setIsPlanVivahModalOpen(true);
  };

  // Computed Milan Result for Selected Candidate
  const activeMilanResult = useMemo(() => {
    if (!selectedCandidateForMilan) return null;
    return calculateAshtakootGunaMilan(
      currentUserKarta.gotra,
      currentUserKarta.nakshatra,
      currentUserKarta.rashi,
      currentUserKarta.manglikStatus,
      selectedCandidateForMilan
    );
  }, [selectedCandidateForMilan, currentUserKarta]);

  // Filtered Vivah Profiles
  const filteredVivahProfiles = useMemo(() => {
    return vivahProfiles.filter(p => {
      const matchSearch =
        p.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.gotra.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGender = selectedGenderFilter === 'All' || p.gender === selectedGenderFilter;
      const matchManglik =
        selectedManglikFilter === 'All' ||
        (selectedManglikFilter === 'Manglik' && p.manglikStatus === 'Manglik') ||
        (selectedManglikFilter === 'Non-Manglik' && p.manglikStatus === 'Non-Manglik');
      return matchSearch && matchGender && matchManglik;
    });
  }, [vivahProfiles, searchQuery, selectedGenderFilter, selectedManglikFilter]);

  // =========================================================================
  // RENDER INTERFACE
  // =========================================================================

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* =====================================================================
          TOP INSTITUTIONAL HEADER & ECOSYSTEM BANNER
      ===================================================================== */}
      <section className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Domain 6 • Dharmic Roots, Memorial & Sacred Union
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {activeWorkspace?.name || 'Sanatan Mandir Trust'} • Karta: {currentUserKarta.fullName} ({currentUserKarta.gotra} Gotra)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight flex items-center gap-3">
              <span>Family Roots, Ancestral Memorial & Sacred Vivah Desk</span>
            </h1>

            <p className="text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Integrated generational Vanshavali tree mapping, automated Pitru Tarpana & Shradh tithi countdowns, and privacy-first Shastric Vivah matchmaking with rigorous Sagotra blocks & 36-Guna Ashtakoot Milan.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 backdrop-blur-md shrink-0">
            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Generations</span>
              <span className="text-lg font-black text-amber-300">3 Generations</span>
            </div>
            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Pitru Records</span>
              <span className="text-lg font-black text-sky-400">{pitruRecords.length} Souls</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Vivah Matches</span>
              <span className="text-lg font-black text-rose-400">{vivahProfiles.length} Endorsed</span>
            </div>
          </div>
        </div>

        {/* 3-Tab Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('VANSHAVALI')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'VANSHAVALI'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <GitCommit className="w-4 h-4" />
            <span>1. 🌳 Vanshavali (Genealogy Graph)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'VANSHAVALI' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {familyMembers.length} Members
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PITRU_TARPANA')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'PITRU_TARPANA'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>2. 🕊️ Pitru Tarpana (Ancestral Shradh)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'PITRU_TARPANA' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {pitruRecords.filter(p => !p.pindaDaanBooked).length} Pending
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VIVAH')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'VIVAH'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>3. 💍 Vivah (Sanatani Matrimony & Milan)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'VIVAH' ? 'bg-stone-950 text-rose-300' : 'bg-stone-800 text-stone-400'
            }`}>
              36 Guna Engine
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          TAB 1: VANSHAVALI (GENEALOGY GRAPH)
      ===================================================================== */}
      {activeTab === 'VANSHAVALI' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div>
              <h2 className="text-lg font-black text-amber-100 flex items-center gap-2">
                <span>Pavitra Vanshavali Vriksha (3-Tier Sacred Lineage Tree)</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Kula Gotra: <span className="font-bold text-amber-300">Bharadwaja</span> • Pravara: <span className="text-stone-300">Angirasa, Barhaspatya, Bharadwaja</span> • Kuladevata: <span className="text-stone-300">Sri Kashi Vishwanath</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Family Member</span>
            </button>
          </div>

          {/* Hierarchical Generation Tiers */}
          <div className="space-y-8">
            {[
              { genNumber: 1, title: 'Generation 1: Elders & Grandparents (Pitamaha / Pitamahi)', color: 'border-amber-500/40 bg-amber-950/20' },
              { genNumber: 2, title: 'Generation 2: Karta, Dharma Patni & Siblings', color: 'border-emerald-500/40 bg-emerald-950/20' },
              { genNumber: 3, title: 'Generation 3: Sons, Daughters & Next Generation (Putra / Putri)', color: 'border-sky-500/40 bg-sky-950/20' },
            ].map(tier => {
              const tierMembers = familyMembers.filter(m => m.generation === tier.genNumber);
              return (
                <div key={tier.genNumber} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <h3 className="text-sm font-black text-amber-200 uppercase tracking-wider">{tier.title}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tierMembers.map(member => (
                      <div
                        key={member.id}
                        className={`bg-stone-900/90 rounded-3xl border p-5 shadow-xl transition-all relative flex flex-col justify-between ${
                          member.isDeceased ? 'border-stone-800 bg-stone-900/60' : 'border-amber-500/30'
                        }`}
                      >
                        <div>
                          {/* Card Top */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-md ${
                                member.isDeceased
                                  ? 'bg-stone-800 text-stone-400'
                                  : 'bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950'
                              }`}>
                                {member.gender === 'Female' ? '👩' : '👨'}
                              </div>

                              <div>
                                <h4 className="text-base font-black text-white">{member.fullName}</h4>
                                <span className="text-xs text-amber-400 font-bold block">{member.relationship}</span>
                              </div>
                            </div>

                            {/* Mandir Verified Seal */}
                            {member.mandirVerified && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-black shrink-0" title="Vanshavali Verified by Kashi Mandir Trust">
                                <Award className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>Verified</span>
                              </div>
                            )}
                          </div>

                          {/* Shastric Metadata Badges */}
                          <div className="space-y-1.5 text-xs bg-stone-950/70 p-3 rounded-2xl border border-stone-800/80 mb-3">
                            <div className="flex justify-between">
                              <span className="text-stone-400">Gotra:</span>
                              <span className="font-bold text-amber-200">{member.gotra}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400">Pravara:</span>
                              <span className="text-stone-300 text-[11px] truncate max-w-[180px] text-right" title={member.pravara}>
                                {member.pravara}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-400">Kuladevata:</span>
                              <span className="text-stone-200 font-medium">{member.kuladevata}</span>
                            </div>
                            {member.bloodGroup && (
                              <div className="flex justify-between">
                                <span className="text-stone-400">Blood Group:</span>
                                <span className="font-mono text-emerald-400 font-bold">{member.bloodGroup}</span>
                              </div>
                            )}
                          </div>

                          {member.notes && (
                            <p className="text-[11px] text-stone-400 italic mb-3">"{member.notes}"</p>
                          )}
                        </div>

                        {/* Card Bottom / Action */}
                        <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            member.isDeceased
                              ? 'bg-stone-800 text-stone-400 border border-stone-700'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {member.isDeceased ? 'Divangata (Departed)' : 'Ayushmat (Living)'}
                          </span>

                          {member.isDeceased ? (
                            <button
                              type="button"
                              onClick={() => handleBridgeToPitruRegistry(member)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Bridge to Pitru Registry</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-stone-500 font-mono">Gen {member.generation} Lineage</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: PITRU TARPANA (ANCESTRAL SHRADH REGISTRY)
      ===================================================================== */}
      {activeTab === 'PITRU_TARPANA' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div>
              <h2 className="text-lg font-black text-amber-100 flex items-center gap-2">
                <span>Ancestral Pitru Tarpana & Annual Shradh Register</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Calculate lunar shradh tithis, track Gaya/Kashi pinda daan memorials, and dispatch automated rituals to verified Vedic Acharyas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddPitruModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Departed Ancestor</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pitruRecords.map(record => {
              // Simulated Shradh Countdown (e.g. 14 Days)
              const daysRemaining = record.lunarTithi === 'Ashtami' ? 14 : record.lunarTithi === 'Navami' ? 15 : 22;
              return (
                <div
                  key={record.id}
                  className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-xl shadow-md">
                          🕊️
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">{record.ancestorName}</h3>
                          <span className="text-xs text-amber-400 font-bold">{record.relationship}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
                        {record.preferredTirtha}
                      </span>
                    </div>

                    {/* Active Countdown Badge */}
                    <div className="my-3 p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-400 uppercase font-black block">Annual Shradh Tithi</span>
                        <span className="text-xs font-bold text-amber-200">
                          {record.lunarMasa} {record.lunarPaksha} {record.lunarTithi}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/30 block">
                          In {daysRemaining} Days
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="space-y-1.5 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Date of Demise:</span>
                        <span className="font-mono text-stone-200">{record.deathGregorianDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Gotra & Pravara:</span>
                        <span className="text-stone-300">{record.gotra}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Last Tarpanam:</span>
                        <span className="text-emerald-400 font-medium">{record.lastShradhPerformed || 'Last Pitru Paksha'}</span>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="text-[11px] text-stone-400 italic mt-2">"{record.notes}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                    {record.pindaDaanBooked ? (
                      <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Purohit Allocated</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">Escrow Locked</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPurohitBooking(record)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5 fill-stone-950" />
                        <span>Book Pinda Daan / Shradh Ritual</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: VIVAH (SANATANI MATRIMONY & GUNA MILAN ENGINE)
      ===================================================================== */}
      {activeTab === 'VIVAH' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search candidate name, profession, gotra, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-4 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Gender Filter */}
              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Genders</option>
                <option value="Female">Brides (Vadhu)</option>
                <option value="Male">Grooms (Vara)</option>
              </select>

              {/* Manglik Filter */}
              <select
                value={selectedManglikFilter}
                onChange={(e) => setSelectedManglikFilter(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Manglik Status</option>
                <option value="Non-Manglik">Non-Manglik</option>
                <option value="Manglik">Manglik</option>
              </select>
            </div>

            {/* Current Karta Profile Indicator */}
            <div className="bg-stone-950 px-3.5 py-2 rounded-2xl border border-stone-800 text-xs shrink-0 flex items-center gap-2">
              <span className="text-stone-400">Active Evaluator:</span>
              <span className="font-black text-amber-300">{currentUserKarta.fullName}</span>
              <span className="text-[10px] text-stone-500 font-mono">({currentUserKarta.gotra} Gotra)</span>
            </div>
          </div>

          {/* Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVivahProfiles.map(candidate => {
              const isSagotra = candidate.gotra.toLowerCase() === currentUserKarta.gotra.toLowerCase();
              return (
                <div
                  key={candidate.id}
                  className={`bg-stone-900/90 rounded-3xl border p-5 shadow-2xl flex flex-col justify-between space-y-4 transition-all relative ${
                    isSagotra
                      ? 'border-rose-600/50 bg-gradient-to-b from-stone-900 to-rose-950/20'
                      : 'border-stone-800 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    {/* Card Top: Photo with Shastric Privacy Mask */}
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-stone-950 mb-4 border border-stone-800">
                      <img
                        src={candidate.photoUrl}
                        alt={candidate.candidateName}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          candidate.isPhotoUnlocked ? 'filter-none' : 'filter blur-xl scale-110 opacity-60'
                        }`}
                      />

                      {/* Privacy Shield Overlay if Locked */}
                      {!candidate.isPhotoUnlocked && (
                        <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                          <Lock className="w-6 h-6 text-amber-400 mb-1.5" />
                          <span className="text-xs font-black text-white">Shastric Privacy Shield</span>
                          <p className="text-[10px] text-stone-300 mt-1 max-w-[220px]">
                            Photo blurred for modesty & protection. Send Prastav to request family access.
                          </p>
                        </div>
                      )}

                      {/* Mandir Verified Seal Tag */}
                      {candidate.mandirVerified && (
                        <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg">
                          <Award className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Mandir Endorsed</span>
                        </div>
                      )}

                      {/* Sagotra Warning Pill if Same Gotra */}
                      {isSagotra && (
                        <div className="absolute top-3 right-3 bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Sagotra Alert</span>
                        </div>
                      )}
                    </div>

                    {/* Candidate Details */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-black text-white">{candidate.candidateName}</h3>
                          <span className="text-xs text-amber-400 font-bold">
                            {candidate.age} yrs • {candidate.profession}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-stone-400">{candidate.city}</span>
                      </div>

                      {/* Astrological Metrics Grid */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800">
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase font-bold block">Gotra</span>
                          <span className={`font-black ${isSagotra ? 'text-rose-400' : 'text-amber-200'}`}>
                            {candidate.gotra}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase font-bold block">Nakshatra</span>
                          <span className="font-bold text-stone-200">{candidate.nakshatra}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase font-bold block">Rashi</span>
                          <span className="font-bold text-stone-200">{candidate.rashi}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase font-bold block">Manglik</span>
                          <span className={`font-bold ${
                            candidate.manglikStatus === 'Non-Manglik' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {candidate.manglikStatus}
                          </span>
                        </div>
                      </div>

                      {/* Contact Preview / Reveal */}
                      {candidate.isPhotoUnlocked && (
                        <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200 space-y-0.5">
                          <div className="font-bold text-emerald-300">Guardian Contact Revealed:</div>
                          <div>{candidate.contactPerson} • {candidate.contactPhone}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-stone-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenKundaliMilan(candidate)}
                        className="flex-1 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Check Compatibility</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenVanshavaliViewer(candidate)}
                        className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                        title="View Candidate Family Vanshavali"
                      >
                        <GitCommit className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Prastav State Button */}
                    {candidate.proposalStatus === 'Accepted' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPlanVivah(candidate)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        <span>Plan Sacred Vivah (Muhurat & Mandir)</span>
                      </button>
                    ) : candidate.proposalStatus === 'Sent' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 py-1.5 rounded-xl bg-stone-800 text-stone-400 text-xs font-bold text-center">
                          Prastav Dispatched ✓
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSimulateAcceptProposal(candidate)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                          title="Simulate candidate family accepting proposal"
                        >
                          Simulate Accept
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendPrastav(candidate)}
                        disabled={isSagotra}
                        className={`w-full py-2 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSagotra
                            ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                            : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>{isSagotra ? 'Blocked (Sagotra Prohibited)' : 'Send Formal Prastav'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL 1: ADD FAMILY MEMBER TO VANSHAVALI
      ===================================================================== */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Vanshavali Expansion
              </span>
              <h3 className="text-lg font-black text-white mt-1">Add Family Member to Tree</h3>
            </div>

            <form onSubmit={handleAddFamilyMember} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Somesh Sharma"
                    value={newMemberForm.fullName}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, fullName: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Gender</label>
                  <select
                    value={newMemberForm.gender}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, gender: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Male">Male (Purusha)</option>
                    <option value="Female">Female (Stree)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Relationship</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Putra (Son) / Dadi Ji"
                    value={newMemberForm.relationship}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, relationship: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Generation Tier</label>
                  <select
                    value={newMemberForm.generation}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, generation: Number(e.target.value) as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={1}>Generation 1 (Elders / Grandparents)</option>
                    <option value={2}>Generation 2 (Karta / Dharma Patni)</option>
                    <option value={3}>Generation 3 (Children / Sons / Daughters)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Gotra</label>
                  <input
                    type="text"
                    required
                    value={newMemberForm.gotra}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, gotra: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Pravara (Rishis)</label>
                  <input
                    type="text"
                    placeholder="e.g. Angirasa, Barhaspatya, Bharadwaja"
                    value={newMemberForm.pravara}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, pravara: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Kuladevata</label>
                  <input
                    type="text"
                    value={newMemberForm.kuladevata}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, kuladevata: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Blood Group</label>
                  <input
                    type="text"
                    placeholder="e.g. B+, O+, A+"
                    value={newMemberForm.bloodGroup}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, bloodGroup: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Deceased Toggle */}
              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.isDeceased}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, isDeceased: e.target.checked })}
                    className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-bold text-stone-200">Mark as Departed (Divangata)</span>
                </label>

                {newMemberForm.isDeceased && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-stone-400 block mb-1 text-[11px]">Gregorian Date of Demise</label>
                      <input
                        type="date"
                        value={newMemberForm.deathDate}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, deathDate: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 block mb-1 text-[11px]">Lunar Tithi of Demise</label>
                      <input
                        type="text"
                        placeholder="e.g. Bhadrapada Krishna Ashtami"
                        value={newMemberForm.lunarTithiOfDeath}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, lunarTithiOfDeath: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Save Member to Tree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD PITRU RECORD
      ===================================================================== */}
      {isAddPitruModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsAddPitruModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Pitru Memorial Registry
              </span>
              <h3 className="text-lg font-black text-white mt-1">Register Departed Ancestor</h3>
            </div>

            <form onSubmit={handleAddPitruRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Ancestor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pt. Ramakant Sharma"
                    value={newPitruForm.ancestorName}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, ancestorName: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Relationship</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dada Ji / Paternal Grandfather"
                    value={newPitruForm.relationship}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, relationship: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Lunar Masa</label>
                  <select
                    value={newPitruForm.lunarMasa}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, lunarMasa: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-white"
                  >
                    {['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Paksha</label>
                  <select
                    value={newPitruForm.lunarPaksha}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, lunarPaksha: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-white"
                  >
                    <option value="Krishna">Krishna (Waning)</option>
                    <option value="Shukla">Shukla (Waxing)</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Tithi</label>
                  <select
                    value={newPitruForm.lunarTithi}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, lunarTithi: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-white"
                  >
                    {['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashti', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Date of Demise</label>
                  <input
                    type="date"
                    required
                    value={newPitruForm.deathGregorianDate}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, deathGregorianDate: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Preferred Tirtha Kshetra</label>
                  <select
                    value={newPitruForm.preferredTirtha}
                    onChange={(e) => setNewPitruForm({ ...newPitruForm, preferredTirtha: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Gaya Kshetra">Gaya Kshetra (Phalgu River)</option>
                    <option value="Kashi Manikarnika">Kashi Manikarnika (Ganga)</option>
                    <option value="Haridwar Brahma Kund">Haridwar Brahma Kund</option>
                    <option value="Prayagraj Sangam">Prayagraj Triveni Sangam</option>
                    <option value="Local Mandir">Local Mandir Sanctum</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPitruModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Register in Memorial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ASHTAKOOT GUNA MILAN & COMPATIBILITY ENGINE (TAB 3)
      ===================================================================== */}
      {isKundaliModalOpen && selectedCandidateForMilan && activeMilanResult && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/50 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsKundaliModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Vedic Shastric Astrological Engine
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Ashtakoot Guna Milan (36 Points)
              </h3>
              <p className="text-xs text-stone-300">
                Comparing <span className="text-amber-300 font-bold">{currentUserKarta.fullName}</span> ({currentUserKarta.nakshatra}, {currentUserKarta.rashi}) with <span className="text-rose-300 font-bold">{selectedCandidateForMilan.candidateName}</span> ({selectedCandidateForMilan.nakshatra}, {selectedCandidateForMilan.rashi})
              </p>
            </div>

            {/* CRITICAL SAGOTRA HARD BLOCK ALERT */}
            {activeMilanResult.isSagotraBlocked ? (
              <div className="p-5 rounded-2xl bg-rose-950/70 border-2 border-rose-600 text-rose-200 space-y-2 animate-shake">
                <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <span>SAGOTRA HARD BLOCK: Marriage Prohibited</span>
                </div>
                <p className="text-xs leading-relaxed">
                  {activeMilanResult.sagotraDetails}
                </p>
                <div className="text-[11px] text-rose-300/90 pt-2 border-t border-rose-800">
                  Shastric Mandate: Apastamba Grihya Sutra prohibits union between persons who trace ancestry to the same Rishi pravara. This safeguard protects the genetic vigor and purity of the Dharmic kulam.
                </div>
              </div>
            ) : (
              /* Guna Milan Score Banner */
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                activeMilanResult.totalScore >= 33
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                  : activeMilanResult.totalScore >= 25
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : activeMilanResult.totalScore >= 18
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">
                    Total Compatibility Score
                  </span>
                  <div className="text-3xl font-black mt-0.5 flex items-baseline gap-1">
                    <span>{activeMilanResult.totalScore}</span>
                    <span className="text-base text-stone-400">/ 36 Gunas</span>
                  </div>
                  <span className="text-xs font-bold block mt-1">
                    Verdict: {activeMilanResult.verdictTitle}
                  </span>
                </div>

                <div className="text-right sm:max-w-xs text-xs opacity-90">
                  {activeMilanResult.description}
                </div>
              </div>
            )}

            {/* Manglik Reconciliation Panel */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-300">Manglik Dosha Status:</span>
                <span className={`font-black px-2 py-0.5 rounded-full text-[10px] uppercase ${
                  activeMilanResult.manglikMatch.status === 'Harmonious'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {activeMilanResult.manglikMatch.status}
                </span>
              </div>
              <p className="text-stone-400 text-[11px]">{activeMilanResult.manglikMatch.description}</p>
              {activeMilanResult.manglikMatch.remedy && (
                <div className="mt-2 p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px]">
                  <span className="font-bold">Remedial Shanti: </span>
                  {activeMilanResult.manglikMatch.remedy}
                </div>
              )}
            </div>

            {/* 8 Kootas Detailed Breakdown */}
            {!activeMilanResult.isSagotraBlocked && (
              <div className="space-y-2.5">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                  Eightfold Koota Breakdown (36 Gunas)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(activeMilanResult.kootas).map((koota) => {
                    const pct = (koota.obtainedScore / koota.maxScore) * 100;
                    return (
                      <div key={koota.name} className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800/80 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-stone-200">{koota.name}</span>
                          <span className="font-bold text-amber-300">
                            {koota.obtainedScore} / {koota.maxScore}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-stone-400 block">{koota.meaning}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsKundaliModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: CANDIDATE FAMILY VANSHAVALI VIEWER
      ===================================================================== */}
      {isVanshavaliViewModalOpen && selectedCandidateForVanshavali && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setIsVanshavaliViewModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Sanatani Lineage Verification
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {selectedCandidateForVanshavali.candidateName}'s Family Roots
              </h3>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">Paternal Gotra:</span>
                <span className="font-black text-amber-200">{selectedCandidateForVanshavali.gotra}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Pravara Rishis:</span>
                <span className="text-stone-200">{selectedCandidateForVanshavali.pravara}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Kuladevata:</span>
                <span className="text-stone-200">{selectedCandidateForVanshavali.kuladevata}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Mandir Verification:</span>
                <span className="text-emerald-400 font-bold">{selectedCandidateForVanshavali.verificationBadge}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-stone-300 block mb-1">About Family & Traditions:</span>
              <p className="text-stone-300 bg-stone-950/50 p-3 rounded-xl border border-stone-800 leading-relaxed">
                {selectedCandidateForVanshavali.aboutFamily}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVanshavaliViewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: BOOK PINDA DAAN & SHRADH PUROHIT
      ===================================================================== */}
      {isPurohitBookingModalOpen && selectedPitruForBooking && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setIsPurohitBookingModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Purohit Marketplace Bridge
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Book Pinda Daan for {selectedPitruForBooking.ancestorName}
              </h3>
              <p className="text-stone-400">
                Tirtha: {selectedPitruForBooking.preferredTirtha} • Gotra: {selectedPitruForBooking.gotra}
              </p>
            </div>

            <form onSubmit={handleConfirmPurohitBooking} className="space-y-3">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Ritual Service</label>
                <input
                  type="text"
                  disabled
                  value={`Complete Pinda Daan, Tila Tarpanam & Shradh Path (${selectedPitruForBooking.lunarMasa} ${selectedPitruForBooking.lunarTithi})`}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Escrow Dakshina (₹)</label>
                  <input
                    type="number"
                    value={purohitBookingForm.dakshinaAmount}
                    onChange={(e) => setPurohitBookingForm({ ...purohitBookingForm, dakshinaAmount: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-amber-300 font-black"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Execution Date</label>
                  <input
                    type="date"
                    value={purohitBookingForm.bookingDate}
                    onChange={(e) => setPurohitBookingForm({ ...purohitBookingForm, bookingDate: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Sacred Sankalpa Notes</label>
                <textarea
                  rows={2}
                  value={purohitBookingForm.specialSankalp}
                  onChange={(e) => setPurohitBookingForm({ ...purohitBookingForm, specialSankalp: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white"
                />
              </div>

              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-[11px] text-stone-400">
                Dakshina is held safely in Platform Escrow Vault. Released to the Acharya only after live ritual darshan confirmation or receipt validation.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPurohitBookingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Confirm & Lock Escrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: PLAN SACRED VIVAH BRIDGE
      ===================================================================== */}
      {isPlanVivahModalOpen && selectedCandidateForVivahPlan && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-rose-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setIsPlanVivahModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                Sanatani Vivah Bandhan Bridge
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Plan Sacred Union
              </h3>
              <p className="text-stone-300">
                Match confirmed between <span className="text-amber-300 font-bold">{currentUserKarta.fullName}</span> and <span className="text-rose-300 font-bold">{selectedCandidateForVivahPlan.candidateName}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400">Step 1: Shubh Vivah Muhurat</span>
                <p className="text-stone-300">
                  Calculate auspicious lagna and dates through the Vedic Panjika Ephemeris engine.
                </p>
                <div className="text-[11px] text-emerald-400 font-bold">
                  Recommended: Margashirsha Shukla Panchami (Vivah Panchami)
                </div>
              </div>

              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400">Step 2: Temple Kalyana Mandapam</span>
                <p className="text-stone-300">
                  Book sanctum hall at Kashi Mandir or Tirumala Kalyana Mandapam with Satvik Prasadam catering.
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400">Step 3: Mukhya Purohit Assignment</span>
                <p className="text-stone-300">
                  Book Vedic Acharya for Saptapadi, Kanyadaan, and Laja Homa ceremonies.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPlanVivahModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlanVivahModalOpen(false);
                  showToast('Bridged wedding details to Panchang Muhurat and Purohit Desk! 🕉️', 'success');
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black shadow-lg cursor-pointer"
              >
                Bridge to Vivah Desk
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FamilyRootsMatrimonyDesk;
