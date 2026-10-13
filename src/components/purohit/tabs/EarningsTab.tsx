/** Real earnings computation from released dakshina, grouped by month. */
import React, { useMemo } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { Card, SectionTitle, EmptyState } from '../ui';

export const EarningsTab: React.FC = () => {
  const { myGigs } = usePurohit();

  const released = useMemo(
    () => myGigs.filter((g) => g.status === 'DAKSHINA_RELEASED' && g.dakshinaAgreed),
    [myGigs]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    released.forEach((g) => {
      const d = new Date(g.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) || { total: 0, count: 0 };
      cur.total += g.dakshinaAgreed || 0;
      cur.count += 1;
      map.set(key, cur);
    });
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', {
          month: 'long',
          year: 'numeric',
        });
        return { key, label, ...v };
      });
  }, [released]);

  const lifetime = released.reduce((s, g) => s + (g.dakshinaAgreed || 0), 0);
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.total));

  return (
    <div className="space-y-4">
      <SectionTitle sub="Computed from gigs whose dakshina was released. Workflow-level tracking — actual settlement happens off-platform until a payment partner is integrated.">
        Earnings
      </SectionTitle>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-lg font-black text-stone-900">₹{lifetime.toLocaleString('en-IN')}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Lifetime</p>
        </Card>
        <Card>
          <p className="text-lg font-black text-stone-900">{released.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Released gigs</p>
        </Card>
        <Card>
          <p className="text-lg font-black text-stone-900">
            ₹{released.length ? Math.round(lifetime / released.length).toLocaleString('en-IN') : 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Avg / ritual</p>
        </Card>
      </div>

      {byMonth.length === 0 ? (
        <Card>
          <EmptyState
            title="No released earnings yet"
            sub="When a devotee confirms your completed ritual, its dakshina appears here, month by month."
          />
        </Card>
      ) : (
        <Card>
          <p className="text-sm font-black text-stone-900 mb-4">Monthly earnings</p>
          <div className="space-y-3">
            {byMonth.map((m) => (
              <div key={m.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-stone-700">{m.label}</span>
                  <span className="font-black text-stone-900">
                    ₹{m.total.toLocaleString('en-IN')} · {m.count} ritual{m.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    style={{ width: `${Math.max(4, (m.total / maxMonth) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
