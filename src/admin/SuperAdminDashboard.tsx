import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  Landmark,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Search,
  Filter,
  Plus,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
  Server,
  Layers,
} from 'lucide-react';
import { getTenants, TenantRecord, DEFAULT_TENANTS } from '../services/adminService';
import { OnboardTenantModal } from './components/OnboardTenantModal';
import { useLanguage } from '../context/LanguageContext';
import { ExecutiveLiveTicker } from './components/ExecutiveLiveTicker';
import { PredictiveCrowdForecast } from './components/PredictiveCrowdForecast';
import { FiduciarySolvencyTerminal } from './components/FiduciarySolvencyTerminal';

export const SuperAdminDashboard: React.FC = () => {
  const { getTaxonomy } = useLanguage();
  const [tenants, setTenants] = useState<TenantRecord[]>(DEFAULT_TENANTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAllTenants = useCallback(async () => {
    try {
      const records = await getTenants();
      setTenants(records && records.length > 0 ? records : DEFAULT_TENANTS);
    } catch {
      setTenants(DEFAULT_TENANTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTenants();
  }, [fetchAllTenants]);

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || tenant.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Cloud Infrastructure
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Cluster: ap-south-1 (Mumbai / SE1)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Global Platform Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aggregated metrics, multi-tenant database partitions, and enterprise onboarding management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Health Checks</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shadow-amber-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard New Mandir</span>
          </button>
        </div>
      </div>

      {/* Row 1: Executive Live Telemetry Ticker */}
      <ExecutiveLiveTicker />

      {/* Row 2: Executive Core Telemetry KPI Band (Terminal Theme) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Metric 1: Total Temples / Tenants */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-slate-100 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Mandir Tenants
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight">
              {loading ? '-' : tenants.length}
            </span>
            <span className="text-xs font-bold text-emerald-400 inline-flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> 100% Online
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Partitioned Databases</span>
            <span className="font-semibold font-mono text-amber-400">Zero Leakage</span>
          </div>
        </div>

        {/* Metric 2: Total Participants / Devotees */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-slate-100 hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {getTaxonomy('Participant')} Reach
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight">45.2K</span>
            <span className="text-xs font-bold text-emerald-400 inline-flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14.8% MoM
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Unique QR Gate Passes</span>
            <span className="font-semibold font-mono text-indigo-300">41.8K Issued</span>
          </div>
        </div>

        {/* Metric 3: Offering / Treasury Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden text-slate-100 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {getTaxonomy('FinancialOffering')} Gross Volume
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight">₹1.2M</span>
            <span className="text-xs font-bold text-emerald-400 inline-flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +18.2%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Section 80G Certified</span>
            <span className="font-semibold font-mono text-emerald-400">Form 10BE Synced</span>
          </div>
        </div>
      </div>

      {/* Row 3: Dual Intelligence Command Sector (Panchang AI + Fiduciary Solvency) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PredictiveCrowdForecast />
        <FiduciarySolvencyTerminal />
      </div>

      {/* Row 4: Live Tenant Status Roster & RRT Intervention Desk */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter & Search Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Live Tenant Status Roster & RRT Intervention Desk
            </h2>
            <p className="text-xs text-slate-500">
              Mandir trusts and dharmic organizations registered across the cluster &bull; {getTaxonomy('SpiritualCustodian')} Directory & Emergency Interventions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search mandir, city, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">All Tiers</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Heritage">Heritage</option>
              <option value="Standard">Standard</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Temple Name & Code</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Plan Tier</th>
                <th className="py-3.5 px-4">{getTaxonomy('Participant')}</th>
                <th className="py-3.5 px-4">Onboarded</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="font-semibold text-xs text-slate-500">Loading Tenants from Firestore...</p>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm">No Tenants Found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const isEnterprise = tenant.tier === 'Enterprise';
                  const isHeritage = tenant.tier === 'Heritage';

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs flex-shrink-0">
                            {tenant.code.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{tenant.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">
                              {tenant.code} &bull; {getTaxonomy('SpiritualCustodian')}: {tenant.custodian || 'Pradhan Archaka'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <p className="text-slate-800 font-semibold">{tenant.location}</p>
                        <p className="text-[11px] text-slate-400">{tenant.state}</p>
                      </td>

                      {/* Plan Tier */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isEnterprise
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isHeritage
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {tenant.tier}
                        </span>
                      </td>

                      {/* Devotees */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {tenant.devoteeCount}
                      </td>

                      {/* Onboarded Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {tenant.onboardedDate}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            tenant.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tenant.status === 'Trial Mode'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tenant.status === 'Active'
                                ? 'bg-emerald-500'
                                : tenant.status === 'Trial Mode'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          ></span>
                          {tenant.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard New Mandir Modal */}
      <OnboardTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchAllTenants()}
      />
    </div>
  );
};
