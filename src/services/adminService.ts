import { db, auth } from './firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  location: string;
  state: string;
  tier: 'Enterprise' | 'Heritage' | 'Standard' | 'Starter';
  custodian: string;
  devoteeCount: string;
  onboardedDate: string;
  status: 'Active' | 'Pending Verification' | 'Trial Mode';
  [key: string]: any;
}

export const DEFAULT_TENANTS: TenantRecord[] = [
  {
    id: 'DEMO_ws-mandir',
    name: 'Kashi Vishwanath Trust & Temple',
    code: 'MND-KSH-108',
    location: 'Varanasi',
    state: 'Uttar Pradesh',
    tier: 'Enterprise',
    custodian: 'Sri Mahant Kashi Naresh',
    devoteeCount: '185,000+',
    onboardedDate: '15 Jan 2024',
    status: 'Active',
  },
  {
    id: 'DEMO_ws-samiti',
    name: 'Ayodhya Seva Samiti & Dharmada',
    code: 'TR-AYD-440',
    location: 'Ayodhya',
    state: 'Uttar Pradesh',
    tier: 'Enterprise',
    custodian: 'Nripendra Misra',
    devoteeCount: '240,000+',
    onboardedDate: '22 Jan 2024',
    status: 'Active',
  },
  {
    id: 'DEMO_ws-goshala',
    name: 'Surabhi Gau Seva Dham & Ashram',
    code: 'GSH-VRN-882',
    location: 'Vrindavan',
    state: 'Uttar Pradesh',
    tier: 'Heritage',
    custodian: 'Swami Govind Dev Giri',
    devoteeCount: '42,500+',
    onboardedDate: '02 Mar 2024',
    status: 'Active',
  },
  {
    id: 'DEMO_ws-vidyapeeth',
    name: 'Shree Somnath Sanskrit Gurukul',
    code: 'GRK-SMN-301',
    location: 'Prabhas Patan',
    state: 'Gujarat',
    tier: 'Standard',
    custodian: 'Acharya Ramanujacharya',
    devoteeCount: '15,200+',
    onboardedDate: '10 Apr 2024',
    status: 'Active',
  },
  {
    id: 'DEMO_ws-sangha',
    name: 'Bharat Dharma Raksha Sangha',
    code: 'SNG-NGP-550',
    location: 'Nagpur',
    state: 'Maharashtra',
    tier: 'Standard',
    custodian: 'Prant Sangha Karyavah',
    devoteeCount: '31,000+',
    onboardedDate: '18 May 2024',
    status: 'Active',
  },
];

/**
 * Fetches and returns all documents from the root `tenants` collection in Firestore.
 * If Firestore permissions are restricted or collection is empty, gracefully falls back to default cluster tenants.
 */
export const getTenants = async (): Promise<TenantRecord[]> => {
  try {
    const colRef = collection(db, 'tenants');
    const snapshot = await getDocs(colRef);
    if (!snapshot || snapshot.empty) {
      return DEFAULT_TENANTS;
    }
    const tenants: TenantRecord[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || docSnap.id,
        code: data.code || docSnap.id.toUpperCase(),
        location: data.location || data.city || 'India',
        state: data.state || 'Dharmic Kshetra',
        tier: (data.tier as any) || 'Enterprise',
        custodian: data.custodian || 'Chief Trustee',
        devoteeCount: data.devoteeCount || (data.devoteesCount ? data.devoteesCount.toLocaleString('en-IN') : '10,000+'),
        onboardedDate: data.onboardedDate || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Jan 2025'),
        status: (data.status as any) || 'Active',
        ...data,
      };
    });
    return tenants;
  } catch (error) {
    // Graceful fallback when Firestore is unauthenticated or restricted
    return DEFAULT_TENANTS;
  }
};

export const fetchTenants = getTenants;

/**
 * Provisions a new Mandir tenant partition via Node.js Express backend
 */
export const provisionTenant = async (tenantData: any): Promise<any> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated. Please log in as Super Admin.');
  }

  const token = await currentUser.getIdToken();
  if (!token) {
    throw new Error('Failed to retrieve authentication token.');
  }

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const response = await fetch(`${backendUrl}/api/admin/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(tenantData),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || errorBody?.error || `Failed to provision tenant: Status ${response.status}`);
  }

  return await response.json();
};

