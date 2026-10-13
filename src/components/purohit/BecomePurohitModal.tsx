/**
 * BecomePurohitModal — devotee → purohit upgrade path (dual identity).
 * =====================================================================
 * A devotee in an org context can ALSO become a purohit without leaving
 * their devotee identity. This mints the Universal Purohit ID (PUR-XXXXXX)
 * linked to their existing Firebase account (source: 'devotee_upgrade').
 * The verification tiers apply identically regardless of entry path.
 * After minting, the mode switcher takes them to the personal purohit
 * workspace — zero org data there.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { usePurohit } from '../../context/PurohitContext';
import { useToast } from '../../context/ToastContext';
import { VerificationBadge } from '../common/VerificationBadge';

interface BecomePurohitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]';

export const BecomePurohitModal: React.FC<BecomePurohitModalProps> = ({ isOpen, onClose }) => {
  const { firebaseUser, currentDevotee, enterPurohitSession } = useAuthWorkspace();
  const { mintPurohitIdentity } = usePurohit();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    displayName: currentDevotee?.fullName || '',
    phone: currentDevotee?.phone || '',
    city: '',
    languages: 'Sanskrit, Hindi',
    specializations: '',
  });
  const [saving, setSaving] = useState(false);
  const [minted, setMinted] = useState<import('../../types/purohit').PurohitIdentity | null>(null);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      showToast('Please sign in first.', 'error');
      return;
    }
    setSaving(true);
    try {
      const identity = await mintPurohitIdentity({
        uid: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        displayName: form.displayName,
        phone: form.phone,
        city: form.city,
        languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        source: 'devotee_upgrade',
      });
      setMinted(identity);
      showToast(`Welcome, ${identity.displayName}! Your Purohit ID is ${identity.id}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not create purohit identity', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openWorkspace = () => {
    if (minted) enterPurohitSession(minted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-5 rounded-t-3xl flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black">🪔 Become a Purohit</h2>
            <p className="text-xs text-amber-100 mt-1">
              Your devotee identity stays untouched. This adds a purohit identity with its own
              personal workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {minted ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <p className="font-black text-stone-900 text-lg">Your Purohit ID is minted</p>
                <p className="font-mono text-2xl font-black text-amber-700 mt-2">{minted.id}</p>
                <div className="mt-2 flex justify-center">
                  <VerificationBadge tier="REGISTERED" />
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Next: complete the credential application in your purohit workspace to climb the
                verification tiers — the same pipeline every purohit follows.
              </p>
              <button
                type="button"
                onClick={openWorkspace}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm min-h-[44px]"
              >
                Open my Purohit Workspace →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold text-sm min-h-[44px]"
              >
                Stay in devotee view
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                <p className="font-black mb-1">Dual identity, one login</p>
                <p>
                  You remain a devotee here. Your purohit profile lives in a separate personal
                  workspace with zero organisation data — switch between them anytime.
                </p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Display name</span>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                  className={`${inputCls} mt-1`}
                  placeholder="e.g. Pt. Ramesh Shastri"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">City</span>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    className={`${inputCls} mt-1`}
                    placeholder="e.g. Varanasi"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Languages</span>
                <input
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  className={`${inputCls} mt-1`}
                  placeholder="Sanskrit, Hindi, English"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Specializations</span>
                <input
                  value={form.specializations}
                  onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                  className={`${inputCls} mt-1`}
                  placeholder="Vivah Samskara, Grihapravesh (comma-separated)"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-sm min-h-[44px] disabled:opacity-50"
              >
                {saving ? 'Minting your Purohit ID…' : 'Mint my Purohit ID'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
