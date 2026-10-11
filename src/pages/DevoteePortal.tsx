import React, { useState, useMemo } from 'react';
import {
  Flame,
  Sparkles,
  Clock,
  Compass,
  Coins,
  Heart,
  Calendar,
  ChevronRight,
  Star,
  CheckCircle2,
  MapPin,
  Bot,
  X,
  ShoppingBag,
  Send,
  Volume2,
  ShieldCheck,
  Award,
  Flower2,
  Building2,
  ArrowLeft,
  Radio,
  Wifi,
  User,
  ExternalLink,
  BookOpen,
  Info,
  Check,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { offlineSyncProtocol } from '../services/offlineSyncProtocol';
import { DevoteeProfile, SevaBooking, PurohitGig, VivahProfile } from '../types/b2c';
import { VivahEngine } from '../components/devotee/VivahEngine';

interface DevoteePortalProps {
  onBackToERP?: () => void;
}

export const DevoteePortal: React.FC<DevoteePortalProps> = ({ onBackToERP }) => {
  const { showToast } = useToast();
  const { currentRole, switchRole } = useAuthWorkspace();
  const { language } = useLanguage();

  // Devotee State
  const [devotee, setDevotee] = useState<DevoteeProfile>({
    id: 'dev-108',
    name: 'Somnath Sharma',
    gotra: 'Kashyapa',
    ishtaDevata: 'Lord Shiva',
    punyaMudras: 240,
    yatraPassport: ['Kashi Vishwanath', 'Kedarnath Dham', 'Tirupati Balaji'],
    streakDays: 14,
    nakshatra: 'Rohini',
    rashi: 'Vrishabha (Taurus)',
  });

  // Selected Deity
  const [selectedDeity, setSelectedDeity] = useState<'Lord Shiva' | 'Sri Ram' | 'Mata Durga' | 'Sri Krishna'>('Lord Shiva');

  // Pushpanjali animation flag
  const [isPushpanjaliActive, setIsPushpanjaliActive] = useState<boolean>(false);

  // SubView navigation ('home' or full-screen modules like 'vivah')
  const [activeSubView, setActiveSubView] = useState<'home' | 'vivah'>('home');

  // Active Modals
  const [activeModal, setActiveModal] = useState<'none' | 'gitaAI' | 'purohit' | 'vivah' | 'sevaBooking'>('none');
  const [selectedSeva, setSelectedSeva] = useState<{ title: string; price: number; type: 'Puja' | 'Annadanam' | 'Goshala' } | null>(null);

  // Sankalpa form
  const [sankalpName, setSankalpName] = useState(devotee.name);
  const [sankalpGotra, setSankalpGotra] = useState(devotee.gotra);
  const [sankalpIntention, setSankalpIntention] = useState('Family Health, Peace & Spiritual Upliftment');

  // Gita AI Chat State
  const [gitaQuestion, setGitaQuestion] = useState('');
  const [gitaChat, setGitaChat] = useState<Array<{ sender: 'user' | 'gita'; text: string; verse?: string }>>([
    {
      sender: 'gita',
      text: 'Hari Om, Somnath ji. I am your Gita AI Spiritual Counselor. How may Lord Krishna’s timeless wisdom guide your heart today?',
      verse: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन | मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि || (BG 2.47)',
    },
  ]);

  // Deity invocations
  const deityDetails = useMemo(() => {
    switch (selectedDeity) {
      case 'Lord Shiva':
        return {
          title: 'Bhagavan Sri Mahadeva',
          mantra: 'ॐ नमः शिवाय | ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् ||',
          temple: 'Kashi Vishwanath Jyotirlinga',
          color: 'from-amber-600/30 to-indigo-950',
          symbol: '🔱 Trishula & Crescent Moon',
          imageAlt: 'Lord Shiva Mahadeva',
        };
      case 'Sri Ram':
        return {
          title: 'Maryada Purushottam Sri Ram',
          mantra: 'श्री राम जय राम जय जय राम | रामाय नमः ||',
          temple: 'Ayodhya Janmabhoomi Mandir',
          color: 'from-orange-600/30 to-amber-950',
          symbol: '🏹 Kodanda Bow & Arrow',
          imageAlt: 'Lord Sri Ram',
        };
      case 'Mata Durga':
        return {
          title: 'Maha Jagadamba Mata Durga',
          mantra: 'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे ||',
          temple: 'Maa Kamakhya & Kalighat Pitha',
          color: 'from-rose-600/30 to-purple-950',
          symbol: '🦁 Simhavahini & Lotus',
          imageAlt: 'Mata Durga',
        };
      case 'Sri Krishna':
        return {
          title: 'Yogeshwar Sri Krishna',
          mantra: 'ॐ नमो भगवते वासुदेवाय | हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे ||',
          temple: 'Dwarkadhish & Vrindavan',
          color: 'from-blue-600/30 to-slate-950',
          symbol: '🦚 Peacock Feather & Flute',
          imageAlt: 'Sri Krishna',
        };
    }
  }, [selectedDeity]);

  // Pushpanjali handler
  const handleOfferPushpanjali = () => {
    setIsPushpanjaliActive(true);
    setDevotee((prev) => ({
      ...prev,
      punyaMudras: prev.punyaMudras + 10,
      streakDays: (prev.streakDays || 14) + 1,
    }));

    // Queue in offline meshnet protocol
    offlineSyncProtocol.queueTransaction({
      id: `pushp-${Date.now()}`,
      payload: {
        devoteeId: devotee.id,
        action: 'PUSHPANJALI',
        deity: selectedDeity,
        credits: 10,
      },
      timestamp: Date.now(),
      status: 'pending',
      type: 'DEVOTEE_DAILY_SEVA',
    });

    showToast(
      `🌺 दिव्य पुष्पाञ्जलि अर्पण सफल! +10 Punya Mudras credited to your Dharmic Wallet.`,
      'success',
      'Pushpanjali Accepted'
    );

    setTimeout(() => {
      setIsPushpanjaliActive(false);
    }, 2200);
  };

  // Seva Booking Submit
  const handleConfirmSevaBooking = () => {
    if (!selectedSeva) return;

    const newBooking: SevaBooking = {
      id: `BK-${Date.now().toString().slice(-6)}`,
      type: selectedSeva.type,
      sankalpDetails: {
        devoteeName: sankalpName,
        gotra: sankalpGotra,
        intention: sankalpIntention,
        nakshatra: devotee.nakshatra,
      },
      status: 'confirmed',
      b2bWorkspaceId: 'kashi-vishwanath-trust',
      workspaceName: 'Sri Kashi Vishwanath Mandir Trust',
      amount: selectedSeva.price,
      bookingDate: new Date().toLocaleDateString('en-IN'),
      muhurat: 'Abhijit Muhurat (11:48 AM - 12:36 PM)',
    };

    // Queue in offline protocol
    offlineSyncProtocol.queueTransaction({
      id: newBooking.id,
      payload: newBooking,
      timestamp: Date.now(),
      status: 'pending',
      type: 'SEVA_BOOKING_SANCTUM',
    });

    setDevotee((prev) => ({
      ...prev,
      punyaMudras: prev.punyaMudras + 50,
    }));

    setActiveModal('none');
    setSelectedSeva(null);

    showToast(
      `🙏 ${selectedSeva.title} booked! Your Gotra will be chanted live on the Sanctum Teleprompter.`,
      'success',
      'Sanctum Recitation Queued'
    );
  };

  // Gita AI Ask
  const handleAskGita = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gitaQuestion.trim()) return;

    const userText = gitaQuestion;
    setGitaQuestion('');

    setGitaChat((prev) => [...prev, { sender: 'user', text: userText }]);

    setTimeout(() => {
      let gitaReply = '';
      let verseRef = '';

      if (userText.toLowerCase().includes('anxious') || userText.toLowerCase().includes('stress') || userText.toLowerCase().includes('fear')) {
        gitaReply = 'Arjuna faced intense dejection on the battlefield. Sri Krishna reminded him that the self is eternal and indomitable. Anchor your mind in self-realization; turbulent thoughts pass like fleeting seasons.';
        verseRef = 'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः | आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत || (BG 2.14)';
      } else if (userText.toLowerCase().includes('duty') || userText.toLowerCase().includes('work') || userText.toLowerCase().includes('career')) {
        gitaReply = 'Execute your natural prescribed duty without attachment to outcomes. Dedicate the fruit of your labor as an offering to Ishvara, and anxiety will dissolve into serene purpose.';
        verseRef = 'तस्मादसक्तः सततं कार्यं कर्म समाचर | असक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः || (BG 3.19)';
      } else {
        gitaReply = 'Whatever happens, happens for the elevation of the soul. Keep your consciousness purified through daily remembrance (Smaranam) and unconditional surrender to Sri Hari.';
        verseRef = 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज | अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः || (BG 18.66)';
      }

      setGitaChat((prev) => [...prev, { sender: 'gita', text: gitaReply, verse: verseRef }]);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* MOBILE SIMULATOR WRAPPER */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-slate-900 border-x border-slate-800 shadow-2xl relative pb-24">
        {activeSubView === 'vivah' ? (
          <div className="flex-1 flex flex-col">
            {/* Top Bar with "← Back to Portal" button */}
            <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 flex items-center justify-between shadow-md">
              <button
                type="button"
                onClick={() => setActiveSubView('home')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Back to Portal</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span className="text-white font-bold">Sanatani Vivah</span>
              </div>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar">
              <VivahEngine
                currentUser={{
                  id: devotee.id,
                  userId: 'user-somnath',
                  name: devotee.name,
                  gotra: devotee.gotra,
                  nakshatra: devotee.nakshatra || 'Rohini',
                  rashi: devotee.rashi || 'Vrishabha',
                  manglikStatus: 'Non-Manglik',
                  profession: 'Vedic Software Engineer & Researcher',
                  verified: true,
                }}
                onBack={() => setActiveSubView('home')}
              />
            </main>
          </div>
        ) : (
          <>
            {/* TOP STATUS & NAVIGATION STRIP */}
        <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onBackToERP && (
              <button
                type="button"
                onClick={onBackToERP}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Return to B2B Mandir ERP"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
              ॐ
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1 leading-tight">
                <span>Sanatani Super App</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  B2C
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {devotee.name} &bull; {devotee.gotra}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Punya Mudras Balance Chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shadow-xs">
              <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{devotee.punyaMudras}</span>
            </div>

            {/* Switch to ERP Button */}
            {onBackToERP && (
              <button
                type="button"
                onClick={onBackToERP}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono font-bold text-amber-400 transition-all cursor-pointer flex items-center gap-1"
              >
                <Building2 className="w-3 h-3 text-amber-400" />
                <span>Admin ERP</span>
              </button>
            )}
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT */}
        <main className="p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar">

          {/* SECTION 1: DYNAMIC PANCHANG HEADER */}
          <section className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-amber-500/30 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wide">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Vedic Panjika Ephemeris</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Kashi Timezone
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-white">
                Vikram Samvat 2083 &bull; Ashwina Paksha
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-3 mt-1 font-mono">
                <span>तिथि: <strong>Shukla Trayodashi</strong></span>
                <span>&bull;</span>
                <span>नक्षत्र: <strong>Rohini</strong></span>
              </div>
            </div>

            {/* Localized Muhurat Timer Banner */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 animate-spin text-amber-400" />
                </div>
                <div>
                  <div className="font-black text-amber-300 text-xs flex items-center gap-1.5">
                    <span>Abhijit Muhurat Active</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                      Subha
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-200/80 font-mono">
                    11:48 AM &ndash; 12:36 PM (42 mins remaining)
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-1 rounded-lg border border-amber-500/30 shrink-0">
                Puja Ready
              </span>
            </div>
          </section>

          {/* SECTION 2: "MY ISHTA DEVATA" SHRINE */}
          <section className="p-5 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Floating Flower Effect when Pushpanjali is offered */}
            {isPushpanjaliActive && (
              <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none z-20 animate-in fade-in zoom-in duration-300">
                <div className="text-4xl animate-bounce">🌸 🌺 🌼 🌺 🌸</div>
                <div className="text-sm font-black text-amber-300 mt-2 font-serif">
                  पुष्पाञ्जलि समर्पयामि
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold">
                  +10 Punya Mudras
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                My Ishta Devata Shrine
              </span>

              {/* Daily Streak Badge */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-mono font-bold">
                <span>🔥</span>
                <span>{devotee.streakDays} Days Streak</span>
              </div>
            </div>

            {/* Deity Switcher Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-[10px] font-bold">
              {(['Lord Shiva', 'Sri Ram', 'Mata Durga', 'Sri Krishna'] as const).map((deity) => (
                <button
                  key={deity}
                  type="button"
                  onClick={() => setSelectedDeity(deity)}
                  className={`py-1.5 rounded-xl transition-all text-center cursor-pointer ${
                    selectedDeity === deity
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {deity.replace('Lord ', '').replace('Mata ', '').replace('Sri ', '')}
                </button>
              ))}
            </div>

            {/* Visual Sacred Altar Card */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${deityDetails.color} border border-amber-500/30 text-center space-y-2 relative overflow-hidden`}>
              <div className="text-2xl">{deityDetails.symbol.split(' ')[0]}</div>
              <h3 className="text-lg font-black text-white font-serif tracking-wide">
                {deityDetails.title}
              </h3>
              <p className="text-[11px] text-amber-200/90 font-serif italic max-w-xs mx-auto leading-relaxed">
                {deityDetails.mantra}
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Primary Kshetra: {deityDetails.temple}
              </div>
            </div>

            {/* Interactive Pushpanjali Action Button */}
            <button
              type="button"
              onClick={handleOfferPushpanjali}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <Flower2 className="w-4 h-4 text-slate-950 group-hover:rotate-45 transition-transform" />
              <span>Offer Pushpanjali (+10 Punya Mudras)</span>
            </button>
          </section>

          {/* SECTION 3: SEVA & SACRED SHOP (E-COMMERCE CAROUSEL) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Seva &amp; Sacred Shop</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Direct Mandir Adopt-a-Seva &amp; Consecrated Sacred Items
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer">
                Explore All &rarr;
              </span>
            </div>

            {/* Horizontal Scrollable Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory custom-scrollbar">
              
              {/* Card 1: Book Kashi Rudrabhishek (Adopt-a-Seva) */}
              <div className="min-w-[240px] max-w-[240px] snap-center p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between space-y-3 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Adopt-a-Seva
                    </span>
                    <span className="text-xs font-mono font-black text-amber-400">
                      ₹2,100
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white leading-tight">
                    Book Kashi Rudrabhishek
                  </h4>

                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    Live recitation of your Gotra inside the Garbhagriha. Ganga Jal &amp; Bhasma Prasad dispatched.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Teleprompter Synced</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeva({
                        title: 'Kashi Rudrabhishek Seva',
                        price: 2100,
                        type: 'Puja',
                      });
                      setActiveModal('sevaBooking');
                    }}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Book Sankalpa
                  </button>
                </div>
              </div>

              {/* Card 2: Order Certified Rudraksha */}
              <div className="min-w-[240px] max-w-[240px] snap-center p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between space-y-3 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Sacred Shop
                    </span>
                    <span className="text-xs font-mono font-black text-indigo-400">
                      ₹1,250
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white leading-tight">
                    Certified 5-Mukhi Rudraksha
                  </h4>

                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    Lab-tested genuine Nepali bead consecrated with Vedic mantras during Pradosham at Kashi.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[9px] font-mono text-indigo-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Kashi Trust Certified</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      showToast(
                        '🛍️ Order added to sacred cart! Consecrated dispatch in 48 hours.',
                        'success',
                        'Sacred Shop'
                      );
                    }}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Order Now
                  </button>
                </div>
              </div>

              {/* Card 3: Gau Gras Seva */}
              <div className="min-w-[240px] max-w-[240px] snap-center p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between space-y-3 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Gau Seva
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      ₹501
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white leading-tight">
                    Feed 11 Indigenous Cows
                  </h4>

                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    Fresh green grass, jaggery &amp; minerals served at the heritage Goshala sanctuary in your name.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>Kamadhenu Blessing</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeva({
                        title: 'Gau Gras Seva (11 Cows)',
                        price: 501,
                        type: 'Goshala',
                      });
                      setActiveModal('sevaBooking');
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Offer Seva
                  </button>
                </div>
              </div>

              {/* Card 4: Annadanam */}
              <div className="min-w-[240px] max-w-[240px] snap-center p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between space-y-3 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Mahaprasad
                    </span>
                    <span className="text-xs font-mono font-black text-orange-400">
                      ₹1,500
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white leading-tight">
                    Sponsor 51 Annadanam Meals
                  </h4>

                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    Nourishing Satvik Prasadam cooked with Desi Ghee for visiting pilgrims and sadhus.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[9px] font-mono text-orange-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>80G Receipt Included</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSeva({
                        title: 'Sponsor 51 Annadanam Meals',
                        price: 1500,
                        type: 'Annadanam',
                      });
                      setActiveModal('sevaBooking');
                    }}
                    className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[11px] transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Sponsor Meals
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 4: COMMUNITY MATRIX ENTRY POINTS */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-black uppercase font-mono tracking-wider text-slate-400">
              Sanatani Community Matrix
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: Purohit Marketplace */}
              <button
                type="button"
                onClick={() => setActiveModal('purohit')}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-left transition-all cursor-pointer group shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                  Purohit Marketplace
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Find verified Pandits for Griha Pravesha, Satyanarayan &amp; Shradh rituals.
                </p>
                <div className="mt-2 text-[9px] font-mono text-amber-400 font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>4.95 Rating &bull; Transparent Dakshina</span>
                </div>
              </button>

              {/* Button 2: Sanatani Vivah */}
              <button
                type="button"
                onClick={() => setActiveSubView('vivah')}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-left transition-all cursor-pointer group shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Heart className="w-5 h-5 text-rose-400" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-xs font-black text-white group-hover:text-rose-300 transition-colors">
                  Sanatani Vivah
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  36-Guna Kundali match &amp; verified Dharmic family roots.
                </p>
                <div className="mt-2 text-[9px] font-mono text-rose-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  <span>Gotra Exogamy Verified ✓</span>
                </div>
              </button>
            </div>
          </section>

          {/* SECTION 5: YATRA PASSPORT */}
          <section className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Yatra Passport &amp; Pilgrimage Stamps</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  O2O Physical Verification at Mandir Turnstiles &amp; Kiosks
                </p>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {devotee.yatraPassport.length}/6 Stamped
              </span>
            </div>

            {/* Grid of Digital Pilgrimage Stamps */}
            <div className="grid grid-cols-3 gap-2">
              {/* Stamp 1: Kashi */}
              <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-center space-y-1">
                <div className="text-xl">🏛️</div>
                <div className="text-[10px] font-black text-amber-300 leading-tight">
                  Kashi
                </div>
                <span className="text-[8px] font-mono text-emerald-400 block font-bold">
                  ✓ Verified
                </span>
              </div>

              {/* Stamp 2: Kedarnath */}
              <div className="p-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-center space-y-1">
                <div className="text-xl">🏔️</div>
                <div className="text-[10px] font-black text-cyan-300 leading-tight">
                  Kedarnath
                </div>
                <span className="text-[8px] font-mono text-emerald-400 block font-bold">
                  ✓ Verified
                </span>
              </div>

              {/* Stamp 3: Tirupati */}
              <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-center space-y-1">
                <div className="text-xl">🛕</div>
                <div className="text-[10px] font-black text-amber-300 leading-tight">
                  Tirupati
                </div>
                <span className="text-[8px] font-mono text-emerald-400 block font-bold">
                  ✓ Verified
                </span>
              </div>

              {/* Stamp 4: Ayodhya */}
              <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1 opacity-70">
                <div className="text-xl">🚩</div>
                <div className="text-[10px] font-bold text-slate-300 leading-tight">
                  Ayodhya
                </div>
                <span className="text-[8px] font-mono text-slate-500 block">
                  Scan at Kiosk
                </span>
              </div>

              {/* Stamp 5: Somnath */}
              <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1 opacity-70">
                <div className="text-xl">🌅</div>
                <div className="text-[10px] font-bold text-slate-300 leading-tight">
                  Somnath
                </div>
                <span className="text-[8px] font-mono text-slate-500 block">
                  Scan at Kiosk
                </span>
              </div>

              {/* Stamp 6: Rameswaram */}
              <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1 opacity-70">
                <div className="text-xl">🌊</div>
                <div className="text-[10px] font-bold text-slate-300 leading-tight">
                  Rameswaram
                </div>
                <span className="text-[8px] font-mono text-slate-500 block">
                  Scan at Kiosk
                </span>
              </div>
            </div>
          </section>

          {/* ZERO-INTERNET EMERGENCY PROTOCOL STRIP */}
          <section className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Meshnet Relay: <strong>BLE Active</strong></span>
            </div>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-300 border border-slate-800">
              Zero-Internet Ready
            </span>
          </section>

        </main>

        {/* FLOATING ACTION BUTTON (FAB): GITA AI SPIRITUAL COUNSELOR */}
        <div className="fixed bottom-5 right-5 max-w-md w-auto z-40">
          <button
            type="button"
            onClick={() => setActiveModal('gitaAI')}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/40 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-200/40"
          >
            <Bot className="w-4 h-4 text-slate-950" />
            <span>Ask Gita AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-950 animate-ping" />
          </button>
        </div>
          </>
        )}

      </div>

      {/* MODAL 1: GITA AI SPIRITUAL COUNSELOR */}
      {activeModal === 'gitaAI' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">Gita AI Counselor</h3>
                  <span className="text-[10px] text-amber-400 font-mono">Bhagavad Gita Wisdom</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {gitaChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-amber-500 text-slate-950 font-medium'
                        : 'bg-slate-950 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.verse && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-serif text-amber-400 italic">
                        {msg.verse}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Questions */}
            <div className="px-4 py-2 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px] font-mono">
              <button
                type="button"
                onClick={() => {
                  setGitaQuestion('How to overcome fear of failure?');
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 shrink-0 hover:bg-slate-700"
              >
                Overcome Fear
              </button>
              <button
                type="button"
                onClick={() => {
                  setGitaQuestion('What is Nishkama Karma?');
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 shrink-0 hover:bg-slate-700"
              >
                Nishkama Karma
              </button>
              <button
                type="button"
                onClick={() => {
                  setGitaQuestion('How to quiet the restless mind?');
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 shrink-0 hover:bg-slate-700"
              >
                Quiet the Mind
              </button>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleAskGita} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                value={gitaQuestion}
                onChange={(e) => setGitaQuestion(e.target.value)}
                placeholder="Ask any spiritual, moral, or life doubt..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PUROHIT MARKETPLACE */}
      {activeModal === 'purohit' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Purohit Marketplace</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Verified Archakas &bull; Fixed Transparent Dakshina
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pandit Listing */}
            <div className="space-y-3">
              {[
                {
                  name: 'Pandit Vidyadhar Shastri',
                  location: 'Kashi Vishwanath Kshetra',
                  sect: 'Rigveda • Shukla Yajurveda',
                  rating: 4.98,
                  rituals: 412,
                  rate: '₹2,500 / Puja',
                },
                {
                  name: 'Acharya Someshwar Joshi',
                  location: 'Ujjain Mahakal Kshetra',
                  sect: 'Samaveda & Vastu Shanti',
                  rating: 4.94,
                  rituals: 285,
                  rate: '₹3,100 / Puja',
                },
                {
                  name: 'Pandit Ananda Bhattacharya',
                  location: 'Kolkata & Mayapur',
                  sect: 'Tantrokta & Satyanarayan',
                  rating: 4.96,
                  rituals: 520,
                  rate: '₹2,100 / Puja',
                },
              ].map((p, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-black text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{p.location}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-400">{p.rate}</span>
                  </div>

                  <div className="text-[10px] text-amber-200/80 font-mono">{p.sect}</div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                    <div className="flex items-center gap-1 text-amber-400 font-bold font-mono">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{p.rating} ({p.rituals} rituals)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        showToast(`Purohit consultation requested with ${p.name}. Pandit will call within 2 hours.`, 'success', 'Purohit Connect');
                        setActiveModal('none');
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] hover:bg-amber-400"
                    >
                      Book Pandit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SANATANI VIVAH */}
      {activeModal === 'vivah' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>Sanatani Vivah (Dharmic Matchmaking)</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  36-Guna Kundali Matching &bull; Verified Family Roots
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Devotee's Matrimonial Astrological Profile */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase text-rose-400">
                Your Vedic Horoscope Profile
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-400 block">Gotra</span>
                  <span className="text-white font-bold">{devotee.gotra}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-400 block">Nakshatra</span>
                  <span className="text-white font-bold">{devotee.nakshatra}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-400 block">Rashi</span>
                  <span className="text-white font-bold">{devotee.rashi}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <span className="text-[10px] text-slate-400 block">Manglik Status</span>
                  <span className="text-emerald-400 font-bold">Non-Manglik</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
              <strong>Shastra Rule:</strong> Sagotra marriages are strictly prevented. Kundali matching evaluates Nadi, Bhakoot, Gana, Maitri, and Varna compatibility.
            </div>

            <button
              type="button"
              onClick={() => {
                showToast('Vivah matchmaking profile activated with your verified Mandir credentials.', 'success', 'Vivah Matched');
                setActiveModal('none');
                setActiveSubView('vivah');
              }}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors shadow-lg cursor-pointer"
            >
              Browse Compatible Dharmic Matches
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: SEVA BOOKING SANCTUM RECITATION */}
      {activeModal === 'sevaBooking' && selectedSeva && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">{selectedSeva.title}</h3>
                <span className="text-xs font-mono font-bold text-amber-400">₹{selectedSeva.price}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  setSelectedSeva(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                  Yajamana Name (यजमान नाम)
                </label>
                <input
                  type="text"
                  value={sankalpName}
                  onChange={(e) => setSankalpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                  Gotra (गोत्र)
                </label>
                <input
                  type="text"
                  value={sankalpGotra}
                  onChange={(e) => setSankalpGotra(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                  Sankalpa Intention (सङ्कल्प मनोरथ)
                </label>
                <input
                  type="text"
                  value={sankalpIntention}
                  onChange={(e) => setSankalpIntention(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 space-y-1 font-mono">
              <div className="flex items-center justify-between text-amber-300">
                <span>Sanctum Recitation:</span>
                <span>Live Teleprompter</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Prasad Delivery:</span>
                <span>Speed Post Included ✓</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmSevaBooking}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-xl cursor-pointer"
            >
              Confirm Sankalpa &amp; Pay ₹{selectedSeva.price}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevoteePortal;
