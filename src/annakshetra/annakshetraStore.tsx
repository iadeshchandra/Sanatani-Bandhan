import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { allowsSeedData } from '../lib/workspaceKind';
import { purgePersistedSeedState } from '../lib/seedPurge';
import {
  AnnakshetraState, AnnakshetraSettings, Bhandara, KitchenItem, MealLog,
  MenuPlan, Purchase, Recipe, Wastage,
} from './types';

/* ------------------------------------------------------------------ */
/* Annakshetra One store — offline-first, per-workspace localStorage.  */
/* Kitchen inventory, recipes, menus, bhandaras, meal counts and       */
/* wastage live on this device; money (bhandara sponsorships, kitchen  */
/* purchases) ALSO posts to treasury, which has the cloud path.        */
/* New data-layer module — DataContext is never touched (transport     */
/* limit).                                                            */
/*                                                                     */
/* COOK CORRECTNESS: cooking a menu deducts each recipe's BOM scaled   */
/* to the servings count. Deduction is atomic per menu: if any         */
/* ingredient is short, nothing is deducted and the shortfall list is  */
/* returned so the cook can purchase first.                            */
/* ------------------------------------------------------------------ */

type EntityKey = 'items' | 'purchases' | 'recipes' | 'menus' | 'bhandaras' | 'meals' | 'wastage';

const EMPTY: AnnakshetraState = {
  items: [], purchases: [], recipes: [], menus: [],
  bhandaras: [], meals: [], wastage: [],
  settings: { defaultServings: 100 },
};

const storageKey = (ws: string) => `sb_annakshetra_${ws}`;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysFrom = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ------------------------- derived helpers ------------------------- */

/** Items at or below their low-stock threshold. */
export function lowStockItems(state: AnnakshetraState): KitchenItem[] {
  return state.items.filter((i) => i.stock <= i.lowStockAt);
}

/** Total quantity of an item needed to cook `recipeIds` for `servings`. */
export function bomFor(
  recipeIds: string[], servings: number, state: AnnakshetraState,
): Array<{ itemId: string; name: string; unit: string; need: number; have: number }> {
  const need = new Map<string, number>();
  for (const rid of recipeIds) {
    const r = state.recipes.find((x) => x.id === rid);
    if (!r) continue;
    for (const ing of r.ingredients) {
      need.set(ing.itemId, (need.get(ing.itemId) || 0) + (ing.qtyPer100 * servings) / 100);
    }
  }
  return [...need.entries()].map(([itemId, qty]) => {
    const it = state.items.find((x) => x.id === itemId);
    return {
      itemId, need: Math.round(qty * 100) / 100,
      name: it?.name || '(removed item)',
      unit: it?.unit || 'kg',
      have: it?.stock ?? 0,
    };
  });
}

/** Shortfalls (need > have) for a planned cook — empty means it can cook. */
export function cookShortfalls(
  recipeIds: string[], servings: number, state: AnnakshetraState,
) {
  return bomFor(recipeIds, servings, state).filter((b) => b.need > b.have + 1e-9);
}

/** Estimated cost (₹) of cooking `recipeIds` for `servings`, from last purchase rates. */
export function estimateCost(
  recipeIds: string[], servings: number, state: AnnakshetraState,
): number {
  let total = 0;
  for (const b of bomFor(recipeIds, servings, state)) {
    const it = state.items.find((x) => x.id === b.itemId);
    total += b.need * (it?.lastPurchaseRate ?? 0);
  }
  return Math.round(total);
}

/** Total meals served across all logs (or within [from, to]). */
export function totalMeals(state: AnnakshetraState, from?: string, to?: string): number {
  return state.meals
    .filter((m) => (!from || m.date >= from) && (!to || m.date <= to))
    .reduce((s, m) => s + m.breakfast + m.lunch + m.dinner + m.prasad, 0);
}

function loadState(ws: string): AnnakshetraState {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      // QUEUED #53: one-time purge of pre-law persisted seed residue
      // (real workspaces only; exact seed-id match — see lib/seedPurge).
      return purgePersistedSeedState('annakshetra', ws, { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
    }
  } catch { /* corrupted → reseed */ }
  return { ...EMPTY };
}

