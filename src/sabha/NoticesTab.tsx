import React, { useState } from 'react';
import { useSabha, uid } from './sabhaStore';
import { T, Card, Btn, Field, inputCls, Modal, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Notice board — internal sabha announcements. Pinned notices stay   */
/* on top. Simple, honest, device-local.                              */
/* ------------------------------------------------------------------ */

export const NoticesTab: React.FC = () => {
  const { state, add, update, remove } = useSabha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', pinned: false });

  const save = () => {
    if (!form.title.trim()) { showToast('Please enter a title.', 'warning'); return; }
    add('notices', {
      id: uid('n'), title: form.title.trim(), body: form.body.trim(),
      pinned: form.pinned, postedAt: Date.now(),
    });
    showToast('Notice posted.', 'success');
    setForming(false);
    setForm({ title: '', body: '', pinned: false });
  };

  const list = [...state.notices].sort((a, b) =>
    (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.postedAt - a.postedAt
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-stone-700">
            <T en="Notice board" bn="বিজ্ঞপ্তি বোর্ড" hi="सूचना पट्ट" />
          </div>
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Post notice" bn="বিজ্ঞপ্তি দিন" hi="सूचना दें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No notices yet." />}

      <div className="space-y-3">
        {list.map((n) => (
          <Card key={n.id} className={n.pinned ? 'border-amber-300 bg-amber-50/40' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold text-stone-800">
                {n.pinned && '📌 '}{n.title}
              </div>
              <div className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(new Date(n.postedAt).toISOString().slice(0, 10))}</div>
            </div>
            {n.body && <div className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{n.body}</div>}
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => { update('notices', n.id, { pinned: !n.pinned }); }}>
                {n.pinned ? <T en="Unpin" bn="আনপিন" hi="अनपिन करें" /> : <T en="Pin" bn="পিন" hi="पिन करें" />}
              </Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm('Remove this notice?')) { remove('notices', n.id); showToast('Removed.', 'info'); } }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={<T en="Post notice" bn="বিজ্ঞপ্তি দিন" hi="सूचना दें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 gap-3">
            <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />}>
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Navratri duty roster is out" />
            </Field>
            <Field label={<T en="Body" bn="বিবরণ" hi="विवरण" />}>
              <textarea className={inputCls} rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Details for members…" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-bold text-stone-700 min-h-[44px]">
              <input type="checkbox" className="w-5 h-5" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              <T en="Pin to top" bn="উপরে পিন করুন" hi="शीर्ष पर पिन करें" />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Post" bn="প্রকাশ" hi="प्रकाशित करें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
