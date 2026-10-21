import React, { useMemo, useState } from 'react';
import { useInr } from '../hooks/useWorkspaceInr';
import { useAnnakshetra, uid, todayISO, bomFor, cookShortfalls, estimateCost } from './annakshetraStore';
import { Card, Btn, Field, inputCls, Modal, T, useLocaleText, StatusPill } from './ui';
import { useToast } from '../context/ToastContext';
import { MealSlot, RecipeIngredient } from './types';

/* Annakshetra One — menu & recipe planning: per-recipe ingredient BOM
 * (per 100 servings), weekly menu planner, and one-tap "Cook" that
 * atomically deducts stock. Shortfalls block the cook honestly. */

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'prasad'];
const CATS = ['breakfast', 'lunch', 'dinner', 'prasad', 'sweet', 'other'] as const;

export const MenuTab: React.FC = () => {
  const inr = useInr();
  const { state, add, update, remove, cookMenu } = useAnnakshetra();
  const { showToast } = useToast();
  const { tr } = useLocaleText();
  const [showRecipe, setShowRecipe] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editRecipe, setEditRecipe] = useState<string | null>(null);
  const [rF, setRF] = useState({ name: '', category: 'lunch' as typeof CATS[number], notes: '', ingredients: [] as RecipeIngredient[] });
  const [mF, setMF] = useState({ date: todayISO(), slot: 'lunch' as MealSlot, recipeIds: [] as string[], servings: state.settings.defaultServings });

  const itemName = (id: string) => state.items.find((i) => i.id === id)?.name || '(removed)';

  const openNewRecipe = () => { setEditRecipe(null); setRF({ name: '', category: 'lunch', notes: '', ingredients: [] }); setShowRecipe(true); };
  const openEditRecipe = (id: string) => {
    const r = state.recipes.find((x) => x.id === id);
    if (!r) return;
    setEditRecipe(id);
    setRF({ name: r.name, category: r.category, notes: r.notes || '', ingredients: r.ingredients.map((i) => ({ ...i })) });
    setShowRecipe(true);
  };

  const submitRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rF.name.trim()) { showToast(tr('anna.menu.needname', 'Recipe name required', 'নাম আবশ্যক', 'नाम आवश्यक'), 'warning'); return; }
    if (rF.ingredients.length === 0) { showToast(tr('anna.menu.needing', 'Add at least one ingredient', 'একটি উপকরণ দিন', 'एक सामग्री जोड़ें'), 'warning'); return; }
    const payload = { name: rF.name.trim(), category: rF.category, notes: rF.notes.trim() || undefined, ingredients: rF.ingredients };
    if (editRecipe) update('recipes', editRecipe, payload);
    else add('recipes', { id: uid('rc'), ...payload });
    setShowRecipe(false);
    showToast(tr('anna.menu.saved', 'Recipe saved', 'রেসিপি সংরক্ষিত', 'रेसिपी सहेजी गई'), 'success');
  };

  const addIngRow = () => setRF({ ...rF, ingredients: [...rF.ingredients, { itemId: state.items[0]?.id || '', qtyPer100: 0 }] });

  const submitMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (mF.recipeIds.length === 0) { showToast(tr('anna.menu.needrecipe', 'Pick at least one recipe', 'একটি রেসিপি বাছুন', 'एक रेसिपी चुनें'), 'warning'); return; }
    add('menus', {
      id: uid('mn'), date: mF.date, slot: mF.slot, recipeIds: mF.recipeIds,
      servings: Math.max(1, Math.floor(mF.servings)), cooked: false,
    });
    setShowMenu(false);
    setMF({ date: todayISO(), slot: 'lunch', recipeIds: [], servings: state.settings.defaultServings });
    showToast(tr('anna.menu.planned', 'Menu planned', 'মেনু পরিকল্পিত', 'मेनू नियोजित'), 'success');
  };

  const doCook = (menuId: string) => {
    const menu = state.menus.find((m) => m.id === menuId);
    if (!menu || menu.cooked) return;
    const short = cookMenu(menu);
    if (short.length) {
      showToast(
        tr('anna.menu.short', 'Not enough stock', 'মজুত অপর্যাপ্ত', 'स्टॉक अपर्याप्त') + ': ' +
        short.map((s) => `${s.name} (${tr('anna.menu.need', 'need', 'লাগবে', 'चाहिए')} ${s.need} ${s.unit}, ${tr('anna.menu.have', 'have', 'আছে', 'है')} ${s.have})`).join('; '),
        'warning'
      );
      return;
    }
    showToast(tr('anna.menu.cooked', 'Cooked — stock auto-deducted', 'রান্না সম্পন্ন — মজুত কাটা হয়েছে', 'पक गया — स्टॉक स्वतः कटा'), 'success');
  };

  const plans = useMemo(() => [...state.menus].sort((a, b) => b.date.localeCompare(a.date) || a.slot.localeCompare(b.slot)).slice(0, 30), [state.menus]);

  return (
    <div className="space-y-6">
      {/* Recipes */}
      <div>
        <div className="flex items-center justify-between mb-3 no-print">
          <h3 className="font-bold text-stone-800"><T en="Recipes (BOM per 100 servings)" bn="রেসিপি (প্রতি ১০০ থালায় উপকরণ)" hi="रेसिपी (प्रति 100 थाली सामग्री)" /></h3>
          <Btn onClick={openNewRecipe}>+ <T en="New recipe" bn="নতুন রেসিপি" hi="नई रेसिपी" /></Btn>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.recipes.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-stone-800">{r.name}</div>
                  <div className="text-xs text-stone-500 capitalize">{r.category} · ≈{inr(estimateCost([r.id], 100, state))}/100 {tr('anna.menu.plates', 'plates', 'থালা', 'थाली')}</div>
                </div>
                <div className="flex gap-1 no-print">
                  <button onClick={() => openEditRecipe(r.id)} className="text-xs px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200">✎</button>
                  <button onClick={() => { if (window.confirm(tr('anna.menu.del', 'Delete recipe?', 'মুছবেন?', 'हटाएं?'))) remove('recipes', r.id); }} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">🗑</button>
                </div>
              </div>
              <ul className="mt-2 text-xs text-stone-600 space-y-0.5">
                {r.ingredients.map((ing, i) => (
                  <li key={i}>• {itemName(ing.itemId)} — {ing.qtyPer100} {state.items.find((x) => x.id === ing.itemId)?.unit || ''}/100</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        {state.recipes.length === 0 && <Card><p className="text-sm text-stone-400 text-center py-6">{tr('anna.menu.empty', 'No recipes yet.', 'কোনো রেসিপি নেই।', 'कोई रेसिपी नहीं।')}</p></Card>}
      </div>

      {/* Menu planner */}
      <div>
        <div className="flex items-center justify-between mb-3 no-print">
          <h3 className="font-bold text-stone-800"><T en="Menu planner" bn="মেনু পরিকল্পনা" hi="मेनू योजना" /></h3>
          <Btn onClick={() => setShowMenu(true)}>+ <T en="Plan menu" bn="মেনু বানান" hi="मेनू बनाएं" /></Btn>
        </div>
        <div className="space-y-3">
          {plans.map((m) => {
            const short = m.cooked ? [] : cookShortfalls(m.recipeIds, m.servings, state);
            return (
              <Card key={m.id}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <div className="font-bold text-stone-800 capitalize">{m.date} · {m.slot}</div>
                    <div className="text-xs text-stone-500">
                      {m.recipeIds.map((id) => state.recipes.find((r) => r.id === id)?.name).filter(Boolean).join(' + ') || '—'}
                      {' · '}{m.servings} {tr('anna.menu.servings', 'servings', 'থালা', 'थाली')}
                      {' · '}≈{inr(estimateCost(m.recipeIds, m.servings, state))}
                    </div>
                    {!m.cooked && short.length > 0 && (
                      <div className="text-xs text-red-700 font-semibold mt-1">
                        ⚠️ {tr('anna.menu.shortof', 'Short of', 'ঘাটতি', 'कमी')}: {short.map((s) => `${s.name} (${s.need - s.have} ${s.unit})`).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <StatusPill status={m.cooked ? 'cooked' : 'pending'} />
                    {!m.cooked && <Btn onClick={() => doCook(m.id)}>🍳 <T en="Cook & deduct" bn="রাঁধুন ও কাটুন" hi="पकाएं और काटें" /></Btn>}
                    <button onClick={() => remove('menus', m.id)} className="text-xs px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200">🗑</button>
                  </div>
                </div>
              </Card>
            );
          })}
          {plans.length === 0 && <Card><p className="text-sm text-stone-400 text-center py-6">{tr('anna.menu.noplans', 'No menus planned yet.', 'কোনো মেনু নেই।', 'कोई मेनू नहीं।')}</p></Card>}
        </div>
      </div>

      {showRecipe && (
        <Modal wide title={editRecipe ? tr('anna.menu.edit', 'Edit recipe', 'রেসিপি সম্পাদনা', 'रेसिपी संपादित करें') : tr('anna.menu.new', 'New recipe', 'নতুন রেসিপি', 'नई रेसिपी')} onClose={() => setShowRecipe(false)}>
          <form onSubmit={submitRecipe} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={tr('anna.menu.rname', 'Recipe name', 'নাম', 'नाम')}><input className={inputCls} value={rF.name} onChange={(e) => setRF({ ...rF, name: e.target.value })} placeholder="e.g. Moong Dal Khichdi" /></Field>
              <Field label={tr('anna.menu.cat', 'Category', 'বিভাগ', 'श्रेणी')}>
                <select className={inputCls} value={rF.category} onChange={(e) => setRF({ ...rF, category: e.target.value as typeof CATS[number] })}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div>
              <div className="text-xs font-bold text-stone-600 mb-1.5">{tr('anna.menu.bom', 'Ingredients — quantity per 100 servings', 'উপকরণ — প্রতি ১০০ থালায় পরিমাণ', 'सामग्री — प्रति 100 थाली मात्रा')}</div>
              {rF.ingredients.map((ing, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2 mb-2">
                  <select className={inputCls} value={ing.itemId} onChange={(e) => { const c = [...rF.ingredients]; c[i] = { ...c[i], itemId: e.target.value }; setRF({ ...rF, ingredients: c }); }}>
                    {state.items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                  </select>
                  <input type="number" min={0} step="any" className={inputCls} value={ing.qtyPer100} onChange={(e) => { const c = [...rF.ingredients]; c[i] = { ...c[i], qtyPer100: Number(e.target.value) }; setRF({ ...rF, ingredients: c }); }} placeholder="qty" />
                  <button type="button" onClick={() => setRF({ ...rF, ingredients: rF.ingredients.filter((_, j) => j !== i) })} className="rounded-xl bg-red-50 text-red-600 font-bold">✕</button>
                </div>
              ))}
              <Btn type="button" variant="ghost" onClick={addIngRow} className="text-xs">+ {tr('anna.menu.adding', 'Add ingredient', 'উপকরণ যোগ', 'सामग्री जोड़ें')}</Btn>
            </div>
            <Field label={tr('anna.menu.notes', 'Notes (optional)', 'মন্তব্য', 'टिप्पणी')}><input className={inputCls} value={rF.notes} onChange={(e) => setRF({ ...rF, notes: e.target.value })} /></Field>
            <Btn type="submit" className="w-full"><T en="Save recipe" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
          </form>
        </Modal>
      )}

      {showMenu && (
        <Modal title={tr('anna.menu.plan', 'Plan menu', 'মেনু পরিকল্পনা', 'मेनू योजना')} onClose={() => setShowMenu(false)}>
          <form onSubmit={submitMenu} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('anna.menu.date', 'Date', 'তারিখ', 'तिथि')}><input type="date" className={inputCls} value={mF.date} onChange={(e) => setMF({ ...mF, date: e.target.value })} /></Field>
              <Field label={tr('anna.menu.slot', 'Meal', 'বেলা', 'समय')}>
                <select className={inputCls} value={mF.slot} onChange={(e) => setMF({ ...mF, slot: e.target.value as MealSlot })}>
                  {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label={tr('anna.menu.recipes', 'Recipes', 'রেসিপি', 'रेसिपी')}>
              <div className="space-y-1.5 max-h-44 overflow-y-auto border border-stone-200 rounded-xl p-2">
                {state.recipes.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" className="w-4 h-4 accent-amber-700" checked={mF.recipeIds.includes(r.id)}
                      onChange={(e) => setMF({ ...mF, recipeIds: e.target.checked ? [...mF.recipeIds, r.id] : mF.recipeIds.filter((x) => x !== r.id) })} />
                    {r.name}
                  </label>
                ))}
              </div>
            </Field>
            <Field label={tr('anna.menu.servingsn', 'Servings', 'থালা সংখ্যা', 'थालियों की संख्या')}><input type="number" min={1} className={inputCls} value={mF.servings} onChange={(e) => setMF({ ...mF, servings: Number(e.target.value) })} /></Field>
            {mF.recipeIds.length > 0 && (
              <div className="text-xs text-stone-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <b>{tr('anna.menu.willneed', 'Will need', 'লাগবে', 'चाहिए')}:</b>{' '}
                {bomFor(mF.recipeIds, Math.max(1, Math.floor(mF.servings)), state).map((b) => `${b.name} ${b.need} ${b.unit}`).join(' · ')}
                {' · '}≈{inr(estimateCost(mF.recipeIds, Math.max(1, Math.floor(mF.servings)), state))}
              </div>
            )}
            <Btn type="submit" className="w-full"><T en="Plan menu" bn="পরিকল্পনা করুন" hi="योजना बनाएं" /></Btn>
          </form>
        </Modal>
      )}
    </div>
  );
};
