import React from 'react';
import { Heart, Beef, GraduationCap, Sparkles, Flame, Users } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { calculatePanchang, getPanchangTodayLine } from '../../utils/panchang';
import { ShlokaCard, RoleHomeSwitch } from './RoleHome';
import { GurukulHome } from './GurukulHome';
import { useOrgGlanceRefresh } from '../../lib/orgGlanceSync';
import { resolveHerdCount } from '../../lib/herdCount';

interface DashboardHomeProps {
  onSelectModule?: (id: string) => void;
  onNavigate?: (id: string) => void;
  onOpenQuickPay: () => void;
  onOpenMySpace?: () => void;
}

/**
 * DashboardHome — the sacred home.
 *
 * The top banner (workspace identity + live Panjika) and the Daily Vedic
 * Wisdom shloka are the soul of the app: identical for every role.
 * Below them, RoleHomeSwitch renders each role's 3-action work surface
 * (Priest / Accountant / Trustee / Sevadar); every other role falls back
 * to the full dashboard body.
 */
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onSelectModule,
  onNavigate,
  onOpenQuickPay,
  onOpenMySpace,
}) => {
  const handleNav = (mod: string) => {
    if (onNavigate) onNavigate(mod);
    else if (onSelectModule) onSelectModule(mod);
  };
  const { activeWorkspace, currentDevotee } = useAuthWorkspace();
  const taxonomy = useWorkspaceTaxonomy();
  const { safeTranslate } = useLanguage();
  const { devotees, poojaBookings, cows, gurukulStudents, collectionWindows } = useData();
  const panchang = calculatePanchang();
  // Keep the Solo "what needs me" feed fresh: refresh this org's glance
  // summary (debounced, fail-open) whenever its dashboard loads.
  useOrgGlanceRefresh();

  // R-1 (Gurukul vibe): Gurukul / Vidyalaya workspaces get the dedicated
  // gurukul home — dinacharya, pathyakram, kanthastha, parampara — instead of
  // the generic role work surface. The sacred header + shloka stay identical.
  const orgTypeKey = (activeWorkspace.type || '').toLowerCase();
  const isGurukulLike = ['gurukul', 'vidyalaya', 'pathshala'].includes(orgTypeKey);

  // F-DASH-3: per-org-type hero stat — LIVE workspace data, never identical
  // mock numbers. Goshala leads with the herd, Gurukul with shishyas,
  // Mandir with seva bookings, everyone else with their community.
  const heroPrimary = (() => {
    if (orgTypeKey === 'goshala')
      return {
        Icon: Beef,
        label: safeTranslate('dash_hero_cows', 'Gau Mata Under Care', 'যত্নে থাকা গোমাতা', 'देखभाल में गौ माता'),
        // QUEUED #59 (A4-1): the herd's register of record is the
        // Goshala One suite store — read it through the ONE resolver
        // every surface shares, never the DataContext register alone.
        value: resolveHerdCount(activeWorkspace.id, { legacyCowCount: cows.length }),
      };
    if (isGurukulLike)
      return {
        Icon: GraduationCap,
        label: safeTranslate('dash_hero_students', 'Shishyas in Learning', 'শিক্ষারত শিষ্য', 'अध्ययनरत शिष्य'),
        value: gurukulStudents.length,
      };
    if (['mandir', 'kashikshetra', 'tirth'].includes(orgTypeKey))
      return {
        Icon: Sparkles,
        label: safeTranslate('dash_hero_bookings', 'Seva Bookings', 'সেবা বুকিং', 'सेवा बुकिंग'),
        // F2: prefer the probed server total over the loaded window size.
        value: collectionWindows.puja_bookings.total ?? poojaBookings.length,
      };
    if (orgTypeKey === 'ashram')
      return {
        Icon: Flame,
        label: safeTranslate('dash_hero_sadhaks', 'Sadhak Parivar', 'সাধক পরিবার', 'साधक परिवार'),
        // F2: prefer the probed server total over the loaded window size.
        value: collectionWindows.devotees.total ?? devotees.length,
      };
    return {
      Icon: Users,
      label: safeTranslate('dash_hero_parivar', 'Kul Parivars', 'কুল পরিবার', 'कुल परिवार'),
      // F2: prefer the probed server total over the loaded window size.
      value: collectionWindows.devotees.total ?? devotees.length,
    };
  })();
  // Honest fallback: a devotee with no recorded seva index is "on the path",
  // never an invented 1245 pts.
  const sevaKarma = currentDevotee?.sevaIndex;
  const HeroIcon = heroPrimary.Icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 flex flex-col">
      {/* Sacred header — identical for every role */}
      {/* F-DASH-1: flex-wrap + min-w-0 so the Panjika card drops below instead
          of overlapping the title block at tight widths. */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm shrink-0 relative overflow-hidden anim-fade-up">
        <div className="relative z-10 flex flex-col gap-4 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {taxonomy.workspaceLabel} • {activeWorkspace.sampradaya || 'Sanatan Vaidika Tradition'}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-semibold text-slate-800 tracking-tight">
              {activeWorkspace.name}
            </h2>
          </div>

          {/* Hero stats — per-org-type live data (F-DASH-3), never mock numbers */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <HeroIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{heroPrimary.label}</p>
                <p className="text-sm font-black text-slate-900">{heroPrimary.value.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                  {safeTranslate('dash_hero_seva_karma', 'Your Seva Karma', 'আপনার সেবা কর্ম', 'आपका सेवा कर्म')}
                </p>
                <p className="text-sm font-black text-slate-900">
                  {sevaKarma != null ? (
                    <>{sevaKarma.toLocaleString('en-IN')} <span className="text-slate-400 font-medium text-xs">pts</span></>
                  ) : (
                    <span className="text-indigo-500 font-bold">
                      {safeTranslate('dash_hero_on_the_path', 'On the path 🙏', 'পথে আছেন 🙏', 'मार्ग पर हैं 🙏')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Panjika Card — canonical today line via getPanchangTodayLine (single source of truth) */}
        <div
          className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex flex-col sm:items-end relative z-10 anim-fade-up shrink-0 max-w-full w-full sm:w-auto"
          style={{ '--i': 1 } as React.CSSProperties}
        >
          <p className="font-bold text-slate-700">
            {getPanchangTodayLine(panchang)}
          </p>
          <p className="text-slate-500 mt-0.5">
            {panchang.nakshatra} Nakshatra
          </p>
          <p className="text-slate-400 mt-1 font-mono text-[10px] uppercase tracking-wide">
            Abhijit: {panchang.abhijitMuhurat}
          </p>
        </div>
      </div>

      {/* Sacred soul — identical for every role */}
      <ShlokaCard />

      {/* Role-based work surface — or the dedicated Gurukul home */}
      {isGurukulLike ? (
        <GurukulHome onNavigate={handleNav} />
      ) : (
        <RoleHomeSwitch
          onNavigate={handleNav}
          onOpenQuickPay={onOpenQuickPay}
          onOpenMySpace={onOpenMySpace}
        />
      )}
    </div>
  );
};

export default DashboardHome;
