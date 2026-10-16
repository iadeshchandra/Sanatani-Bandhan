/**
 * OrgRequestLedger.tsx — the organisation's P2P request ledger.
 * ==============================================================
 * RBAC: Trustee / Accountant (or SuperAdmin) only. Enforced client-side
 * here AND server-side by firestore.rules (org trustees may read
 * orgId-bound p2pRequests; everyone else is denied).
 *
 * Shows every org-sent and org-received money request with the
 * requesting trustee's identity, filterable, with CSV export and a
 * monthly summary. Entry point: the org Treasury desk (trustee view).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { T, useLocaleText } from '../solo/ui';
import {
  MoneyRequest,
  RequestStatus,
  requestStatusLabel,
  formatMoney,
} from './types';
import {
  fetchOrgMoneyRequests,
  isActiveStatus,
} from '../lib/p2pLedger';

const ALLOWED_ROLES = new Set(['trustee', 'accountant', 'superadmin']);

export function canViewOrgLedger(role: string | undefined | null): boolean {
  return ALLOWED_ROLES.has(String(role || '').trim().toLowerCase());
}

export interface OrgRequestLedgerProps {
  orgId: string;
  orgName: string;
  role: string;
  isOpen: boolean;
  onClose: () => void;
}

export const OrgRequestLedger: React.FC<OrgRequestLedgerProps> = ({
  orgId,
  orgName,
  role,
  isOpen,
  onClose,
}) => {
  const { lang } = useLocaleText();
  const L: 'en' | 'bn' | 'hi' = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';

  const allowed = canViewOrgLedger(role);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState('');
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!isOpen || !allowed || !orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchOrgMoneyRequests(orgId)
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [isOpen, allowed, orgId]);

  const members = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of requests) {
      const id = r.direction === 'org_to_user' ? r.receiverId : r.senderId;
      const name = r.direction === 'org_to_user' ? r.receiverName : r.senderName;
      if (id && !m.has(id)) m.set(id, name || '—');
    }
    return [...m.entries()];
  }, [requests]);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (member) {
          const id = r.direction === 'org_to_user' ? r.receiverId : r.senderId;
          if (id !== member) return false;
        }
        if (purpose && !r.note.toLowerCase().includes(purpose.toLowerCase())) return false;
        if (status === 'active' && !isActiveStatus(r.status)) return false;
        else if (status === 'history' && isActiveStatus(r.status)) return false;
        else if (status !== 'all' && status !== 'active' && status !== 'history' && r.status !== status)
          return false;
        if (fromDate && r.createdAt < new Date(fromDate).getTime()) return false;
        if (toDate && r.createdAt > new Date(toDate).getTime() + 86399999) return false;
        return true;
      }),
    [requests, member, purpose, status, fromDate, toDate],
  );

  const summary = useMemo(() => {
    let requested = 0;
    let received = 0;
    let pending = 0;
    const byMonth = new Map<string, { count: number; total: number }>();
    for (const r of requests) {
      const done = ['settled', 'paid', 'accepted'].includes(r.status);
      if (r.direction === 'org_to_user' && done) requested += r.amount;
      if (r.direction === 'user_to_org' && r.status === 'settled') received += r.amount;
      if (isActiveStatus(r.status)) pending += r.amount;
      const d = new Date(r.createdAt || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = byMonth.get(key) || { count: 0, total: 0 };
      b.count += 1;
      b.total += r.amount;
      byMonth.set(key, b);
    }
    return {
      requested,
      received,
      pending,
      byMonth: [...byMonth.entries()].sort().reverse().slice(0, 12),
    };
  }, [requests]);

  const exportCsv = () => {
    const header = ['Date', 'Direction', 'Counterparty', 'Amount', 'Currency', 'Purpose', 'Status', 'Trustee', 'PaidVia', 'PaidRef'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = filtered.map((r) =>
      [
        new Date(r.createdAt || 0).toISOString().slice(0, 10),
        r.direction,
        r.direction === 'org_to_user' ? r.receiverName : r.senderName,
        r.amount,
        r.currency,
        r.note,
        r.status,
        r.senderTrusteeName || '',
        r.paidVia || '',
        r.paidRef || '',
      ]
        .map(esc)
        .join(','),
    );
    const blob = new Blob([[header.map(esc).join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-request-ledger-${orgId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="bg-stone-50 w-full sm:max-w-4xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 text-white px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
                <T en="Trustee view — confidential" bn="ট্রাস্টি দৃশ্য — গোপনীয়" hi="ट्रस्टी दृश्य — गोपनीय" />
              </div>
              <h2 className="text-xl font-extrabold mt-1">
                <T en="P2P Request Ledger" bn="P2P অনুরোধ খতিয়ান" hi="P2P अनुरोध बही" />
              </h2>
              <p className="text-xs text-amber-100/80 mt-0.5">{orgName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-amber-100/70 hover:text-white rounded-full min-h-[44px] min-w-[44px]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {!loading && allowed && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {(
                [
                  ['requested', summary.requested, 'text-emerald-300', 'Paid out', 'প্রদত্ত', 'भुगतान'],
                  ['received', summary.received, 'text-sky-300', 'Received', 'প্রাপ্ত', 'प्राप्त'],
                  ['pending', summary.pending, 'text-amber-300', 'Pending', 'অপেক্ষমাণ', 'लंबित'],
                ] as const
              ).map(([k, v, cls, en, bn, hi]) => (
                <div key={k} className="rounded-2xl bg-white/10 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100/80">
                    <T en={en} bn={bn} hi={hi} />
                  </div>
                  <div className={`text-lg font-extrabold ${cls}`}>{formatMoney(v)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!allowed ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3" aria-hidden>
                🔒
              </div>
              <p className="font-bold text-stone-700">
                <T
                  en="Only trustees and accountants can view this ledger."
                  bn="শুধুমাত্র ট্রাস্টি ও হিসাবরক্ষক এই খতিয়ান দেখতে পারেন।"
                  hi="केवल ट्रस्टी और लेखाकार ही यह बही देख सकते हैं।"
                />
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              <T en="Loading…" bn="লোড হচ্ছে…" hi="लोड हो रहा है…" />
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-3">
                  {error}
                </div>
              )}

              {/* Filters + export */}
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={member}
                  onChange={(e) => setMember(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm min-h-[44px]"
                  aria-label="Filter by member"
                >
                  <option value="">{L === 'bn' ? 'সব সদস্য' : L === 'hi' ? 'सभी सदस्य' : 'All members'}</option>
                  {members.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={L === 'bn' ? 'উদ্দেশ্য খুঁজুন…' : L === 'hi' ? 'उद्देश्य खोजें…' : 'Search purpose…'}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm min-h-[44px] flex-1 min-w-[140px]"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm min-h-[44px]"
                  aria-label="Filter by status"
                >
                  {(['all', 'active', 'history'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s === 'all' ? (L === 'bn' ? 'সব' : L === 'hi' ? 'सभी' : 'All') : s}
                    </option>
                  ))}
                  {(
                    ['pending', 'accepted', 'paid', 'settled', 'declined', 'cancelled', 'expired'] as RequestStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {requestStatusLabel(s, L)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-sm min-h-[44px]"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-sm min-h-[44px]"
                  aria-label="To date"
                />
                <button
                  onClick={exportCsv}
                  className="rounded-xl bg-stone-800 text-white text-sm font-bold px-4 min-h-[44px]"
                >
                  ⬇ CSV
                </button>
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-10">
                  <T en="No requests yet." bn="এখনও কোনো অনুরোধ নেই।" hi="अभी कोई अनुरोध नहीं।" />
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((r) => {
                    const out = r.direction === 'org_to_user';
                    const cp = out ? r.receiverName : r.senderName;
                    return (
                      <div key={r.id} className="rounded-2xl bg-white border border-stone-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-sm">{cp || '—'}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  out ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {out ? (
                                  <T en="Org → member" bn="সংস্থা → সদস্য" hi="संस्था → सदस्य" />
                                ) : (
                                  <T en="Member → org" bn="সদস্য → সংস্থা" hi="सदस्य → संस्था" />
                                )}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                {requestStatusLabel(r.status, L)}
                              </span>
                            </div>
                            {r.note && <p className="text-xs text-stone-500 mt-1">{r.note}</p>}
                            <p className="text-[11px] text-stone-400 mt-1">
                              {r.senderTrusteeName && (
                                <span>
                                  <T en="Requested by" bn="অনুরোধকারী" hi="अनुरोधकर्ता" /> {r.senderTrusteeName} ·{' '}
                                </span>
                              )}
                              {new Date(r.createdAt || 0).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {r.paidVia && (
                                <span>
                                  {' '}
                                  · {r.paidVia}
                                  {r.paidRef ? ` (${r.paidRef})` : ''}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className={`font-extrabold shrink-0 ${out ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {out ? '−' : '+'}
                            {formatMoney(r.amount, r.currency)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Monthly summary */}
              {summary.byMonth.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white border border-stone-200 p-3">
                  <h3 className="font-extrabold text-stone-900 text-sm mb-2">
                    <T en="By month" bn="মাস অনুযায়ী" hi="माह अनुसार" />
                  </h3>
                  <div className="space-y-1">
                    {summary.byMonth.map(([m, b]) => (
                      <div key={m} className="flex justify-between text-sm">
                        <span className="text-stone-600 font-semibold">{m}</span>
                        <span className="text-stone-800">
                          {b.count} · {formatMoney(b.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
