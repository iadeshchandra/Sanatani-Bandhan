import React, { useState } from 'react';
import {
  Package,
  ChefHat,
  Scale,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles,
  ArrowRight,
  Flame,
  Utensils,
  History,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface RawMaterial {
  id: string;
  name: string;
  unit: 'kg' | 'L' | 'pcs';
  currentStock: number;
  reorderLevel: number;
  category?: string;
}

export interface RecipeIngredient {
  materialId: string;
  qtyRequired: number;
}

export interface Recipe {
  id: string;
  name: string;
  batchYield: string;
  category: string;
  description: string;
  ingredients: RecipeIngredient[];
}

interface ProductionLog {
  id: string;
  recipeName: string;
  batches: number;
  yieldReport: string;
  timestamp: string;
}

const INITIAL_MATERIALS: RawMaterial[] = [
  { id: 'mat-1', name: 'Shuddha Desi Ghee', unit: 'L', currentStock: 45, reorderLevel: 20, category: 'Dairy & Fats' },
  { id: 'mat-2', name: 'Premium Gram Flour (Besan)', unit: 'kg', currentStock: 120, reorderLevel: 50, category: 'Flours & Grains' },
  { id: 'mat-3', name: 'Khandsari Desi Sugar (Bura)', unit: 'kg', currentStock: 80, reorderLevel: 40, category: 'Sweeteners' },
  { id: 'mat-4', name: 'Basmati Gobindobhog Rice', unit: 'kg', currentStock: 250, reorderLevel: 100, category: 'Flours & Grains' },
  { id: 'mat-5', name: 'Moong Dal (Dhuli)', unit: 'kg', currentStock: 95, reorderLevel: 40, category: 'Pulses' },
  { id: 'mat-6', name: 'Green Cardamom (Elaichi)', unit: 'kg', currentStock: 3.5, reorderLevel: 3, category: 'Spices' },
  { id: 'mat-7', name: 'Kaju & Badam (Dry Fruits)', unit: 'kg', currentStock: 18, reorderLevel: 10, category: 'Dry Fruits' },
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    name: 'Shree Mahaprasad Besan Ladoo',
    batchYield: '100 Sacred Ladoos (50g each)',
    category: 'Naivedyam',
    description: 'Traditional Tirupati & Kashi style roasted gram flour ladoo infused with pure desi ghee and cardamom.',
    ingredients: [
      { materialId: 'mat-2', qtyRequired: 10 },    // 10 kg Besan
      { materialId: 'mat-1', qtyRequired: 6 },     // 6 L Ghee
      { materialId: 'mat-3', qtyRequired: 12 },    // 12 kg Sugar
      { materialId: 'mat-6', qtyRequired: 0.2 },   // 0.2 kg Elaichi
      { materialId: 'mat-7', qtyRequired: 1.5 },   // 1.5 kg Dry Fruits
    ],
  },
  {
    id: 'rec-2',
    name: 'Maha Annadanam Khichdi',
    batchYield: '100 Portions Annadanam',
    category: 'Annadanam',
    description: 'Nutritious Gobindobhog rice and yellow moong dal cooked with ghee, cumin, and rock salt for mass distribution.',
    ingredients: [
      { materialId: 'mat-4', qtyRequired: 15 },    // 15 kg Rice
      { materialId: 'mat-5', qtyRequired: 10 },    // 10 kg Moong Dal
      { materialId: 'mat-1', qtyRequired: 3.5 },   // 3.5 L Ghee
    ],
  },
  {
    id: 'rec-3',
    name: 'Panchamrit Abhishek Prasad',
    batchYield: '50 Cups Sacred Panchamrit',
    category: 'Abhishek',
    description: 'Divine offering blend used for Shiva Linga and Deity snanam, distributed to devotees post-aarti.',
    ingredients: [
      { materialId: 'mat-1', qtyRequired: 2 },     // 2 L Ghee
      { materialId: 'mat-3', qtyRequired: 4 },     // 4 kg Sugar
    ],
  },
];

