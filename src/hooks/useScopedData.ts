import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy as fsOrderBy, limit as fsLimit, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

const useCollection = <T>(
  collectionName: string,
  filters: Record<string, any> = {},
  options: {
    limit?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
    realtime?: boolean;
  } = {}
) => {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    // If blocked by authorization
    if (filters._unauthorized) {
      setData([]);
      return;
    }

    const constraints: QueryConstraint[] = [];
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
        if (key !== '_unauthorized') {
           constraints.push(where(key, '==', value));
        }
    });

    // In-memory sort will be applied after fetching to avoid requiring composite indexes
    // (No fsOrderBy added to constraints)
    if (options.limit) {
      constraints.push(fsLimit(options.limit));
    }

    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as T);
      if (options.orderBy) {
        const { field, direction } = options.orderBy;
        items.sort((a: any, b: any) => {
          if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
          if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      setData(items);
    }, (error) => {
      console.warn(`Firebase sync warning for ${collectionName}:`, error.message);
    });

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(filters), JSON.stringify(options)]);

  return data;
};

export const useScopedData = <T>(
  collectionName: string,
  customFilters: Record<string, any> = {},
  options: {
    limit?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
    realtime?: boolean;
  } = {}
) => {
  const { currentUser, activeWorkspace, firebaseUser } = useAuthWorkspace();
  
  // Build RBAC filters
  const rbacFilters = useMemo(() => {
    if (!currentUser || !activeWorkspace || !firebaseUser || currentUser.id === 'temp-devotee-id') {
      return { _unauthorized: true };
    }

    const roleUpper = (currentUser.role || '').toUpperCase();
    const uid = currentUser.id;

    // Always filter by activeWorkspace.id to prevent cross-workspace data leakage
    const baseFilter: Record<string, any> = { workspaceId: activeWorkspace.id };

    // 'audit_logs' collection: Only TRUSTEE/SUPER_ADMIN can access
    if (collectionName === 'audit_logs') {
       if (roleUpper !== 'TRUSTEE' && roleUpper !== 'SUPER_ADMIN' && roleUpper !== 'SUPERADMIN') {
          return { ...baseFilter, _unauthorized: true };
       }
    }

    // ACCOUNTANT, TRUSTEE, SUPER_ADMIN: See all workspace data
    if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN' || roleUpper === 'TRUSTEE' || roleUpper === 'ACCOUNTANT') {
      return baseFilter;
    }

    // DEVOTEE: Only see data where devoteeId === currentUser.uid
    if (roleUpper === 'DEVOTEE') {
      if (collectionName === 'devotees') {
         return { ...baseFilter, id: uid };
      }
      if (collectionName === 'treasury') {
         return { ...baseFilter, devoteeId: uid };
      }
      if (collectionName === 'pooja_bookings') {
         return { ...baseFilter, devoteeId: uid };
      }
      return { ...baseFilter, devoteeId: uid };
    }

    // PUROHIT / PRIEST: See data where assignedPurohit === currentUser.uid OR workspace data
    if (roleUpper === 'PUROHIT' || roleUpper === 'PRIEST') {
      if (collectionName === 'pooja_bookings') {
         return { ...baseFilter, assignedPurohit: uid };
      }
      return baseFilter;
    }

    return baseFilter;
  }, [currentUser, activeWorkspace, collectionName]);
  
  // Merge with custom filters, but ensure authoritative RBAC filters always win
  const finalFilters = { ...customFilters, ...rbacFilters };
  
  // Use existing useCollection hook with final filters
  return useCollection<T>(collectionName, finalFilters, options);
};
