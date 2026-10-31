/**
 * margdarshan/joins.ts — the EXPLICIT guide↔desk join table (J1).
 * =====================================================================
 * J0 attached guides to desks by structural id equality only (5
 * guides) and deliberately refused to guess the rest: several topic
 * guides have an obvious CONCEPTUAL desk counterpart, but the guide
 * library and the desk catalog grew up in separate id spaces, and no
 * source table joins them. This file is the human-reviewed join the
 * J0 notes called for. Every pair is argued on one test — SAME USER
 * TASK = join; different task = the guide stays a topic page of its
 * own and the two pages cross-link as related instead.
 *
 * A join means: the desk page shows the guide (its what-it-is, steps
 * and tips) as its own how-to body, and the topic slug becomes an
 * alias that resolves to the desk page. The inventory itself is
 * untouched (J0's builder and its pins stand); the join lives only
 * in this manual layer.
 *
 * JOINED (guide id → desk page slug):
 *
 *  hr → sevadar-roster. The guide is "Sevadar Management — paid
 *    staff with salary records, and sevadars with duty rosters for
 *    daily seva and festival crowds." The desk is "Sevadar HR &
 *    Volunteer Roster — shifts, check-ins, and SOPs in one roster."
 *    One task: caring for the people who serve. JOIN.
 *
 *  events → utsav-one. The guide plans each utsava end-to-end —
 *    "dates, committees, budgets, tasks, vendors and programs." The
 *    desk is "Utsav One — run the whole mahotsav from one desk:
 *    budgets, committees, vendors, program and crowd safety." The
 *    same sentence in two dialects. JOIN.
 *
 *  samskara → samskara-one. The guide tracks "every family member's
 *    samskaras… and pitra-shraddha remembrances"; the desk keeps
 *    "your family's sacred chronicle — the 16 samskaras, gentle
 *    reminders, pitra records and shraddha." One chronicle. JOIN.
 *
 *  matha → matha-one. The guide administers "resident sadhaks, daily
 *    schedules, parampara lineage, dakshina records"; the desk keeps
 *    "sannyasi registry, parampara lineage, dinacharya and gurukul."
 *    One matha, one record. JOIN.
 *
 *  panjika → panchang. The guide is the almanac itself — "tithi,
 *    nakshatra, festivals, Ekadashi and shubh muhurats"; the desk is
 *    "Vedic Panchang & Muhurat — tithi, nakshatra and muhurat for
 *    every day." One almanac. JOIN.
 *
 *  marketplace → purohitMarket. The guide: "Yajmans discover
 *    verified purohits and jyotishis, take sankalp for a seva, and
 *    offer dakshina — held safely until the seva completes." The
 *    desk is the "Global Scholar Marketplace — find KYC-verified
 *    scholars and purohits for any ritual, anywhere." One bazaar,
 *    one discovery-and-booking task. JOIN. (The guide's jyotishi
 *    half stays equally served: the jyotish topic page cross-links
 *    here, and the marketplace itself lists both.)
 *
 * KEPT SEPARATE (argued, not overlooked):
 *
 *  purohit ✕ purohitDesk. The guide speaks to the DEVOTEE: "connect
 *    with learned purohits for puja, hawan, vivah and all samskaras"
 *    — finding and inviting a purohit. The desk (Purohit Diary &
 *    Dakshina) is the PUROHIT's own diary — bookings received,
 *    dakshina, daily discipline. Seeking a purohit and being one
 *    are different tasks for different people. The topic page stays;
 *    it cross-links to the marketplace page, where its task lives.
 *
 *  sangam ✕ satsang. The guide is the community confluence — "share
 *    shlokas, organise seva drives, announce satsangs… Ashirvad, not
 *    likes": the social layer. The desk 'satsang' is "Satsang, Kirtan
 *    & Discourse — organize kirtan and discourses: schedules, venues
 *    and reminders": event organisation. A feed is not a booking
 *    desk. The topic page stays.
 *
 * Every other topic guide (wallet, jyotish, godmode, chat, the P2P
 * family, org-requests) has no desk counterpart at all — Solo and
 * platform surfaces — and stays a topic page by construction.
 */

export const GUIDE_JOINS: Readonly<Record<string, string>> = {
  hr: 'sevadar-roster',
  events: 'utsav-one',
  samskara: 'samskara-one',
  matha: 'matha-one',
  panjika: 'panchang',
  marketplace: 'purohitMarket',
};

/** Topic slug → the desk page slug its guide joined to. */
export const JOINED_TOPIC_ALIASES: Readonly<Record<string, string>> =
  GUIDE_JOINS;

/** Desk page slug → the joined guide id, when a join lands on it. */
export const JOINED_GUIDE_BY_DESK_SLUG: ReadonlyMap<string, string> =
  new Map(Object.entries(GUIDE_JOINS).map(([guide, slug]) => [slug, guide]));
