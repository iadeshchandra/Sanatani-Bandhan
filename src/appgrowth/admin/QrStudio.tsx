/**
 * QrStudio — App Growth admin: branded QR codes, campaign QRs, print posters.
 * ==========================================================================
 * QR rendering/export/posters come from the QR builder's module
 * `src/appgrowth/qr/` (BrandedQr, exportQrPng/Svg/Pdf, PosterGenerator,
 * buildAppLink). Campaign CRUD here is the Admin builder's ownership —
 * `qrLinks.ts` treats `appGrowthCampaigns` as read-only.
 *
 * Campaigns live in `appGrowthCampaigns/{id}`: { label, templeName, active,
 * createdAt, createdBy }. Each campaign gets its own QR pointing at
 * /get-app?c=<id> so scans attribute to the temple/event that printed it.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { Download, Plus, Megaphone, QrCode, FileText } from 'lucide-react';
import { db, auth } from '../../firebase';
import { isOwnerClient } from '../useAppGrowthConfig';
import { useToast } from '../../context/ToastContext';
import { Card, Empty, Loading, SectionTitle, Field, inputCls, btnPrimary, btnGhost } from './ui';
import {
  BrandedQr,
  PosterGenerator,
  buildAppLink,
  exportQrPng,
  exportQrSvg,
  exportQrPdf,
} from '../qr';

interface Campaign {
  id: string;
  label: string;
  templeName: string;
}

const DownloadRow: React.FC<{ campaignId?: string | null; campaignLabel?: string }> = ({ campaignId, campaignLabel }) => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const opts = {
    campaignId: campaignId ?? null,
    campaignLabel,
    variant: (campaignId ? 'campaign' : 'generic') as 'campaign' | 'generic',
  };
  const run = async (kind: 'png' | 'svg' | 'pdf', fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
      showToast(`${kind.toUpperCase()} downloaded.`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : `${kind.toUpperCase()} export failed.`, 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btnGhost} disabled={!!busy} onClick={() => run('png', () => exportQrPng(opts))}>
        <Download className="w-4 h-4" /> {busy === 'png' ? '…' : 'PNG'}
      </button>
      <button type="button" className={btnGhost} disabled={!!busy} onClick={() => run('svg', () => exportQrSvg(opts))}>
        <Download className="w-4 h-4" /> {busy === 'svg' ? '…' : 'SVG'}
      </button>
      <button type="button" className={btnGhost} disabled={!!busy} onClick={() => run('pdf', () => exportQrPdf(opts))}>
        <FileText className="w-4 h-4" /> {busy === 'pdf' ? '…' : 'Print PDF'}
      </button>
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

  const active = campaigns.find((c) => c.id === activeId) ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle hint="The main code — print it anywhere. Points at /get-app (no campaign attribution).">
          <span className="flex items-center gap-2"><QrCode className="w-4 h-4 text-saffron-400" /> Master QR</span>
        </SectionTitle>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="rounded-2xl bg-white p-3">
            <BrandedQr url={buildAppLink()} size={170} variant="generic" />
          </div>
          <div className="space-y-2 w-full">
            <p className="text-[11px] text-slate-500 break-all font-mono">{buildAppLink()}</p>
            <DownloadRow />
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

        {active && (
          <div className="mt-4 rounded-xl border border-saffron-500/30 bg-saffron-500/5 p-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="rounded-2xl bg-white p-3">
                <BrandedQr url={buildAppLink(active.id)} size={170} variant="campaign" campaignLabel={active.label} />
              </div>
              <div className="space-y-2 w-full">
                <p className="text-sm font-bold text-white">{active.label}</p>
                <p className="text-[11px] text-slate-500 break-all font-mono">{buildAppLink(active.id)}</p>
                <DownloadRow campaignId={active.id} campaignLabel={active.label} />
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint="Temple-notice-board poster: pick a campaign, preview the A4, download the print PDF. Built by the QR builder.">
          Poster generator
        </SectionTitle>
        <PosterGenerator />
      </Card>
    </div>
  );
};
