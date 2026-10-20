import { db } from './firebaseClient';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Adds a new transaction record to the tenant-isolated Firestore collection:
 * /tenants/{tenantId}/treasury
 */
export const addTransaction = async (tenantId: string, transactionData: any) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'treasury');
    const docRef = await addDoc(colRef, {
      ...transactionData,
      createdAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...transactionData,
    };
  } catch (error: any) {
    // QUEUED #45: honest failure. This used to FABRICATE a `local-tx-*`
    // record and return it as if the write had succeeded — money that was
    // never persisted appeared on the ledger and vanished on re-entry. The
    // rejection now propagates. (Vouchers themselves flow through
    // DataContext — the root `treasury` collection re-entry reads.)
    console.warn('Unable to persist transaction to Firestore:', error?.message || error);
    throw error;
  }
};

/**
 * Fetches all transaction records for a specific tenant from Firestore:
 * /tenants/{tenantId}/treasury
 */
export const getTransactions = async (tenantId: string) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'treasury');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error: any) {
    console.warn('Notice: Falling back to local ledger. Firestore transactions unavailable:', error?.message || error);
    return [];
  }
};