/* ------------------------- demo seed ------------------------- */
function buildSeed(): AnnakshetraState {
  const items: KitchenItem[] = [
    { id: 'it_rice', name: 'Rice (basmati)', unit: 'kg', stock: 120, lowStockAt: 25, lastPurchaseRate: 68 },
    { id: 'it_dal', name: 'Toor dal', unit: 'kg', stock: 45, lowStockAt: 10, lastPurchaseRate: 145 },
    { id: 'it_atta', name: 'Wheat atta', unit: 'kg', stock: 80, lowStockAt: 20, lastPurchaseRate: 42 },
    { id: 'it_oil', name: 'Mustard oil', unit: 'litre', stock: 18, lowStockAt: 5, lastPurchaseRate: 190 },
    { id: 'it_ghee', name: 'Desi ghee', unit: 'kg', stock: 9, lowStockAt: 3, lastPurchaseRate: 620 },
    { id: 'it_sugar', name: 'Sugar', unit: 'kg', stock: 30, lowStockAt: 8, lastPurchaseRate: 44 },
    { id: 'it_milk', name: 'Milk', unit: 'litre', stock: 25, lowStockAt: 10, lastPurchaseRate: 58 },
    { id: 'it_potato', name: 'Potato', unit: 'kg', stock: 40, lowStockAt: 12, lastPurchaseRate: 28 },
    { id: 'it_onion', name: 'Onion', unit: 'kg', stock: 22, lowStockAt: 8, lastPurchaseRate: 34 },
    { id: 'it_salt', name: 'Salt & spices', unit: 'kg', stock: 15, lowStockAt: 3, lastPurchaseRate: 120 },
  ];
  const recipes: Recipe[] = [
    {
      id: 'rc_khichdi', name: 'Moong Dal Khichdi', category: 'lunch',
      ingredients: [
        { itemId: 'it_rice', qtyPer100: 12 },
        { itemId: 'it_dal', qtyPer100: 6 },
        { itemId: 'it_oil', qtyPer100: 2 },
        { itemId: 'it_salt', qtyPer100: 1 },
      ],
      notes: 'Standard bhandara khichdi — serves with ghee tadka',
    },
    {
      id: 'rc_purisabzi', name: 'Puri + Aloo Sabzi', category: 'dinner',
      ingredients: [
        { itemId: 'it_atta', qtyPer100: 10 },
        { itemId: 'it_potato', qtyPer100: 12 },
        { itemId: 'it_onion', qtyPer100: 4 },
        { itemId: 'it_oil', qtyPer100: 4 },
      ],
    },
    {
      id: 'rc_kheer', name: 'Chawal ki Kheer', category: 'sweet',
      ingredients: [
        { itemId: 'it_rice', qtyPer100: 3 },
        { itemId: 'it_milk', qtyPer100: 25 },
        { itemId: 'it_sugar', qtyPer100: 6 },
      ],
      notes: 'Prasad sweet — slow-cooked',
    },
  ];
  const bhandaras: Bhandara[] = [
    {
      id: 'bh_seed1', name: 'Ekadashi Bhandara', occasion: 'Ekadashi', date: daysFrom(6),
      sponsorName: 'Shri Ramesh Agarwal', expectedCount: 500,
      recipeIds: ['rc_khichdi', 'rc_kheer'], servingsPlanned: 500,
      donationAmount: 21000, is80GEligible: false, taxReceiptIssued: false,
      receiptNo: 'SEED', status: 'planned',
    },
  ];
  const meals: MealLog[] = [
    { id: 'ml_1', date: daysFrom(-1), breakfast: 60, lunch: 180, dinner: 150, prasad: 220 },
    { id: 'ml_2', date: todayISO(), breakfast: 55, lunch: 0, dinner: 0, prasad: 120 },
  ];
  return {
    ...EMPTY, items, recipes, bhandaras, meals,
    settings: { defaultServings: 100 },
  };
}

