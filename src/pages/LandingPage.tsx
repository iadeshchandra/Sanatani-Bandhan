import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Landmark,
  Globe,
  Menu,
  X,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Receipt,
  Users,
  Repeat,
  WifiOff,
  Megaphone,
  CheckCircle2,
  Flame,
  ChevronRight,
  ChevronDown,
  Coins,
  BookOpen,
  FileCheck,
  Scale,
  Calendar,
  Bell,
  IdCard,
  QrCode,
  HeartHandshake,
  Ticket,
  Fingerprint,
  ScanLine,
  ChefHat,
  Package,
  UtensilsCrossed,
  Beef,
  Milk,
  Syringe,
  Wheat,
  Building2,
  Car,
  KeyRound,
  MessageCircle,
  CalendarDays,
  Languages,
  FileText,
  Lock,
  Bot,
  Smartphone,
  HandCoins,
  PiggyBank,
  BadgeCheck,
  Star,
  Quote,
  CalendarCheck,
  Home,
  GraduationCap,
  Gem,
  TrendingUp,
  Award,
  Target,
  Network,
  Upload,
  Flower2,
  MonitorSmartphone,
  ClipboardCheck,
  Sun,
  ScrollText,
  Library,
  Truck,
  CalendarHeart,
  FileCheck2,
  Siren,
  LayoutGrid,
  Heart,
  Droplets,
  Vote,
  Route,
  BedDouble,
  ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useDemoStarter } from '../hooks/useDemoStarter';
import { calculatePanchang } from '../utils/panchang';
import { PLAN_PRICING } from '../config/planPricing';
import { PrivacyPolicy } from '../components/public/PrivacyPolicy';
import { TermsOfService } from '../components/public/TermsOfService';
import { SecurityWhitepaper } from '../components/public/SecurityWhitepaper';
import { DemoSelectionModal } from '../components/public/DemoSelectionModal';
import { WorkspaceType } from '../types';

interface LandingPageProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onDemoStart?: (type: WorkspaceType) => void;
}

/* ------------------------------------------------------------------ */
/*  Small helpers (inline, self-contained)                             */
/* ------------------------------------------------------------------ */

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {children}
    </div>
  );
};

/** Pure-CSS diya: clay bowl + flickering flame + warm glow. */
const Diya: React.FC<{ className?: string; flameDelay?: string }> = ({ className = '', flameDelay = '0s' }) => (
  <div className={`flex flex-col items-center ${className}`} aria-hidden="true">
    <div className="relative flex justify-center">
      {/* glow */}
      <div
        className="absolute -inset-6 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0) 70%)' }}
      />
      {/* flame */}
      <div className="diya-flame relative z-10" style={{ animationDelay: flameDelay }} />
    </div>
    {/* bowl */}
    <div
      className="w-16 h-6 rounded-b-full rounded-t-[6px] mt-1"
      style={{
        background: 'linear-gradient(to bottom, #9a3412 0%, #7c2d12 55%, #571f0b 100%)',
        boxShadow: '0 6px 14px rgba(124,45,18,0.4)',
      }}
    />
  </div>
);

/** Large, subtle, slow-rotating mandala rendered as inline SVG. */
const Mandala: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 400 400" className={`mandala-spin pointer-events-none ${className}`} aria-hidden="true">
    <g fill="none" stroke="#EA580C" strokeWidth="1">
      <circle cx="200" cy="200" r="190" />
      <circle cx="200" cy="200" r="160" strokeDasharray="4 6" />
      <circle cx="200" cy="200" r="120" />
      <circle cx="200" cy="200" r="60" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        const x1 = 200 + 120 * Math.cos(a);
        const y1 = 200 + 120 * Math.sin(a);
        const x2 = 200 + 160 * Math.cos(a);
        const y2 = 200 + 160 * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const cx = 200 + 90 * Math.cos(a);
        const cy = 200 + 90 * Math.sin(a);
        return <ellipse key={`p-${i}`} cx={cx} cy={cy} rx="14" ry="34" transform={`rotate(${i * 30} ${cx} ${cy})`} />;
      })}
      <circle cx="200" cy="200" r="18" />
      <text x="200" y="209" textAnchor="middle" fontSize="22" fill="#EA580C" stroke="none">
        ॐ
      </text>
    </g>
  </svg>
);

