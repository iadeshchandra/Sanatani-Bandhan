/**
 * PurohitReviewQueue — platform admin credential review.
 * Mounted at /admin/purohit-reviews behind SystemOverrideGuard (owner email).
 * Approve → applicant's tier becomes CREDENTIAL_VERIFIED. Reject → reason recorded.
 */
import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { PurohitApplication } from '../types/purohit';

export const PurohitReviewQueue: React.FC = () => {
  const [apps, setApps] = useState<PurohitApplication[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [working, setWorking] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const q =
      filter === 'ALL'
        ? query(collection(db, 'purohitApplications'), orderBy('createdAt', 'desc'), limit(100))
        : query(
            collection(db, 'purohitApplications'),
            where('status', '==', filter),
            orderBy('createdAt', 'desc'),
            limit(100)
          );
    const unsub = onSnapshot(
      q,
      (snap) => setApps(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitApplication))),
      () => setApps([])
    );
    return () => unsub();
  }, [filter]);

  const decide = async (app: PurohitApplication, approve: boolean) => {
    if (!approve && !rejectReason.trim()) {
      alert('Give a rejection reason — the applicant sees it.');
      return;
    }
    setWorking(app.id);
    try {
      const ts = Date.now();
      await updateDoc(doc(db, 'purohitApplications', app.id), {
        status: approve ? 'APPROVED' : 'REJECTED',
        rejectionReason: approve ? '' : rejectReason.trim().slice(0, 500),
        reviewedAt: ts,
      });
      if (approve) {
        // Advance the tier along the ordered path (admin-authoritative).
        await updateDoc(doc(db, 'purohits', app.purohitId), {
          verificationTier: 'CREDENTIAL_VERIFIED',
          updatedAt: ts,
        });
      }
      setRejectFor(null);
      setRejectReason('');
    } catch (e: any) {
      alert(e.message || 'Decision failed');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Purohit Credential Review</h1>
        <p className="text-sm text-slate-500 mt-1">
          Applications from independent purohits. Approval advances them to CREDENTIAL_VERIFIED.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">🪔</p>
          <p className="font-bold text-slate-700">No {filter.toLowerCase()} applications</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {apps.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-black text-slate-900">{app.displayName}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {app.purohitId} · {app.city} · {app.phone}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {app.experienceYears} yrs · {app.idProofType} · {app.gurukulAffiliation || 'No gurukul listed'}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 ${
                    app.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800'
                      : app.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {app.status}
                </span>
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-black text-slate-700 mb-1.5">Certificates</p>
                  {app.certificates.length === 0 ? (
                    <p className="text-slate-400">None listed</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {app.certificates.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-black text-slate-700 mb-1.5">Specializations & languages</p>
                  <p className="text-slate-600">{app.specializations.join(', ') || '—'}</p>
                  <p className="text-slate-500 mt-1">{app.languages.join(', ')}</p>
                </div>
              </div>

              {app.status === 'REJECTED' && app.rejectionReason && (
                <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  Rejected: {app.rejectionReason}
                </p>
              )}

              {app.status === 'PENDING' && (
                <div className="mt-4">
                  {rejectFor === app.id ? (
                    <div className="space-y-2.5">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="Rejection reason (visible to applicant)…"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={working === app.id}
                          onClick={() => decide(app, false)}
                          className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black"
                        >
                          Confirm rejection
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectFor(null);
                            setRejectReason('');
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={working === app.id}
                        onClick={() => decide(app, true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50"
                      >
                        {working === app.id ? 'Working…' : '✓ Approve → Credential Verified'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectFor(app.id)}
                        className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700"
                      >
                        Reject with reason
                      </button>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-3">
                Applied {new Date(app.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
