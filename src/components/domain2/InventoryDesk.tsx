import React, { useState, useMemo } from 'react';
import { appLocale } from '../../lib/format';
import { useInr, useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import { Package, Plus, Search, AlertTriangle, CheckCircle2, TrendingDown, X, Download, ScanBarcode } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { WindowedNotice } from '../common/WindowedNotice';
import { InventoryItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { CameraScanner } from '../common/CameraScanner';
import { DataExportButton } from '../common/DataExportButton';
import { EmptyState } from '../common/EmptyState';
import { isValidAmountOrZero, sanitizeName } from '../../utils/validation';
import { LocalOnlyBadge } from '../common/LocalOnlyBadge';
import { useLanguage } from '../../context/LanguageContext';

export const InventoryDesk: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { t } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const { inventory, updateInventoryStock, addInventoryItem } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<InventoryItem | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<'Ghee & Oils' | 'Camphor & Dhoop' | 'Rice & Grains' | 'Spices & Dry Fruits' | 'Prasad Supplies' | 'General Stores'>('Ghee & Oils');
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [unit, setUnit] = useState<'kg' | 'liters' | 'packets' | 'pieces'>('kg');
  const [minReorderLevel, setMinReorderLevel] = useState<number>(20);
  const [costPerUnit, setCostPerUnit] = useState<number>(1000);
  const [supplierName, setSupplierName] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const filteredInventory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return inventory.filter(
      (i) =>
        !term ||
        i.itemName?.toLowerCase().includes(term) ||
        i.category?.toLowerCase().includes(term) ||
        i.id?.toLowerCase() === term
    );
  }, [inventory, searchTerm]);

  // Low-stock alert rollup for the header banner
  const lowStockItems = useMemo(
    () => inventory.filter((i) => Number(i.currentStock) <= Number(i.minReorderLevel)),
    [inventory]
  );

  const handleScanBarcode = (data: string) => {
    setSearchTerm(data);
    showToast(`Scanned Tag: ${data}`, 'success');
    setIsScannerOpen(false);
    return true;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Inventory Status Report', 14, 15);
    
    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString(appLocale())}`, 14, 22);

    // Table Data
    const tableColumn = ["Item Name", "Category", "Current Stock", "Min Reorder", "Status", "Cost/Unit", "Supplier"];
    const tableRows = filteredInventory.map((item, idx) => {
      const isLow = item.currentStock <= item.minReorderLevel;
      return [
        item.itemName,
        item.category,
        `${item.currentStock} ${item.unit}`,
        `${item.minReorderLevel} ${item.unit}`,
        isLow ? 'Low Stock' : 'Optimal',
        `Rs.${item.costPerUnit}`,
        item.supplierName || 'N/A'
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] }, // Amber-500 roughly
      didParseCell: function(data) {
        // Highlight low stock status in red
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Low Stock') {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          }
        }
      }
    });

    doc.save(`inventory_report_${new Date().getTime()}.pdf`);
    showToast('Inventory Report Downloaded', 'success');
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockItem) return;
    const next = Number(newStockVal);
    // Physical stock can never be negative; cap absurd values (fat-finger guard)
    if (!Number.isFinite(next) || next < 0) {
      showToast('Stock level cannot be negative', 'error', 'Invalid Stock');
      return;
    }
    if (next > 1000000) {
      showToast('Stock level exceeds the 1,000,000 unit sanity cap — please verify', 'error', 'Unusual Quantity');
      return;
    }
    updateInventoryStock(editingStockItem.id, next);
    // Warn when the update pushes the item at/below its reorder level
    if (next <= Number(editingStockItem.minReorderLevel)) {
      showToast(
        `${editingStockItem.itemName} is at/below reorder level (${editingStockItem.minReorderLevel} ${editingStockItem.unit}) — consider raising a purchase order`,
        'warning',
        'Reorder Alert'
      );
    }
    setEditingStockItem(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeName(itemName);
    if (!cleanName) {
      showToast('Item name is required', 'error', 'Missing Details');
      return;
    }
    // Duplicate item name guard (case-insensitive)
    const nameExists = inventory.some((i) => (i.itemName || '').trim().toLowerCase() === cleanName.toLowerCase());
    if (nameExists) {
      showToast(`"${cleanName}" already exists in the store — update its stock instead`, 'error', 'Duplicate Item');
      return;
    }
    if (!isValidAmountOrZero(currentStock) || Number(currentStock) > 1000000) {
      showToast('Opening stock must be between 0 and 1,000,000', 'error', 'Invalid Stock');
      return;
    }
    if (!isValidAmountOrZero(minReorderLevel)) {
      showToast('Reorder level must be a non-negative number', 'error', 'Invalid Reorder Level');
      return;
    }
    if (!isValidAmountOrZero(costPerUnit)) {
      showToast('Cost per unit must be a non-negative amount', 'error', 'Invalid Cost');
      return;
    }

    addInventoryItem({
      workspaceId: activeWorkspace.id,
      itemName: cleanName,
      category,
      currentStock: Number(currentStock),
      unit,
      minReorderLevel: Number(minReorderLevel),
      costPerUnit: Number(costPerUnit),
      supplierName: supplierName.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setItemName('');
    showToast(`"${cleanName}" added to the store register`, 'success', 'Item Added');
  };

  return (
    <div className="space-y-6">
      <WindowedNotice collection="inventory_items" variant="list" loaded={inventory.length} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Bhandara & Pooja Samagri Store
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {inventory.length} Tracked Consumables
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">{t('org.finance.assets.storeConsumablesInventoryDesk')}</h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Monitor stock levels of Desi Ghee, Bhimseni Camphor, Akshat rice, and automatic reorder alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700/50 text-indigo-200 font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Scan Tag</span>
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            className="px-4 py-2 rounded-xl bg-temple-800 hover:bg-temple-700 border border-temple-700 text-temple-200 font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('org.finance.assets.exportPdf')}</span>
          </button>
          <DataExportButton
            filename={`inventory_stock_${new Date().toISOString().slice(0, 10)}.csv`}
            label="Export CSV"
            records={filteredInventory.map((item) => ({
              itemName: item.itemName,
              category: item.category,
              currentStock: Number(item.currentStock) || 0,
              unit: item.unit,
              minReorderLevel: Number(item.minReorderLevel) || 0,
              status: Number(item.currentStock) <= Number(item.minReorderLevel) ? 'Low Stock' : 'Optimal',
              costPerUnit: Number(item.costPerUnit) || 0,
              stockValue: (Number(item.currentStock) || 0) * (Number(item.costPerUnit) || 0),
              supplierName: item.supplierName || '',
            }))}
          />
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            data-guide-anchor="org-inventory-add"
            className="px-4 py-2 min-h-[44px] rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
          >
          <Plus className="w-4 h-4" />
          <span>{t('org.finance.assets.addStockItem')}</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-saffron-500/10 border border-saffron-500/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-saffron-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-black text-saffron-300 uppercase tracking-wider mb-1">
              {lowStockItems.length} item{lowStockItems.length === 1 ? '' : 's'} at/below reorder level
            </p>
            <p className="text-saffron-200/90 font-semibold">
              {lowStockItems.slice(0, 5).map((i) => `${i.itemName} (${i.currentStock} ${i.unit})`).join(' · ')}
              {lowStockItems.length > 5 && ` (+${lowStockItems.length - 5} more)`} — raise purchase orders before
              the bhandara or festival rush.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredInventory.map((item, idx) => {
          const isLow = item.currentStock <= item.minReorderLevel;

          return (
            <div
              key={`${item.id}-${idx}`}
              className={`bg-temple-900/90 border rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all ${
                isLow ? 'border-saffron-500/60 bg-saffron-950/10' : 'border-temple-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-saffron-400">
                      {item.category}
                    </span>
                    <h3 className="font-extrabold text-sm text-temple-100 mt-0.5">{item.itemName}</h3>
                  </div>
                  {isLow ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Optimal
                    </span>
                  )}
                </div>

                <div className="py-2 space-y-1 text-xs text-temple-300">
                  <p>
                    <span className="text-temple-400">Min Reorder Level:</span>{' '}
                    <span className="font-mono text-temple-200">
                      {item.minReorderLevel} {item.unit}
                    </span>
                  </p>
                  <p>
                    <span className="text-temple-400">Cost per unit:</span>{' '}
                    <span className="font-mono text-saffron-400">{inr(item.costPerUnit)}</span>
                  </p>
                  {item.supplierName && (
                    <p className="text-[11px] text-temple-400 truncate">
                      Supplier: {item.supplierName}
                    </p>
                  )}
                </div>

                <div className={`p-3 rounded-xl flex items-center justify-between ${
                  isLow ? 'bg-rose-950/40 border border-rose-500/50' : 'bg-temple-950/60 border border-temple-800'
                }`}>
                  <div>
                    <p className={`text-[10px] font-semibold uppercase ${isLow ? 'text-rose-400' : 'text-temple-400'}`}>Current Stock</p>
                    <p className={`text-xl font-black ${isLow ? 'text-rose-500' : 'text-temple-100'}`}>
                      {item.currentStock} <span className={`text-xs font-normal ${isLow ? 'text-rose-400' : 'text-saffron-400'}`}>{item.unit}</span>
                    </p>
                  </div>
                  {isLow ? (
                    <AlertTriangle className="w-5 h-5 text-rose-500 opacity-80" />
                  ) : (
                    <Package className="w-5 h-5 text-saffron-400 opacity-80" />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingStockItem(item);
                  setNewStockVal(item.currentStock);
                }}
                className="w-full py-1.5 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-200 text-xs font-semibold"
              >{t('org.finance.assets.updateStockCount')}</button>
            </div>
          );
        })}
      </div>
      {filteredInventory.length === 0 && (
        <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-8">
          <EmptyState
            icon={Package}
            title={inventory.length === 0 ? t('vibe.sevakInventoryEmptyTitle') : t('vibe.sevakInventoryNoMatchTitle')}
            description={
              inventory.length === 0
                ? t('vibe.sevakInventoryEmptyDesc')
                : t('vibe.sevakInventoryNoMatchDesc')
            }
            actionLabel={inventory.length === 0 ? t('vibe.sevakAddStockItem') : undefined}
            onAction={inventory.length === 0 ? () => setIsAddModalOpen(true) : undefined}
          />
        </div>
      )}

      {/* Update Stock Modal */}
      {editingStockItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-t-3xl sm:rounded-2xl max-w-sm w-full flex flex-col overflow-hidden text-temple-100 shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            <h4 className="font-bold text-sm mb-1">Update Stock for {editingStockItem.itemName}</h4>
            <p className="text-xs text-temple-400 mb-4">Unit: {editingStockItem.unit}</p>

            <form onSubmit={handleUpdateStock} className="flex flex-col min-h-0 grow">
              <div className="overflow-y-auto min-h-0 px-6 py-4 space-y-3">
              <input
                type="number"
                required
                min="0"
                value={newStockVal}
                onChange={(e) => setNewStockVal(Number(e.target.value))}
                className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-sm font-bold text-saffron-400"
              />

              </div>
              <div className="flex items-center justify-end gap-2 shrink-0 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEditingStockItem(null)}
                  className="px-3 py-1.5 rounded-xl bg-temple-800 text-temple-300 text-xs"
                >{t('org.finance.assets.cancel2')}</button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs"
                >{t('org.finance.assets.saveStock')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full flex flex-col overflow-hidden text-temple-100 shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 px-6 pt-5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-sm">{t('org.finance.assets.addNewStoreConsumable')}</h3><LocalOnlyBadge /></div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="flex flex-col min-h-0 grow text-xs">
              <div className="overflow-y-auto min-h-0 px-6 py-4 space-y-3">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Pure Desi Cow Ghee"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">{t('org.finance.assets.category2')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  >
                    <option>Ghee & Oils</option>
                    <option>Camphor & Dhoop</option>
                    <option>Rice & Grains</option>
                    <option>Spices & Dry Fruits</option>
                    <option>{t('org.finance.assets.prasadSupplies')}</option>
                    <option>General Stores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="packets">packets</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Min Reorder</label>
                  <input
                    type="number"
                    value={minReorderLevel}
                    onChange={(e) => setMinReorderLevel(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Cost/Unit ({wsCurrency.symbol})</label>
                  <input
                    type="number"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">{t('org.finance.assets.supplierName')}</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              </div>
              <div className="flex items-center justify-end gap-3 border-t border-temple-800 shrink-0 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold"
                >{t('org.finance.assets.addItem')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <CameraScanner
          onScan={handleScanBarcode}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};