/** Marigold toran divider between major sections. */
const ToranDivider: React.FC = () => (
  <div className="toran-divider" aria-hidden="true">
    <div className="toran-string" />
    <div className="toran-dots" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Data: feature showcase tabs                                        */
/* ------------------------------------------------------------------ */

interface ShowcaseFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

interface ShowcaseTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** One clause naming which institutions use this area most. */
  audience: string;
  features: ShowcaseFeature[];
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: 'treasury',
    label: 'Treasury & Donations',
    audience: "Every institution's backbone — from hundi to school fees.",
    icon: Coins,
    features: [
      { icon: HandCoins, title: 'Quick Chanda POS', desc: 'Counter collections with UPI + cash, printed receipts in seconds.' },
      { icon: BookOpen, title: 'Double-entry ledger', desc: 'Every rupee auto-posted — no manual journal entries, ever.' },
      { icon: Receipt, title: 'Auto 80G receipts', desc: 'Tax certificates generated instantly for every eligible donation.' },
      { icon: FileCheck, title: 'Tally Prime sync', desc: 'One-click export your CA actually wants, in Tally format.' },
      { icon: Scale, title: 'Blind hundi audit', desc: 'Dual-custodian sealed counting with variance alerts.' },
      { icon: Gem, title: 'Ratna Bhandar vault', desc: 'Gold, silver & jewel ornaments — weighed, sealed & audited.' },
      { icon: TrendingUp, title: 'Predictive runway', desc: 'Festival-season cash-flow forecasts from live ledger data.' },
    ],
  },
  {
    id: 'seva',
    label: 'Recurring Seva',
    audience: 'Mandirs, goshalas & sanghas run their monthly giving on this.',
    icon: Repeat,
    features: [
      { icon: Repeat, title: 'Monthly mandates', desc: 'Annadanam, gau-seva & lamp subscriptions on autopilot.' },
      { icon: PiggyBank, title: 'MRR tracking', desc: 'See your institution\u2019s monthly recurring seva income at a glance.' },
      { icon: CalendarCheck, title: 'Pause / resume / cancel', desc: 'Devotees control their seva; staff handle exceptions gracefully.' },
      { icon: Bell, title: 'Auto due reminders', desc: 'Gentle WhatsApp nudges before every due date — no awkward calls.' },
      { icon: Award, title: 'Karma ledger', desc: 'Micro-seva points & punya certificates for every volunteer.' },
      { icon: Target, title: 'Fundraising campaigns', desc: 'Jirnoddhar drives with live donor milestones & goals.' },
    ],
  },
  {
    id: 'devotee',
    label: 'Devotee Parivar',
    audience: 'Mandirs, ashrams & gurukuls keep lifelong member records here.',
    icon: Users,
    features: [
      { icon: Users, title: 'Family CRM', desc: 'Lifelong records with gotra, family trees & seva history.' },
      { icon: IdCard, title: 'Universal Sanatani ID', desc: 'One identity that travels with the devotee across institutions.' },
      { icon: QrCode, title: 'QR ID cards', desc: 'Print beautiful, verifiable devotee cards in one click.' },
      { icon: HeartHandshake, title: 'Duplicate detection', desc: 'Smart matching keeps your parivar list clean & trusted.' },
      { icon: Network, title: 'Vanshavali lineage', desc: 'Interactive gotra family trees across generations.' },
      { icon: Flame, title: 'Pitru Paksha & Shradh', desc: 'Ancestor tithi registry with annual remembrance alerts.' },
      { icon: Upload, title: 'Bulk devotee import', desc: 'CSV/Excel migration with auto-cleaning & gotra match.' },
      { icon: Flower2, title: 'Personal sadhana', desc: 'Japa counters, meditation logs & dharmic progress.' },
    ],
  },
  {
    id: 'darshan',
    label: 'Darshan & Crowd',
    audience: 'Built for mandirs — and any institution with visitor flow.',
    icon: Ticket,
    features: [
      { icon: QrCode, title: 'QR gate passes', desc: 'Scan-in at the turnstile — no paper tokens, no queues.' },
      { icon: Ticket, title: 'Online bookings', desc: 'Devotees reserve darshan slots from their phone.' },
      { icon: Fingerprint, title: 'Biometric turnstiles', desc: 'High-trust entry for VIP & senior-citizen darshans.' },
      { icon: ScanLine, title: 'Anti-passback', desc: 'One pass, one entry — reuse & sharing blocked automatically.' },
      { icon: MonitorSmartphone, title: 'Tatkal kiosk', desc: 'Self-service express darshan booking at the gate.' },
      { icon: ClipboardCheck, title: 'Live check-in console', desc: 'Real-time entry counts, slot capacity & rush alerts.' },
    ],
  },
  {
    id: 'puja',
    label: 'Puja & Seva',
    audience: 'Mandirs & ashrams schedule every ritual here.',
    icon: Flame,
    features: [
      { icon: CalendarDays, title: 'Sankalp bookings', desc: 'Archana, abhishekam & homam with gotra-aware sankalpam.' },
      { icon: Bell, title: 'Garbhagriha teleprompter', desc: 'Priests follow the vidhi step-by-step, never miss a mantra.' },
      { icon: UtensilsCrossed, title: 'Prasadam management', desc: 'Plan, track & distribute prasadam without wastage.' },
      { icon: Sparkles, title: 'Rahu-Kaal aware muhurat', desc: 'Bookings auto-checked against inauspicious windows.' },
      { icon: Sun, title: 'Nitya-seva routines', desc: 'Daily aarti schedules, priest duty logs & naivedya.' },
      { icon: ScrollText, title: 'Purohit desk & marketplace', desc: 'Ritual ledgers, dakshina records & verified purohits.' },
      { icon: Library, title: 'Granth library', desc: 'Vedic scriptures, stotrams & authentic Sanskrit verses.' },
    ],
  },
  {
    id: 'goshala',
    label: 'Goshala',
    audience: "The goshala's complete daily operating system.",
    icon: Beef,
    features: [
      { icon: Beef, title: 'Cattle records', desc: 'Every gau mata profiled — breed, age, lineage & health.' },
      { icon: Milk, title: 'Milk yield', desc: 'Daily yield tracking per animal with lactation curves.' },
      { icon: Syringe, title: 'Health & vaccination', desc: 'Vet schedules, deworming & treatment history, all logged.' },
      { icon: Wheat, title: 'Fodder planning', desc: 'Panchang-season aware feed planning — never run short.' },
    ],
  },
  {
    id: 'bhandar',
    label: 'Bhandar & Kitchen',
    audience: 'Ashrams, gurukuls & mandirs feed thousands from here.',
    icon: ChefHat,
    features: [
      { icon: Package, title: 'Inventory', desc: 'Grains, ghee, flowers — every item counted & valued.' },
      { icon: UtensilsCrossed, title: 'Recipe BOM explosion', desc: 'One annadanam plan auto-deducts every ingredient.' },
      { icon: CalendarDays, title: 'Panchang-driven procurement', desc: 'Festival demand forecasting from the tithi calendar.' },
      { icon: Scale, title: 'Wastage control', desc: 'Track shrinkage & keep the annapurna audit clean.' },
      { icon: Truck, title: 'Smart procurement', desc: 'Auto purchase orders when festival demand spikes.' },
    ],
  },
  {
    id: 'bhoomi',
    label: 'Bhoomi & Vahan',
    audience: 'Trusts & sanghas manage property and vehicles here.',
    icon: Building2,
    features: [
      { icon: KeyRound, title: 'Property leases', desc: 'Shops, halls & land — rent schedules with auto-reminders.' },
      { icon: Car, title: 'Vehicle fleet', desc: 'Raths, ambulances & buses with fuel & service logs.' },
      { icon: Coins, title: 'Auto treasury posting', desc: 'Rent & fuel entries post to the ledger by themselves.' },
      { icon: CalendarCheck, title: 'Maintenance schedules', desc: 'Never miss a service date or lease renewal again.' },
      { icon: Landmark, title: 'Asset & ornament register', desc: 'Deity jewels, idols & trust land — valued & insured.' },
    ],
  },
  {
    id: 'utsav',
    label: 'Utsav Broadcasts',
    audience: "Every institution's voice — festivals to fee reminders.",
    icon: Megaphone,
    features: [
      { icon: MessageCircle, title: 'WhatsApp alerts', desc: 'Festival & darshan announcements reach every phone.' },
      { icon: CalendarDays, title: 'Festival templates', desc: 'Diwali, Navratri, Rath Yatra — ready-made campaigns.' },
      { icon: Users, title: 'Gotra merge tags', desc: 'Personalised messages: name, gotra & seva history.' },
      { icon: Languages, title: 'Multi-language', desc: 'Hindi, Bengali, Sanskrit & English — write once, reach all.' },
      { icon: CalendarHeart, title: 'Festival calendar', desc: 'Tithi observances & panjika events, auto-reminded.' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Audit',
    audience: 'Trust boards and auditors sleep better with this.',
    icon: FileText,
    features: [
      { icon: FileText, title: '80G / 12A / 10BD filings', desc: 'CA-ready reports generated from live ledger data.' },
      { icon: Lock, title: 'SHA-256 tamper-proof log', desc: 'Block-chained audit trail — nobody can backdate entries.' },
      { icon: ShieldCheck, title: 'Role-based access', desc: 'Trustee, accountant, priest — everyone sees only their desk.' },
      { icon: BadgeCheck, title: 'Trustee dashboards', desc: 'One-glance financial health for every board meeting.' },
      { icon: FileCheck2, title: 'Form 10BD studio', desc: 'Donation statements filed in the exact statutory format.' },
      { icon: Building2, title: 'Multi-branch federation', desc: 'Switch between branches & trusts in one login.' },
      { icon: Siren, title: 'Crisis command', desc: 'Crowd-density alerts, lost-child broadcasts & SOS dispatch.' },
      { icon: LayoutGrid, title: 'Modular app store', desc: 'Activate add-on desks tailored to your institution.' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Offline',
    audience: "Every institution's 24×7 sevak — online or offline.",
    icon: Bot,
    features: [
      { icon: Bot, title: 'Vedic AI helpdesk', desc: 'Devotees ask in plain language — answers from your institution\u2019s data.' },
      { icon: Sparkles, title: 'Dharmic assistant', desc: 'Shastra-grounded guidance for priests & administrators.' },
      { icon: WifiOff, title: '100% offline PWA', desc: 'Counts, collections & check-ins work with zero internet.' },
      { icon: Smartphone, title: 'Auto-sync', desc: 'Everything merges to the cloud the moment you reconnect.' },
    ],
  },
  {
    id: 'community',
    label: 'Community & Seva',
    audience: 'Where the parivar gathers — beyond any single institution.',
    icon: HeartHandshake,
    features: [
      { icon: Heart, title: 'Sanatani Vivah', desc: 'Community matrimony with kundali gun-milan matching.' },
      { icon: Droplets, title: 'Raktha Seva network', desc: 'Emergency blood donors mobilised in minutes.' },
      { icon: Vote, title: 'Panchayat polling', desc: 'Transparent community votes & trust resolutions.' },
      { icon: Route, title: 'Yatra Net pilgrimage', desc: 'Group tracking, shelter routes & emergency geotagging.' },
      { icon: BedDouble, title: 'Dharamshala & guests', desc: 'Room check-in, kutir bookings & pilgrim stays.' },
      { icon: ClipboardList, title: 'Sevadar roster', desc: 'Volunteer shifts, duty sign-ups & attendance.' },
      { icon: GraduationCap, title: 'Vedic shiksha', desc: 'Gurukul classes, curriculum & student progress.' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Data: institution profiles (the 5 core organisation types)         */
/* ------------------------------------------------------------------ */

interface OrgProfile {
  type: WorkspaceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  /** Context line shown under the hero H1 when this org is selected. */
  contextLine: string;
  /** 3 featured capability chips for the hero selector. */
  chips: string[];
  /** 4 tailored bullets for the "Who it's for" card. */
  bullets: string[];
}

const ORG_PROFILES: OrgProfile[] = [
  {
    type: 'Mandir',
    label: 'Mandir',
    icon: Landmark,
    tagline: 'Temples & trusts',
    contextLine: 'Darshan queues, hundi audits & 80G receipts — handled.',
    chips: ['QR gate passes', 'Blind hundi audit', 'Auto 80G receipts'],
    bullets: [
      'Darshan bookings & QR gate passes',
      'Dual-custody hundi counting',
      'Auto 80G receipts & Tally sync',
      'Utsav WhatsApp broadcasts',
    ],
  },
  {
    type: 'Goshala',
    label: 'Goshala',
    icon: Beef,
    tagline: 'Cow shelters & gau-seva',
    contextLine: 'Cattle records, milk yield & fodder planning — handled.',
    chips: ['Cattle health records', 'Milk yield tracking', 'Fodder planning'],
    bullets: [
      'Individual gau-mata health profiles',
      'Daily milk yield & lactation curves',
      'Vaccination & vet visit schedules',
      'Panchang-season fodder planning',
    ],
  },
  {
    type: 'Ashram',
    label: 'Ashram',
    icon: Home,
    tagline: 'Retreats & satsang',
    contextLine: 'Rooms, guests & satsang schedules — handled.',
    chips: ['Guest & room booking', 'Satsang calendar', 'Bhandara planning'],
    bullets: [
      'Guest check-in & room allocation',
      'Satsang & shivir event calendar',
      'Bhandara / annadanam planning',
      'Sevadar rosters & attendance',
    ],
  },
  {
    type: 'Gurukul',
    label: 'Gurukul',
    icon: GraduationCap,
    tagline: 'Vedic schools',
    contextLine: 'Students, shastric curriculum & fees — handled.',
    chips: ['Student records', 'Shastra curriculum', 'Fee tracking'],
    bullets: [
      'Student & acharya records',
      'Shastric curriculum planning',
      'Fee collection & receipts',
      'Hostel & mess management',
    ],
  },
  {
    type: 'Sangha',
    label: 'Sangha',
    icon: Users,
    tagline: 'Community groups',
    contextLine: 'Members, sevas & community funds — handled.',
    chips: ['Member directory', 'Seva rosters', 'Community funds'],
    bullets: [
      'Member & family directory',
      'Seva sign-ups & rosters',
      'Community fund transparency',
      'Meeting & event coordination',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Data: FAQ & testimonials                                           */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'Is it really free? What is the catch?',
    a: 'Yes — the Seva Free plan is ₹0 forever: pooja booking, Panchang & muhurat, Quick Chanda and WhatsApp broadcasts for up to 100 devotees, with the offline PWA and community support. No credit card, no trial clock. When you grow, Mandir Standard (₹1,499/month) unlocks kitchens, dharamshala, gau seva, 80G receipts and more — still a fraction of the ₹35,000/year typical institution software, because dharma technology should belong to every institution, not just the wealthy ones.',
  },
  {
    q: 'Does it work without internet?',
    a: 'Completely. Sanatani Bandhan is an offline-first Progressive Web App. Hundi counts, chanda collections, darshan check-ins — everything works in airplane mode and syncs automatically when you are back online. Institutions in remote kshetras run it daily with zero connectivity.',
  },
  {
    q: 'Is our institution\u2019s data safe?',
    a: 'Your data is protected by deny-by-default cloud security rules, encrypted in transit and at rest, and written to an append-only SHA-256 audit ledger — nobody can backdate or silently alter entries. Role-based access means the priest never sees the treasury and the accountant never sees devotee PINs. And your data is yours: export it any time.',
  },
  {
    q: 'Do we need computers or special hardware?',
    a: 'No. If your sevaks can use WhatsApp, they can run Sanatani Bandhan. It runs in any phone browser, installs to the home screen like a native app, and works with the UPI QR and printer you already have. Optional biometric turnstiles and receipt printers can be added later.',
  },
  {
    q: 'Which languages does it support?',
    a: 'The interface is available in English, Hindi (हिंदी), Bengali (বাংলা), and Sanskrit (संस्कृतम्). Utsav broadcasts can be composed once and delivered in multiple languages, and gotra-aware merge tags personalise every message.',
  },
  {
    q: 'Can we migrate from paper registers or Tally?',
    a: 'Yes. Most institutions complete migration in a weekend: import member lists from spreadsheets, carry forward opening balances from your paper bahi-khata, and sync historical vouchers to Tally Prime. Our guided setup walks your karyalaya through it step by step — free.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Forty years of paper registers became a searchable digital parivar in one weekend. For the first time, our trust board sees the real numbers before every meeting.',
    role: 'Trustee — Mandir',
    place: 'Varanasi',
  },
  {
    quote:
      'Every gau-mata has a health record now — vaccinations, milk yield, vet visits. Our goshala finally runs like the seva it is, not a guessing game.',
    role: 'Goshala Manager',
    place: 'Mathura',
  },
  {
    quote:
      'Guest rooms, satsang schedules and bhandara planning — one dashboard for the whole ashram. Our sevaks learned it in a single afternoon.',
    role: 'Ashram Administrator',
    place: 'Rishikesh',
  },
  {
    quote:
      'Student records, shastra curriculum and fee receipts — the gurukul office went from three ledgers to one screen. Parents get receipts on WhatsApp instantly.',
    role: 'Gurukul Principal',
    place: 'Varanasi',
  },
  {
    quote:
      'Member sevas, community funds, event rosters — everything transparent to every member. Disputes over funds have simply stopped.',
    role: 'Sangha President',
    place: 'Pune',
  },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSignupClick,
  onDemoStart,
}) => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const startDemo = useDemoStarter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('treasury');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [activeOrg, setActiveOrg] = useState<WorkspaceType>('Mandir');
  const orgProfile = ORG_PROFILES.find((o) => o.type === activeOrg) ?? ORG_PROFILES[0];

  const panchang = useMemo(() => {
    try {
      return calculatePanchang(new Date());
    } catch {
      return null;
    }
  }, []);

  const tithiLine = panchang ? `Today · ${panchang.tithi}, ${panchang.paksha} Paksha` : null;

  const handleStartDemo = (type: WorkspaceType = 'Mandir') => {
    if (onDemoStart) {
      onDemoStart(type);
      return;
    }
    // Self-sufficient: the router renders this page without demo props,
    // so bootstrap a real org-typed demo workspace via the shared hook.
    startDemo(type);
  };

  const handleGoToLogin = () => {
    if (onLoginClick) {
      onLoginClick();
      return;
    }
    navigate('/login');
  };

  const handleSignup = () => {
    if (onSignupClick) {
      onSignupClick();
      return;
    }
    navigate('/signup');
  };

  const handleContact = () => {
    navigate('/contact');
  };

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeShowcase = SHOWCASE_TABS.find((t) => t.id === activeTab) ?? SHOWCASE_TABS[0];

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Inline styles: diya flames, mandala, toran divider */}
      <style>{`
        @keyframes diya-flicker {
          0%, 100% { transform: scaleY(1) scaleX(1) rotate(-2deg); }
          25% { transform: scaleY(1.1) scaleX(0.94) rotate(2deg); }
          50% { transform: scaleY(0.92) scaleX(1.05) rotate(-1deg); }
          75% { transform: scaleY(1.06) scaleX(0.97) rotate(1deg); }
        }
        .diya-flame {
          width: 22px;
          height: 36px;
          background: radial-gradient(ellipse at 50% 72%, #fef3c7 0%, #fcd34d 30%, #f59e0b 55%, #ea580c 78%, rgba(234,88,12,0) 100%);
          border-radius: 50% 50% 50% 50% / 64% 64% 36% 36%;
          transform-origin: 50% 100%;
          animation: diya-flicker 1.7s ease-in-out infinite;
          filter: blur(0.4px);
        }
        @keyframes mandala-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .mandala-spin {
          animation: mandala-rotate 60s linear infinite;
          opacity: 0.04;
        }
        .toran-divider { position: relative; height: 22px; overflow: hidden; }
        .toran-string {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: #b45309;
        }
        .toran-dots {
          position: absolute; top: 2px; left: 0; right: 0; height: 20px;
          background-image:
            radial-gradient(circle at 14px 8px, #f59e0b 6px, #d97706 7px, rgba(217,119,6,0) 8px),
            radial-gradient(circle at 42px 8px, #ea580c 6px, #c2410c 7px, rgba(194,65,12,0) 8px),
            radial-gradient(circle at 70px 8px, #fbbf24 5px, #f59e0b 6px, rgba(245,158,11,0) 7px);
          background-size: 84px 20px;
          background-repeat: repeat-x;
        }
        @keyframes panel-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .showcase-panel { animation: panel-fade 0.35s ease-out; }
        .tab-scroll::-webkit-scrollbar { display: none; }
        .tab-scroll { scrollbar-width: none; }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .float-slow { animation: float-slow 5s ease-in-out infinite; }
      `}</style>

      {/* Schema.org Structured Metadata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'SoftwareApplication',
                name: 'Sanatani Bandhan',
                operatingSystem: 'Web browser, Progressive Web App',
                applicationCategory: 'BusinessApplication',
                description:
                  'Free dharmic institution management platform for mandirs, goshalas, ashrams, gurukuls and sanghas — treasury, audits, member CRM, 80G receipts, 49 desks, and 100% offline-first. ₹0 forever.',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
              },
              {
                '@type': 'Organization',
                name: 'Sanatani Bandhan',
                url: 'https://sanatanibandhan.web.app',
              },
            ],
          }),
        }}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#FFF8F0]/95 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer"
            aria-label="Sanatani Bandhan home"
          >
            <img
              src="/icon-96x96.png"
              alt="Sanatani Bandhan"
              className="w-10 h-10 rounded-2xl shadow-md shadow-orange-500/25"
              width={40}
              height={40}
            />
            <span className="text-lg sm:text-xl font-extrabold tracking-tight">
              Sanatani <span className="text-orange-600">Bandhan</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-stone-600" aria-label="Page sections">
            <button type="button" onClick={() => scrollTo('institutions')} className="hover:text-orange-600 transition-colors cursor-pointer">
              Institutions
            </button>
            <button type="button" onClick={() => scrollTo('showcase')} className="hover:text-orange-600 transition-colors cursor-pointer">
              Features
            </button>
            <button type="button" onClick={() => scrollTo('dharma')} className="hover:text-orange-600 transition-colors cursor-pointer">
              Why Dharma
            </button>
            <button type="button" onClick={() => scrollTo('pricing')} className="hover:text-orange-600 transition-colors cursor-pointer">
              Pricing
            </button>
            <button type="button" onClick={() => scrollTo('faq')} className="hover:text-orange-600 transition-colors cursor-pointer">
              FAQ
            </button>
            <button type="button" onClick={handleContact} className="hover:text-orange-600 transition-colors cursor-pointer">
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-1.5 text-xs">
              <Globe className="w-3.5 h-3.5 text-orange-600" />
              <select
                aria-label="Select language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent font-bold text-xs text-stone-700 focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="bn">বাংলা</option>
                <option value="sa">संस्कृतम्</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleGoToLogin}
              className="hidden sm:inline-flex min-h-[44px] px-6 items-center rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-extrabold tracking-wide transition-all cursor-pointer"
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="lg:hidden w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-stone-700 cursor-pointer"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-orange-100 bg-white px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Institutions', 'institutions'],
                ['Features', 'showcase'],
                ['Why Dharma', 'dharma'],
                ['Pricing', 'pricing'],
                ['FAQ', 'faq'],
                ['Contact', 'contact-link'],
              ].map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => (id === 'contact-link' ? handleContact() : scrollTo(id))}
                  className="py-3 rounded-xl bg-orange-50 border border-orange-100 text-stone-700 text-sm font-extrabold cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); handleGoToLogin(); }}
              className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer"
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); handleSignup(); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-sm font-extrabold cursor-pointer"
            >
              CREATE FREE ACCOUNT
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-20 text-center">
          <Mandala className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] sm:w-[860px] sm:h-[860px]" />

          <div className="relative max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-[11px] sm:text-xs font-extrabold tracking-[0.18em] uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              ॥ वसुधैव कुटुम्बकम् ॥ · One platform · Five institutions
            </div>

            {tithiLine && (
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800 text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  {tithiLine}
                </span>
              </div>
            )}

            <div className="flex items-start justify-center gap-6 sm:gap-14 mb-2">
              <Diya className="float-slow hidden sm:flex" flameDelay="0.3s" />
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-stone-900 max-w-3xl">
                From Paper Registers to a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
                  Digital Workspace.
                </span>
              </h1>
              <Diya className="float-slow hidden sm:flex" flameDelay="1.1s" />
            </div>

            <p className="mt-6 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
              Unite your Mandir, Goshala, Ashram, Gurukul or Sangha. Stop losing records
              and fighting over funds. Manage lifelong members, track donations securely,
              and broadcast Utsav alerts — all from one secure dashboard.
            </p>

            {/* Institution selector */}
            <div className="mt-7" role="group" aria-label="Choose your institution type">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {ORG_PROFILES.map((o) => {
                  const selected = o.type === activeOrg;
                  return (
                    <button
                      key={o.type}
                      type="button"
                      onClick={() => setActiveOrg(o.type)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-2 min-h-[44px] px-4 sm:px-5 rounded-full text-sm font-extrabold border-2 transition-all cursor-pointer ${
                        selected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-900/20'
                          : 'bg-white text-stone-600 border-orange-100 hover:border-orange-300 hover:text-orange-700'
                      }`}
                    >
                      <o.icon className="w-4 h-4" />
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p key={orgProfile.type} className="showcase-panel mt-4 text-sm sm:text-base font-bold text-stone-700">
                {orgProfile.contextLine}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {orgProfile.chips.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100/70 border border-orange-200 text-orange-800 text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={handleSignup}
                className="w-full sm:w-auto min-h-[56px] px-9 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm sm:text-base tracking-wide shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                CREATE FREE ACCOUNT
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDemoModalOpen(true)}
                className="w-full sm:w-auto min-h-[56px] px-9 rounded-2xl bg-white hover:bg-orange-50 border-2 border-stone-200 hover:border-orange-300 text-stone-800 font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center">
                  <Play className="w-3 h-3 fill-white ml-0.5" />
                </span>
                WATCH SYSTEM DEMO
              </button>
            </div>

            <p className="mt-6 text-xs text-stone-400 font-medium flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Trusted by 140+ dharmic institutions across Bharat
            </p>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-orange-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              ['49', 'Desks for every institution'],
              ['100%', 'Offline-first, zero internet needed'],
              ['80G', 'Instant tax receipts, Tally-ready'],
              ['₹0', 'Free forever — no card, no trial'],
            ].map(([big, small]) => (
              <div key={small} className="py-2">
                <div className="text-2xl sm:text-3xl font-black text-orange-600">{big}</div>
                <div className="text-xs text-stone-500 font-medium mt-1">{small}</div>
              </div>
            ))}
          </div>
        </section>

        <ToranDivider />

        {/* WHO IT'S FOR */}
        <section id="institutions" className="scroll-mt-24 px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-extrabold tracking-[0.22em] uppercase text-orange-600 mb-3">
              ॥ पञ्चधा सेवा ॥ — Five institutions, one platform
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              Built for <span className="text-orange-600">your</span> institution.
            </h2>
            <p className="mt-4 text-stone-500 leading-relaxed">
              Every organisation type gets its own configured workspace — the right
              desks, the right language, the right workflows. Launch a live demo
              pre-set for yours.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ORG_PROFILES.map((o, i) => (
              <Reveal key={o.type} delay={(i % 3) * 90}>
                <div className="h-full bg-white rounded-3xl border border-orange-100 p-7 shadow-sm hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-1 transition-all flex flex-col">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center mb-5 shadow-lg shadow-orange-500/25">
                    <o.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900">{o.label}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mt-1 mb-4">
                    {o.tagline}
                  </p>
                  <ul className="space-y-2.5 flex-1">
                    {o.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-stone-600">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleStartDemo(o.type)}
                    className="mt-6 inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-stone-900 hover:bg-orange-600 text-white text-sm font-extrabold transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Launch {o.label} demo
                  </button>
                </div>
              </Reveal>
            ))}
            {/* Sixth tile: the platform promise */}
            <Reveal delay={180}>
              <div className="h-full rounded-3xl p-7 flex flex-col justify-center text-center bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-xl">
                <p className="text-2xl mb-3">ॐ</p>
                <h3 className="text-xl font-black">Not listed?</h3>
                <p className="mt-2 text-sm text-stone-300 leading-relaxed">
                  Trusts, samitis, yatras, pathshalas — if it serves dharma,
                  it fits. Tell us about your institution.
                </p>
                <button
                  type="button"
                  onClick={handleContact}
                  className="mt-6 inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-white/10 border-2 border-white/25 hover:bg-white/20 text-white text-sm font-extrabold transition-all cursor-pointer"
                >
                  Talk to us
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <ToranDivider />

        {/* FEATURE SHOWCASE */}
        <section id="showcase" className="scroll-mt-24 px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-extrabold tracking-[0.22em] uppercase text-orange-600 mb-3">
              ॥ सर्वं एकत्र ॥ — Everything in one place
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              One platform for every <span className="text-orange-600">dharmic institution.</span>
            </h2>
            <p className="mt-4 text-stone-500 leading-relaxed">
              Forty-nine desks, twelve worlds — treasury, goshala, darshan, kitchen, community and more.
              Pick your institution above, or explore every capability below.
            </p>
          </Reveal>

          {/* Tab bar */}
          <Reveal delay={80}>
            <div
              className="tab-scroll flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center"
              role="tablist"
              aria-label="Feature categories"
            >
              {SHOWCASE_TABS.map((t) => {
                const isActive = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(t.id)}
                    className={`shrink-0 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full text-sm font-extrabold border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-900/20'
                        : 'bg-white text-stone-600 border-orange-100 hover:border-orange-300 hover:text-orange-700'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Panel */}
          <div key={activeTab} className="showcase-panel mt-8" role="tabpanel">
            <p className="text-center text-sm font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-full px-5 py-2.5 max-w-xl mx-auto mb-8">
              {activeShowcase.audience}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeShowcase.features.map((f, i) => (
                <div
                  key={f.title}
                  className={`bg-white rounded-3xl border border-orange-100 p-7 shadow-sm hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-1 transition-all ${
                    i === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-8">
              <button
                type="button"
                onClick={() => handleStartDemo(activeOrg)}
                className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-extrabold transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Try {activeShowcase.label} in the {orgProfile.label} demo
              </button>
            </p>
          </div>
        </section>

        {/* DHARMA SOUL STRIP */}
        <section id="dharma" className="scroll-mt-24 bg-[#4a1710] text-orange-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <Reveal className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-2xl mb-3">🪔</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Built for Dharma, <span className="text-amber-400">not just data.</span>
              </h2>
              <p className="mt-3 text-lg font-bold text-amber-200/90">धर्मो रक्षति रक्षितः</p>
              <p className="text-sm text-orange-200/70 mt-1 italic">Dharma protects those who protect it.</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  icon: Scale,
                  title: 'Radical transparency',
                  desc: 'Every rupee traceable from hundi to ledger. No black boxes, no backdated entries — trust your donors can verify.',
                },
                {
                  icon: HeartHandshake,
                  title: 'Seva-first',
                  desc: 'A free-forever tier for every institution, however small. Dharma technology should belong to all, not just the wealthy.',
                },
                {
                  icon: CalendarDays,
                  title: 'Shastra-aligned',
                  desc: 'Panchang-driven operations — procurement, muhurat and festivals computed from the tithi calendar itself.',
                },
              ].map((v, i) => (
                <Reveal key={v.title} delay={i * 90}>
                  <div className="h-full rounded-3xl bg-white/5 border border-white/10 p-7 backdrop-blur">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                      <v.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-extrabold text-white mb-2">{v.title}</h3>
                    <p className="text-sm text-orange-200/80 leading-relaxed">{v.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <ToranDivider />

        {/* PRICING — driven by src/config/planPricing.ts (PLAN_PRICING). Do not hardcode prices here. */}
        <section id="pricing" className="scroll-mt-24 px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              Priced for <span className="text-orange-600">every institution.</span>
            </h2>
            <p className="mt-4 text-stone-500 leading-relaxed">
              Start free, grow when you are ready. Every plan includes the offline-first
              PWA, all five institution types, and community support.
            </p>
          </Reveal>

          {/* Monthly / Annual toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center rounded-full bg-white border border-orange-200 p-1 shadow-sm" role="group" aria-label="Billing period">
              <button
                type="button"
                onClick={() => setBillingAnnual(false)}
                aria-pressed={!billingAnnual}
                className={`min-h-[44px] px-6 rounded-full text-sm font-extrabold transition-all cursor-pointer ${!billingAnnual ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingAnnual(true)}
                aria-pressed={billingAnnual}
                className={`min-h-[44px] px-6 rounded-full text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${billingAnnual ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Annual
                <span className="text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">2 months free</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* SEVA FREE — from PLAN_PRICING.LITE */}
            <Reveal className="h-full">
              <div className="h-full rounded-[2rem] bg-white border border-orange-200 p-8 flex flex-col shadow-sm hover:shadow-xl hover:shadow-orange-100 transition-all">
                <span className="self-start text-[11px] font-black tracking-widest uppercase bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                  {PLAN_PRICING.LITE.badge}
                </span>
                <h3 className="mt-4 text-2xl font-black text-stone-900">Seva Free</h3>
                <p className="mt-1 text-sm text-stone-500">{PLAN_PRICING.LITE.tagline}</p>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-stone-900">{PLAN_PRICING.LITE.price.currencySymbol}0</span>
                  <span className="text-stone-500 font-bold">forever</span>
                </p>
                <p className="mt-3 text-xs font-bold text-stone-500 uppercase tracking-wide">
                  Up to {PLAN_PRICING.LITE.limits.devotees} devotees · {PLAN_PRICING.LITE.limits.transactions} transactions · {PLAN_PRICING.LITE.limits.adminSeats} admin seats
                </p>
                <ul className="mt-6 space-y-3 text-sm font-medium text-stone-700 flex-1">
                  {['Pooja Booking', 'Panchang & Muhurat', 'Quick Chanda', 'WhatsApp Broadcaster'].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-orange-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleSignup}
                  className="mt-8 w-full min-h-[52px] rounded-2xl border-2 border-orange-600 text-orange-700 font-black text-sm tracking-wide hover:bg-orange-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  START FREE
                </button>
              </div>
            </Reveal>

            {/* MANDIR STANDARD — from PLAN_PRICING.STANDARD (highlighted) */}
            <Reveal delay={80} className="h-full">
              <div className="relative h-full rounded-[2rem] bg-gradient-to-br from-orange-600 to-amber-500 p-8 text-white shadow-2xl shadow-orange-500/30 overflow-hidden flex flex-col">
                <span className="absolute top-4 right-6 text-[11px] font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">
                  {PLAN_PRICING.STANDARD.badge}
                </span>
                <h3 className="text-2xl font-black">Mandir Standard</h3>
                <p className="mt-1 text-sm text-orange-100">{PLAN_PRICING.STANDARD.tagline}</p>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black">
                    {PLAN_PRICING.STANDARD.price.currencySymbol}
                    {billingAnnual
                      ? Math.round(PLAN_PRICING.STANDARD.price.annual / 12).toLocaleString('en-IN')
                      : PLAN_PRICING.STANDARD.price.monthly.toLocaleString('en-IN')}
                  </span>
                  <span className="text-orange-100 font-bold">/ month{billingAnnual ? ', billed annually' : ''}</span>
                </p>
                {billingAnnual && (
                  <p className="mt-1 text-xs font-bold text-orange-100">
                    {PLAN_PRICING.STANDARD.price.currencySymbol}{PLAN_PRICING.STANDARD.price.annual.toLocaleString('en-IN')}/year — 2 months free
                  </p>
                )}
                <p className="mt-3 text-xs font-bold text-orange-100 uppercase tracking-wide">
                  {PLAN_PRICING.STANDARD.limits.devotees.toLocaleString('en-IN')} devotees · {PLAN_PRICING.STANDARD.limits.branches} branches · priority support
                </p>
                <ul className="mt-6 space-y-3 text-sm font-medium flex-1">
                  {['Everything in Seva Free', 'Annadanam Kitchen', 'Dharamshala guest rooms', 'Gau Seva & dairy', '80G tax receipts', 'Fundraising campaigns', 'Inventory & store'].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleSignup}
                  className="mt-8 w-full min-h-[52px] rounded-2xl bg-white text-orange-700 font-black text-sm tracking-wide shadow-lg hover:bg-orange-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  START 30-DAY FREE TRIAL
                </button>
              </div>
            </Reveal>

            {/* ENTERPRISE — from PLAN_PRICING.ENTERPRISE */}
            <Reveal delay={160} className="h-full">
              <div className="h-full rounded-[2rem] bg-stone-900 p-8 text-stone-200 flex flex-col shadow-xl">
                <span className="self-start text-[11px] font-black tracking-widest uppercase bg-stone-800 text-amber-400 px-3 py-1 rounded-full">
                  {PLAN_PRICING.ENTERPRISE.badge}
                </span>
                <h3 className="mt-4 text-2xl font-black text-white">Enterprise</h3>
                <p className="mt-1 text-sm text-stone-400">{PLAN_PRICING.ENTERPRISE.tagline}</p>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">
                    {PLAN_PRICING.ENTERPRISE.price.currencySymbol}
                    {billingAnnual
                      ? Math.round(PLAN_PRICING.ENTERPRISE.price.annual / 12).toLocaleString('en-IN')
                      : PLAN_PRICING.ENTERPRISE.price.monthly.toLocaleString('en-IN')}
                  </span>
                  <span className="text-stone-400 font-bold">/ month{billingAnnual ? ', billed annually' : ''}</span>
                </p>
                {billingAnnual && (
                  <p className="mt-1 text-xs font-bold text-stone-400">
                    {PLAN_PRICING.ENTERPRISE.price.currencySymbol}{PLAN_PRICING.ENTERPRISE.price.annual.toLocaleString('en-IN')}/year — 2 months free
                  </p>
                )}
                <p className="mt-3 text-xs font-bold text-stone-400 uppercase tracking-wide">
                  Unlimited everything · dedicated SLA
                </p>
                <ul className="mt-6 space-y-3 text-sm font-medium flex-1">
                  {['Everything in Standard', 'Double-entry treasury ledger', 'SHA-256 audit logs', 'Multi-branch federation', 'Crisis command center', 'Granular RBAC roles'].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleContact}
                  className="mt-8 w-full min-h-[52px] rounded-2xl border-2 border-amber-400/60 text-amber-300 font-black text-sm tracking-wide hover:bg-stone-800 transition-all active:scale-[0.98] cursor-pointer"
                >
                  TALK TO US
                </button>
              </div>
            </Reveal>
          </div>

          {/* Slim competitor contrast strip */}
          <Reveal delay={120}>
            <div className="mt-8 rounded-2xl bg-stone-100 border border-stone-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center">
              <span className="text-sm font-bold text-stone-500">
                Typical institution software costs <span className="text-stone-700 font-black">₹35,000/year</span> — per-desk pricing, hardware lock-in, paid consultants.
              </span>
              <span className="text-sm font-extrabold text-orange-700">We chose a different path.</span>
            </div>
          </Reveal>
        </section>

        {/* VOICES */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-24 max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              Voices from the <span className="text-orange-600">parivar.</span>
            </h2>
          </Reveal>
          {/* NOTE: replace with real testimonials once collected from pilot institutions. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.role} delay={i * 90}>
                <figure className="h-full bg-white rounded-3xl border border-orange-100 p-7 shadow-sm flex flex-col">
                  <Quote className="w-8 h-8 text-orange-200 mb-4" />
                  <blockquote className="text-sm text-stone-600 leading-relaxed flex-1">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 pt-4 border-t border-orange-50">
                    <div className="flex items-center gap-1 text-amber-500 mb-1.5" aria-label="5 star rating">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                    <div className="text-sm font-extrabold text-stone-900">{t.role}</div>
                    <div className="text-xs text-stone-400 font-medium">{t.place}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 px-4 sm:px-6 pb-16 sm:pb-24 max-w-3xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              Common <span className="text-orange-600">questions.</span>
            </h2>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 40}>
                  <div className={`bg-white rounded-2xl border transition-all ${open ? 'border-orange-300 shadow-lg shadow-orange-100' : 'border-orange-100'}`}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="w-full min-h-[56px] flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left cursor-pointer"
                    >
                      <span className="font-extrabold text-stone-900 text-sm sm:text-base">{f.q}</span>
                      <ChevronDown className={`w-5 h-5 shrink-0 text-orange-600 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-5 sm:px-6 pb-5 text-sm text-stone-500 leading-relaxed">
                        {f.a}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-24 max-w-5xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-700 via-orange-600 to-amber-500 p-8 sm:p-14 text-white text-center shadow-2xl shadow-orange-500/30">
              <div className="absolute inset-0 opacity-10" aria-hidden="true">
                <Mandala className="absolute -right-24 -top-24 w-[420px] h-[420px] !opacity-100" />
              </div>
              <div className="relative">
                <div className="flex justify-center gap-8 mb-6">
                  <Diya flameDelay="0s" />
                  <Diya flameDelay="0.6s" />
                  <Diya flameDelay="1.2s" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Bring your institution online tonight.
                </h2>
                <p className="mt-3 text-orange-100 max-w-xl mx-auto">
                  Join 140+ institutions already running on Sanatani Bandhan. Free forever — no card, no salesman, no catch.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <button
                    type="button"
                    onClick={handleSignup}
                    className="w-full sm:w-auto min-h-[56px] px-10 rounded-2xl bg-white text-orange-700 font-black text-sm sm:text-base tracking-wide shadow-xl hover:bg-orange-50 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    CREATE FREE ACCOUNT
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoModalOpen(true)}
                    className="w-full sm:w-auto min-h-[56px] px-10 rounded-2xl bg-white/15 border-2 border-white/40 text-white font-black text-sm sm:text-base tracking-wide hover:bg-white/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    WATCH SYSTEM DEMO
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* SECURITY NOTE */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-stone-500 text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-stone-700">धर्मो रक्षति रक्षितः</span>
            <span>— your records are encrypted, audited, and yours alone.</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-stone-400 font-medium">
            {['Deny-by-default data security', 'Dual-custody hundi counts', 'Append-only audit ledger', 'Role-based access'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-stone-950 text-stone-400 pt-14 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/icon-96x96.png"
                  alt="Sanatani Bandhan"
                  className="w-12 h-12 rounded-2xl shadow-lg"
                  width={48}
                  height={48}
                />
                <span className="text-2xl font-extrabold text-white">
                  Sanatani <span className="text-orange-500">Bandhan</span>
                </span>
              </div>
              <p className="text-sm tracking-[0.2em] uppercase text-stone-500 font-bold">
                "Dharmo Rakshati Rakshitah"
              </p>
            </div>
            <nav aria-label="Features">
              <h4 className="text-xs font-black tracking-widest uppercase text-stone-500 mb-4">Features</h4>
              <ul className="space-y-2.5 text-sm font-medium">
                <li><button type="button" onClick={() => scrollTo('showcase')} className="hover:text-orange-400 transition-colors cursor-pointer">All 49 desks</button></li>
                <li><button type="button" onClick={() => scrollTo('showcase')} className="hover:text-orange-400 transition-colors cursor-pointer">Treasury &amp; 80G</button></li>
                <li><button type="button" onClick={() => scrollTo('showcase')} className="hover:text-orange-400 transition-colors cursor-pointer">Goshala &amp; Bhandar</button></li>
                <li><button type="button" onClick={() => scrollTo('dharma')} className="hover:text-orange-400 transition-colors cursor-pointer">Why Dharma</button></li>
              </ul>
            </nav>
            <nav aria-label="Compare">
              <h4 className="text-xs font-black tracking-widest uppercase text-stone-500 mb-4">Compare</h4>
              <ul className="space-y-2.5 text-sm font-medium">
                <li><button type="button" onClick={() => scrollTo('pricing')} className="hover:text-orange-400 transition-colors cursor-pointer">Pricing</button></li>
                <li><button type="button" onClick={() => scrollTo('faq')} className="hover:text-orange-400 transition-colors cursor-pointer">FAQ</button></li>
                <li><button type="button" onClick={() => setDemoModalOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">Live demo</button></li>
                <li><button type="button" onClick={handleGoToLogin} className="hover:text-orange-400 transition-colors cursor-pointer">Login</button></li>
                <li><button type="button" onClick={handleContact} className="hover:text-orange-400 transition-colors cursor-pointer">Contact us</button></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h4 className="text-xs font-black tracking-widest uppercase text-stone-500 mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm font-medium">
                <li><button type="button" onClick={() => setPrivacyOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">Privacy Policy</button></li>
                <li><button type="button" onClick={() => setTosOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">Terms of Service</button></li>
                <li><button type="button" onClick={() => setSecurityOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">Security</button></li>
                <li><button type="button" onClick={handleContact} className="hover:text-orange-400 transition-colors cursor-pointer">Contact Support</button></li>
              </ul>
            </nav>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Sanatani Bandhan. Built with devotion for Sanatana Dharma.</span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-800 font-bold tracking-widest uppercase text-[10px]">
              <Landmark className="w-3.5 h-3.5 text-orange-500" />
              Empowering the global Sanatani family
            </span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <DemoSelectionModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onSelect={(type) => {
          setDemoModalOpen(false);
          handleStartDemo(type);
        }}
      />
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
      {tosOpen && <TermsOfService onClose={() => setTosOpen(false)} />}
      {securityOpen && <SecurityWhitepaper onClose={() => setSecurityOpen(false)} />}
    </div>
  );
};

export default LandingPage;
