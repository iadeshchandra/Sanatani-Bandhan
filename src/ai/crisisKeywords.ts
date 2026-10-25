/**
 * Sanatani Bandhan — AI Assistant Phase 0 · crisis keyword lists
 * =====================================================================
 * DATA SOURCE: curated by the product team, bundled with the app.
 * OFFLINE STORY: fully offline — plain string lists, no network, no model.
 *
 * Design law: ANY match routes to `{ type: 'sos' }` immediately, with no
 * chit-chat and no attempt to answer the original question first. Bare
 * "sos" is intentionally NOT a crisis keyword — it routes to the `sos_help`
 * intent, which explains the SOS flow and still offers the SOS button first.
 * Batch 3 (2026-10-25) extended these lists to all 10 app languages;
 * the 7 newer tables are AI-authored DRAFT keyword packs (same draft
 * standard as the draft dictionaries) pending native-speaker review.
 */

export type CrisisLang = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'sa';

export const CRISIS_KEYWORDS: Record<CrisisLang, string[]> = {
  en: [
    'help me',
    'emergency',
    'suicide',
    'kill myself',
    'i want to die',
    'i wanna die',
    'end my life',
    'hurt myself',
    'harming myself',
    'attack',
    'attacked',
    'unsafe',
    "i'm not safe",
    'i am not safe',
    'save me',
    'in danger',
    'being harassed',
    'threatened',
  ],
  hi: [
    'बचाओ',
    'मुझे बचाओ',
    'मदद करो',
    'मदद चाहिए',
    'आपातकाल',
    'आपातकालीन',
    'आत्महत्या',
    'मरना चाहता',
    'मरना चाहती',
    'मर जाऊं',
    'हमला',
    'खतरे में',
    'सुरक्षित नहीं',
    'बचा लो',
  ],
  bn: [
    'বাঁচান',
    'আমাকে বাঁচান',
    'বাঁচান আমাকে',
    'সাহায্য করুন',
    'সাহায্য চাই',
    'জরুরি',
    'জরুরী',
    'আত্মহত্যা',
    'মরতে চাই',
    'মরে যাব',
    'আক্রমণ',
    'বিপদে',
    'নিরাপদ নই',
    'বাঁচাও',
  ],
  ta: [
    'உதவி செய்யுங்கள்',
    'எனக்கு உதவி செய்யுங்கள்',
    'என்னைக் காப்பாற்றுங்கள்',
    'காப்பாற்றுங்கள்',
    'அவசரம்',
    'அவசர நிலைமை',
    'தற்கொலை',
    'தற்கொலை செய்து கொள்ள விரும்புகிறேன்',
    'என்னை நானே கொல்ல விரும்புகிறேன்',
    'சாக விரும்புகிறேன்',
    'நான் சாக விரும்புகிறேன்',
    'என் வாழ்க்கையை முடிக்க விரும்புகிறேன்',
    'என்னை நானே காயப்படுத்திக் கொள்கிறேன்',
    'என்னை நானே துன்புறுத்திக் கொள்கிறேன்',
    'தாக்குதல்',
    'என் மீது தாக்குதல் நடந்தது',
    'என்னைத் தாக்குகிறார்கள்',
    'பாதுகாப்பாக இல்லை',
    'நான் பாதுகாப்பாக இல்லை',
    'ஆபத்தில் இருக்கிறேன்',
    'நான் ஆபத்தில் இருக்கிறேன்',
    'என்னைத் துன்புறுத்துகிறார்கள்',
    'என்னை மிரட்டுகிறார்கள்',
    'மாரடைப்பு',
    'சுயநினைவின்றி இருக்கிறார்',
    'இரத்தம் வழிகிறது',
    'ஆம்புலன்ஸ் வேண்டும்',
    'தீ',
    'தீப்பற்றி விட்டது',
    'வீடு எரிகிறது',
  ],
  te: [
    'సహాయం చేయండి',
    'నాకు సహాయం చేయండి',
    'రక్షించండి',
    'నన్ను రక్షించండి',
    'నన్ను కాపాడండి',
    'కాపాడండి',
    'అత్యవసరం',
    'అత్యవసర పరిస్థితి',
    'ఆత్మహత్య',
    'ఆత్మహత్య చేసుకోవాలనుకుంటున్నాను',
    'చనిపోవాలనుకుంటున్నాను',
    'నేను చనిపోవాలనుకుంటున్నాను',
    'నా జీవితాన్ని ముగించాలనుకుంటున్నాను',
    'నన్ను నేను గాయపరచుకోవాలనుకుంటున్నాను',
    'నన్ను నేను బాధపెట్టుకుంటున్నాను',
    'దాడి',
    'నాపై దాడి జరిగింది',
    'దాడి జరుగుతోంది',
    'సురక్షితంగా లేను',
    'నేను సురక్షితంగా లేను',
    'ప్రమాదంలో ఉన్నాను',
    'నేను ప్రమాదంలో ఉన్నాను',
    'వేధింపులకు గురవుతున్నాను',
    'నన్ను బెదిరిస్తున్నారు',
    'గుండెపోటు',
    'అపస్మారక స్థితిలో ఉన్నాను',
    'రక్తస్రావం అవుతోంది',
    'అంబులెన్స్ కావాలి',
    'అగ్ని',
    'మంటలు',
    'ఇల్లు మండుతోంది',
    'ఇంట్లో మంటలు వచ్చాయి',
  ],
  mr: [
    'वाचवा',
    'मला वाचवा',
    'मदत करा',
    'मदतीची गरज आहे',
    'आपत्कालीन',
    'आणीबाणी',
    'आत्महत्या',
    'मला मरायचे आहे',
    'मरायचे आहे',
    'स्वतःला संपवायचे आहे',
    'जीव द्यायचा आहे',
    'स्वतःला इजा करायची आहे',
    'स्वतःला दुखापत',
    'हल्ला',
    'माझ्यावर हल्ला झाला',
    'असुरक्षित आहे',
    'मी सुरक्षित नाही',
    'धोक्यात आहे',
    'मला वाचवा',
    'छळ होत आहे',
    'धमकावले जात आहे',
    'हृदयविकाराचा झटका',
    'बेशुद्ध',
    'रक्तस्राव होत आहे',
    'रुग्णवाहिका',
    'आग',
    'घराला आग लागली',
    'आग लागली आहे',
    'मारहाण',
    'मला धोका आहे',
  ],
  gu: [
    'મદદ કરો',
    'મને મદદ કરો',
    'મદદ જોઈએ છે',
    'બચાવો',
    'મને બચાવો',
    'બચાવી લો',
    'કટોકટી',
    'આત્મહત્યા',
    'આત્મહત્યા કરવી છે',
    'મરવું છે',
    'મને મરવું છે',
    'મરી જઈશ',
    'જાતને નુકસાન કરવું છે',
    'જાતને ઇજા પહોંચાડી',
    'હુમલો',
    'હુમલો થયો છે',
    'મારા પર હુમલો થયો',
    'અસુરક્ષિત',
    'હું સુરક્ષિત નથી',
    'હું જોખમમાં છું',
    'જોખમમાં છું',
    'સતામણી થાય છે',
    'મને ધમકી મળી છે',
    'ધમકી આપે છે',
    'હૃદયરોગનો હુમલો',
    'બેભાન થઈ ગયા',
    'લોહી વહે છે',
    'એમ્બ્યુલન્સ બોલાવો',
    'આગ લાગી છે',
    'ઘરમાં આગ લાગી છે',
    'ઘર બળે છે',
    'મારપીટ થાય છે',
  ],
  kn: [
    'ಸಹಾಯ ಮಾಡಿ',
    'ನನಗೆ ಸಹಾಯ ಮಾಡಿ',
    'ಸಹಾಯ ಬೇಕು',
    'ತುರ್ತು',
    'ತುರ್ತು ಪರಿಸ್ಥಿತಿ',
    'ಆತ್ಮಹತ್ಯೆ',
    'ನಾನು ಸಾಯಲು ಬಯಸುತ್ತೇನೆ',
    'ಸಾಯಲು ಬಯಸುತ್ತೇನೆ',
    'ನನ್ನ ಜೀವನ ಕೊನೆಗೊಳಿಸುತ್ತೇನೆ',
    'ನನ್ನನ್ನು ನೋಯಿಸಿಕೊಳ್ಳುತ್ತೇನೆ',
    'ನನಗೆ ನಾನೇ ಹಾನಿ ಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ',
    'ನನ್ನನ್ನು ಕಾಪಾಡಿ',
    'ಕಾಪಾಡಿ',
    'ದಾಳಿ',
    'ನನ್ನ ಮೇಲೆ ದಾಳಿ ಆಗಿದೆ',
    'ಸುರಕ್ಷಿತವಾಗಿಲ್ಲ',
    'ನಾನು ಸುರಕ್ಷಿತವಾಗಿಲ್ಲ',
    'ಅಪಾಯದಲ್ಲಿದ್ದೇನೆ',
    'ನನಗೆ ಕಿರುಕುಳ ನೀಡಲಾಗುತ್ತಿದೆ',
    'ಬೆದರಿಕೆ ಹಾಕಲಾಗುತ್ತಿದೆ',
    'ಹೃದಯಾಘಾತ',
    'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ್ದಾರೆ',
    'ಮೂರ್ಛೆ ಹೋಗಿದ್ದೇನೆ',
    'ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆ',
    'ಆಂಬ್ಯುಲೆನ್ಸ್ ಬೇಕು',
    'ಬೆಂಕಿ',
    'ಮನೆಗೆ ಬೆಂಕಿ ಬಿದ್ದಿದೆ',
    'ಮನೆ ಸುಡುತ್ತಿದೆ',
    'ನನಗೆ ಗಾಯವಾಗಿದೆ',
    'ಉಸಿರಾಡಲು ಆಗುತ್ತಿಲ್ಲ',
    'ಪೊಲೀಸರನ್ನು ಕರೆಯಿರಿ',
  ],
  ml: [
    'സഹായിക്കൂ',
    'എന്നെ സഹായിക്കൂ',
    'സഹായം വേണം',
    'അടിയന്തരം',
    'അടിയന്തര സാഹചര്യം',
    'ആത്മഹത്യ',
    'ഞാൻ ആത്മഹത്യ ചെയ്യും',
    'എന്നെത്തന്നെ കൊല്ലും',
    'മരിക്കണം',
    'എനിക്ക് മരിക്കണം',
    'ജീവിതം അവസാനിപ്പിക്കണം',
    'എന്നെത്തന്നെ വേദനിപ്പിക്കും',
    'എന്നെത്തന്നെ ഉപദ്രവിക്കുന്നു',
    'ആക്രമണം',
    'ആക്രമിക്കപ്പെട്ടു',
    'എന്നെ ആക്രമിക്കുന്നു',
    'സുരക്ഷിതമല്ല',
    'ഞാൻ സുരക്ഷിതമല്ല',
    'എന്നെ രക്ഷിക്കൂ',
    'രക്ഷിക്കൂ',
    'അപകടത്തിലാണ്',
    'ഞാൻ അപകടത്തിലാണ്',
    'എന്നെ ഉപദ്രവിക്കുന്നു',
    'എന്നെ ഭീഷണിപ്പെടുത്തുന്നു',
    'ഹൃദയാഘാതം',
    'ബോധമില്ല',
    'ബോധം പോയി',
    'രക്തസ്രാവം',
    'ആംബുലൻസ് വിളിക്കൂ',
    'തീപിടിച്ചു',
    'തീപിടുത്തം',
    'വീട് കത്തുന്നു',
  ],
  sa: [
    'साहाय्यं करोतु',
    'मां रक्षतु',
    'रक्षतु माम्',
    'आपत्',
    'आपत्कालः',
    'आत्महत्या',
    'अहं मर्तुं इच्छामि',
    'मर्तुं इच्छामि',
    'आत्मानं हन्तुं इच्छामि',
    'अहं आत्मानं पीडयामि',
    'मां हन्ति',
    'आक्रमणम्',
    'मयि आक्रमणम् अभवत्',
    'अहं सुरक्षितः न अस्मि',
    'अहं सुरक्षिता न अस्मि',
    'अहं सङ्कटे अस्मि',
    'सङ्कटे अस्मि',
    'मां त्रायतु',
    'उत्पीडनं भवति',
    'मां धमकयति',
    'हृदयाघातः',
    'अचेतनः अस्ति',
    'रक्तस्रावः भवति',
    'रुग्णवाहनम् आह्वयतु',
    'अग्निः',
    'गृहं दह्यते',
    'गृहे अग्निः',
    'चिकित्सकं आह्वयतु',
    'श्वासः न आगच्छति',
    'कृपया शीघ्रम् आगच्छतु',
  ],
};