export const SmartBhandarDesk: React.FC = () => {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>(INITIAL_MATERIALS);
  const [recipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [activeTab, setActiveTab] = useState<'inventory' | 'recipes' | 'production'>('inventory');

  // Production Form State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(INITIAL_RECIPES[0].id);
  const [batchCount, setBatchCount] = useState<number>(1);
  const [productionHistory, setProductionHistory] = useState<ProductionLog[]>([
    {
      id: 'log-1',
      recipeName: 'Shree Mahaprasad Besan Ladoo',
      batches: 2,
      yieldReport: '200 Sacred Ladoos',
      timestamp: 'Today, 06:30 AM',
    },
    {
      id: 'log-2',
      recipeName: 'Maha Annadanam Khichdi',
      batches: 3,
      yieldReport: '300 Portions Annadanam',
      timestamp: 'Yesterday, 11:45 AM',
    },
  ]);

  // Adjust stock manually (+ / -)
  const handleStockAdjust = (id: string, delta: number) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, currentStock: Math.max(0, Number((m.currentStock + delta).toFixed(2))) }
          : m
      )
    );
  };

  // Core BOM Production Engine
  const handleProduce = (recipeId: string, numBatches: number) => {
    if (numBatches <= 0 || isNaN(numBatches)) {
      showToast('Please specify a valid number of batches greater than 0', 'error');
      return;
    }

    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      showToast('Selected recipe not found', 'error');
      return;
    }

    // 1. Verify stock sufficiency for ALL ingredients
    for (const ing of recipe.ingredients) {
      const material = materials.find((m) => m.id === ing.materialId);
      if (!material) {
        showToast(`Ingredient ID ${ing.materialId} not found in inventory`, 'error');
        return;
      }

      const totalRequired = Number((ing.qtyRequired * numBatches).toFixed(2));
      if (material.currentStock < totalRequired) {
        showToast(
          `Insufficient ${material.name}: Need ${totalRequired} ${material.unit}, have only ${material.currentStock} ${material.unit}`,
          'error'
        );
        return;
      }
    }

    // 2. Deduct inventory mathematically
    setMaterials((prevMaterials) =>
      prevMaterials.map((m) => {
        const ing = recipe.ingredients.find((i) => i.materialId === m.id);
        if (ing) {
          const totalRequired = ing.qtyRequired * numBatches;
          const updatedStock = Math.max(0, Number((m.currentStock - totalRequired).toFixed(2)));
          return { ...m, currentStock: updatedStock };
        }
        return m;
      })
    );

    // 3. Log production entry
    const newLog: ProductionLog = {
      id: `log-${Date.now()}`,
      recipeName: recipe.name,
      batches: numBatches,
      yieldReport: `${numBatches}x (${recipe.batchYield})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
    };
    setProductionHistory((prev) => [newLog, ...prev]);

    // 4. Success feedback
    showToast(
      `Prasad production logged: ${numBatches} batch(es) of ${recipe.name}. Inventory deducted successfully!`,
      'success'
    );
  };

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];
  const lowStockCount = materials.filter((m) => m.currentStock <= m.reorderLevel).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Kitchen Supply Chain
            </span>
            {lowStockCount > 0 ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                {lowStockCount} Items Low Stock
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Stocks Optimal
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-500" />
            Smart Bhandar & Prasad Recipe Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated Bill of Materials (BOM), recipe batch execution, and real-time raw ingredient depletion.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-amber-600" />
            Raw Inventory ({materials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'recipes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            Recipe BOM ({recipes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'production'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Kitchen Production
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Raw Material Stock & Reorder Levels
                </h3>
                <p className="text-xs text-slate-500">
                  Track grocery inventory, ghee reserves, flours, and automatic threshold alerts.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Raw Material</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Current Stock</th>
                    <th className="px-4 py-3.5">Reorder Threshold</th>
                    <th className="px-5 py-3.5">Stock Level Status</th>
                    <th className="px-5 py-3.5 text-right">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((mat) => {
                    const isLow = mat.currentStock <= mat.reorderLevel;
                    const stockRatio = Math.min(100, Math.round((mat.currentStock / (mat.reorderLevel * 2.5)) * 100));

                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{mat.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {mat.id}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {mat.category || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-extrabold text-slate-900">
                            {mat.currentStock}
                          </span>{' '}
                          <span className="text-slate-500 font-medium">{mat.unit}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-600">
                            {mat.reorderLevel} {mat.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4 w-48">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className={isLow ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-500'}>
                              {isLow && <AlertCircle className="w-3 h-3 text-rose-500" />}
                              {isLow ? 'Critical Low' : 'Adequate'}
                            </span>
                            <span className="text-slate-400 font-mono">{stockRatio}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isLow ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${stockRatio}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => handleStockAdjust(mat.id, -1)}
                              title="Deduct 1 unit"
                              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-1 text-[11px] font-bold text-slate-700">1 {mat.unit}</span>
                            <button
                              type="button"
                              onClick={() => handleStockAdjust(mat.id, 5)}
                              title="Add 5 units"
                              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECIPES & BOM */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                    {recipe.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">BOM ID: {recipe.id}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {recipe.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                  {recipe.description}
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Yield Per Standard Batch:
                  </div>
                  <div className="text-sm font-extrabold text-amber-700 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-amber-500" />
                    {recipe.batchYield}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Required Bill of Materials (BOM):
                  </div>
                  <div className="space-y-1.5">
                    {recipe.ingredients.map((ing) => {
                      const mat = materials.find((m) => m.id === ing.materialId);
                      const isStockSufficient = (mat?.currentStock || 0) >= ing.qtyRequired;

                      return (
                        <div
                          key={ing.materialId}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50"
                        >
                          <span className="text-slate-700 font-medium">{mat?.name || ing.materialId}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {ing.qtyRequired} {mat?.unit}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isStockSufficient ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              title={isStockSufficient ? 'Stock available' : 'Shortage'}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRecipeId(recipe.id);
                    setActiveTab('production');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  Cook This Recipe in Kitchen
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PRODUCTION ENGINE */}
      {activeTab === 'production' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Production Execution Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Log Prasad Batch & Auto-Deduct Inventory
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select the recipe being prepared by temple chefs. The engine computes required groceries and deducts them instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Recipe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Recipe <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Number of Batches */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Number of Batches to Cook <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Calculated BOM Requirement Preview */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ingredient Requirement Calculation ({batchCount} Batch{batchCount > 1 ? 'es' : ''})
                </span>
                <span className="text-xs font-semibold text-amber-700">
                  Target Yield: {batchCount * (parseInt(selectedRecipe.batchYield) || 100)} items / portions
                </span>
              </div>

              <div className="space-y-2">
                {selectedRecipe.ingredients.map((ing) => {
                  const mat = materials.find((m) => m.id === ing.materialId);
                  const totalNeeded = Number((ing.qtyRequired * batchCount).toFixed(2));
                  const isAvailable = (mat?.currentStock || 0) >= totalNeeded;

                  return (
                    <div
                      key={ing.materialId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                          }`}
                        />
                        <span className="font-bold text-slate-800">{mat?.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900">
                          {totalNeeded} {mat?.unit}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          (In stock: {mat?.currentStock} {mat?.unit})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Trigger */}
            <button
              type="button"
              onClick={() => handleProduce(selectedRecipeId, batchCount)}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ChefHat className="w-5 h-5" />
              Log Production & Deduct Inventory
            </button>
          </div>

          {/* Recent Production History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <History className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recent Kitchen Batches
                </h4>
              </div>

              <div className="space-y-3">
                {productionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{item.recipeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Prepared: <span className="font-bold text-amber-700">{item.yieldReport}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6 text-[11px] text-slate-400 text-center">
              Fiduciary compliance: Raw material inventory logs are synchronized with the central audit trail.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartBhandarDesk;
