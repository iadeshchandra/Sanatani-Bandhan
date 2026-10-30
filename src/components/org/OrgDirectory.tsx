/**
 * OrgDirectory — public organisation discovery (Membership sprint).
 * ==========================================================================
 * Searchable / filterable list of published organisation pages.
 * Search by name or city; filter by organisation type. Each row opens the
 * public OrgPage. Entry points: devotee account area + public routes.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, BadgeCheck, Loader2, Landmark, ArrowLeft, Building2 } from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { useLanguage } from '../../context/LanguageContext';
import { PublicLanguageButton } from '../public/PublicLanguageButton';
import { orgTypeLabel, OrgPage as OrgPageType } from '../../types/membership';

const TYPE_FILTERS = [
  'All', 'Mandir', 'Sangha', 'Ashram', 'Gurukul', 'Goshala',
  'Trust', 'Samaj', 'PurohitSabha', 'MahotsavSamiti', 'Tirth',
];

export const OrgDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { t: gt } = useLanguage();
  const { browseOrgPages } = useMembership();
  const [pages, setPages] = useState<OrgPageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      const list = await browseOrgPages({ q: q.trim() || undefined, type: type === 'All' ? undefined : type });
      setPages(list);
      setLoading(false);
    }, q ? 350 : 0); // debounce typing
    return () => clearTimeout(t);
  }, [q, type, browseOrgPages]);

  return (
    <div className="min-h-screen public-backdrop pb-16">
      <div className="bg-gradient-to-br from-amber-700 via-orange-800 to-stone-900 px-4 pt-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-white/80 hover:text-white flex items-center gap-1.5 text-xs font-bold mb-4 min-h-[44px]"
            >
              <ArrowLeft size={14} /> {gt('surfaces.orgDirectory.back')}
            </button>
            {/* World-Readiness B4 (G-L3): the canonical language door. */}
            <PublicLanguageButton tone="dark" />
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Building2 size={24} /> {gt('surfaces.orgDirectory.title')}
          </h1>
          <p className="text-amber-100/80 text-sm mt-1">
            {gt('surfaces.orgDirectory.subtitle')}
          </p>
          <div className="relative mt-4">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={gt('surfaces.orgDirectory.searchPlaceholder')}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium text-stone-900 placeholder:text-stone-400 bg-white shadow-lg outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
            />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-black transition-all min-h-[44px] ${
                  type === t ? 'bg-white text-amber-800 shadow' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {t === 'All' ? gt('surfaces.orgDirectory.all') : orgTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-2 pt-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-amber-600" size={32} />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-16">
            <Landmark size={48} className="text-stone-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-stone-600">{gt('surfaces.orgDirectory.emptyTitle')}</p>
            <p className="text-xs text-stone-400 mt-1">{gt('surfaces.orgDirectory.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((p) => (
              <button
                key={p.orgId}
                onClick={() => navigate(`/org/${p.publicSlug || p.orgId}`)}
                className="w-full bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-4 hover:shadow-md hover:border-amber-300 transition-all text-left min-h-[44px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white font-black text-xl shrink-0 overflow-hidden">
                  {p.logoUrl ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover" /> : <Landmark size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-stone-900 text-sm flex items-center gap-1.5 truncate">
                    <span className="truncate">{p.name}</span>
                    {p.verified && <BadgeCheck size={14} className="text-emerald-600 shrink-0" />}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                    <span className="font-bold text-amber-700">{orgTypeLabel(p.type)}</span>
                    {p.city && <span className="flex items-center gap-0.5"><MapPin size={10} /> {p.city}</span>}
                  </p>
                  {p.about && <p className="text-xs text-stone-400 mt-1 line-clamp-1">{p.about}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
