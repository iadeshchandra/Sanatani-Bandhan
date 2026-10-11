import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SevaTier, DevoteeMember, PitruRecord, TreasuryTransaction, PoojaBooking } from '../types';

export interface ShradhReminder {
  ancestorName: string;
  relationship: string;
  shradhDate: Date;
  daysUntil: number;
  canBookPindaDaan: boolean;
}

export interface Festival {
  id?: string;
  name: string;
  date: Date;
  relatedDeities: string[];
}

export interface SevaProgress {
  currentTier: SevaTier;
  progressPercent: number;
  nextTier: SevaTier | null;
  pointsToNextTier: number;
}

export interface FamilySnapshot {
  familyName: string;
  members: DevoteeMember[];
  totalMembers: number;
}

export interface Activity {
  id: string;
  type: 'donation' | 'booking' | 'volunteer';
  date: Date;
  title: string;
  amount?: number;
  status?: string;
}

// Basic lunar-to-gregorian mapping heuristic for Shradh
export const calculateNextShradhDate = (tithiLunar: string, paksha: string): Date => {
  const today = new Date();
  
  // Deterministic fake offset logic: 
  // Normally, Pitru Paksha occurs in Ashwina Krishna Paksha (Sep/Oct).
  // We'll set a basic default target for Pitru Paksha.
  const targetMonth = 8; // September (0-indexed)
  
  const nextDate = new Date(today.getFullYear(), targetMonth, 15);
  
  // If we've passed Sep 15 this year, bump to next year
  if (today.getTime() > nextDate.getTime()) {
    nextDate.setFullYear(today.getFullYear() + 1);
  }
  
  // Spread out deterministically based on string lengths
  const offset = ((tithiLunar?.length || 0) + (paksha?.length || 0)) % 15;
  nextDate.setDate(nextDate.getDate() + offset);

  return nextDate;
};

export const calculateSevaTier = (donations: number, hours: number): SevaTier => {
  if (donations >= 200001 || hours >= 501) return 'Ratna';
  if (donations >= 50001 || hours >= 201) return 'Vishesh';
  if (donations >= 10001 || hours >= 51) return 'Kormi';
  return 'Sadharan';
};

export class PersonalizedReminderService {
  
  static async getUpcomingShradhReminders(devoteeId: string): Promise<ShradhReminder[]> {
    const recordsRef = collection(db, 'pitru_records');
    const q = query(recordsRef, where('devoteeId', '==', devoteeId));
    const snapshot = (await getDocs(q).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
    
    const reminders: ShradhReminder[] = [];
    const today = new Date();
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as PitruRecord;
      if (!data.tithiLunar && !data.tithiOfDemise) return;
      
      const tithiStr = data.tithiLunar || data.tithiOfDemise || '';
      const shradhDate = calculateNextShradhDate(tithiStr, data.paksha || 'Krishna');
      
      const diffTime = shradhDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Return reminders for Shradh dates within next 30 days
      if (diffDays >= 0 && diffDays <= 30) {
        reminders.push({
          ancestorName: data.ancestorName,
          relationship: data.relationship || data.relation || 'Ancestor',
          shradhDate: shradhDate,
          daysUntil: diffDays,
          canBookPindaDaan: true
        });
      }
    });
    
