import React, { createContext, useContext, useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { startDemoBackgroundService } from '../lib/dbUtils';

interface InitialData {
  sanatani_workspaces?: any;
  sanatani_active_workspace_id?: any;
  sanatani_user_role?: any;
  sanatani_current_devotee?: any;
  sb_devotees?: any;
  sb_families?: any;
  sb_vanshavali?: any;
  sb_guests?: any;
  sb_treasury?: any;
  sb_assets?: any;
  sb_inventory?: any;
  sb_pooja_bookings?: any;
  sanatani_app_lang?: any;
}

const InitialDataContext = createContext<InitialData | null>(null);

export const useInitialData = () => {
  const ctx = useContext(InitialDataContext);
  if (!ctx) throw new Error('useInitialData outside provider');
  return ctx;
};

const keys = [
  'sanatani_workspaces',
  'sanatani_active_workspace_id',
  'sanatani_user_role',
  'sanatani_current_devotee',
  'sb_devotees',
  'sb_families',
  'sb_vanshavali',
  'sb_guests',
  'sb_treasury',
  'sb_assets',
  'sb_inventory',
  'sb_pooja_bookings',
  'sanatani_app_lang'
];

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<InitialData | null>(null);

  useEffect(() => {
    // Initialize 24h auto-cleanup daemon
    const cleanupDaemon = startDemoBackgroundService();

    // Existing load

    const load = async () => {
      const loaded: any = {};
      for (const key of keys) {
        let val = await get(key);
        if (val === undefined) {
          // Migration from localStorage
          const lsVal = localStorage.getItem(key);
          if (lsVal) {
            try {
              val = JSON.parse(lsVal);
            } catch {
              val = lsVal;
            }
            // Save to idb for future
            await set(key, val);
          }
        }
        loaded[key] = val;
      }
      setData(loaded);
    };
    load();

    return () => {
      cleanupDaemon();
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return <InitialDataContext.Provider value={data}>{children}</InitialDataContext.Provider>;
};
