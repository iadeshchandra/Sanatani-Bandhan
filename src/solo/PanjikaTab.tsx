import React, { useEffect, useMemo, useState } from 'react';
import { useSoloStore, uid, todayISO } from './soloStore';
import { Card, T, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { calculateDailyPanchang, calculateSunriseSunset, STANDARD_CITIES } from '../utils/panchang';
import { drikSnapshot, drikDayNakshatra, type LunarSchool } from '../lib/drikPanchang';
import {
  REGIONAL_CALENDARS, getCalendar, defaultCalendarId, formatRegionalDate,
  meshaMonthName, type RegionalCalendar, type RegionalDate,
} from '../lib/regionalCalendars';
import {
  PANJIKA_FESTIVALS, festivalsOn, upcomingFestivals, categoryMeta,
  type PanjikaFestival,
} from '../lib/panjikaFestivals';
import {
  findShubhMuhurat, SAMSKARA_KINDS, MUHURAT_DISCLAIMER_BY_TRADITION,
  type SamskaraKind, type MuhuratDay, type MuhuratTradition,
} from '../lib/shubhMuhurat';
import { findEkadashis, VRATA_DISCLAIMER } from '../lib/vrataSchedule';
import { getRashifal, rashiName, RASHIFAL_DISCLAIMER, RASHIFAL_LABEL } from '../lib/rashifal';
import { getCachedRegion } from '../lib/geoDetect';
import type { ReminderKind } from './types';

/* PanjikaTab — the Sanatani Panjika: one almanac, every tradition.
 * Regional calendar framework (10 traditions), daily panjika, festivals,
 * shubh-muhurat finder, Ekadashi schedule, and rashifal.
 * Offline-first: everything computed locally; festival DB bundled.
 */

type Section = 'calendar' | 'today' | 'utsav' | 'muhurat' | 'vrata' | 'rashifal';

const SECTIONS: Array<{ id: Section; en: string; bn: string; icon: string }> = [
  { id: 'calendar', en: 'Calendar', bn: 'বর্ষপঞ্জি', icon: '🗓️' },
  { id: 'today', en: "Today's Panjika", bn: 'আজকের পঞ্জিকা', icon: '☀️' },
  { id: 'utsav', en: 'Utsav', bn: 'উৎসব', icon: '🎉' },
  { id: 'muhurat', en: 'Shubh Muhurat', bn: 'শুভ মুহূর্ত', icon: '🔆' },
  { id: 'vrata', en: 'Ekadashi', bn: 'একাদশী', icon: '🌙' },
  { id: 'rashifal', en: 'Rashifal', bn: 'রাশিফল', icon: '🔮' },
];

const CAL_STORAGE = 'sb_panjika_cal';
const CITY_STORAGE = 'sb_panjika_city';
const SCHOOL_STORAGE = 'sb_panjika_school';

/** Sunday-start weekday headers in the user's language (Oct 11 2026 = Sunday). */
const WEEKDAY_LOCALES: Record<string, string> = {
  bn: 'bn-BD', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
  gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', sa: 'sa-IN', en: 'en-IN',
};
const EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function weekdayHeaders(lang: string): string[] {
  const locale = WEEKDAY_LOCALES[lang] || 'en-IN';
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    try {
      out.push(new Date(2026, 9, 11 + i).toLocaleDateString(locale, { weekday: 'short' }));
    } catch {
      out.push(EN_SHORT[i]);
    }
  }
  return out;
}
/** Shukla/Krishna paksha markers in the user's script. */
function pakshaMark(paksha: 'Shukla' | 'Krishna' | undefined, lang: string): string {
  const shukla = paksha === 'Shukla';
  switch (lang) {
    case 'bn': return shukla ? 'শু' : 'কৃ';
    case 'hi': case 'sa': case 'mr': return shukla ? 'शु' : 'कृ';
    case 'ta': return shukla ? 'வ' : 'தே';
    case 'te': return shukla ? 'శు' : 'కృ';
    case 'kn': return shukla ? 'ಶು' : 'ಕೃ';
    case 'ml': return shukla ? 'ശു' : 'കൃ';
    case 'gu': return shukla ? 'શુ' : 'કૃ';
    default: return shukla ? 'S' : 'K';
  }
}

