/**
 * Sanatani B2C & Devotee Super App Ecosystem Types
 * Phase 9: B2B2C Expansion
 */

export interface DevoteeProfile {
  id: string;
  name: string;
  gotra: string;
  ishtaDevata: string;
  punyaMudras: number;
  yatraPassport: string[];
  phone?: string;
  email?: string;
  nakshatra?: string;
  rashi?: string;
  streakDays?: number;
  avatarUrl?: string;
}

export interface SevaBooking {
  id: string;
  type: 'Puja' | 'Annadanam' | 'Goshala';
  sankalpDetails: {
    devoteeName: string;
    gotra: string;
    nakshatra?: string;
    intention: string;
  };
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  b2bWorkspaceId: string;
  workspaceName?: string;
  amount?: number;
  bookingDate?: string;
  muhurat?: string;
}

export interface PurohitGig {
  id: string;
  name: string;
  sect: string;
  language: string;
  rating: number;
  hourlyRate: number;
  experienceYears?: number;
  specialization?: string[];
  verified?: boolean;
  avatarUrl?: string;
  location?: string;
}

export interface VivahProfile {
  id: string;
  userId: string;
  nakshatra: string;
  rashi: string;
  manglikStatus: 'Manglik' | 'Non-Manglik' | 'Anshik Manglik';
  name?: string;
  age?: number;
  gotra?: string;
  profession?: string;
  verified?: boolean;
}

export interface OfflineSyncPacket {
  id: string;
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced';
  type?: string;
  retryCount?: number;
}
