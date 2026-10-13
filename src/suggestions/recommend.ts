/**
 * Seva Suggestions — "Recommended for you" ranking engine.
 * ============================================================================
 * Scores every not-yet-enabled module for THIS workspace and returns a ranked
 * list with a one-line, honest reason each. No fabricated statistics —
 * reasons use soft phrasing ("many", "often") and real signals only.
 *
 * Signals:
 *  - org-type affinity (curated per archetype, beyond registry natives)
 *  - festival proximity (crowd-safety modules before big utsavs)
 *  - workspace size (devotee count, donation volume)
 *  - recent desk usage (adjacent modules)
 */

export interface LocalizedText {
  en: string;
  hi: string;
  bn: string;
}

export interface RecContext {
  orgType: string;
  nativeModules: string[];
  enabledModules: string[];
  devoteeCount: number;
  donationCount: number;
  daysToFestival: number | null;
  festivalName: LocalizedText | null;
  recentDeskIds: string[];
  lang?: string;
}

export interface Recommendation {
  moduleId: string;
  score: number;
  reason: LocalizedText;
}

/** Modules that should never be "recommended" (always-on, personal, or the store itself). */
const NEVER_RECOMMEND = new Set([
  'dashboard',
  'appStore',
  'masterSettings',
  'devotee-portal',
  'sadhana-karma',
  'yatraNet',
  'sanatani-vivah',
]);

/**
 * Curated affinity: modules a given org type usually needs, beyond its
 * registry natives. Conservative — only the high-confidence 90% cases.
 */
const ORG_AFFINITY: Record<string, string[]> = {
  Mandir: ['sevadar-roster', 'inventory', 'qrScanner', 'utsavPanjika'],
  Tirth: ['qrScanner', 'membership'],
  KashiKshetra: ['qrScanner', 'membership'],
  MahotsavSamiti: ['sevadar-roster', 'sandeshBroadcast', 'qrScanner'],
  Goshala: ['sevadar-roster', 'campaigns'],
  Ashram: ['sevadar-roster', 'membership', 'qrScanner'],
  Yoga: ['membership', 'sandeshBroadcast'],
  Satsang: ['membership', 'sandeshBroadcast'],
  Sangha: ['sevadar-roster', 'membership', 'sandeshBroadcast'],
  Samaj: ['sevadar-roster', 'membership', 'sandeshBroadcast'],
  Gurukul: ['bulkImport', 'membership'],
  Vidyalaya: ['bulkImport', 'sandeshBroadcast', 'membership'],
  PurohitSabha: ['membership', 'sandeshBroadcast'],
  Trust: ['sevadar-roster', 'bulkImport', 'sandeshBroadcast'],
  DharmadaTrust: ['bulkImport'],
  AkshayaPatra: ['sevadar-roster', 'vahan'],
  Purohit: ['sandeshBroadcast'],
};

/** Crowd-safety modules worth enabling ahead of a big utsav. */
const CROWD_SAFETY_MODULES = ['checkin', 'qrScanner', 'crisis-command', 'yatranet-gis', 'sevadar-roster'];

/** Modules adjacent to a desk the user already visits (gentle cross-sell). */
const ADJACENT: Record<string, string[]> = {
  treasury: ['taxReceipts', 'tally-export', 'donorCare'],
  devotees: ['donorCare', 'membership', 'bulkImport'],
  poojaBooking: ['purohitMarket', 'pitruShradh'],
  utsavPanjika: ['checkin', 'qrScanner', 'crisis-command'],
  campaigns: ['donorCare', 'sandeshBroadcast'],
  'quick-chanda-pos': ['donorCare', 'taxReceipts'],
};

function tr(t: LocalizedText, lang?: string): string {
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('bn')) return t.bn;
  if (l.startsWith('hi')) return t.hi;
  return t.en;
}

export function localizeText(t: LocalizedText, lang?: string): string {
  return tr(t, lang);
}

