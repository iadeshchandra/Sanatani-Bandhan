/* Annakshetra One — kitchen & bhandara management types.
 *
 * Offline-first: kitchen records are device-local (own store, never
 * DataContext). Only treasury postings (bhandara sponsorships, kitchen
 * purchases) travel to the cloud via useData().addTreasuryTransaction.
 */

export type Unit = 'kg' | 'litre' | 'pcs' | 'packet' | 'bundle';

export interface KitchenItem {
  id: string;
  /** e.g. 'Basmati rice', 'Toor dal', 'Ghee' */
  name: string;
  unit: Unit;
  /** Current stock in `unit`. */
  stock: number;
  /** Alert when stock <= this. */
  lowStockAt: number;
  /** Last purchase rate (₹ per unit) — drives recipe cost estimates. */
  lastPurchaseRate?: number;
  notes?: string;
}

export interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  unit: Unit;
  amount: number;
  vendor?: string;
  date: string; // yyyy-mm-dd
  receiptNo: string;
  treasuryTxId?: string; // 'posted'
  paymentMode?: string;
}

/** One line of a recipe BOM: quantity of an item per 100 servings. */
export interface RecipeIngredient {
  itemId: string;
  qtyPer100: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'prasad' | 'sweet' | 'other';
  ingredients: RecipeIngredient[];
  notes?: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'prasad';

export interface MenuPlan {
  id: string;
  date: string; // yyyy-mm-dd
  slot: MealSlot;
  recipeIds: string[];
  servings: number;
  cooked: boolean;
  cookedAt?: string;
}

export interface Bhandara {
  id: string;
  name: string;
  occasion: string;
  date: string; // yyyy-mm-dd
  sponsorName: string;
  sponsorPhone?: string;
  expectedCount: number;
  servedCount?: number;
  recipeIds: string[];
  servingsPlanned: number;
  donationAmount: number;
  /** Honest 80G: true only when the institution holds 80G registration. */
  is80GEligible: boolean;
  taxReceiptIssued: boolean;
  receiptNo: string;
  treasuryTxId?: string; // 'posted'
  status: 'planned' | 'completed' | 'cancelled';
}

export interface MealLog {
  id: string;
  date: string; // yyyy-mm-dd
  breakfast: number;
  lunch: number;
  dinner: number;
  prasad: number;
  notes?: string;
}

export interface Wastage {
  id: string;
  date: string; // yyyy-mm-dd
  itemName: string;
  qty: number;
  unit: string;
  reason: string;
}

export interface AnnakshetraSettings {
  defaultServings: number;
}

export interface AnnakshetraState {
  items: KitchenItem[];
  purchases: Purchase[];
  recipes: Recipe[];
  menus: MenuPlan[];
  bhandaras: Bhandara[];
  meals: MealLog[];
  wastage: Wastage[];
  settings: AnnakshetraSettings;
}
