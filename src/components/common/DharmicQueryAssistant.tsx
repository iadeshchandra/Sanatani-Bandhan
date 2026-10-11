import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  Flame,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  Bookmark,
  X,
  Compass,
  Calendar,
  Clock,
  MapPin,
  Bot,
  User,
  Sun,
  Moon,
  Flower2,
  AlertCircle,
  HelpCircle,
  Sparkle,
  CheckCircle2,
  Layers,
  Building2,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { calculateDailyPanchang, STANDARD_CITIES, PanchangData } from '../../utils/panchang';

export type AssistantLang = 'en' | 'hi' | 'bn' | 'sa';

export interface DharmicAssistantResult {
  title: string;
  summary: string;
  shloka?: string;
  shlokaTransliteration?: string;
  shlokaMeaning?: string;
  scriptureSource?: string;
  guidancePoints?: string[];
  moduleActions?: Array<{
    label: string;
    targetModule?: string;
    tip?: string;
  }>;
  suggestedQueries?: string[];
  isMock?: boolean;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  query?: string;
  result?: DharmicAssistantResult;
  moduleContext?: string;
}

export interface DharmicQueryAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeModule?: string;
  onNavigate?: (module: string) => void;
  isDrawer?: boolean;
}

export const DharmicQueryAssistant: React.FC<DharmicQueryAssistantProps> = ({
  isOpen = true,
  onClose,
  activeModule = 'dashboard',
  onNavigate,
  isDrawer = false,
}) => {
  const { activeWorkspace } = useAuthWorkspace();
  const { residentPujas } = useData();
  const { showToast } = useToast();

  const [promptInput, setPromptInput] = useState('');
  const [selectedLang, setSelectedLang] = useState<AssistantLang>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  const [activeChipFilter, setActiveChipFilter] = useState<'all' | 'fasts' | 'timings' | 'samagri' | 'shastras'>('all');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize SpeechSynthesis on client
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Compute live panchang details grounded in workspace coordinates
  const { panchang, locationName, activeFestivals, aartiScheduleSummary, nextAartiName } = useMemo(() => {
    const cityName = activeWorkspace?.city || 'Varanasi';
    const cityMatch = STANDARD_CITIES.find(
      (c) => c.name.toLowerCase().includes(cityName.toLowerCase()) || cityName.toLowerCase().includes(c.id)
    );
    const lat = cityMatch ? cityMatch.lat : 25.3176;
    const lon = cityMatch ? cityMatch.lon : 82.9739;
    const computedPanchang: PanchangData = calculateDailyPanchang(new Date(), lat, lon);

    // Detect active festival / vrata based on tithi and lunar month
    const tithiLower = computedPanchang.tithi.toLowerCase();
    let detectedFestival = 'Nitya Mandir Seva & Darshan';
    if (tithiLower.includes('ekadashi')) {
      detectedFestival = 'Ekadashi Vrata (Nirjala / Phalahar Fasting)';
    } else if (tithiLower.includes('purnima')) {
      detectedFestival = 'Satyanarayan Vrata & Maha Purnima Snan';
    } else if (tithiLower.includes('amavasya')) {
      detectedFestival = 'Darsha Amavasya & Pitru Tarpan';
    } else if (tithiLower.includes('trayodashi')) {
      detectedFestival = 'Shiva Pradosham Vrata & Sandhya Abhishekam';
    } else if (tithiLower.includes('chaturthi')) {
      detectedFestival = 'Ganesha Sankashti / Vinayaka Chaturthi Vrata';
    } else if (tithiLower.includes('ashtami')) {
      detectedFestival = 'Durga Ashtami Seva & Kalash Puja';
    } else if (tithiLower.includes('navami')) {
      detectedFestival = 'Sri Rama Navami Aradhana & Havan';
    }

    // Format aartis from residentPujas schedule
    const aartiList = (residentPujas && residentPujas.length > 0)
      ? residentPujas.map((rp) => `${rp.pujaName} (${rp.timings})`).join('; ')
      : 'Mangala Aarti (05:00 AM), Madhyahna Bhoga (12:00 PM), Sandhya Aarti (07:00 PM), Shayana Aarti (09:30 PM)';

    // Approximate next aarti based on current hour
    const currentHour = new Date().getHours();
    let nextAarti = 'Mangala Aarti (05:00 AM)';
    if (currentHour >= 5 && currentHour < 12) {
      nextAarti = 'Madhyahna Bhoga Aarti (12:00 PM)';
    } else if (currentHour >= 12 && currentHour < 19) {
      nextAarti = 'Sandhya Maha Aarti (07:00 PM)';
    } else if (currentHour >= 19 && currentHour < 22) {
      nextAarti = 'Shayana Aarti (09:30 PM)';
    }

    return {
      panchang: computedPanchang,
      locationName: `${cityName}${activeWorkspace?.state ? `, ${activeWorkspace.state}` : ''}`,
      activeFestivals: detectedFestival,
      aartiScheduleSummary: aartiList,
      nextAartiName: nextAarti,
    };
  }, [activeWorkspace, residentPujas]);

  // Initial welcome greeting on first mount
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: 'init-copilot-welcome',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        moduleContext: activeModule,
        result: {
          title: `Namaste! Official Dharmic Copilot for ${activeWorkspace.name}`,
          summary: `Welcome to the context-aware Dharmic Copilot. I am initialized with live telemetry for ${activeWorkspace.name} in ${locationName}. Today's Tithi is ${panchang.tithi} (${panchang.paksha} Paksha) with ${panchang.nakshatra} Nakshatra. Fasting & Observance: ${activeFestivals}. How may I serve your devotion or institutional duties today?`,
          shloka: `धर्मो रक्षति रक्षितः। यतो धर्मस्ततो जयः॥`,
          shlokaTransliteration: `dharmo rakṣati rakṣitaḥ, yato dharmastato jayaḥ`,
          shlokaMeaning: `Dharma protects those who uphold Dharma. Where there is righteousness, divine victory is assured.`,
          scriptureSource: `Mahabharata & Manusmriti 8.15`,
          guidancePoints: [
            `Current Lunar Day: ${panchang.tithi} (${panchang.paksha} Paksha) • ${panchang.nakshatra} Nakshatra.`,
            `Upcoming Temple Service: ${nextAartiName}.`,
            `Ask any question regarding fasting rules, aarti timings, puja samagri, or scripture pramanas.`
          ],
          moduleActions: [
            { label: 'Check Live Panjika', targetModule: 'panchang-muhurat', tip: 'View detailed Muhurat & Choghadiya' },
            { label: 'Book Puja Sankalp', targetModule: 'pooja-booking', tip: 'Reserve sacred ritual slot' },
            { label: 'Daily Aarti Roster', targetModule: 'aarti-roster', tip: 'View priest & seva duties' }
          ],
          suggestedQueries: [
            'What are the rules for Ekadashi fasting?',
            'When is the next evening aarti?',
            'What samagri is needed for Satyanarayan Puja?',
            'What is today\'s auspicious Muhurat & Rahu Kaal?'
          ],
          isMock: false,
        },
      };
      setMessages([initialGreeting]);
    }
  }, [activeWorkspace, panchang, activeFestivals, locationName, nextAartiName, activeModule]);

  // Auto scroll down smoothly
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Preset Questions
  const allPresets = [
    { label: 'Ekadashi Fasting Rules', query: 'What are the rules for Ekadashi fasting?', category: 'fasts' },
    { label: 'Next Evening Aarti', query: 'When is the next evening aarti?', category: 'timings' },
    { label: 'Satyanarayan Puja Samagri', query: 'What samagri is needed for Satyanarayan Puja?', category: 'samagri' },
    { label: 'Today\'s Muhurat & Rahu Kaal', query: `What is today\'s auspicious Muhurat and Rahu Kaal in ${locationName}?`, category: 'timings' },
    { label: 'Sanctum Dress Code', query: 'What are the sanctum entry and traditional dress code guidelines for darshan?', category: 'timings' },
    { label: 'Rudrabhishek Samagri & Vidhi', query: 'What samagri is required for Shiva Rudrabhishek and what is the vidhi?', category: 'samagri' },
    { label: 'Significance of Anna-Daan', query: 'What is the scriptural significance and spiritual merit of Anna-Daan in Taittiriya Upanishad?', category: 'shastras' },
    { label: 'How to Book Sankalp Online', query: 'How do I book a personalized Vedic Puja Sankalp through this portal?', category: 'samagri' },
  ];

  const filteredPresets = allPresets.filter(
    (p) => activeChipFilter === 'all' || p.category === activeChipFilter
  );

  // Send Query to Gemini API with Context Injection
  const handleSendQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      query: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      moduleContext: activeModule,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput('');
    setIsLoading(true);

    try {
      // Build conversation history
      const history = messages
        .filter((m) => m.query || m.result?.summary)
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          text: m.query || m.result?.summary || '',
        }));

      // Inject tenant & panchang context directly into the Gemini system instructions
      const systemInstruction = `You are the official Dharmic AI Copilot for "${activeWorkspace.name}" located in ${locationName}.
Today's Tithi is ${panchang.tithi} (${panchang.paksha} Paksha), Nakshatra is ${panchang.nakshatra}, Lunar Month is ${panchang.lunarMonth}, Samvat ${panchang.vikramSamvat}.
Sunrise: ${panchang.sunrise} | Sunset: ${panchang.sunset} | Rahu Kaal: ${panchang.rahuKaal} | Abhijit Muhurat: ${panchang.abhijitMuhurat}.
Active Vrat/Festivals Today: ${activeFestivals}.
Temple Daily Aarti Schedule & Timings:
${aartiScheduleSummary}
Next Approaching Aarti: ${nextAartiName}.
Sampradaya/Tradition: ${activeWorkspace.sampradaya || 'Sanatan Vaidika Dharma'}.
Temple Deity: ${activeWorkspace.kuladevata || 'Sacred Sanatan Sanctum'}.

Your sacred duty:
Help devotees with authentic scriptural knowledge (Shastra Pramana), temple timings, fasting rules (Vrata Niyama), puja samagri checklists, and temple operations with profound reverence, accuracy, and clarity.
Preferred Response Language: ${selectedLang === 'hi' ? 'Hindi' : selectedLang === 'bn' ? 'Bengali' : selectedLang === 'sa' ? 'Sanskrit' : 'English'}.`;

      // Check for user-provided custom key or env key
      const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('user_gemini_api_key') || undefined;

      const res = await fetch('/api/gemini/dharmic-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          systemInstruction,
          activeModule,
          workspaceName: activeWorkspace.name,
          workspaceType: activeWorkspace.type,
          location: locationName,
          activeFestivals,
          aartiSchedule: aartiScheduleSummary,
          panchangContext: {
            tithi: panchang.tithi,
            paksha: panchang.paksha,
            nakshatra: panchang.nakshatra,
            lunarMonth: panchang.lunarMonth,
            samvat: panchang.vikramSamvat,
            sunrise: panchang.sunrise,
            sunset: panchang.sunset,
            rahuKaal: panchang.rahuKaal,
            abhijitMuhurat: panchang.abhijitMuhurat,
          },
          language: selectedLang,
          conversationHistory: history,
          customApiKey: clientApiKey,
        }),
      });

      const data = await res.json();

      if (data.success && data.result) {
        const assistantMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          result: data.result,
          moduleContext: activeModule,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to retrieve response from Dharmic Copilot');
      }
    } catch (err: any) {
      console.error('Dharmic Copilot error:', err);

      // Context-aware fallback response grounded in live panchang
      const fallbackResult: DharmicAssistantResult = {
        title: `Dharmic Guidance • ${activeWorkspace.name}`,
        summary: `Regarding your inquiry on "${trimmed}": In adherence to today's sacred calendar (${panchang.tithi}, ${panchang.nakshatra} Nakshatra in ${locationName}), devotee services and temple rituals are coordinated under authentic Vaidika guidelines. ${nextAartiName} is scheduled next.`,
        shloka: `सत्यं वद। धर्मं चर। स्वाध्यायान्मा प्रमदः।`,
        shlokaTransliteration: `satyaṁ vada, dharmaṁ cara, svādhyāyān mā pramadaḥ`,
        shlokaMeaning: `Speak the truth. Conduct yourself with Dharma. Never neglect sacred study and devotion.`,
        scriptureSource: `Taittiriya Upanishad 1.11.1`,
        guidancePoints: [
          `Temple Timings: ${nextAartiName}. Sanctum doors remain accessible according to daily Seva shifts.`,
          `Today's Astrological Alignment: ${panchang.tithi} (${panchang.paksha} Paksha) with ${panchang.nakshatra} Nakshatra.`,
          `Consult the temple Purohit desk or visit the Pooja Booking counter for custom Sankalp arrangements.`
        ],
        moduleActions: [
          { label: 'Check Live Panjika', targetModule: 'panchang-muhurat', tip: 'View Rahu Kaal & Muhurat' },
          { label: 'Pooja Booking Desk', targetModule: 'pooja-booking', tip: 'Book Sankalp slot' }
        ],
        suggestedQueries: [
          'What are the rules for Ekadashi fasting?',
          'When is the next evening aarti?',
          'What samagri is needed for Satyanarayan Puja?'
        ],
        isMock: true,
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          result: fallbackResult,
          moduleContext: activeModule,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy guidance to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard! 🙏', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Text-To-Speech Speech Synthesis
  const handleSpeak = (text: string) => {
    if (!synthRef.current) {
      showToast('Speech synthesis not available in this browser', 'info');
      return;
    }

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    try {
      const cleanText = text.replace(/[॥।]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedLang === 'hi' || selectedLang === 'sa' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.92;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      synthRef.current.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  // Bookmark guidance note
  const handleBookmark = (title: string, shloka?: string) => {
    const note = shloka ? `${title} — ${shloka}` : title;
    if (!savedNotes.includes(note)) {
      setSavedNotes((prev) => [...prev, note]);
      showToast('Saved to your Dharmic Study Notes', 'success');
    } else {
      setSavedNotes((prev) => prev.filter((n) => n !== note));
      showToast('Removed from saved notes', 'info');
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    showToast('Conversation reset', 'info');
  };

  if (!isOpen && isDrawer) return null;

  return (
    <div
      id="dharmic-copilot-container"
      className={`flex flex-col bg-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-100 ${
        isDrawer
          ? 'fixed top-16 right-4 bottom-4 w-full sm:w-[520px] max-w-[calc(100vw-32px)] z-50 transition-all duration-300 backdrop-blur-xl'
          : 'w-full h-full min-h-[640px]'
      }`}
    >
      {/* 1. Auspicious Copilot Header */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 px-4 sm:px-5 py-3.5 border-b border-amber-500/25 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-serif font-black text-xl shrink-0 select-none border border-amber-300/40">
            ॐ
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-amber-100 tracking-wide flex items-center gap-1.5 truncate">
                Dharmic AI Copilot
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1 shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                Gemini API
              </span>
            </div>
            <p className="text-[11px] text-amber-200/75 truncate max-w-[280px] sm:max-w-[340px]">
              {activeWorkspace.name} • {locationName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleResetChat}
            title="Reset Chat History"
            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800/80 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isDrawer && onClose && (
            <button
              type="button"
              id="close-dharmic-copilot-btn"
              onClick={onClose}
              title="Close Copilot"
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Live Panchang & Temple Grounding Strip */}
      <div className="bg-stone-900/90 border-b border-stone-800 px-3.5 py-2 flex items-center justify-between gap-2 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
            <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{panchang.tithi} ({panchang.paksha})</span>
          </div>

          <span className="text-stone-600">•</span>

          <div className="flex items-center gap-1.5 text-stone-300">
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{panchang.nakshatra}</span>
          </div>

          <span className="text-stone-600">•</span>

          <div className="flex items-center gap-1.5 text-stone-300">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[170px]" title={nextAartiName}>{nextAartiName}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Injected
        </div>
      </div>

      {/* 3. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-slate-950 via-stone-950 to-slate-950">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.id}-${idx}`}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'user' ? (
              <div className="max-w-[85%] bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-medium rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-lg shadow-amber-900/20">
                <div className="flex items-center gap-1.5 mb-0.5 text-stone-950/70 text-[10px] font-bold uppercase tracking-wider">
                  <User className="w-3 h-3" />
                  <span>Devotee</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-stone-950 font-medium">
                  {msg.query}
                </p>
                <span className="text-[10px] text-stone-900/60 block text-right mt-1">
                  {msg.timestamp}
                </span>
              </div>
            ) : (
              <div className="w-full max-w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3 relative group">
                {/* Assistant Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif text-sm font-bold shrink-0">
                      ॐ
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-200 leading-tight truncate">
                        {msg.result?.title || 'Dharmic Intelligence Guidance'}
                      </h4>
                      {msg.result?.scriptureSource && (
                        <p className="text-[10px] text-amber-400/80 font-medium truncate">
                          Pramana: {msg.result.scriptureSource}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1 shrink-0">
                    {msg.result?.shloka && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeak(
                            `${msg.result?.shloka}. Meaning: ${msg.result?.shlokaMeaning || msg.result?.summary}`
                          )
                        }
                        title={isSpeaking ? 'Stop Audio' : 'Listen to Pronunciation'}
                        className={`p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors cursor-pointer ${
                          isSpeaking ? 'text-amber-400 bg-amber-500/10 animate-pulse' : ''
                        }`}
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          `${msg.result?.title}\n\n${msg.result?.shloka ? `॥ ${msg.result.shloka} ॥\nMeaning: ${msg.result.shlokaMeaning}\nSource: ${msg.result.scriptureSource}\n\n` : ''}${msg.result?.summary}\n\nKey Points:\n${(msg.result?.guidancePoints || []).map((p) => `• ${p}`).join('\n')}`,
                          msg.id
                        )
                      }
                      title="Copy Guidance"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-400 hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBookmark(msg.result?.title || 'Note', msg.result?.shloka)}
                      title="Bookmark to Dharmic Notes"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sacred Sanskrit Verse Box */}
                {msg.result?.shloka && (
                  <div className="bg-gradient-to-br from-amber-950/40 via-stone-900 to-amber-950/30 border border-amber-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Sparkle className="w-3 h-3 text-amber-400" />
                        Sacred Shastra Citation
                      </span>
                      <span className="text-amber-300/80 font-mono text-[9px]">
                        {msg.result.scriptureSource}
                      </span>
                    </div>

                    <div className="font-serif text-sm sm:text-base text-amber-100 leading-relaxed font-semibold text-center py-1 tracking-wide">
                      ॥ {msg.result.shloka} ॥
                    </div>

                    {msg.result.shlokaTransliteration && (
                      <div className="text-[11px] text-amber-200/80 italic text-center font-mono">
                        "{msg.result.shlokaTransliteration}"
                      </div>
                    )}

                    {msg.result.shlokaMeaning && (
                      <div className="text-xs text-stone-300 border-t border-amber-500/20 pt-1.5 leading-relaxed">
                        <strong className="text-amber-300 font-semibold">Meaning: </strong>
                        {msg.result.shlokaMeaning}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation Summary */}
                <div className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  <p>{msg.result?.summary}</p>
                </div>

                {/* Guidance Points Checklist */}
                {msg.result?.guidancePoints && msg.result.guidancePoints.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Key Recommendations & Ritual Guidelines:
                    </span>
                    <ul className="space-y-1 text-xs text-stone-300">
                      {msg.result.guidancePoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Navigation Buttons */}
                {msg.result?.moduleActions && msg.result.moduleActions.length > 0 && (
                  <div className="pt-2 border-t border-stone-800">
                    <div className="flex flex-wrap gap-1.5">
                      {msg.result.moduleActions.map((action, actionIdx) => (
                        <button
                          key={actionIdx}
                          type="button"
                          onClick={() => {
                            if (action.targetModule && onNavigate) {
                              onNavigate(action.targetModule);
                              showToast(`Navigating to ${action.label}`, 'info');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{action.label}</span>
                          <ArrowRight className="w-3 h-3 text-amber-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-up Questions */}
                {msg.result?.suggestedQueries && msg.result.suggestedQueries.length > 0 && (
                  <div className="pt-2 border-t border-stone-800/80">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1 font-semibold">
                      Suggested Follow-up Inquiries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.result.suggestedQueries.map((queryText, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => handleSendQuery(queryText)}
                          disabled={isLoading}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-stone-800 hover:bg-amber-950/50 text-stone-300 hover:text-amber-200 border border-stone-700/60 hover:border-amber-500/40 transition-colors text-left cursor-pointer"
                        >
                          {queryText}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Animated Typing Indicator */}
        {isLoading && (
          <div className="w-full max-w-full bg-stone-900 border border-amber-500/25 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif text-sm font-bold shrink-0">
              ॐ
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-300">
                  Dharmic Copilot is consulting scriptures & live panjika
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <p className="text-[11px] text-stone-400">
                Grounding with {activeWorkspace.name} ({panchang.tithi}, {panchang.nakshatra})...
              </p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 4. Preset Chip List Bar */}
      <div className="bg-stone-900 border-t border-stone-800 px-3.5 py-2.5 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              Common Inquiries:
            </span>
          </div>

          {/* Filter categories */}
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveChipFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                activeChipFilter === 'all' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveChipFilter('fasts')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                activeChipFilter === 'fasts' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Fasts
            </button>
            <button
              type="button"
              onClick={() => setActiveChipFilter('timings')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                activeChipFilter === 'timings' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Timings
            </button>
            <button
              type="button"
              onClick={() => setActiveChipFilter('samagri')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                activeChipFilter === 'samagri' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Samagri
            </button>
          </div>
        </div>

        {/* Horizontal Chip Carousel */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filteredPresets.map((preset, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleSendQuery(preset.query)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-stone-950 hover:bg-amber-950/40 border border-stone-800 hover:border-amber-500/40 text-[11px] text-stone-300 hover:text-amber-200 whitespace-nowrap transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Input Area */}
      <div className="bg-stone-950 p-3.5 border-t border-stone-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(promptInput);
          }}
          className="flex items-center gap-2"
        >
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value as AssistantLang)}
            title="Select AI Response Language"
            className="bg-stone-900 border border-stone-700/80 text-stone-300 text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-amber-500 shrink-0 cursor-pointer font-medium"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="bn">বাংলা</option>
            <option value="sa">संस्कृत</option>
          </select>

          <div className="relative flex-1">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask about scriptures, rituals, fasts, or temple operations..."
              className="w-full bg-stone-900 border border-stone-700/80 rounded-xl pl-3.5 pr-4 py-2.5 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!promptInput.trim() || isLoading}
            title="Send Inquiry"
            className={`p-2.5 rounded-xl font-semibold flex items-center justify-center transition-all shrink-0 ${
              promptInput.trim() && !isLoading
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 cursor-pointer'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 text-[10px] text-stone-500 px-1">
          <span>Context: {activeWorkspace.name} • {panchang.tithi}</span>
          <span className="flex items-center gap-1 text-amber-500/70">
            <Sparkles className="w-2.5 h-2.5" />
            Gemini 3.8 Flash
          </span>
        </div>
      </div>
    </div>
  );
};
