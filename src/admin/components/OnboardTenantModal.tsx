import React, { useState } from 'react';
import { X, Building2, MapPin, Shield, User, Loader2 } from 'lucide-react';
import { provisionTenant } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

interface OnboardTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OnboardTenantModal: React.FC<OnboardTenantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [stateName, setStateName] = useState('');
  const [tier, setTier] = useState<'Enterprise' | 'Heritage' | 'Standard' | 'Starter'>('Standard');
  const [custodian, setCustodian] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Temple Name is required');
      showToast('Temple Name is required', 'error');
      return;
    }

    if (!location.trim()) {
      setFormError('Location is required');
      showToast('Location is required', 'error');
      return;
    }

    setLoading(true);
    try {
      await provisionTenant({
        name: name.trim(),
        location: location.trim(),
        state: stateName.trim() || 'Dharmic Kshetra',
        tier,
        custodian: custodian.trim() || 'Chief Trustee',
      });

      showToast(`Mandir "${name}" provisioned successfully!`, 'success');
      onSuccess();
      onClose();
      // Reset form
      setName('');
      setLocation('');
      setStateName('');
      setCustodian('');
      setTier('Standard');
    } catch (err: any) {
      console.error('Error provisioning tenant:', err);
      const errMsg = err?.message || 'Failed to provision tenant';
      setFormError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-amber-50 to-orange-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Onboard New Mandir</h2>
              <p className="text-xs text-slate-500">Provision isolated multi-tenant partition</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Temple / Trust Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shree Somnath Jyotirlinga Trust"
                required
                disabled={loading}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City / Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Prabhas Patan"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                State / Province
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="e.g. Gujarat"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Plan Tier
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
                >
                  <option value="Standard">Standard Tier</option>
                  <option value="Heritage">Heritage Mandir</option>
                  <option value="Enterprise">Enterprise Kshetra</option>
                  <option value="Starter">Starter Ashram</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Chief Custodian / Trustee
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={custodian}
                  onChange={(e) => setCustodian(e.target.value)}
                  placeholder="e.g. Sri Pravinbhai Trivedi"
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 flex items-center transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : (
                'Confirm & Provision Mandir'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default OnboardTenantModal;
