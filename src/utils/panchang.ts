import {
  drikTithiAt,
  drikDayNakshatra,
  drikYogaAt,
  drikKaranaAt,
  drikLunarMonth,
} from '../lib/drikPanchang';

export interface PanchangData {
  gregorianDate: string;
  sunrise: string;
  sunset: string;
  dayLength: string;
  tithi: string;
  tithiNumber: number;
  paksha: 'Shukla' | 'Krishna';
  tithiDescription: string;
  nakshatra: string;
  nakshatraLord: string;
  yoga: string;
  karana: string;
  vaara: string;
  vaaraLord: string;
  rahuKaal: string;
  yamagandam: string;
  gulikaKaal: string;
  abhijitMuhurat: string;
  brahmaMuhurat: string;
  amritKaal: string;
  vikramSamvat: number;
  sakaSamvat: number;
  lunarMonth: string;
  moonPhasePercent: number;
  planetaryHours: PlanetaryHourSegment[];
}

export interface PlanetaryHourSegment {
  index: number;
  name: string;
  type: 'Rahu' | 'Gulika' | 'Yamaganda' | 'Abhijit' | 'Normal';
  isAuspicious: boolean;
  isInauspicious: boolean;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description: string;
}

export interface StandardCity {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  timezoneOffsetHours: number;
}

export const STANDARD_CITIES: StandardCity[] = [
  { id: 'varanasi', name: 'Varanasi (Kashi)', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739, timezoneOffsetHours: 5.5 },
  { id: 'ujjain', name: 'Ujjain (Mahakal)', state: 'Madhya Pradesh', lat: 23.1765, lon: 75.7885, timezoneOffsetHours: 5.5 },
  { id: 'ayodhya', name: 'Ayodhya (Ram Janmabhoomi)', state: 'Uttar Pradesh', lat: 26.7922, lon: 82.1998, timezoneOffsetHours: 5.5 },
  { id: 'mathura', name: 'Mathura - Vrindavan', state: 'Uttar Pradesh', lat: 27.4924, lon: 77.6737, timezoneOffsetHours: 5.5 },
  { id: 'haridwar', name: 'Haridwar (Ganga Dweep)', state: 'Uttarakhand', lat: 29.9457, lon: 78.1642, timezoneOffsetHours: 5.5 },
  { id: 'puri', name: 'Puri (Jagannath Dham)', state: 'Odisha', lat: 19.8135, lon: 85.8312, timezoneOffsetHours: 5.5 },
  { id: 'tirupati', name: 'Tirupati (Balaji)', state: 'Andhra Pradesh', lat: 13.6288, lon: 79.4192, timezoneOffsetHours: 5.5 },
  { id: 'rameswaram', name: 'Rameswaram', state: 'Tamil Nadu', lat: 9.2876, lon: 79.3129, timezoneOffsetHours: 5.5 },
  { id: 'somnath', name: 'Somnath (Prabhas Patan)', state: 'Gujarat', lat: 20.8880, lon: 70.4012, timezoneOffsetHours: 5.5 },
  { id: 'kedarnath', name: 'Kedarnath', state: 'Uttarakhand', lat: 30.7352, lon: 79.0669, timezoneOffsetHours: 5.5 },
  { id: 'delhi', name: 'New Delhi (Indraprastha)', state: 'Delhi NCR', lat: 28.6139, lon: 77.2090, timezoneOffsetHours: 5.5 },
  { id: 'mumbai', name: 'Mumbai (Mumbadevi)', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, timezoneOffsetHours: 5.5 },
  { id: 'kolkata', name: 'Kolkata (Kalighat)', state: 'West Bengal', lat: 22.5726, lon: 88.3639, timezoneOffsetHours: 5.5 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946, timezoneOffsetHours: 5.5 },
];

/**
 * Astronomical Solar Calculation Engine (NOAA Solar Formula Approximation)
 * Computes exact Local Sunrise and Sunset given latitude, longitude, and date.
 */