/**
 * Soft crisis keywords — these are genuine distress signals when standalone
 * ("help me", "save me"), but are also the natural start of procedural
 * requests ("help me with dana", "help me find a temple"). They only
 * trigger SOS when NOT followed by a procedural continuation.
 */
const SOFT_CRISIS_KEYWORDS: Record<CrisisLang, string[]> = {
  en: ['help me', 'save me', 'attack'],
  hi: ['मदद करो', 'मदद चाहिए', 'बचा लो'],
  bn: ['সাহায্য করুন', 'সাহায্য চাই', 'বাঁচাও'],
  ta: ['உதவி செய்யுங்கள்', 'எனக்கு உதவி செய்யுங்கள்', 'என்னைக் காப்பாற்றுங்கள்', 'காப்பாற்றுங்கள்'],
  te: ['సహాయం చేయండి', 'నాకు సహాయం చేయండి', 'నన్ను కాపాడండి', 'కాపాడండి'],
  mr: ['मदत करा', 'मदतीची गरज आहे', 'मला वाचवा', 'वाचवा'],
  gu: ['મદદ કરો', 'મદદ જોઈએ છે', 'બચાવો', 'બચાવી લો'],
  kn: ['ಸಹಾಯ ಮಾಡಿ', 'ನನ್ನನ್ನು ಕಾಪಾಡಿ', 'ಕಾಪಾಡಿ', 'ದಾಳಿ'],
  ml: ['സഹായിക്കൂ', 'എന്നെ രക്ഷിക്കൂ', 'രക്ഷിക്കൂ', 'ആക്രമണം'],
  sa: ['साहाय्यं करोतु', 'मां रक्षतु', 'रक्षतु माम्', 'मां त्रायतु'],
};

