import React, { useState } from 'react';
import { useSatsang, uid, activeMembers, suggestedPrasadBearer } from './satsangStore';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, fmtTime, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Prasad rotation — who brings prasad for which gathering, with an    */
/* auto-suggestion of the fairest next bearer (longest since last).   */
/* ------------------------------------------------------------------ */

export const PrasadTab: React.FC = () => {
  const { state, add, update, remove } = useSatsang();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState({ gatheringId: '', memberId: '', item: '' });
  const members = activeMembers(state);
  const gatherings = [...state.gatherings].sort((a, b) => b.date.localeCompare(a.date));
  const suggestion = suggestedPrasadBearer(state);

  const openFor = (gid: string, mid?: string) => {
    setForm({ gatheringId: gid, memberId: mid || suggestion?.id || '', item: '' });
    setForming(true);
  };

  const save = () => {
    if (!form.gatheringId || !form.memberId) { showToast('Pick a gathering and a bearer.', 'warning'); return; }
    add('prasad', {
      id: uid('p'), gatheringId: form.gatheringId, memberId: form.memberId,
      item: form.item.trim() || undefined, status: 'assigned', createdAt: Date.now(),
    });
    showToast('Prasad duty assigned.', 'success');
    setForming(false);
    setForm({ gatheringId: '', memberId: '', item: '' });
  };

  const bearerName = (id: string) => state.members.find((m) => m.id === id)?.name || '—';
  const gatheringOf = (gid: string) => state.gatherings.find((g) => g.id === gid);

  const list = [...state.prasad].sort((a, b) => {
    const ga = gatheringOf(a.gatheringId)?.date || '';
    const gb = gatheringOf(b.gatheringId)?.date || '';
    return gb.localeCompare(ga);
  });

  return (
    <div className="space-y-4">
      {suggestion && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-stone-700">
              🍲 <T en="Fairest next bearer" bn="ন্যায্য পরবর্তী বাহক" hi="उचित अगला वाहक" />:{' '}
              <span className="font-extrabold text-rose-800">{suggestion.name}</span>
              <span className="text-xs text-stone-500"> <T en="(longest since last prasad duty)" bn="(শেষ প্রসাদ দায়িত্বের পর সবচেয়ে বেশি সময়)" hi="(पिछली प्रसाद ड्यूटी के बाद सबसे लंबा समय)" /></span>
            </div>
            <Btn variant="ghost" onClick={() => {
              const upcoming = gatherings.find((g) => g.status === 'scheduled');
              if (!upcoming) { showToast('Schedule a gathering first.', 'warning'); return; }
              openFor(upcoming.id, suggestion.id);
            }} className="no-print">
              <T en="Assign" bn="বরাদ্দ করুন" hi="सौंपें" />
            </Btn>
          </div>
        </Card>
      )}

      {list.length === 0 && <Empty text="No prasad duties assigned yet." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((p) => {
          const g = gatheringOf(p.gatheringId);
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">🍲 {bearerName(p.memberId)}</div>
                  <div className="text-xs text-stone-500">
                    {g ? `${fmtDate(g.date)} · ${fmtTime(g.time)}` : '—'}
                    {p.item && <> · {p.item}</>}
                  </div>
                </div>
                <StatusPill status={p.status} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3 no-print">
                {p.status === 'assigned' && (
                  <Btn variant="emerald" onClick={() => { update('prasad', p.id, { status: 'done' }); showToast('Marked done. Dhanyavaad!', 'success'); }}>
                    ✓ <T en="Done" bn="সম্পন্ন" hi="पूर्ण" />
                  </Btn>
                )}
                <Btn variant="danger" onClick={() => { remove('prasad', p.id); showToast('Assignment removed.', 'info'); }}>
                  <T en="Remove" bn="মুছুন" hi="हटाएं" />
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {forming && (
        <Modal title={<T en="Assign prasad duty" bn="প্রসাদ দায়িত্ব বরাদ্দ" hi="प्रसाद ड्यूटी सौंपें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 gap-3">
            <Field label={<T en="Gathering" bn="সমাবেশ" hi="सभा" />}>
              <select className={inputCls} value={form.gatheringId} onChange={(e) => setForm({ ...form, gatheringId: e.target.value })}>
                <option value="">—</option>
                {gatherings.map((g) => <option key={g.id} value={g.id}>{fmtDate(g.date)} · {fmtTime(g.time)}</option>)}
              </select>
            </Field>
            <Field label={<T en="Bearer" bn="বাহক" hi="वाहक" />}>
              <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label={<T en="Item (optional)" bn="আইটেম (ঐচ্ছিক)" hi="वस्तु (वैकल्पिक)" />}>
              <input className={inputCls} value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="e.g. Kheer, Puri-sabzi" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