export const calculateSunriseSunset = (
  date: Date,
  lat: number,
  lon: number,
  tzOffsetHours: number = 5.5
): { sunriseDate: Date; sunsetDate: Date; sunriseStr: string; sunsetStr: string; dayLengthMinutes: number } => {
  const startOfYear = new Date(Date.UTC(date.getFullYear(), 0, 1));
  const currentDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfYear = Math.floor((currentDate.getTime() - startOfYear.getTime()) / 86400000) + 1;

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + ((12 - tzOffsetHours) / 24));

  // Equation of time in minutes
  const eqtime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );

  // Solar declination angle in radians
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (lat * Math.PI) / 180;
  const zenith = (90.833 * Math.PI) / 180; // Official solar disc zenith including refraction

  let cosH = (Math.cos(zenith) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));

  // Clamp for polar regions
  cosH = Math.max(-1, Math.min(1, cosH));
  const hourAngle = Math.acos(cosH) * (180 / Math.PI); // degrees

  // Solar noon in minutes from midnight UTC
  const solarNoonUtc = 720 - 4 * lon - eqtime;
  const sunriseUtc = solarNoonUtc - hourAngle * 4;
  const sunsetUtc = solarNoonUtc + hourAngle * 4;

  const sunriseLocalMin = (sunriseUtc + tzOffsetHours * 60 + 1440) % 1440;
  const sunsetLocalMin = (sunsetUtc + tzOffsetHours * 60 + 1440) % 1440;

  // P0 accuracy: build TRUE UTC instants. `localMin` is minutes after local
  // midnight in the target city; the instant is midnight-UTC of the civil
  // date plus (localMin - tzOffset). NEVER use setHours() (browser tz).
  const dayStartUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const sunriseDate = new Date(dayStartUtc + (sunriseLocalMin - tzOffsetHours * 60) * 60000);
  const sunsetDate = new Date(dayStartUtc + (sunsetLocalMin - tzOffsetHours * 60) * 60000);

  const dayLengthMinutes = Math.round(sunsetLocalMin - sunriseLocalMin);

  return {
    sunriseDate,
    sunsetDate,
    sunriseStr: formatTimeInTz(sunriseDate, tzOffsetHours),
    sunsetStr: formatTimeInTz(sunsetDate, tzOffsetHours),
    dayLengthMinutes: dayLengthMinutes > 0 ? dayLengthMinutes : dayLengthMinutes + 1440,
  };
};

/**
 * Format a true UTC instant as wall-clock time in the target timezone.
 * (toLocaleTimeString uses the *browser* tz — wrong for any other city.)
 */
export const formatTimeInTz = (d: Date, tzOffsetHours: number): string => {
  const shifted = new Date(d.getTime() + tzOffsetHours * 3600000);
  const hh = shifted.getUTCHours();
  const mm = shifted.getUTCMinutes();
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
};