/* ------------------------- context ------------------------- */
interface AnnakshetraCtx {
  state: AnnakshetraState;
  workspaceId: string;
  add: <K extends EntityKey>(key: K, item: AnnakshetraState[K] extends Array<infer T> ? T : never) => void;
  update: <K extends EntityKey>(key: K, id: string, patch: Partial<AnnakshetraState[K] extends Array<infer T> ? T : never>) => void;
  remove: (key: EntityKey, id: string) => void;
  setSettings: (patch: Partial<AnnakshetraSettings>) => void;
  /** Atomic cook: deduct BOM for a menu's recipes×servings. Returns shortfalls (empty = cooked). */
  cookMenu: (menu: MenuPlan) => Array<{ name: string; need: number; have: number; unit: string }>;
  /** Record a purchase: adds stock AND returns the purchase record (caller posts to treasury). */
  recordPurchase: (p: Omit<Purchase, 'id' | 'itemName' | 'unit'>) => Purchase;
  ensureSeeded: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<AnnakshetraCtx | null>(null);

export const AnnakshetraProvider: React.FC<{ workspaceId: string; children: React.ReactNode }> = ({ workspaceId, children }) => {
  const [state, setState] = useState<AnnakshetraState>(() => loadState(workspaceId));
  const wsRef = useRef(workspaceId);
  useEffect(() => {
    if (wsRef.current !== workspaceId) { wsRef.current = workspaceId; setState(loadState(workspaceId)); }
  }, [workspaceId]);
  useEffect(() => {
    try { localStorage.setItem(storageKey(wsRef.current), JSON.stringify(state)); } catch { /* quota → keep in memory */ }
  }, [state]);

  const api = useMemo<AnnakshetraCtx>(() => ({
    state,
    workspaceId,
    add: (key, item) => setState((s) => ({ ...s, [key]: [...(s[key] as unknown[]), item] })),
    update: (key, id, patch) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
    remove: (key, id) => setState((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    cookMenu: (menu) => {
      const short = cookShortfalls(menu.recipeIds, menu.servings, state);
      if (short.length) return short;
      const bom = bomFor(menu.recipeIds, menu.servings, state);
      setState((s) => ({
        ...s,
        items: s.items.map((it) => {
          const line = bom.find((b) => b.itemId === it.id);
          return line ? { ...it, stock: Math.max(0, Math.round((it.stock - line.need) * 100) / 100) } : it;
        }),
        menus: s.menus.map((m) => (m.id === menu.id ? { ...m, cooked: true, cookedAt: new Date().toISOString() } : m)),
      }));
      return [];
    },
    recordPurchase: (p) => {
      const item = state.items.find((i) => i.id === p.itemId);
      const rec: Purchase = {
        ...p, id: uid('pu'),
        itemName: item?.name || '', unit: item?.unit || 'kg',
      };
      setState((s) => ({
        ...s,
        purchases: [...s.purchases, rec],
        items: s.items.map((it) => it.id === p.itemId
          ? { ...it, stock: Math.round((it.stock + p.qty) * 100) / 100, lastPurchaseRate: p.qty > 0 ? Math.round((p.amount / p.qty) * 100) / 100 : it.lastPurchaseRate }
          : it),
      }));
      return rec;
    },
    ensureSeeded: () => {
      // QUEUED #45 seed law: fictitious seed data hydrates ONLY in an
      // explicit demo context. In a real workspace an empty store
      // stays EMPTY — no phantom herds, rooms, meals or members.
      if (!allowsSeedData(workspaceId)) return;
      setState((s) => (s.items.length ? s : buildSeed()));
    },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.items)) return false;
        setState({ ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...(parsed.settings || {}) } });
        return true;
      } catch { return false; }
    },
    resetAll: () => setState(allowsSeedData(workspaceId) ? buildSeed() : EMPTY),
  }), [state, workspaceId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useAnnakshetra = (): AnnakshetraCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnnakshetra must be used inside AnnakshetraProvider');
  return ctx;
};
