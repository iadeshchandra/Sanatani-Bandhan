import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

export function useFirestoreCollection<T extends { id: string, workspaceId?: string }>(
  collectionName: string,
  initialData: T[]
) {
  const { activeWorkspace, isAuthenticated, firebaseUser } = useAuthWorkspace();
  const [data, setData] = useState<T[]>(initialData);

  useEffect(() => {
    if (!activeWorkspace?.id || !isAuthenticated || !firebaseUser) return;
    
    // Only fetch records for the active workspace
    const q = query(
      collection(db, collectionName), 
      where("workspaceId", "==", activeWorkspace.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => doc.data() as T);
        setData(items);
      }
    }, (error) => {
      console.warn(`Firebase sync warning for ${collectionName}:`, error.message);
    });

    return () => unsubscribe();
  }, [collectionName, activeWorkspace?.id]);

  const add = async (item: T) => {
    try {
      await setDoc(doc(db, collectionName, item.id), item);
    } catch (e) {
      console.error("Error adding doc: ", e);
    }
  };

  const update = async (id: string, updates: Partial<T>) => {
    try {
      await setDoc(doc(db, collectionName, id), updates, { merge: true });
    } catch (e) {
      console.error("Error updating doc: ", e);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error("Error deleting doc: ", e);
    }
  };

  return { data, setData, add, update, remove };
}