/**
 * Procedural verbs that turn "help me …" into an ordinary request.
 * "help me with dana" → dana_help. "help me, I'm in danger" → still SOS
 * (the strong keyword 'in danger' matches independently).
 */
const PROCEDURAL_AFTER_HELP =
  /\bhelp me\s+(with|to|find|book|get|open|show|do|make|give|tell|explain|learn|understand|use|booking?)\b/i;

/**
 * Returns true when the input is "help me <procedural verb> …" — an
 * ordinary assistance request, not a distress signal.
 */
export function isProceduralHelp(input: string): boolean {
  const text = (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return PROCEDURAL_AFTER_HELP.test(text);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Word-boundary-aware match (Unicode-aware, so Devanagari/Bengali
 * conjuncts are respected). Returns the matched keyword and language,
 * or null when the input is crisis-free.
 */
export function detectCrisis(input: string): { keyword: string; lang: CrisisLang } | null {
  const text = (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const procedural = isProceduralHelp(text);
  const langs: CrisisLang[] = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'];
  for (const lang of langs) {
    for (const kw of CRISIS_KEYWORDS[lang]) {
      const re = new RegExp(`(?<!\\p{L})${escapeRegExp(kw.toLowerCase())}(?!\\p{L})`, 'u');
      if (!re.test(text)) continue;
      // Soft keywords ("help me", "save me") are distress signals when
      // standalone, but procedural requests when followed by "with/to/find…".
      // "help me with dana" → not a crisis. "help me, I'm in danger" →
      // still a crisis (strong keyword 'in danger' matches independently).
      const isSoft = (SOFT_CRISIS_KEYWORDS[lang] as readonly string[]).includes(kw);
      if (isSoft && procedural) continue;
      return { keyword: kw, lang };
    }
  }
  return null;
}

/** Total crisis keywords across all languages (for reporting/QA). */
export function crisisKeywordCount(): Record<CrisisLang, number> {
  return {
    en: CRISIS_KEYWORDS.en.length,
    hi: CRISIS_KEYWORDS.hi.length,
    bn: CRISIS_KEYWORDS.bn.length,
    ta: CRISIS_KEYWORDS.ta.length,
    te: CRISIS_KEYWORDS.te.length,
    mr: CRISIS_KEYWORDS.mr.length,
    gu: CRISIS_KEYWORDS.gu.length,
    kn: CRISIS_KEYWORDS.kn.length,
    ml: CRISIS_KEYWORDS.ml.length,
    sa: CRISIS_KEYWORDS.sa.length,
  };
}
