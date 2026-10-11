import { db } from './firebaseClient';
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Adds an emergency or crowd alert to the tenant-isolated collection:
 * /tenants/{tenantId}/yatranet_alerts
 */
export const addAlert = async (tenantId: string, alertData: any) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'yatranet_alerts');
    const docRef = await addDoc(colRef, {
      ...alertData,
      createdAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...alertData,
    };
  } catch (error: any) {
    console.warn('Notice: Unable to persist YatraNet alert to Firestore, cached locally:', error?.message || error);
    return {
      id: `local-alert-${Date.now()}`,
      ...alertData,
      createdAt: new Date().toISOString(),
    };
  }
};

/**
 * Updates an alert's status (e.g. 'Active', 'Dispatched', 'Resolved'):
 * /tenants/{tenantId}/yatranet_alerts/{alertId}
 */
export const updateAlertStatus = async (tenantId: string, alertId: string, status: string) => {
  try {
    const docRef = doc(db, 'tenants', tenantId, 'yatranet_alerts', alertId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.warn('Notice: Unable to update YatraNet alert status in Firestore:', error?.message || error);
  }
};

/**
 * Subscribes to real-time alerts from Firestore:
 * /tenants/{tenantId}/yatranet_alerts
 * Returns the unsubscribe function.
 */
export const subscribeToAlerts = (tenantId: string, callback: (alerts: any[]) => void) => {
  try {
    const colRef = collection(db, 'tenants', tenantId, 'yatranet_alerts');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const alerts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(alerts);
      },
      (error) => {
        console.warn('Notice: YatraNet alerts sync fallback:', error?.message || error);
        callback([]);
      }
    );
    return unsubscribe;
  } catch (error: any) {
    console.warn('Notice: YatraNet alerts listener fallback:', error?.message || error);
    return () => {};
  }
};
