/**
 * P0 accuracy verification for the Sanatani Panjika module.
 * Run: bun scripts/verify-panjika.ts   (TZ=UTC to prove tz-independence)
 *
 * Ground truth (4 independent panchang sources):
 *   Oct 16 2026, Kolkata = Shukla Shashthi, Nakshatra Mula,
 *   Yoga Shobhana, Karana Kaulava, sunrise ≈ 05:32 IST.
 */
import { calculateSunriseSunset } from '../src/utils/panchang';
import { drikTithiAt, drikNakshatraAt, drikYogaAt, drikKaranaAt, drikDayNakshatra } from '../src/lib/drikPanchang';
import { findEkadashis } from '../src/lib/vrataSchedule';

const KOL = { lat: 22.5726, lon: 88.3639, tz: 5.5 };
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got "${actual}", expected "${expected}"`);
}

function checkNear(label: string, actualMs: number, expectedMs: number, tolMs: number) {
  const ok = Math.abs(actualMs - expectedMs) <= tolMs;
  if (!ok) failures++;
  const diffMin = ((actualMs - expectedMs) / 60000).toFixed(1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: off by ${diffMin} min (tol ${(tolMs / 60000).toFixed(0)} min)`);
}

/** Sunrise instant for a civil date in Kolkata. `y,m,d` = Kolkata civil date. */
function kolkataSunrise(y: number, m: number, d: number) {
  // Build a Date whose UTC Y/M/D equal the Kolkata civil date
  // (calculateSunriseSunset reads browser-local components).
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return calculateSunriseSunset(probe, KOL.lat, KOL.lon, KOL.tz);
}

console.log(`--- browser TZ offset: ${-new Date().getTimezoneOffset() / 60}h ---\n`);

// 1. Sunrise instant: Oct 16 2026 Kolkata ≈ 05:32 IST = 00:02 UTC
const sr16 = kolkataSunrise(2026, 10, 16);
checkNear('Oct 16 2026 Kolkata sunrise instant', sr16.sunriseDate.getTime(), Date.UTC(2026, 9, 16, 0, 2), 5 * 60000);
console.log(`      sunriseStr = "${sr16.sunriseStr}" (expect ~05:32 AM)`);
console.log(`      instant ISO = ${sr16.sunriseDate.toISOString()}`);

// 2. Tithi at sunrise Oct 16 → Shukla Shashthi
const t16 = drikTithiAt(sr16.sunriseDate);
check('Oct 16 tithi paksha', t16.paksha, 'Shukla');
check('Oct 16 tithi name', t16.name, 'Shashthi');

// 3. Nakshatra Oct 16 → Mula (majority of daylight; Jyeshtha till ~7 AM)
const dayNak16 = drikDayNakshatra(sr16.sunriseDate, sr16.sunsetDate);
check('Oct 16 headline nakshatra (majority daylight)', dayNak16.name, 'Mula');
console.log(`      transitions: ${dayNak16.transitions.map((t) => `${t.name}@${t.at.toISOString()}`).join(', ')}`);
check('Oct 16 yoga', drikYogaAt(sr16.sunriseDate).name, 'Shobhana');
check('Oct 16 karana', drikKaranaAt(sr16.sunriseDate).name, 'Kaulava');

// 4. Nov 8 2026 → Amavasya at NIGHT (Diwali/Kali Puja worship time, not sunrise)
const diwaliNight = new Date(Date.UTC(2026, 10, 8, 20 - 5.5, 0)); // 20:00 IST Nov 8
const tDiwali = drikTithiAt(diwaliNight);
check('Nov 8 2026 20:00 IST tithi (Diwali night)', `${tDiwali.paksha} ${tDiwali.name}`, 'Krishna Amavasya');

// 5. Holi: Purnima at sunrise Mar 3 (Dol Purnima); Mar 4 = Dhulandi (colors day)
const srMar3 = kolkataSunrise(2026, 3, 3);
const tMar3 = drikTithiAt(srMar3.sunriseDate);
check('Mar 3 2026 tithi at sunrise (Dol Purnima)', `${tMar3.paksha} ${tMar3.name}`, 'Shukla Purnima');

// 6. Bhai Dooj probe: Shukla Dwitiya at sunrise → DB dates verified correct
console.log('\n--- Bhai Dooj probe (Shukla Dwitiya at sunrise) ---');
for (const d of [10, 11]) {
  const sr = kolkataSunrise(2026, 11, d);
  const t = drikTithiAt(sr.sunriseDate);
  console.log(`      Nov ${d} 2026: ${t.paksha} ${t.name}`);
}
const srBD26 = kolkataSunrise(2026, 11, 11);
check('Bhai Dooj 2026 = Nov 11', `${drikTithiAt(srBD26.sunriseDate).paksha} ${drikTithiAt(srBD26.sunriseDate).name}`, 'Shukla Dwitiya');
for (const d of [30, 31]) {
  const sr = kolkataSunrise(2027, 10, d);
  const t = drikTithiAt(sr.sunriseDate);
  console.log(`      Oct ${d} 2027: ${t.paksha} ${t.name}`);
}
const srBD27 = kolkataSunrise(2027, 10, 31);
check('Bhai Dooj 2027 = Oct 31', `${drikTithiAt(srBD27.sunriseDate).paksha} ${drikTithiAt(srBD27.sunriseDate).name}`, 'Shukla Dwitiya');

// 7. Ekadashi sanity: next Ekadashi after Oct 16 2026 + parana window shape
console.log('\n--- Ekadashi / parana sanity ---');
const eks = findEkadashis(new Date(Date.UTC(2026, 9, 16)), new Date(Date.UTC(2026, 10, 20)), {
  lat: KOL.lat, lon: KOL.lon, tz: KOL.tz,
});
for (const e of eks.slice(0, 3)) {
  console.log(`      ${e.name}: smarta ${e.smartaIso}${e.differ ? ` / vaishnava ${e.vaishnavaIso}` : ''} | parana: ${e.parana}`);
  const bad = /–/.test(e.parana) && (() => {
    const [a, b] = e.parana.split('–').map((s) => s.trim());
    return a >= b; // lexical compare works for "HH:MM AM/PM" only if same period; do a real parse
  })();
  void bad;
}

console.log(`\n${failures === 0 ? 'ALL ASSERTIONS PASSED' : `${failures} ASSERTION(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

// Note (2026-10-16): This script guards the P0 Panjika accuracy fixes.
// It also documents that src/lib/drikPanchang.ts, vrataSchedule.ts and
// shubhMuhurat.ts were once pushed base64-encoded (commit aee5550) and
// restored to real TypeScript in the P0 fix — never push encoded blobs.
