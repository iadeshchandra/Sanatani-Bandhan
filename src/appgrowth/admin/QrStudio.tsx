/**
 * QrStudio — App Growth admin: branded QR codes, campaign QRs, print posters.
 * ==========================================================================
 * QR rendering/export lives in `./qrBranded` — a COMPAT SHIM. The QR builder
 * owns `src/appgrowth/qr/` (BrandedQr, export fns, PosterGenerator); when it
 * lands, rewire the imports below to `../qr/...` and delete `qrBranded.tsx`.
 *
 * Campaigns live in `appGrowthCampaigns/{id}`: { label, templeName, createdAt,
 * createdBy }. Each campaign gets its own QR pointing at /get-app?c=<id> so
 * scans attribute to the temple/event that printed it.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { Download, Plus, Megaphone, Printer, QrCode } from 'lucide-react';
import { db, auth } from '../../firebase';
import { appGrowthLink, isOwnerClient } from '../useAppGrowthConfig';
import { useToast } from '../../context/ToastContext';
import { Card, Empty, Loading, SectionTitle, Field, inputCls, btnPrimary, btnGhost } from './ui';
import { BrandedQrPreview, downloadQrPng, downloadQrSvg, downloadPosterPdf } from './qrBranded';

interface Campaign {
  id: string;
  label: string;
  templeName: string;
}

const DownloadRow: React.FC<{ value: string; label: string; posterOpts?: { title: string; templeName?: string } }> = ({ value, label, posterOpts }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (kind: 'png' | 'svg' | 'pdf', fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); } catch { /* toast from caller context */ } finally { setBusy(null); }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btnGhost} disabled={!!busy} onClick={() => run('png', () => downloadQrPng(value, label))}>
        <Download className="w-4 h-4" /> {busy === 'png' ? '…' : 'PNG'}
      </button>
      <button type="button" className={btnGhost} disabled={!!busy} onClick={() => run('svg', () => downloadQrSvg(value, label))}>
        <Download className="w-4 h-4" /> {busy === 'svg' ? '…' : 'SVG'}
      </button>
      {posterOpts && (
        <button
          type="button"
          className={btnGhost}
          disabled={!!busy}
          onClick={() => run('pdf', () => downloadPosterPdf({
            value,
            title: posterOpts.title,
            campaignLabel: label,
            templeName: posterOpts.templeName,
          }))}
        >
          <Printer className="w-4 h-4" /> {busy === 'pdf' ? '…' : 'Poster PDF'}
        </button>
      )}
    </div>
  );
};

export const QrStudio: React.FC = () => {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [temple, setTemple] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'appGrowthCampaigns'), orderBy('createdAt', 'desc')));
      setCampaigns(snap.docs.map((d) => ({ id: d.id, label: String(d.data().label ?? d.id), templeName: String(d.data().templeName ?? '') })));
    } catch {
      showToast('Could not load campaigns.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const createCampaign = async () => {
    if (!isOwnerClient()) { showToast('Only the platform owner can create campaigns.', 'error'); return; }
    const cleanLabel = label.trim();
    if (!cleanLabel) { showToast('Give the campaign a label first (e.g. "Diwali 2026").', 'error'); return; }
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, 'appGrowthCampaigns'), {
        label: cleanLabel,
        templeName: temple.trim(),
        active: true, // contract with growthService.getCampaign: explicit false = hidden
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid ?? 'unknown',
      });
      setLabel('');
      setTemple('');
      await load();
      setActiveId(ref.id);
      showToast(`Campaign "${cleanLabel}" created — its QR is ready below.`, 'success');
    } catch {
      showToast('Campaign creation failed.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const baseLink = appGrowthLink();
  const active = campaigns.find((c) => c.id === activeId) ?? null;
  const activeLink = active ? appGrowthLink(active.id) : null;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle hint="The main code — print it anywhere. Points at /get-app (no campaign attribution).">
          <span className="flex items-center gap-2"><QrCode className="w-4 h-4 text-saffron-400" /> Master QR</span>
        </SectionTitle>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <BrandedQrPreview value={baseLink} label="Get the app" size={170} />
          <div className="space-y-2 w-full">
            <p className="text-[11px] text-slate-500 break-all font-mono">{baseLink}</p>
            <DownloadRow value={baseLink} label="Get the app" posterOpts={{ title: 'Get the Sanatani Bandhan app' }} />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="One QR per temple / event — scans attribute back to the campaign in Analytics.">
          <span className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-saffron-400" /> Campaign QRs</span>
        </SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <Field label="Campaign label">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder='e.g. Diwali 2026 — Main Gate' />
          </Field>
          <Field label="Temple / venue (optional)">
            <input className={inputCls} value={temple} onChange={(e) => setTemple(e.target.value)} placeholder="e.g. Shree Mandir, Dhaka" />
          </Field>
        </div>
        <button type="button" className={btnPrimary} disabled={creating} onClick={createCampaign}>
          <Plus className="w-4 h-4" /> {creating ? 'Creating…' : 'Create campaign + QR'}
        </button>

        <div className="mt-4">
          {loading ? <Loading text="Loading campaigns…" /> : campaigns.length === 0 ? (
            <Empty text="No campaigns yet — create the first one above." />
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(activeId === c.id ? null : c.id)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 min-h-[44px] transition-colors ${activeId === c.id ? 'border-saffron-500/70 bg-saffron-500/5' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'}`}
                >
                  <p className="text-sm font-bold text-white">{c.label}</p>
                  <p className="text-[11px] text-slate-500">{c.templeName || 'No venue set'} · <span className="font-mono">{c.id}</span></p>
                </button>
              ))}
            </div>
          )}
        </div>

        {active && activeLink && (
          <div className="mt-4 rounded-xl border border-saffron-500/30 bg-saffron-500/5 p-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <BrandedQrPreview value={activeLink} label={active.label} size={170} />
              <div className="space-y-2 w-full">
                <p className="text-sm font-bold text-white">{active.label}</p>
                <p className="text-[11px] text-slate-500 break-all font-mono">{activeLink}</p>
                <DownloadRow
                  value={activeLink}
                  label={active.label}
                  posterOpts={{ title: 'Get the Sanatani Bandhan app', templeName: active.templeName || undefined }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
