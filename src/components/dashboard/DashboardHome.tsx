import React from 'react';
import { Heart, Beef, GraduationCap, Sparkles, Flame, Users, LayoutGrid, ArrowRight } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { PanchangHeader } from '../common/PanchangHeader';
import { ShlokaCard, RoleHomeSwitch } from './RoleHome';
import { GurukulHome } from './GurukulHome';
import { useOrgGlanceRefresh } from '../../lib/orgGlanceSync';
import { FestivalJourneyCard } from './FestivalJourneyCard';
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
  const { activeWorkspace, currentDevotee, firebaseUser } = useAuthWorkspace();
  const taxonomy = useWorkspaceTaxonomy();
  const { safeTranslate, t } = useLanguage();
  const { devotees, poojaBookings, cows, gurukulStudents, collectionWindows } = useData();
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
  // WORLD-READY (E-05): the hero used to show a "Seva Karma" SCORE
  // (sevaIndex pts — donations + hours compressed into points). Blueprint
  // D bans scored devotion. What is shown instead is a plain fact from
  // the member's record — hours of seva offered — and the honest
  // fallback stays: no record, "On the path", never an invented number.
  const sevaHours = currentDevotee?.volunteerHours;
  const HeroIcon = heroPrimary.Icon;

  // VIBE B1 — morning-darshan greeting: time-of-day word in the user's
  // language + the user's own name, above the org name in the header.
  const hourNow = new Date().getHours();
  const greetWord =
    hourNow < 12
      ? safeTranslate('vibe.greetMorning', 'Suprabhat', 'সুপ্রভাত', 'सुप्रभात')
      : hourNow < 17
        ? safeTranslate('vibe.greetAfternoon', 'Namaskar', 'নমস্কার', 'नमस्ते')
        : safeTranslate('vibe.greetEvening', 'Shubh Sandhya', 'শুভ সন্ধ্যা', 'शुभ संध्या');
  const greeterName =
    (currentDevotee as { name?: string } | null)?.name || firebaseUser?.displayName || '';
  const orgGreeting = greeterName ? `${greetWord}, ${greeterName}` : greetWord;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 flex flex-col">
      {/* Sacred header — identical for every role. VIBE B1: the white
          office card became the sanctum PanchangHeader — greeting in
          the user's language ("morning darshan"), the festival
          dressing when the DB names a festival today, the tithi
          greeting + brass muhurat chip from the one canonical engine.
          Hero stats stay exactly as they were: live data, below. */}
      <PanchangHeader
        eyebrow={<>{taxonomy.workspaceLabel} • {activeWorkspace.sampradaya || 'Sanatan Vaidika Tradition'}</>}
        greetingLine={orgGreeting}
        title={activeWorkspace.name}
      >
        {/* Hero stats — per-org-type live data (F-DASH-3), never mock numbers */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-white/70 border border-brass-200 px-3 py-2 rounded-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brass-100 flex items-center justify-center text-brass-600">
              <HeroIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-brass-600">{heroPrimary.label}</p>
              <p className="text-sm font-black text-temple-900">{heroPrimary.value.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white/70 border border-peacock-100 px-3 py-2 rounded-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-peacock-100 flex items-center justify-center text-peacock-700">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-peacock-500">
                {safeTranslate('dash_hero_seva_hours', 'Your Seva', 'আপনার সেবা', 'आपकी सेवा')}
              </p>
              <p className="text-sm font-black text-temple-900">
                {sevaHours != null ? (
                  <>{sevaHours.toLocaleString('en-IN')} <span className="text-temple-400 font-medium text-xs">{safeTranslate('dash_hero_hours_offered', 'hours offered', 'ঘণ্টা নিবেদিত', 'घंटे अर्पित')}</span></>
                ) : (
                  <span className="text-peacock-500 font-bold">
                    {safeTranslate('dash_hero_on_the_path', 'On the path 🙏', 'পথে আছেন 🙏', 'मार्ग पर हैं 🙏')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </PanchangHeader>

      {/* Sacred soul — identical for every role */}
      <ShlokaCard />

      {/* Blueprint D — the festival journey, when a festival is near */}
      <FestivalJourneyCard onNavigate={handleNav} />

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

      {/* Module-system redesign (2026-10-23): the door to the complete
          All-Desks Directory — every home carries it (Gurukul included),
          so "where does X live?" always has one tap from home. The
          label rides the directory dictionary keys. */}
      <button
        type="button"
        onClick={() => handleNav('desk-directory')}
        className="w-full rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex items-center gap-3 text-left cursor-pointer hover:border-orange-200 hover:shadow transition-all min-h-[44px]"
      >
        <span className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          <LayoutGrid className="w-5 h-5 text-orange-600" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-800">
            {t('suites.seva.directory.title')}
          </span>
          <span className="block text-[11px] text-slate-500 truncate">
            {t('suites.seva.directory.subtitle')}
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
      </button>
    </div>
  );
};

export default DashboardHome;
