import React, { useState } from 'react';
import { Layers, Plus, Search, ShieldCheck, Download, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { AssetRecord } from '../../types';
import { useToast } from '../../context/ToastContext';

export const AssetInventoryDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { assets, addAsset } = useData();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Deity Ornaments & Gold' | 'Land & Building' | 'Vahan / Vehicle' | 'Electronics' | 'Utensils & Bhandara' | 'Other'>('Deity Ornaments & Gold');
  const [valuation, setValuation] = useState<number | ''>(500000);
  const [acquisitionDate, setAcquisitionDate] = useState('2020-01-01');
  const [condition, setCondition] = useState<'Pristine' | 'Good' | 'Needs Repair' | 'Retired'>('Pristine');
  const [custodian, setCustodian] = useState('Head Priest / Trust Vault');
  const [location, setLocation] = useState('Sanctum Central Vault');
  const [donorName, setDonorName] = useState('');

  const totalAssetValuation = assets.reduce((acc, curr) => acc + curr.valuation, 0);

  const filteredAssets = assets.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      a.category?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      a.custodian?.toLowerCase().includes(searchTerm?.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !valuation) return;

    addAsset({
      workspaceId: activeWorkspace.id,
      name: name.trim(),
      category,
      valuation: Number(valuation),
      acquisitionDate,
      condition,
      custodian: custodian.trim(),
      location: location.trim(),
      donorName: donorName.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setName('');
    setValuation(500000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Fixed Asset & Vault Registry
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Total Valuation: ₹{totalAssetValuation.toLocaleString()}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Fixed Assets & Deity Ornaments Ledger
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Audit register for Deity Swarna Mukut, Sanctum Gold, Real Estate, and Sabha acoustics
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Fixed Asset</span>
        </button>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset, idx) => (
          <div
            key={`${asset.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-saffron-400">
                    {asset.category}
                  </span>
                  <h3 className="font-extrabold text-sm text-temple-100 mt-0.5">{asset.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    asset.condition === 'Pristine'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-temple-800 text-temple-300'
                  }`}
                >
                  {asset.condition}
                </span>
              </div>

              <div className="py-2 space-y-1 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Custodian:</span>{' '}
                  <span className="font-medium text-temple-100">{asset.custodian}</span>
                </p>
                <p>
                  <span className="text-temple-400">Location:</span>{' '}
                  <span className="text-temple-200">{asset.location}</span>
                </p>
                <p>
                  <span className="text-temple-400">Acquired:</span>{' '}
                  <span className="font-mono text-temple-300">{asset.acquisitionDate}</span>
                </p>
                {asset.donorName && (
                  <p>
                    <span className="text-temple-400">Donor:</span>{' '}
                    <span className="text-saffron-400 font-semibold">{asset.donorName}</span>
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-temple-950/60 border border-temple-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-temple-400 font-semibold uppercase">Asset Valuation</p>
                  <p className="text-lg font-black text-saffron-400">₹{(asset.valuation || 0).toLocaleString()}</p>
                </div>
                <ShieldCheck className="w-5 h-5 text-saffron-500 opacity-80" />
              </div>
            </div>

            <div className="pt-2 text-right">
              <span className="text-[10px] text-temple-400 font-mono">Asset ID: {asset.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl max-w-md w-full p-6 text-temple-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Register Fixed Asset</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Asset Name / Description *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Swarna Mukut (Gold Crown)"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  >
                    <option>Deity Ornaments & Gold</option>
                    <option>Land & Building</option>
                    <option>Vahan / Vehicle</option>
                    <option>Electronics</option>
                    <option>Utensils & Bhandara</option>
                  </select>
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Valuation (₹) *</label>
                  <input
                    type="number"
                    required
                    value={valuation}
                    onChange={(e) => setValuation(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200 font-bold text-saffron-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Custodian</label>
                  <input
                    type="text"
                    value={custodian}
                    onChange={(e) => setCustodian(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Vault / Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Donor Name (If Donated)</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-temple-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
