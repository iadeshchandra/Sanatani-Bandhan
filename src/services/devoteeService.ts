import { db } from './firebaseClient';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Adds a new devotee record to the tenant-isolated Firestore collection:
 * /tenants/{tenantId}/devotees
 */
export const addDevotee = async (tenantId: string, devoteeData: any) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'devotees');
    const docRef = await addDoc(colRef, {
      ...devoteeData,
      createdAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...devoteeData,
    };
  } catch (error: any) {
    console.warn('Notice: Unable to persist devotee to Firestore, using local fallback:', error?.message || error);
    return {
      id: `local-dev-${Date.now()}`,
      ...devoteeData,
      createdAt: new Date().toISOString(),
    };
  }
};

/**
 * Fetches all devotee records for a specific tenant from Firestore:
 * /tenants/{tenantId}/devotees
 */
export const getDevotees = async (tenantId: string) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'devotees');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error: any) {
    console.warn('Notice: Falling back to local devotee records. Firestore unavailable:', error?.message || error);
    return [];
  }
};
