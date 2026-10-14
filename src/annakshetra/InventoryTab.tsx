import React, { useState } from 'react';
import { useAnnakshetra, uid, todayISO, lowStockItems } from './annakshetraStore';
import { Card, Btn, Field, inputCls, Modal, T, useLocaleText } from './ui';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';
import { Unit } from './types';

/* Annakshetra One — kitchen inventory: staples with stock, low-stock
 * alerts, purchase entries. Purchases optionally post an expense to
 * treasury (honest: kitchen purchases are never 80G-eligible). */

const UNITS: Unit[] = ['kg', 'litre', 'pcs', 'packet', 'bundle'];

export const InventoryTab: React.FC = () => {
  const { state, add, update, remove, recordPurchase } = useAnnakshetra();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [showItem, setShowItem] = useState(false);
  const [showBuy, setShowBuy] = useState<string | null>(null);
  const [itemF, setItemF] = useState({ name: '', unit: 'kg' as Unit, stock: 0, lowStockAt: 5 });
  const [buyF, setBuyF] = useState({ qty: 0, amount: 0, vendor: '', date: todayISO(), paymentMode: 'Cash', postTreasury: true });

  const low = lowStockItems(state);

  const submitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemF.name.trim()) { showToast(tr('anna.inv.needname', 'Item name required', 'নাম আবশ্যক', 'नाम आवश्यक'), 'warning'); return; }
    add('items', { id: uid('it'), name: itemF.name.trim(), unit: itemF.unit, stock: Math.max(0, itemF.stock), lowStockAt: Math.max(0, itemF.lowStockAt) });
    setShowItem(false);
    setItemF({ name: '', unit: 'kg', stock: 0, lowStockAt: 5 });
    showToast(tr('anna.inv.added', 'Item added', 'যোগ হয়েছে', 'जुड़ गया'), 'success');
  };

  const submitBuy = (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!(buyF.qty > 0) || !(buyF.amount >= 0)) { showToast(tr('anna.inv.needqty', 'Quantity and amount required', 'পরিমাণ ও টাকা দিন', 'मात्रा और राशि दें'), 'warning'); return; }
    const yyyymm = buyF.date.slice(0, 7).replace('-', '');
    const seq = String(state.purchases.length + 1).padStart(4, '0');
    const receiptNo = `KITCHEN-${yyyymm}-${seq}`;
    const rec = recordPurchase({
      itemId, qty: Number(buyF.qty), amount: Number(buyF.amount),
      vendor: buyF.vendor.trim() || undefined, date: buyF.date,
      receiptNo, paymentMode: buyF.paymentMode,
    });
    let treasuryTxId: string | undefined;
    if (buyF.postTreasury) {
      const ok = addTreasuryTransaction({
        workspaceId: activeWorkspace.id,
        date: new Date().toISOString(),
        type: 'Expense',
        category: 'Kitchen (Annakshetra)',
        subcategory: 'Annakshetra One — Kitchen purchase',
        amount: Number(buyF.amount),
        handledBy: 'Annakshetra Karyalaya',
        paymentMode: buyF.paymentMode,
        referenceNo: receiptNo,
        // Honest: kitchen purchases are expenses, never 80G-eligible.
        purpose: `Kitchen purchase — ${rec.itemName}, ${buyF.qty} ${rec.unit}${buyF.vendor ? ` from ${buyF.vendor}` : ''} (${receiptNo}). Not 80G-eligible (operational expense).`,
        is80GEligible: false,
        taxReceiptIssued: false,
      });
      treasuryTxId = ok ? 'posted' : undefined;
    }
    if (treasuryTxId) update('purchases', rec.id, { treasuryTxId });
    setShowBuy(null);
    setBuyF({ qty: 0, amount: 0, vendor: '', date: todayISO(), paymentMode: 'Cash', postTreasury: true });
    showToast(tr('anna.inv.buyadded', 'Purchase recorded — stock updated', 'ক্রয় রেকর্ড — মজুত বেড়েছে', 'खरीद दर्ज — स्टॉक बढ़ा'), 'success');
  };

  return (
    <div className="space-y-4">
      {low.length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <div className="text-sm font-bold text-red-900">
            ⚠️ {tr('anna.inv.lowalert', 'Low stock', 'কম মজুত', 'कम स्टॉक')}: {low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(' · ')}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between no-print">
        <h3 className="font-bold text-stone-800"><T en="Kitchen inventory" bn="রান্নাঘরের মজুত" hi="रसोई भंडार" /></h3>
        <Btn onClick={() => setShowItem(true)}>+ <T en="Add item" bn="আইটেম যোগ" hi="आइटम जोड़ें" /></Btn>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {state.items.map((it) => {
          const isLow = it.stock <= it.lowStockAt;
          return (
            <Card key={it.id} className={isLow ? 'border-red-200' : ''}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-stone-800">{it.name}</div>
                  <div className="text-xs text-stone-500">
                    {tr('anna.inv.alertat', 'alert at', 'সতর্কতা', 'चेतावनी')}: {it.lowStockAt} {it.unit}
                    {it.lastPurchaseRate ? ` · ₹${it.lastPurchaseRate}/${it.unit}` : ''}
                  </div>
                </div>
                <div className={`text-xl font-extrabold ${isLow ? 'text-red-700' : 'text-stone-800'}`}>
                  {it.stock} <span className="text-xs font-semibold text-stone-500">{it.unit}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 no-print">
                <Btn variant="ghost" className="flex-1 !min-h-0 !py-1.5 text-xs" onClick={() => { setShowBuy(it.id); setBuyF({ ...buyF, date: todayISO() }); }}>
                  <T en="Purchase" bn="ক্রয়" hi="खरीद" />
                </Btn>
                <Btn variant="ghost" className="!min-h-0 !py-1.5 text-xs !px-3" onClick={() => {
                  const v = window.prompt(tr('anna.inv.setstock', 'Set stock', 'মজুত নির্ধারণ', 'स्टॉक सेट करें') + ` (${it.unit})`, String(it.stock));
                  if (v !== null && !isNaN(Number(v))) update('items', it.id, { stock: Math.max(0, Number(v)) });
                }}>
                  ✎
                </Btn>
                <Btn variant="danger" className="!min-h-0 !py-1.5 text-xs !px-3" onClick={() => {
                  if (window.confirm(tr('anna.inv.delconfirm', 'Delete this item?', 'মুছবেন?', 'हटाएं?'))) remove('items', it.id);
                }}>
                  🗑
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {state.items.length === 0 && <Card><p className="text-sm text-stone-400 text-center py-6">{tr('anna.inv.empty', 'No items yet — add your first staple.', 'কিছু নেই — প্রথম আইটেম যোগ করুন।', 'कुछ नहीं — पहला आइटम जोड़ें।')}</p></Card>}

      {showItem && (
        <Modal title={tr('anna.inv.newitem', 'Add kitchen item', 'নতুন আইটেম', 'नया आइटम')} onClose={() => setShowItem(false)}>
          <form onSubmit={submitItem} className="space-y-3">
            <Field label={tr('anna.inv.name', 'Item name', 'নাম', 'नाम')}><input className={inputCls} value={itemF.name} onChange={(e) => setItemF({ ...itemF, name: e.target.value })} placeholder="e.g. Basmati rice" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={tr('anna.inv.unit', 'Unit', 'একক', 'इकाई')}>
                <select className={inputCls} value={itemF.unit} onChange={(e) => setItemF({ ...itemF, unit: e.target.value as Unit })}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label={tr('anna.inv.stock', 'Opening stock', 'প্রারম্ভিক মজুত', 'प्रारंभिक स्टॉक')}><input type="number" min={0} step="any" className={inputCls} value={itemF.stock} onChange={(e) => setItemF({ ...itemF, stock: Number(e.target.value) })} /></Field>
              <Field label={tr('anna.inv.lowat', 'Alert at', 'সতর্কতা', 'चेतावनी')}><input type="number" min={0} step="any" className={inputCls} value={itemF.lowStockAt} onChange={(e) => setItemF({ ...itemF, lowStockAt: Number(e.target.value) })} /></Field>
            </div>
            <Btn type="submit" className="w-full"><T en="Add item" bn="যোগ করুন" hi="जोड़ें" /></Btn>
          </form>
        </Modal>
      )}

      {showBuy && (
        <Modal title={tr('anna.inv.buy', 'Record purchase', 'ক্রয় রেকর্ড', 'खरीद दर्ज करें')} onClose={() => setShowBuy(null)}>
          <form onSubmit={(e) => submitBuy(e, showBuy)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('anna.inv.qty', 'Quantity', 'পরিমাণ', 'मात्रा')}><input type="number" min={0} step="any" className={inputCls} value={buyF.qty} onChange={(e) => setBuyF({ ...buyF, qty: Number(e.target.value) })} /></Field>
              <Field label={tr('anna.inv.amount', 'Amount (₹)', 'টাকা (₹)', 'राशि (₹)')}><input type="number" min={0} step="any" className={inputCls} value={buyF.amount} onChange={(e) => setBuyF({ ...buyF, amount: Number(e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('anna.inv.vendor', 'Vendor (optional)', 'বিক্রেতা', 'विक्रेता')}><input className={inputCls} value={buyF.vendor} onChange={(e) => setBuyF({ ...buyF, vendor: e.target.value })} /></Field>
              <Field label={tr('anna.inv.date', 'Date', 'তারিখ', 'तिथि')}><input type="date" className={inputCls} value={buyF.date} onChange={(e) => setBuyF({ ...buyF, date: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" className="w-4 h-4 accent-amber-700" checked={buyF.postTreasury} onChange={(e) => setBuyF({ ...buyF, postTreasury: e.target.checked })} />
              {tr('anna.inv.posttreasury', 'Post expense to treasury (recommended)', 'কোষাগারে ব্যয় পোস্ট করুন', 'कोषागार में व्यय दर्ज करें')}
            </label>
            <p className="text-[11px] text-stone-400">{tr('anna.inv.80gnote', 'Kitchen purchases are operational expenses — never 80G-eligible. Stated honestly in the ledger.', 'রান্নাঘরের ক্রয় পরিচালন ব্যয় — কখনো 80G-যোগ্য নয়।', 'रसोई खरीद परिचालन व्यय है — कभी 80G-योग्य नहीं।')}</p>
            <Btn type="submit" className="w-full"><T en="Record purchase" bn="রেকর্ড করুন" hi="दर्ज करें" /></Btn>
          </form>
        </Modal>
      )}
    </div>
  );
};