    return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  }
  
  static async getPersonalizedFestivals(devoteeId: string): Promise<Festival[]> {
    // 1. Fetch Devotee
    const devoteeRef = doc(db, 'devotees', devoteeId);
    const devoteeSnap = (await getDoc(devoteeRef).catch(e => { console.warn("Firebase getDoc error", e.message); return { exists: () => false, data: () => null }; }));
    if (!devoteeSnap.exists()) return [];
    
    const devoteeData = devoteeSnap.data() as DevoteeMember;
    const kuladevata = devoteeData.kuladevata;
    
    if (!kuladevata) return [];
    
    // 2. Fetch festivals 
    const festivalsRef = collection(db, 'festivals');
    const q = query(festivalsRef, where('relatedDeities', 'array-contains', kuladevata));
    const festSnap = (await getDocs(q).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
    
    const festivals: Festival[] = [];
    festSnap.forEach(fDoc => {
      const fd = fDoc.data();
      festivals.push({
        id: fDoc.id,
        name: fd.name || fd.festivalName,
        date: fd.dateGregorian ? new Date(fd.dateGregorian) : (fd.date ? new Date(fd.date) : new Date()),
        relatedDeities: fd.relatedDeities || []
      });
    });
    
    const today = new Date();
    // Sort upcoming first
    return festivals
      .filter(f => f.date.getTime() >= today.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }

  static async getSevaProgress(devoteeId: string): Promise<SevaProgress> {
    // 1. Fetch Donations
    const treasuryRef = collection(db, 'treasury');
    const qTreasury = query(treasuryRef, where('devoteeId', '==', devoteeId), where('type', '==', 'Income'));
    const treasurySnap = (await getDocs(qTreasury).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
    
    let totalDonations = 0;
    treasurySnap.forEach(tDoc => {
      const td = tDoc.data() as TreasuryTransaction;
      totalDonations += (td.amount || 0);
    });
    
    // 2. Fetch Volunteer Hours (If stored on devotee doc)
    const devoteeRef = doc(db, 'devotees', devoteeId);
    const devoteeSnap = (await getDoc(devoteeRef).catch(e => { console.warn("Firebase getDoc error", e.message); return { exists: () => false, data: () => null }; }));
    let volunteerHours = 0;
    if (devoteeSnap.exists()) {
      const dd = devoteeSnap.data();
      // Graceful fallback if volunteerHours does not exist natively
      volunteerHours = dd.volunteerHours || dd.sevaHours || 0;
    }
    
    const currentTier = calculateSevaTier(totalDonations, volunteerHours);
    
    let nextTier: SevaTier | null = null;
    let targetDonations = 0;
    let targetHours = 0;
    let progressPercent = 100;
    let pointsToNextTier = 0; 
    
    if (currentTier === 'Sadharan') {
      nextTier = 'Kormi';
      targetDonations = 10001;
      targetHours = 51;
    } else if (currentTier === 'Kormi') {
      nextTier = 'Vishesh';
      targetDonations = 50001;
      targetHours = 201;
    } else if (currentTier === 'Vishesh') {
      nextTier = 'Ratna';
      targetDonations = 200001;
      targetHours = 501;
    }
    
    if (nextTier) {
      const donationProgress = Math.min(100, (totalDonations / targetDonations) * 100);
      const hoursProgress = Math.min(100, (volunteerHours / targetHours) * 100);
      progressPercent = Math.max(donationProgress, hoursProgress);
      pointsToNextTier = targetDonations - totalDonations; 
      if (pointsToNextTier < 0) pointsToNextTier = 0;
    }
    
    return {
      currentTier,
      progressPercent: Math.round(progressPercent),
      nextTier,
      pointsToNextTier
    };
  }

  static async getFamilySnapshot(devoteeId: string): Promise<FamilySnapshot> {
    const devoteeRef = doc(db, 'devotees', devoteeId);
    const devoteeSnap = (await getDoc(devoteeRef).catch(e => { console.warn("Firebase getDoc error", e.message); return { exists: () => false, data: () => null }; }));
    if (!devoteeSnap.exists()) {
      return { familyName: 'Unknown', members: [], totalMembers: 0 };
    }
    
    const devoteeData = devoteeSnap.data() as DevoteeMember;
    const familyId = devoteeData.familyId;
    
    if (!familyId) {
      return { 
        familyName: `${devoteeData.gotra || devoteeData.fullName || devoteeData.name || 'Member'} Parivar`, 
        members: [devoteeData], 
        totalMembers: 1 
      };
    }
    
    const devoteesRef = collection(db, 'devotees');
    const q = query(devoteesRef, where('familyId', '==', familyId));
    const familySnap = (await getDocs(q).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
    
    const members: DevoteeMember[] = [];
    familySnap.forEach(d => {
      members.push({ id: d.id, ...d.data() } as DevoteeMember);
    });
    
    // Sort logic: if self, first. Then others by name.
    members.sort((a, b) => {
      if (a.id === devoteeId) return -1;
      if (b.id === devoteeId) return 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
    
    return {
      familyName: `${members[0]?.gotra || 'Family'} Parivar`,
      members,
      totalMembers: members.length
    };
  }

  static async getRecentActivity(devoteeId: string, limitCount: number = 10): Promise<Activity[]> {
    const activities: Activity[] = [];
    
    // Fetch Donations (Fetch all matching, sort in memory to avoid index errors)
    const treasuryRef = collection(db, 'treasury');
    const qTreasury = query(treasuryRef, where('devoteeId', '==', devoteeId), where('type', '==', 'Income'));
    const tSnap = (await getDocs(qTreasury).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
    
    tSnap.forEach(tDoc => {
      const d = tDoc.data() as TreasuryTransaction;
      activities.push({
        id: tDoc.id,
        type: 'donation',
        date: new Date(d.date),
        title: d.category || 'Donation',
        amount: d.amount,
        status: 'completed'
      });
    });
    
    // Fetch Bookings
    const bookingsRef = collection(db, 'pooja_bookings');
    const qBookings = query(bookingsRef, where('devoteeId', '==', devoteeId));
    const bSnap = (await getDocs(qBookings).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
    
    bSnap.forEach(bDoc => {
      const d = bDoc.data() as PoojaBooking;
      activities.push({
        id: bDoc.id,
        type: 'booking',
        date: d.bookingDate ? new Date(d.bookingDate) : new Date(),
        title: d.poojaName || 'Pooja Booking',
        status: 'confirmed'
      });
    });
    
    // Merge, sort, and slice
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return activities.slice(0, limitCount);
  }
}