export interface PanjikaCity { id: string; name: string; lat: number; lon: number; tz: number }
export const PANJIKA_CITIES: PanjikaCity[] = [
  { id: 'dhaka', name: 'Dhaka', lat: 23.8103, lon: 90.4125, tz: 6 },
  { id: 'kathmandu', name: 'Kathmandu', lat: 27.7172, lon: 85.3240, tz: 5.75 },
  ...STANDARD_CITIES.map((c) => ({ id: c.id, name: c.name.split(' (')[0], lat: c.lat, lon: c.lon, tz: c.timezoneOffsetHours })),
  { id: 'chennai', name: 'Chennai', lat: 13.0827, lon: 80.2707, tz: 5.5 },
  { id: 'hyderabad', name: 'Hyderabad', lat: 17.3850, lon: 78.4867, tz: 5.5 },
];

export function getPanjikaCity(id: string | null): PanjikaCity {
  return PANJIKA_CITIES.find((c) => c.id === id) || PANJIKA_CITIES[0];
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PanjikaTab: React.FC = () => {
  const { tr, lang } = useLocaleText();
  const { showToast } = useToast();
  const { add } = useSoloStore();
  const [section, setSection] = useState<Section>('calendar');
  const [calId, setCalId] = useState<string>(() => {
    try {
      return localStorage.getItem(CAL_STORAGE) || defaultCalendarId(getCachedRegion() || 'INTL', 'en');
    } catch {
      return 'vikram';
    }
  });
  const cal: RegionalCalendar = getCalendar(calId);
  const [cityId, setCityId] = useState<string>(() => {
    try {
      return localStorage.getItem(CITY_STORAGE) || ((getCachedRegion() || 'INTL') === 'BD' ? 'dhaka' : 'kolkata');
    } catch { return 'kolkata'; }
  });
  const city = getPanjikaCity(cityId);
  const [school, setSchool] = useState<LunarSchool>(() => {
    try { return (localStorage.getItem(SCHOOL_STORAGE) as LunarSchool) || 'purnimanta'; }
    catch { return 'purnimanta'; }
  });

  useEffect(() => {
    try { localStorage.setItem(CAL_STORAGE, calId); } catch { /* noop */ }
  }, [calId]);
  useEffect(() => {
    try { localStorage.setItem(CITY_STORAGE, cityId); } catch { /* noop */ }
  }, [cityId]);
  // Apply the lunar school to lunar calendars
  useEffect(() => {
    if (cal.kind === 'lunar') cal.lunarSchool = school;
    try { localStorage.setItem(SCHOOL_STORAGE, school); } catch { /* noop */ }
  }, [cal, school]);

  const today = useMemo(() => new Date(), []);
  // The regional day begins at SUNRISE, not midnight: before local sunrise
  // the prevailing date is still yesterday's.
  const todayRd: RegionalDate = useMemo(() => {
    let eff = today;
    try {
      const { sunriseDate } = calculateSunriseSunset(today, city.lat, city.lon, city.tz);
      if (today.getTime() < sunriseDate.getTime()) eff = new Date(today.getTime() - 86400000);
    } catch { /* noop */ }
    try { return cal.toRegional(eff); } catch {
      return { year: today.getFullYear(), month: 1, monthEn: '', monthNative: '', day: 1, kind: 'solar', era: '', eraNative: '' };
    }
  }, [cal, city, today]);

  // ---- Calendar view state ----
  const [viewY, setViewY] = useState(todayRd.year);
  const [viewM, setViewM] = useState(todayRd.month);
  const [selIso, setSelIso] = useState<string | null>(null);

  // Reset view when tradition changes
  const pickCal = (id: string) => {
    setCalId(id);
    const c = getCalendar(id);
    try {
      const r = c.toRegional(new Date());
      setViewY(r.year); setViewM(r.month);
    } catch { /* keep */ }
    setSelIso(null);
    setMresults(null);
  };

  const range = useMemo(() => {
    try { return cal.monthRange(viewY, viewM); }
    catch { const t = new Date(); return { start: t, end: t }; }
  }, [cal, viewY, viewM]);

  const cells = useMemo(() => {
    const out: Array<{ rd: RegionalDate; gDate: Date; iso: string } | null> = [];
    const lead = range.start.getDay();
    for (let i = 0; i < lead; i++) out.push(null);
    const total = Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1;
    for (let i = 0; i < total && i < 42; i++) {
      const gDate = new Date(range.start.getTime() + i * 86400000);
      try {
        out.push({ rd: cal.toRegional(gDate), gDate, iso: toISO(gDate) });
      } catch {
        out.push(null);
      }
    }
    return out;
  }, [range, cal]);

  const shiftMonth = (dir: 1 | -1) => {
    let m = viewM + dir, y = viewY;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setViewM(m); setViewY(y); setSelIso(null);
  };

  const goToday = () => {
    try {
      const r = cal.toRegional(new Date());
      setViewY(r.year); setViewM(r.month); setSelIso(null);
    } catch { /* noop */ }
  };

  // ---- Festivals (filtered by tradition) ----
  const tradFestivals = useMemo(
    () => PANJIKA_FESTIVALS.filter((f) => f.regions.includes(calId)),
    [calId]
  );
  const upcoming = useMemo(() => upcomingFestivals(todayISO(), 12, tradFestivals), [tradFestivals]);
  const selFestivals: PanjikaFestival[] = useMemo(
    () => (selIso ? festivalsOn(selIso, tradFestivals) : []),
    [selIso, tradFestivals]
  );
  const festDots = useMemo(() => {
    const map = new Map<string, PanjikaFestival[]>();
    for (const c of cells) {
      if (!c) continue;
      const fs = festivalsOn(c.iso, tradFestivals);
      if (fs.length) map.set(c.iso, fs);
    }
    return map;
  }, [cells, tradFestivals]);

  const festName = (f: PanjikaFestival) =>
    lang === 'bn' ? f.nameBn : lang === 'hi' && f.nameHi ? f.nameHi : f.nameEn;
  const festSig = (f: PanjikaFestival) => (lang === 'bn' ? f.significanceBn : f.significanceEn);

  const addReminder = (title: string, date: string) => {
    add('reminders', {
      id: uid('r'), title, date, kind: 'vrata' as ReminderKind,
      notes: '', createdAt: Date.now(),
    });
    showToast(tr('solo.panjika.remAdded', 'Reminder added', 'রিমাইন্ডার যোগ হয়েছে', 'रिमाइंडर जुड़ा'), 'success');
  };

  // ---- Today's panchang (location-correct solar times + Drik tithi/nakshatra) ----
  const panchang = useMemo(() => {
    try {
      return calculateDailyPanchang(today, city.lat, city.lon, city.tz);
    } catch { return null; }
  }, [today, city]);
  const drik = useMemo(() => {
    try {
      const { sunriseDate, sunsetDate } = calculateSunriseSunset(today, city.lat, city.lon, city.tz);
      const snap = drikSnapshot(sunriseDate, school);
      // Headline nakshatra = majority of the daylight span (matches published panjikas)
      const dayNak = drikDayNakshatra(sunriseDate, sunsetDate);
      return { ...snap, nakshatra: dayNak.name, nakshatraTransitions: dayNak.transitions };
    } catch { return null; }
  }, [today, city, school]);

  // ---- Muhurat finder ----
  const tradition: MuhuratTradition = calId.startsWith('bengali') ? 'bengali' : 'north_indian';
  const [mkind, setMkind] = useState<SamskaraKind>('bibaha');
  const [mresults, setMresults] = useState<MuhuratDay[] | null>(null);
  const [mloading, setMloading] = useState(false);

  const runMuhurat = () => {
    setMloading(true);
    setTimeout(() => {
      try {
        const from = new Date(); from.setDate(from.getDate() + 1);
        const to = new Date(); to.setDate(to.getDate() + 90);
        const variant = calId === 'bengali_bd' ? 'bd' : 'wb';
        setMresults(findShubhMuhurat(mkind, from, to, variant, {
          tradition,
          coords: { lat: city.lat, lon: city.lon },
          monthName: (m) => meshaMonthName(calId, m),
        }));
      } catch {
        setMresults([]);
        showToast(tr('solo.panjika.mErr', 'Could not compute muhurats', 'মুহূর্ত নির্ণয় করা যায়নি', 'मुहूर्त नहीं निकल सका'), 'error');
      } finally {
        setMloading(false);
      }
    }, 30);
  };

  // ---- Ekadashi (location-correct sunrise) ----
  const ekadashis = useMemo(() => {
    try {
      const to = new Date(); to.setDate(to.getDate() + 120);
      return findEkadashis(new Date(), to, { lat: city.lat, lon: city.lon, tz: city.tz });
    } catch { return []; }
  }, [city]);

  // ---- Rashifal ----
  const rashifal = useMemo(() => getRashifal(today), [today]);
  const [selRashi, setSelRashi] = useState<string | null>(null);
  const selRashiEntry = rashifal.find((r) => r.rashi.id === selRashi) || null;

  const bn = lang === 'bn';
  const viewMonthDef = cal.months[viewM - 1];

  return (
    <div className="space-y-4">
      {/* Header: today's regional date */}
      <Card className="bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 !border-0 text-center">
        <div className="text-amber-200/80 text-xs font-bold uppercase tracking-widest mb-1">
          {cal.nameNative} <span className="opacity-60">· {cal.nameEn}</span>
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
          {formatRegionalDate(todayRd, cal, 'native')}
        </div>
        <div className="text-amber-200/90 text-sm mt-1 font-semibold">
          {formatRegionalDate(todayRd, cal, 'en')}
        </div>
        <div className="text-amber-200/60 text-xs mt-1">
          {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {cal.disclaimerEn && (
          <div className="text-amber-200/50 text-[11px] mt-2 max-w-md mx-auto">{cal.disclaimerEn}</div>
        )}
      </Card>

      {/* Tradition selector */}
      <div>
        <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 px-1">
          <T en="My tradition" bn="আমার ঐতিহ্য" hi="मेरी परंपरा" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {REGIONAL_CALENDARS.map((c) => (
            <button
              key={c.id}
              onClick={() => pickCal(c.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px] border transition ${
                calId === c.id
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-stone-700 border-amber-200 hover:border-amber-400'
              }`}
            >
              <span className="block">{c.nameNative}</span>
              <span className={`block text-[10px] font-semibold ${calId === c.id ? 'text-amber-100' : 'text-stone-400'}`}>
                {c.regionEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Location + lunar school */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 min-h-[44px]">
          <span className="text-xs font-bold text-stone-500">📍</span>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="bg-transparent text-sm font-bold text-stone-800 outline-none"
            aria-label="City for timings"
          >
            {PANJIKA_CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        {cal.kind === 'lunar' && (
          <div className="inline-flex rounded-xl bg-white border border-amber-200 p-1 gap-1">
            {(['purnimanta', 'amanta'] as LunarSchool[]).map((sc) => (
              <button
                key={sc}
                onClick={() => setSchool(sc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] ${school === sc ? 'bg-amber-600 text-white' : 'text-stone-600'}`}
              >
                {sc === 'purnimanta' ? 'Purnimanta' : 'Amanta'}
              </button>
            ))}
          </div>
        )}
        <span className="text-[11px] text-stone-400 font-semibold">
          <T en="Timings per selected city" bn="নির্বাচিত শহর অনুযায়ী সময়" hi="चयनित शहर अनुसार समय" />
        </span>
      </div>

      {/* Section nav */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px] border transition ${
              section === s.id
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200 hover:border-amber-400'
            }`}
          >
            {s.icon} {bn ? s.bn : s.en}
          </button>
        ))}
      </div>

      {/* ============ CALENDAR ============ */}
      {section === 'calendar' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => shiftMonth(-1)} className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-xl font-bold" aria-label="Previous month">‹</button>
            <div className="text-center">
              <div className="font-extrabold text-stone-900 text-lg">
                {viewMonthDef?.native} <span className="text-stone-500 text-sm">{viewMonthDef?.en}</span>
              </div>
              <div className="text-xs text-stone-500 font-semibold">
                {cal.toNumerals(viewY)} {todayRd.eraNative}
              </div>
              <button onClick={goToday} className="text-xs text-amber-700 font-bold underline mt-0.5">
                <T en="Today" bn="আজ" hi="आज" />
              </button>
            </div>
            <button onClick={() => shiftMonth(1)} className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-xl font-bold" aria-label="Next month">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-stone-400 mb-1">
            {weekdayHeaders(lang).map((d, di) => <div key={di}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={`e${i}`} />;
              const isToday = c.iso === todayISO();
              const dots = festDots.get(c.iso) || [];
              return (
                <button
                  key={c.iso}
                  onClick={() => setSelIso(c.iso === selIso ? null : c.iso)}
                  className={`min-h-[52px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition ${
                    c.iso === selIso
                      ? 'bg-amber-600 text-white border-amber-600'
                      : isToday
                        ? 'bg-amber-100 border-amber-500'
                        : 'bg-white border-stone-100 hover:border-amber-300'
                  }`}
                >
                  <span className={`text-base font-extrabold leading-none ${c.iso === selIso ? 'text-white' : 'text-stone-800'}`}>
                    {cal.toNumerals(c.rd.day)}
                  </span>
                  <span className={`text-[10px] leading-none ${c.iso === selIso ? 'text-amber-100' : 'text-stone-400'}`}>
                    {c.gDate.getDate()}
                    {cal.kind === 'lunar' && (
                      <span className="ml-0.5">{pakshaMark(c.rd.paksha, lang)}</span>
                    )}
                  </span>
                  {dots.length > 0 && (
                    <span className="flex gap-0.5">
                      {dots.slice(0, 3).map((f, fi) => (
                        <span key={fi} className={`w-1.5 h-1.5 rounded-full ${categoryMeta(f.category).dot}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-stone-500 font-semibold">
            {(['puja', 'festival', 'fasting', 'holiday'] as const).map((c) => (
              <span key={c} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${categoryMeta(c).dot}`} />
                {bn ? categoryMeta(c).bn : categoryMeta(c).en}
              </span>
            ))}
          </div>

          {/* Selected day detail */}
          {selIso && (
            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="font-extrabold text-stone-900">
                {(() => {
                  try {
                    const r = cal.toRegional(new Date(selIso + 'T12:00:00'));
                    return formatRegionalDate(r, cal, bn ? 'native' : 'en');
                  } catch { return selIso; }
                })()}
              </div>
              <div className="text-xs text-stone-500 mb-2">
                {new Date(selIso + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {selFestivals.length === 0 && (
                <div className="text-sm text-stone-500">
                  <T en="No festival this day." bn="এই দিনে কোনো উৎসব নেই।" hi="इस दिन कोई उत्सव नहीं।" />
                </div>
              )}
              {selFestivals.map((f, fi) => (
                <div key={fi} className="py-2 border-t border-amber-100 first:border-t-0">
                  <div className="font-bold text-stone-800">{festName(f)}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{festSig(f)}</div>
                  <button
                    onClick={() => addReminder(festName(f), selIso)}
                    className="mt-1.5 text-xs font-bold text-amber-700 underline min-h-[32px]"
                  >
                    <T en="🔔 Remind me" bn="🔔 মনে করিয়ে দিন" hi="🔔 याद दिलाएं" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ============ TODAY ============ */}
      {section === 'today' && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-extrabold text-stone-900 mb-3">
              ☀️ <T en="Ajker Panjika" bn="আজকের পঞ্জিকা" hi="आज का पञ्चाङ्ग" />
            </h2>
            <div className="text-center py-2 mb-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <div className="text-2xl font-extrabold text-amber-900">
                {formatRegionalDate(todayRd, cal, 'native')}
              </div>
              <div className="text-xs text-stone-500 font-semibold mt-1">
                <T en={`New year: ${cal.newYearNoteEn}`} bn={`নববর্ষ: ${cal.newYearNoteNative}`} hi={`नववर्ष: ${cal.newYearNoteEn}`} />
              </div>
            </div>
            {panchang ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  ['Tithi', 'তিথি', drik ? drik.tithiFullName : panchang.tithi],
                  ['Nakshatra', 'নক্ষত্র', drik ? drik.nakshatra : panchang.nakshatra],
                  ['Lunar month', 'চান্দ্র মাস', drik ? `${drik.lunarMonth} (${school === 'purnimanta' ? (bn ? 'পূর্ণিমান্ত' : 'Purnimanta') : (bn ? 'আমান্ত' : 'Amanta')})` : panchang.lunarMonth],
                  ['Yoga', 'যোগ', drik ? drik.yoga : panchang.yoga],
                  ['Karana', 'করণ', drik ? drik.karana : panchang.karana],
                  ['Vaara', 'বার', panchang.vaara],
                  ['Sunrise', 'সূর্যোদয়', panchang.sunrise],
                  ['Sunset', 'সূর্যাস্ত', panchang.sunset],
                  ['Rahu Kaal', 'রাহুকাল', panchang.rahuKaal],
                  ['Abhijit', 'অভিজিৎ', panchang.abhijitMuhurat],
                  ['Brahma Muhurat', 'ব্রাহ্মমুহূর্ত', panchang.brahmaMuhurat],
                  ['Amrit Kaal', 'অমৃতকাল', panchang.amritKaal],
                ].map(([en, bnx, v]) => (
                  <div key={en} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <dt className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">{bn ? bnx : en}</dt>
                    <dd className="font-bold text-stone-800 mt-0.5">{v}</dd>
                    {en === 'Nakshatra' && drik && drik.nakshatraTransitions && drik.nakshatraTransitions.length > 1 && (
                      <dd className="text-[11px] text-stone-400 font-semibold mt-0.5">
                        {(() => {
                          const trs = drik.nakshatraTransitions;
                          const fmt = (at: Date) => {
                            const s = new Date(at.getTime() + city.tz * 3600000);
                            const hh = s.getUTCHours(); const mm = s.getUTCMinutes();
                            const ap = hh >= 12 ? 'PM' : 'AM';
                            const h12 = hh % 12 === 0 ? 12 : hh % 12;
                            return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
                          };
                          // "Jyeshtha till 7:00 AM → Mula"
                          return `${trs[0].name} till ${fmt(trs[1].at)} → ${trs.slice(1).map((t) => t.name).join(' → ')}`;
                        })()}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            ) : (
              <Empty text="Panjika unavailable." />
            )}
          </Card>
        </div>
      )}

      {/* ============ UTSAV ============ */}
      {section === 'utsav' && (
        <Card>
          <h2 className="text-lg font-extrabold text-stone-900 mb-1">
            🎉 <T en="Upcoming Utsav" bn="আসন্ন উৎসব" hi="आगामी उत्सव" />
          </h2>
          <p className="text-xs text-stone-500 mb-3">
            <T
              en={`Showing festivals for ${cal.nameEn}.`}
              bn={`${cal.nameNative} ঐতিহ্যের উৎসবসমূহ।`}
              hi={`${cal.nameEn} परंपरा के उत्सव।`}
            />
          </p>
          {upcoming.length === 0 && (
            <Empty text={bn ? 'এই ঐতিহ্যের উৎসব তালিকা শীঘ্রই আসছে।' : 'Festival list for this tradition is being curated.'} />
          )}
          <div className="space-y-3">
            {upcoming.map((f, i) => {
              const d = new Date(f.date + 'T12:00:00');
              const days = Math.round((d.getTime() - today.getTime()) / 86400000);
              return (
                <div key={i} className="rounded-2xl border border-amber-100 bg-white p-4 flex gap-3">
                  <div className="shrink-0 w-14 text-center rounded-xl bg-amber-50 border border-amber-100 py-2">
                    <div className="text-xl font-extrabold text-amber-800">{d.getDate()}</div>
                    <div className="text-[10px] font-bold text-stone-500">
                      {d.toLocaleDateString('en-IN', { month: 'short' })}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${categoryMeta(f.category).dot}`} />
                      <span className="font-extrabold text-stone-900">{festName(f)}</span>
                    </div>
                    <div className="text-xs text-amber-700 font-bold mt-0.5">
                      {days === 0 ? (bn ? 'আজ' : 'Today') : days === 1 ? (bn ? 'আগামীকাল' : 'Tomorrow') : (bn ? `${days} দিন পর` : `in ${days} days`)}
                      {' · '}{bn ? categoryMeta(f.category).bn : categoryMeta(f.category).en}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">{festSig(f)}</div>
                    <button
                      onClick={() => addReminder(festName(f), f.date)}
                      className="mt-1.5 text-xs font-bold text-amber-700 underline min-h-[32px]"
                    >
                      <T en="🔔 Remind me" bn="🔔 মনে করিয়ে দিন" hi="🔔 याद दिलाएं" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ============ MUHURAT FINDER ============ */}
      {section === 'muhurat' && (
        <Card>
          <h2 className="text-lg font-extrabold text-stone-900 mb-1">
            🔆 <T en="Shubh Muhurat Finder" bn="শুভ মুহূর্ত নির্ণয়" hi="शुभ मुहूर्त" />
          </h2>
          <p className="text-xs text-stone-500 mb-3">
            <T
              en={`Traditional ${tradition === 'bengali' ? 'Bengali panjika' : 'North Indian'} guidance for the next 90 days.`}
              bn="আগামী ৯০ দিনের ঐতিহ্যগত নির্দেশনা।"
              hi="अगले ९० दिनों का पारंपरिक मार्गदर्शन।"
            />
          </p>
          <Field label={<T en="Samskara" bn="সংস্কার" hi="संस्कार" />}>
            <select value={mkind} onChange={(e) => { setMkind(e.target.value as SamskaraKind); setMresults(null); }} className={inputCls}>
              {SAMSKARA_KINDS.map((k) => (
                <option key={k.id} value={k.id}>{bn ? k.bn : k.en}</option>
              ))}
            </select>
          </Field>
          <Btn onClick={runMuhurat} disabled={mloading} className="w-full mt-3">
            {mloading
              ? tr('solo.panjika.finding', 'Finding…', 'খোঁজা হচ্ছে…', 'खोजा जा रहा…')
              : tr('solo.panjika.find', '🔆 Find Shubh Muhurat', '🔆 শুভ মুহূর্ত খুঁজুন', '🔆 शुभ मुहूर्त खोजें')}
          </Btn>

          {mresults && (
            <div className="mt-4 space-y-2">
              {mresults.length === 0 && (
                <Empty text={bn ? 'এই সময়ে উপযুক্ত মুহূর্ত পাওয়া যায়নি।' : 'No suitable muhurat in this window.'} />
              )}
              {mresults.slice(0, 15).map((m) => (
                <div key={m.iso} className={`rounded-2xl border p-3 ${m.grade === 'uttam' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-100 bg-white'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-stone-900">
                      {new Date(m.iso + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <span className={`text-[11px] font-black px-2 py-1 rounded-full ${m.grade === 'uttam' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                      {m.grade === 'uttam' ? (bn ? 'উত্তম' : 'UTTAM') : (bn ? 'মধ্যম' : 'MADHYAM')}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {m.tithi} · {m.nakshatra} · {(() => {
                      // Use the finder's Drik-at-sunrise tithi for lunar calendars —
                      // re-deriving from m.date (a different moment) caused
                      // self-contradictory rows like "Saptami … Shashthi".
                      try {
                        const rd = cal.toRegional(m.date);
                        if (rd.kind === 'lunar') {
                          const yr = bn ? cal.toNumerals(rd.year) : String(rd.year);
                          const era = bn ? rd.eraNative : rd.era;
                          return `${m.tithi} ${yr} ${era}`;
                        }
                        return formatRegionalDate(rd, cal, bn ? 'native' : 'en');
                      } catch { return ''; }
                    })()}
                  </div>
                  <ul className="text-xs text-stone-600 mt-1.5 space-y-0.5">
                    {m.reasons.slice(0, 3).map((r, ri) => (
                      <li key={ri}>✓ {bn ? r.bn : r.en}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => addReminder(`${bn ? 'শুভ মুহূর্ত' : 'Shubh muhurat'} — ${SAMSKARA_KINDS.find((k) => k.id === mkind)?.en}`, m.iso)}
                    className="mt-1.5 text-xs font-bold text-amber-700 underline min-h-[32px]"
                  >
                    <T en="🔔 Remind me" bn="🔔 মনে করিয়ে দিন" hi="🔔 याद दिलाएं" />
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-stone-400 italic pt-1">
                {(() => {
                  const d = MUHURAT_DISCLAIMER_BY_TRADITION[tradition];
                  return bn ? d.bn : d.en;
                })()}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ============ EKADASHI ============ */}
      {section === 'vrata' && (
        <Card>
          <h2 className="text-lg font-extrabold text-stone-900 mb-1">
            🌙 <T en="Ekadashi Schedule" bn="একাদশীর নির্ঘণ্ট" hi="एकादशी सूची" />
          </h2>
          <p className="text-xs text-stone-500 mb-3">
            <T en="Smarta and Vaishnava (Goswami/Nimbark) observances." bn="স্মার্ত ও বৈষ্ণব (গোস্বামী/নিম্বার্ক) পালন।" hi="स्मार्त व वैष्णव पालन।" />
          </p>
          {ekadashis.length === 0 && <Empty text="Schedule unavailable." />}
          <div className="space-y-2">
            {ekadashis.slice(0, 10).map((e, i) => (
              <div key={i} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
                <div className="font-extrabold text-stone-900">{bn ? e.nameBn : e.name}</div>
                <div className="text-xs text-stone-600 mt-1">
                  <T en="Smarta" bn="স্মার্ত" hi="स्मार्त" />: <b>{new Date(e.smartaIso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b>
                  {e.differ && (
                    <span> · <T en="Vaishnava" bn="বৈষ্ণব" hi="वैष्णव" />: <b>{new Date(e.vaishnavaIso + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b></span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  <T en="Parana" bn="পারণা" hi="पारणा" />: {bn ? e.paranaBn : e.parana}
                </div>
                <button
                  onClick={() => addReminder(`${bn ? e.nameBn : e.name}`, e.smartaIso)}
                  className="mt-1 text-xs font-bold text-sky-700 underline min-h-[32px]"
                >
                  <T en="🔔 Remind me" bn="🔔 মনে করিয়ে দিন" hi="🔔 याद दिलाएं" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-stone-400 italic pt-2">
            {bn ? VRATA_DISCLAIMER.bn : VRATA_DISCLAIMER.en}
          </p>
        </Card>
      )}

      {/* ============ RASHIFAL ============ */}
      {section === 'rashifal' && (
        <div className="space-y-3">
          <div className="text-center">
            <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5">
              🔮 {bn ? RASHIFAL_LABEL.bn : RASHIFAL_LABEL.en}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {rashifal.map((r) => (
              <button
                key={r.rashi.id}
                onClick={() => setSelRashi(r.rashi.id)}
                className={`rounded-2xl border p-3 text-center min-h-[76px] transition ${
                  selRashi === r.rashi.id ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-amber-100 hover:border-amber-400'
                }`}
              >
                <div className="text-xl font-extrabold">{rashiName(r.rashi, lang)}</div>
                <div className={`text-[10px] font-semibold ${selRashi === r.rashi.id ? 'text-amber-100' : 'text-stone-400'}`}>
                  {r.rashi.dates}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-stone-400 italic text-center">
            {bn ? RASHIFAL_DISCLAIMER.bn : RASHIFAL_DISCLAIMER.en}
          </p>
        </div>
      )}

      {/* Rashifal detail modal */}
      {selRashiEntry && (
        <Modal title={rashiName(selRashiEntry.rashi, lang)} onClose={() => setSelRashi(null)}>
          <div className="text-sm text-stone-500 font-semibold mb-2">
            {selRashiEntry.rashi.dates} · {selRashiEntry.rashi.lord} · {selRashiEntry.rashi.element}
          </div>
          <p className="text-stone-800 leading-relaxed">
            {bn ? selRashiEntry.guidance.bn : selRashiEntry.guidance.en}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <div className="text-[11px] font-bold text-stone-400 uppercase"><T en="Focus" bn="বিষয়" hi="विषय" /></div>
              <div className="font-extrabold text-amber-900">{bn ? selRashiEntry.focus.bn : selRashiEntry.focus.en}</div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <div className="text-[11px] font-bold text-stone-400 uppercase"><T en="Shubh" bn="শুভ" hi="शुभ" /></div>
              <div className="font-extrabold text-amber-900">
                {bn ? selRashiEntry.shubhColor.bn : selRashiEntry.shubhColor.en} · {selRashiEntry.shubhNumber}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