export const formatTime12h = (d: Date): string => {
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const TITHIS_DATA = [
  { name: 'Pratipada', deity: 'Agni', nature: 'Vriddhi & Auspicious starts' },
  { name: 'Dwitiya', deity: 'Brahma', nature: 'Government & foundation laying' },
  { name: 'Tritiya', deity: 'Gauri', nature: 'Festivities & wedding affairs' },
  { name: 'Chaturthi', deity: 'Ganesha', nature: 'Obstacle removal & sadhana' },
  { name: 'Panchami', deity: 'Naga Devatas', nature: 'Healing, medicine & learning' },
  { name: 'Shashthi', deity: 'Kartikeya', nature: 'Victory, courage & challenges' },
  { name: 'Saptami', deity: 'Surya', nature: 'Radiance, travel & worship' },
  { name: 'Ashtami', deity: 'Rudra / Durga', nature: 'Protection, fasts & Shakti puja' },
  { name: 'Navami', deity: 'Durga / Rama', nature: 'Courage & triumph over vice' },
  { name: 'Dashami', deity: 'Yama / Dharmaraja', nature: 'Righteous conduct & expansion' },
  { name: 'Ekadashi', deity: 'Vishnu', nature: 'Supreme Harivasara fasting & japa' },
  { name: 'Dwadashi', deity: 'Vishnu', nature: 'Charity, feasts & temple seva' },
  { name: 'Trayodashi', deity: 'Kamadeva / Shiva', nature: 'Pradosham, union & friendship' },
  { name: 'Chaturdashi', deity: 'Shiva', nature: 'Maha Rudrabhishekam & contemplation' },
  { name: 'Purnima / Amavasya', deity: 'Chandra / Pitrus', nature: 'Full illumination or ancestral tarpana' },
];

const NAKSHATRAS_DATA = [
  { name: 'Ashwini', lord: 'Ketu', symbol: 'Horse Head', deity: 'Ashwini Kumaras' },
  { name: 'Bharani', lord: 'Venus', symbol: 'Yoni', deity: 'Yama' },
  { name: 'Krittika', lord: 'Sun', symbol: 'Flame / Razor', deity: 'Agni' },
  { name: 'Rohini', lord: 'Moon', symbol: 'Chariot / Temple', deity: 'Prajapati Brahma' },
  { name: 'Mrigashirsha', lord: 'Mars', symbol: 'Deer Head', deity: 'Soma (Moon)' },
  { name: 'Ardra', lord: 'Rahu', symbol: 'Teardrop', deity: 'Rudra' },
  { name: 'Punarvasu', lord: 'Jupiter', symbol: 'Bow & Quiver', deity: 'Aditi' },
  { name: 'Pushya', lord: 'Saturn', symbol: 'Cow Udder / Lotus', deity: 'Brihaspati' },
  { name: 'Ashlesha', lord: 'Mercury', symbol: 'Coiled Serpent', deity: 'Nagas' },
  { name: 'Magha', lord: 'Ketu', symbol: 'Royal Throne', deity: 'Pitrus' },
  { name: 'Purva Phalguni', lord: 'Venus', symbol: 'Front Legs of Bed', deity: 'Bhaga' },
  { name: 'Uttara Phalguni', lord: 'Sun', symbol: 'Back Legs of Bed', deity: 'Aryaman' },
  { name: 'Hasta', lord: 'Moon', symbol: 'Open Palm', deity: 'Savitr' },
  { name: 'Chitra', lord: 'Mars', symbol: 'Bright Jewel', deity: 'Vishwakarma' },
  { name: 'Swati', lord: 'Rahu', symbol: 'Coral / Young Shoot', deity: 'Vayu' },
  { name: 'Vishakha', lord: 'Jupiter', symbol: 'Triumphal Arch', deity: 'Indragni' },
  { name: 'Anuradha', lord: 'Saturn', symbol: 'Lotus Staff', deity: 'Mitra' },
  { name: 'Jyeshtha', lord: 'Mercury', symbol: 'Circular Amulet', deity: 'Indra' },
  { name: 'Mula', lord: 'Ketu', symbol: 'Root Bunch', deity: 'Nirriti' },
  { name: 'Purva Ashadha', lord: 'Venus', symbol: 'Elephant Tusk', deity: 'Apas (Water)' },
  { name: 'Uttara Ashadha', lord: 'Sun', symbol: 'Small Cot', deity: 'Vishwadevas' },
  { name: 'Shravana', lord: 'Moon', symbol: 'Three Footprints', deity: 'Vishnu' },
  { name: 'Dhanishta', lord: 'Mars', symbol: 'Mridangam Drum', deity: 'Ashta Vasus' },
  { name: 'Shatabhisha', lord: 'Rahu', symbol: '100 Healers / Empty Circle', deity: 'Varuna' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter', symbol: 'Two-faced Man', deity: 'Aja Ekapada' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn', symbol: 'Twin in Deep Waters', deity: 'Ahirbudhnya' },
  { name: 'Revati', lord: 'Mercury', symbol: 'Fish Swimming in Sea', deity: 'Pushan' },
];

const VAARA_NAMES = [
  { name: 'Ravivaara', eng: 'Sunday', planet: 'Surya (Sun)' },
  { name: 'Somavaara', eng: 'Monday', planet: 'Chandra (Moon)' },
  { name: 'Mangalavaara', eng: 'Tuesday', planet: 'Mangala (Mars)' },
  { name: 'Budhavaara', eng: 'Wednesday', planet: 'Budha (Mercury)' },
  { name: 'Guruvaara', eng: 'Thursday', planet: 'Brihaspati (Jupiter)' },
  { name: 'Shukravaara', eng: 'Friday', planet: 'Shukra (Venus)' },
  { name: 'Shanivaara', eng: 'Saturday', planet: 'Shani (Saturn)' },
];

/**
 * 8-Part Daylight Partition Rules (Vedic Sastra Standard)
 * Weekday: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
 *
 * Rahu Kaal Part (1-indexed 1..8):
 * Mon = 2, Sat = 3, Fri = 4, Wed = 5, Thu = 6, Tue = 7, Sun = 8
 */
const RAHU_PART_BY_WEEKDAY: Record<number, number> = {
  1: 2, // Monday: 2nd segment
  6: 3, // Saturday: 3rd segment
  5: 4, // Friday: 4th segment
  3: 5, // Wednesday: 5th segment
  4: 6, // Thursday: 6th segment
  2: 7, // Tuesday: 7th segment
  0: 8, // Sunday: 8th segment
};

/**
 * Yamagandam Part (1-indexed 1..8):
 * Thu = 1, Wed = 2, Tue = 3, Mon = 4, Sun = 5, Sat = 6, Fri = 7
 */
const YAMAGANDA_PART_BY_WEEKDAY: Record<number, number> = {
  4: 1, // Thursday: 1st segment
  3: 2, // Wednesday: 2nd segment
  2: 3, // Tuesday: 3rd segment
  1: 4, // Monday: 4th segment
  0: 5, // Sunday: 5th segment
  6: 6, // Saturday: 6th segment
  5: 7, // Friday: 7th segment
};

/**
 * Gulika Kaal Part (1-indexed 1..8, ruled by Saturn):
 * Sat = 1, Fri = 2, Thu = 3, Wed = 4, Tue = 5, Mon = 6, Sun = 7
 */
const GULIKA_PART_BY_WEEKDAY: Record<number, number> = {
  6: 1, // Saturday: 1st segment
  5: 2, // Friday: 2nd segment
  4: 3, // Thursday: 3rd segment
  3: 4, // Wednesday: 4th segment
  2: 5, // Tuesday: 5th segment
  1: 6, // Monday: 6th segment
  0: 7, // Sunday: 7th segment
};

/**
 * Main algorithmic entry point: calculates daily Panchang for given date, latitude, and longitude.
 */
export const calculateDailyPanchang = (
  date: Date = new Date(),
  lat: number = 25.3176, // Default: Varanasi
  lon: number = 82.9739,
  tzOffsetHours: number = 5.5
): PanchangData => {
  const dayOfWeek = date.getDay(); // 0..6

  // 1. Calculate precise Sunrise and Sunset for coordinates
  const { sunriseDate, sunsetDate, sunriseStr, sunsetStr, dayLengthMinutes } = calculateSunriseSunset(
    date,
    lat,
    lon,
    tzOffsetHours
  );

  const sunriseMs = sunriseDate.getTime();
  const sunsetMs = sunsetDate.getTime();
  const totalDaylightMs = Math.max(1, sunsetMs - sunriseMs);
  const segmentDurationMs = totalDaylightMs / 8;
  const segmentDurationMinutes = Math.round(segmentDurationMs / 60000);

  // Helper to format a time window given startMs and endMs (target-city wall clock)
  const formatWindow = (startMs: number, endMs: number): string => {
    return `${formatTimeInTz(new Date(startMs), tzOffsetHours)} - ${formatTimeInTz(new Date(endMs), tzOffsetHours)}`;
  };

  // 2. Exact Rahu Kaal window
  const rahuPart = RAHU_PART_BY_WEEKDAY[dayOfWeek] || 8;
  const rahuStartMs = sunriseMs + (rahuPart - 1) * segmentDurationMs;
  const rahuEndMs = sunriseMs + rahuPart * segmentDurationMs;
  const rahuKaalStr = formatWindow(rahuStartMs, rahuEndMs);

  // 3. Exact Yamagandam window
  const yamaPart = YAMAGANDA_PART_BY_WEEKDAY[dayOfWeek] || 5;
  const yamaStartMs = sunriseMs + (yamaPart - 1) * segmentDurationMs;
  const yamaEndMs = sunriseMs + yamaPart * segmentDurationMs;
  const yamagandamStr = formatWindow(yamaStartMs, yamaEndMs);

  // 4. Exact Gulika Kaal window
  const gulikaPart = GULIKA_PART_BY_WEEKDAY[dayOfWeek] || 7;
  const gulikaStartMs = sunriseMs + (gulikaPart - 1) * segmentDurationMs;
  const gulikaEndMs = sunriseMs + gulikaPart * segmentDurationMs;
  const gulikaKaalStr = formatWindow(gulikaStartMs, gulikaEndMs);

  // 5. Abhijit Muhurat: Centered around exact solar noon (Daylight / 15 * 8th part = 24 mins before and after noon)
  const solarNoonMs = sunriseMs + totalDaylightMs / 2;
  const abhijitHalfDurationMs = (totalDaylightMs / 15) / 2;
  const abhijitStartMs = solarNoonMs - abhijitHalfDurationMs;
  const abhijitEndMs = solarNoonMs + abhijitHalfDurationMs;
  const abhijitMuhuratStr = formatWindow(abhijitStartMs, abhijitEndMs);

  // 6. Brahma Muhurat: 2 Muhurtas (96 mins) before sunrise to 1 Muhurta (48 mins) before sunrise
  const brahmaStartMs = sunriseMs - 96 * 60000;
  const brahmaEndMs = sunriseMs - 48 * 60000;
  const brahmaMuhuratStr = formatWindow(brahmaStartMs, brahmaEndMs);

  // 7. Amrit Kaal
  const amritOffsetMs = (totalDaylightMs * 0.65);
  const amritKaalStr = formatWindow(sunriseMs + amritOffsetMs, sunriseMs + amritOffsetMs + 90 * 60000);

  // 8. 8 Planetary Segments of the Day (Pahr/Kaal timeline)
  const planetaryHours: PlanetaryHourSegment[] = [];
  for (let i = 1; i <= 8; i++) {
    const startMs = sunriseMs + (i - 1) * segmentDurationMs;
    const endMs = sunriseMs + i * segmentDurationMs;
    const isRahu = i === rahuPart;
    const isGulika = i === gulikaPart;
    const isYama = i === yamaPart;

    let type: 'Rahu' | 'Gulika' | 'Yamaganda' | 'Abhijit' | 'Normal' = 'Normal';
    let name = `Pahar ${i} (Segment ${i}/8)`;
    let desc = 'Neutral / General Activities';
    let isAuspicious = false;
    let isInauspicious = false;

    if (isRahu) {
      type = 'Rahu';
      name = 'Rahu Kaal';
      desc = 'Highly inauspicious. Avoid new undertakings, transactions, or journey beginnings.';
      isInauspicious = true;
    } else if (isGulika) {
      type = 'Gulika';
      name = 'Gulika Kaal';
      desc = 'Period ruled by Gulika (Son of Saturn). Avoid travel or debt repayment.';
      isInauspicious = true;
    } else if (isYama) {
      type = 'Yamaganda';
      name = 'Yamagandam';
      desc = 'Yama hour. Avoid signing contracts or starting auspicious ventures.';
      isInauspicious = true;
    } else {
      isAuspicious = true;
      name = `Shubh Pahar ${i}`;
      desc = 'Favorable for temple rituals, puja, study, and daily activities.';
    }

    planetaryHours.push({
      index: i,
      name,
      type,
      isAuspicious,
      isInauspicious,
      startTime: formatTimeInTz(new Date(startMs), tzOffsetHours),
      endTime: formatTimeInTz(new Date(endMs), tzOffsetHours),
      durationMinutes: segmentDurationMinutes,
      description: desc,
    });
  }

  // 9. Tithi, Nakshatra, Yoga, Karana, lunar month — DRIK SIDDHANTA ONLY.
  // The legacy single-epoch mean-motion approximation drifted ~2 tithis
  // (P0: a Panjika showing wrong dates is worse than no Panjika).
  // Solar fields above (sunrise/sunset/rahu kaal/…) use the NOAA solar model
  // and are correct; only the lunar fields needed the Drik engine.
  //
  // CANONICAL DAY ANCHOR (QUEUED #52, audit D12): the day's lunar fields
  // are those prevailing at LOCAL SUNRISE of the requested civil day —
  // the classical panjika convention, and the same anchor PanjikaTab
  // uses (drikSnapshot(sunrise) + drikDayNakshatra(sunrise, sunset)).
  // Before this, the fields were evaluated at the raw `date` instant
  // each caller happened to pass: the booking desk passed local noon,
  // the dashboards passed the current moment — so on a day when a tithi
  // or nakshatra changed mid-day, two surfaces showed two different
  // values for the same day (2026-10-20: noon said Shukla Navami /
  // Shravana, the evening said Shukla Dashami / Dhanishta). Now the
  // instant inside `date` is irrelevant: same day + same place ⇒ same
  // tithi / nakshatra / yoga / karana / month, on every surface.
  const drikT = drikTithiAt(sunriseDate);
  const tithiNumberInPaksha = drikT.tithiNumber;
  const tithiMeta = TITHIS_DATA[tithiNumberInPaksha - 1];
  const paksha: 'Shukla' | 'Krishna' = drikT.paksha;
  const tithiFullName = `${paksha} ${drikT.name}`;

  // Headline nakshatra: the one prevailing for the majority of the
  // daylight span (matches published panjikas — see drikDayNakshatra).
  const drikN = drikDayNakshatra(sunriseDate, sunsetDate);
  const nakshatraMeta = NAKSHATRAS_DATA[drikN.index];

  const drikLM = drikLunarMonth(sunriseDate, 'purnimanta');

  const yogaName = drikYogaAt(sunriseDate).name;
  const karanaName = drikKaranaAt(sunriseDate).name;

  const vaaraInfo = VAARA_NAMES[dayOfWeek];

  const hours = Math.floor(dayLengthMinutes / 60);
  const mins = dayLengthMinutes % 60;
  const dayLengthStr = `${hours} hrs ${mins} mins`;

  // Vikram Samvat: Chaitra Shukla Pratipada = new year.
  const gy = date.getFullYear();
  const vikramYear = drikLM.index >= 1 ? gy + 57 : paksha === 'Shukla' ? gy + 57 : gy + 56;

  return {
    gregorianDate: date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    sunrise: sunriseStr,
    sunset: sunsetStr,
    dayLength: dayLengthStr,
    tithi: tithiFullName,
    tithiNumber: tithiNumberInPaksha,
    paksha,
    tithiDescription: `${tithiMeta.deity} Aradhana • ${tithiMeta.nature}`,
    nakshatra: nakshatraMeta.name,
    nakshatraLord: `${nakshatraMeta.lord} (${nakshatraMeta.deity})`,
    yoga: yogaName,
    karana: karanaName,
    vaara: vaaraInfo.name,
    vaaraLord: `${vaaraInfo.eng} • ${vaaraInfo.planet}`,
    rahuKaal: rahuKaalStr,
    yamagandam: yamagandamStr,
    gulikaKaal: gulikaKaalStr,
    abhijitMuhurat: abhijitMuhuratStr,
    brahmaMuhurat: brahmaMuhuratStr,
    amritKaal: amritKaalStr,
    vikramSamvat: vikramYear,
    sakaSamvat: gy - 78,
    lunarMonth: drikLM.name,
    moonPhasePercent: Math.round(((drikT.index % 30) / 30) * 100),
    planetaryHours,
  };
};

/**
 * Backward compatibility alias for legacy callers.
 * H-4: the old hardcoded moonrise ('08:14 PM'/'03:45 AM') was fake precision —
 * removed. Callers needing moonrise must compute it from coordinates.
 */
export const calculatePanchang = (date: Date = new Date()) => {
  const p = calculateDailyPanchang(date, 25.3176, 82.9739);
  return {
    ...p,
    monthLunar: p.lunarMonth,
    bengaliSan: date.getFullYear() - 593,
    rahuKalam: p.rahuKaal,
    yamaganda: p.yamagandam,
    gulikaKalam: p.gulikaKaal,
    auspiciousEvents: [
      `${p.tithi} Vrata & Temple Harivasara`,
      'Gau Seva & Chanda Donation Auspicious Timing',
    ],
  };
};

/**
 * Canonical "today" line — the SINGLE source of truth for rendering today's
 * tithi across the landing page, dashboard, header pill, and B2C views.
 *
 * NOTE: `tithi` already embeds the paksha (e.g. "Shukla Dwitiya"), so callers
 * must NOT append `paksha` again (that produced the old "Shukla Dwitiya,
 * Shukla Paksha" redundancy). No component may hardcode its own tithi string.
 */
export const getPanchangTodayLine = (
  p: Pick<PanchangData, 'tithi' | 'lunarMonth' | 'vikramSamvat'>
): string => `${p.tithi} • ${p.lunarMonth} • Vikram Samvat ${p.vikramSamvat}`;

/**
 * The canonical today line for a civil day + place, computed end-to-end
 * by the single-source engine above (QUEUED #52, audit D12). Surfaces
 * that used to call the instant-based `drikTodayLine(new Date(), …)`
 * directly (solo home, the today digest) rendered the tithi prevailing
 * at the current MOMENT, so they disagreed with every sunrise-anchored
 * surface after a mid-day tithi change. They call this instead — the
 * values can never diverge from the header/dashboard line again.
 * Defaults are the app's canonical place (Varanasi, IST), matching
 * `calculatePanchang`.
 */
export const panchangTodayLine = (
  date: Date = new Date(),
  lat: number = 25.3176,
  lon: number = 82.9739,
  tzOffsetHours: number = 5.5
): string => getPanchangTodayLine(calculateDailyPanchang(date, lat, lon, tzOffsetHours));