export function getRecommendations(ctx: RecContext): Recommendation[] {
  const lang = ctx.lang;
  const known = new Set([...ctx.nativeModules, ...ctx.enabledModules]);
  const out: Recommendation[] = [];
  const seen = new Set<string>();

  const push = (moduleId: string, score: number, reason: LocalizedText) => {
    if (NEVER_RECOMMEND.has(moduleId)) return;
    if (known.has(moduleId)) return;
    if (seen.has(moduleId)) {
      const existing = out.find((r) => r.moduleId === moduleId);
      if (existing && score > existing.score) {
        existing.score = score;
        existing.reason = reason;
      }
      return;
    }
    seen.add(moduleId);
    out.push({ moduleId, score, reason });
  };

  // 1. Org-type affinity (+30)
  const affinity = ORG_AFFINITY[ctx.orgType] || [];
  for (const m of affinity) {
    push(m, 30, {
      en: `A natural fit for ${ctx.orgType} workspaces — many enable this first.`,
      hi: `${ctx.orgType} कार्यक्षेत्रों के लिए उपयुक्त — कई इसे सबसे पहले चालू करते हैं।`,
      bn: `${ctx.orgType} কর্মক্ষেত্রের জন্য উপযুক্ত — অনেকেই এটি প্রথমে চালু করেন।`,
    });
  }

  // 2. Festival proximity (+25, crowd-safety only)
  if (ctx.daysToFestival !== null && ctx.daysToFestival <= 45 && ctx.festivalName) {
    const fname = tr(ctx.festivalName, lang);
    const when =
      ctx.daysToFestival <= 1
        ? lang?.startsWith('bn')
          ? 'আগামীকাল'
          : lang?.startsWith('hi')
            ? 'कल'
            : 'tomorrow'
        : lang?.startsWith('bn')
          ? `${ctx.daysToFestival} দিন পর`
          : lang?.startsWith('hi')
            ? `${ctx.daysToFestival} दिन बाद`
            : `in ${ctx.daysToFestival} days`;
    for (const m of CROWD_SAFETY_MODULES) {
      push(m, 25, {
        en: `${fname} is ${when} — crowd-safety modules are often enabled before big utsavs.`,
        hi: `${fname} ${when} है — बड़े उत्सवों से पहले भीड़-सुरक्षा मॉड्यूल अक्सर चालू किए जाते हैं।`,
        bn: `${fname} ${when} — বড় উৎসবের আগে ভিড়-নিরাপত্তা মডিউল প্রায়শই চালু করা হয়।`,
      });
    }
  }

  // 3. Size signals
  if (ctx.devoteeCount >= 200) {
    push('bulkImport', 15, {
      en: `With ${ctx.devoteeCount}+ devotees, bulk tools save real admin hours.`,
      hi: `${ctx.devoteeCount}+ भक्तों के साथ, बल्क टूल वास्तविक प्रशासनिक घंटे बचाते हैं।`,
      bn: `${ctx.devoteeCount}+ ভক্তের সঙ্গে, বাল্ক টুল প্রকৃত প্রশাসনিক ঘণ্টা বাঁচায়।`,
    });
    push('membership', 12, {
      en: 'At this size, join requests deserve their own queue.',
      hi: 'इस आकार पर, जुड़ने के अनुरोधों को अपनी कतार मिलनी चाहिए।',
      bn: 'এই আকারে, যোগদানের অনুরোধগুলোর নিজস্ব সারি প্রাপ্য।',
    });
  }
  if (ctx.donationCount >= 25) {
    push('donorCare', 18, {
      en: `${ctx.donationCount}+ donations recorded — win-back keeps first-time donors returning.`,
      hi: `${ctx.donationCount}+ दान दर्ज — विन-बैक पहली बार के दाताओं को वापस लाता है।`,
      bn: `${ctx.donationCount}+ অনুদান নথিভুক্ত — উইন-ব্যাক প্রথমবারের দাতাদের ফিরিয়ে আনে।`,
    });
    push('taxReceipts', 14, {
      en: 'Donation volume like this usually means 80G receipts are due.',
      hi: 'इतने दान का मतलब आमतौर पर 80G रसीदें देय हैं।',
      bn: 'এত অনুদান মানে সাধারণত 80G রসিদ প্রাপ্য।',
    });
  }

  // 4. Adjacent to recently used desks (+8)
  for (const deskId of ctx.recentDeskIds.slice(0, 5)) {
    for (const m of ADJACENT[deskId] || []) {
      push(m, 8, {
        en: 'Pairs well with a desk you already use.',
        hi: 'आपके पहले से इस्तेमाल किए डेस्क के साथ अच्छा जोड़ा है।',
        bn: 'আপনি ইতিমধ্যে যে ডেস্ক ব্যবহার করেন তার সঙ্গে ভালো মানায়।',
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 6);
}
