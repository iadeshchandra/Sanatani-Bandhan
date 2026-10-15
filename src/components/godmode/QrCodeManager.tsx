/**
 * QrCodeManager.tsx — Owner-only QR code uploader for payment regions.
 *
 * Rendered inside GodMode → Settings → Geo Payments (QR Codes subtab).
 * The owner uploads payment QR images (UPI for India, Bangla QR for
 * Bangladesh, etc.) directly from the app — no more GitHub web-UI uploads.
 *
 * Storage: Firestore `qrCodes/{REGION}` as base64 PNG data URLs
 * (see src/lib/qrCodes.ts). Public read, owner-only write via rules.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, QrCode, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  uploadQrCode,
  getQrCodeUrl,
  deleteQrCode,
  validateQrFile,
  clearQrCodeCache,
} from '../../lib/qrCodes';
import { getGeoPaymentConfig, type RegionConfig } from '../../lib/geoDetect';
import { clearPaymentMethodsCache } from '../../lib/paymentMethods';
import { useToast } from '../../context/ToastContext';

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-sanatani-orange outline-none';

interface RegionQrState {
  url: string | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

export const QrCodeManager: React.FC = () => {
  const { showToast } = useToast();
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [state, setState] = useState<Record<string, RegionQrState>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setRegionState = useCallback((regionId: string, patch: Partial<RegionQrState>) => {
    setState((prev) => ({
      ...prev,
      [regionId]: { url: null, loading: false, uploading: false, error: null, ...(prev[regionId] || {}), ...patch },
    }));
  }, []);

  const loadRegion = useCallback(async (regionId: string) => {
    setRegionState(regionId, { loading: true, error: null });
    const url = await getQrCodeUrl(regionId);
    setRegionState(regionId, { url, loading: false });
  }, [setRegionState]);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getGeoPaymentConfig();
        const list = cfg.regions.filter((r) => r.enabled);
        setRegions(list);
        list.forEach((r) => loadRegion(r.id));
      } catch {
        // Fallback to the two QR regions if config is unreachable
        const fallback = [
          { id: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', countryCodes: ['91'], ipCountries: ['IN'], enabled: true, flag: '🇮🇳' },
          { id: 'BD', name: 'Bangladesh', currency: 'BDT', currencySymbol: '৳', countryCodes: ['880'], ipCountries: ['BD'], enabled: true, flag: '🇧🇩' },
        ];
        setRegions(fallback);
        fallback.forEach((r) => loadRegion(r.id));
      }
    })();
  }, [loadRegion]);

  const handleFile = async (regionId: string, file: File | undefined) => {
    if (!file) return;
    const err = validateQrFile(file);
    if (err) {
      setRegionState(regionId, { error: err });
      return;
    }
    const uid = auth.currentUser?.uid || 'owner';
    setRegionState(regionId, { uploading: true, error: null });
    const url = await uploadQrCode(regionId, file, uid);
    if (url) {
      setRegionState(regionId, { url, uploading: false });
      // Payment method QR overrides are cached — bust them so the new QR shows.
      clearQrCodeCache();
      clearPaymentMethodsCache();
      try {
        const { clearCachedRegion } = await import('../../lib/geoDetect');
        clearCachedRegion();
      } catch { /* non-fatal */ }
      showToast(`QR code uploaded for ${regionId}.`, 'success');
    } else {
      setRegionState(regionId, { uploading: false, error: 'Upload failed. Please try again.' });
    }
    // Reset the file input so the same file can be re-selected
    const input = fileRefs.current[regionId];
    if (input) input.value = '';
  };

  const handleDelete = async (regionId: string) => {
    const ok = await deleteQrCode(regionId);
    if (ok) {
      setRegionState(regionId, { url: null });
      clearQrCodeCache();
      clearPaymentMethodsCache();
      showToast(`QR code removed for ${regionId}.`, 'success');
    } else {
      setRegionState(regionId, { error: 'Delete failed. Please try again.' });
    }
    setConfirmDelete(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <QrCode size={16} className="text-sanatani-orange" />
        <h4 className="text-sm font-black text-gray-800">Payment QR Codes</h4>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Upload the QR image for each region. It appears instantly on the billing pages —
        no GitHub upload needed. Images are resized to 800px automatically.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {regions.map((r) => {
          const s = state[r.id] || { url: null, loading: true, uploading: false, error: null };
          return (
            <div key={r.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-800">
                  <span className="mr-1.5">{r.flag || '🌐'}</span>
                  {r.name} <span className="text-gray-400 font-mono text-xs">{r.id}</span>
                </p>
                {s.url && !s.loading && (
                  <span className="text-[10px] font-black uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> Live
                  </span>
                )}
              </div>

              {/* Preview */}
              <div className="w-40 h-40 mx-auto rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden mb-3">
                {s.loading ? (
                  <Loader2 size={24} className="animate-spin text-gray-300" />
                ) : s.url ? (
                  <img src={s.url} alt={`${r.name} payment QR`} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center px-4">
                    <QrCode size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-[11px] text-gray-400">No QR uploaded</p>
                  </div>
                )}
              </div>

              {s.error && (
                <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {s.error}
                </p>
              )}

              <input
                ref={(el) => { fileRefs.current[r.id] = el; }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFile(r.id, e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileRefs.current[r.id]?.click()}
                  disabled={s.uploading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sanatani-orange text-white text-xs font-black disabled:opacity-50 min-h-[44px]"
                >
                  {s.uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {s.uploading ? 'Uploading…' : s.url ? 'Replace QR' : 'Upload QR'}
                </button>
                {s.url && (
                  <button
                    onClick={() => setConfirmDelete(r.id)}
                    disabled={s.uploading}
                    title="Delete QR code"
                    className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {r.id === 'IN' && (
                <p className="text-[11px] text-gray-400 mt-2">
                  While no QR is uploaded, Indian users see international methods instead.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-gray-800 mb-2">Delete QR code?</h3>
            <p className="text-sm text-gray-500 mb-4">
              The <span className="font-bold">{confirmDelete}</span> payment QR will be removed.
              {confirmDelete === 'IN' && ' Indian users will fall back to international methods.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 min-h-[44px]">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-black min-h-[44px]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QrCodeManager;
