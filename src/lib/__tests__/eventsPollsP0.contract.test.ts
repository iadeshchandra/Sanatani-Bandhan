/**
 * eventsPollsP0.contract.test.ts — EVENTS + POLLS P0 source contracts.
 * =====================================================================
 * Pins the batch's invariants so a future refactor cannot quietly
 * reopen an audit finding (P-L1…P-L8, L1/L2, L6/L7/L8):
 *   - the polls rules are scoped to the poll's OWN workspace, with a
 *     private ballot-box subcollection and anchored count moves;
 *   - resolutions have a dedicated, rules-pinned block (and are OUT
 *     of the generic operational block, whose allows would OR around
 *     the strict ones);
 *   - public event counters move only with their RSVP records;
 *   - the clients write the shapes the rules expect, and the copy
 *     tells the truth about what the mechanisms do.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const rules = read('firestore.rules');

describe('P-L1: polls rules are scoped to the poll’s own workspace', () => {
  it('the old global-trustee write line is gone', () => {
    expect(rules).not.toMatch(/match \/polls\/\{pollId\} \{\s*\n\s*allow read: if isLoggedIn\(\);\s*\n\s*allow write: if hasRole\(effTenant\(\)/);
  });
  it('reads require membership of the poll workspace; committee polls hide from non-committee', () => {
    expect(rules).toMatch(/match \/polls\/\{pollId\} \{[\s\S]*?isTenantMember\(docWs\(\)\)[\s\S]*?targetAudience/);
    expect(rules).toMatch(/pollCommittee\(docWs\(\)\)/);
  });
  it('the ballot box exists: one vote doc per voter, create-only, never editable', () => {
    expect(rules).toMatch(/match \/votes\/\{voterUid\}/);
    expect(rules).toMatch(/allow create: if voterUid == request\.auth\.uid && pollBallotOk\(pollId\)/);
    const votesBlock = rules.slice(rules.indexOf('match /votes/{voterUid}'));
    expect(votesBlock.slice(0, 900)).toMatch(/allow update, delete: if false/);
  });
  it('poll counts move only with the caller’s NEW ballot (anchored)', () => {
    expect(rules).toMatch(/function pollVoteAnchorOk\(pollId\)/);
    expect(rules).toMatch(/!exists\(vp\) && existsAfter\(vp\)/);
    expect(rules).toMatch(/pollBaseTotal\(resource\.data\) \+ 1/);
  });
  it('deadline conclusion is open to any member but rules-verified', () => {
    expect(rules).toMatch(/function pollAutoConcludeOk\(\)/);
    expect(rules).toMatch(/request\.time >= resource\.data\.get\('expiresAtTs'\)/);
  });
  it('a poll with ballots can never be deleted (archive-only history)', () => {
    expect(rules).toMatch(/allow delete: if pollCommittee\(docWs\(\)\) && pollBaseTotal\(resource\.data\) == 0/);
  });
});

describe('resolutions: dedicated rules-pinned block', () => {
  it('a dedicated match block exists', () => {
    expect(rules).toMatch(/match \/resolutions\/\{resId\}/);
  });
  it('resolutions are OUT of the generic operational block lists', () => {
    const generic = rules.slice(rules.indexOf('// Generic operational collections'), rules.indexOf('match /audit_logs/{logId}'));
    expect(generic).not.toMatch(/'resolutions'/);
  });
  it('votes are pinned: own uid only, tally moves with the map, deadline frozen', () => {
    expect(rules).toMatch(/function resVoteOk\(\)/);
    expect(rules).toMatch(/newV\.diff\(oldV\)\.addedKeys\(\)\.hasOnly\(\[uid\]\)/);
    expect(rules).toMatch(/request\.time < resource\.data\.get\('expiresAtTs'\)/);
  });
  it('conclusion is recomputed by the rules (quorum + outcome)', () => {
    expect(rules).toMatch(/function resConcludeOk\(\)/);
    expect(rules).toMatch(/function resOutcomeOk\(data\)/);
    expect(rules).toMatch(/resQuorumOk\(data\) == data\.get\('quorumMet', false\)/);
  });
  it('client + rules quorum formulas stay in lockstep', () => {
    const logic = read('src/lib/resolutionLogic.ts');
    expect(logic).toMatch(/cast \* 2 > board/);
    expect(rules).toMatch(/cast \* 2 > board/);
    expect(logic).toMatch(/cast >= 2/);
    expect(rules).toMatch(/cast >= 2/);
  });
});

describe('events: counters are anchored to real RSVP records', () => {
  it('the unanchored public counter bump is gone', () => {
    expect(rules).not.toMatch(/function publicCounterBump\(\) \{/);
    expect(rules).not.toMatch(/function slotBookedSane/);
    expect(rules).toMatch(/function anchoredFestivalCounter\(eventId\)/);
  });
  it('festival RSVP doc ids are derived ({eventId}__{uid}) in rules and client alike', () => {
    expect(rules).toMatch(/rsvpId == request\.resource\.data\.get\('eventId', ''\) \+ '__' \+ request\.auth\.uid/);
    expect(read('src/lib/festivalRsvp.ts')).toMatch(/`\$\{eventId\}__\$\{uid\}`/);
  });
  it('slot capacity is a rules bound via the published slotCaps map', () => {
    expect(rules).toMatch(/function festSlotCapacityOk/);
    expect(rules).toMatch(/'slotCaps' in newData/);
    expect(read('src/components/festival/festivalWarStore.tsx')).toMatch(/slotCaps/);
  });
  it('both RSVP surfaces write through the one transaction helper', () => {
    expect(read('src/components/festival/FestivalEventPage.tsx')).toMatch(/applyFestivalRsvp/);
    expect(read('src/components/festival/festivalWarStore.tsx')).toMatch(/applyFestivalRsvp/);
    expect(read('src/lib/festivalRsvp.ts')).toMatch(/runTransaction/);
  });
  it('Sangam rsvpCount is anchored to the caller’s own rsvps doc in the same batch', () => {
    expect(rules).toMatch(/sangamEvents\/\$\(eventId\)\/rsvps\/\$\(request\.auth\.uid\)/);
    expect(read('src/sangam/sangamStore.tsx')).toMatch(/writeBatch/);
  });
  it('L8: the official badge requires a matching org and its trustee', () => {
    expect(rules).toMatch(/get\('isOfficial', false\) != true/);
    expect(rules).toMatch(/isOrgTrustee\(request\.resource\.data\.get\('orgId', ''\)\)\)\)/);
  });
});

describe('clients: ballots, conclusions and honest copy', () => {
  const pollsTab = read('src/components/domain6/CommunityPollsTab.tsx');
  const panchayat = read('src/components/domain6/PanchayatPollingDesk.tsx');

  it('community polls vote through the ballot box (batch: ballot + counts)', () => {
    expect(pollsTab).toMatch(/writeBatch/);
    expect(pollsTab).toMatch(/'polls', pollId, 'votes', uid/);
    expect(pollsTab).not.toMatch(/votedUsers\.\$\{currentUser\.id\}/);
    expect(pollsTab).not.toMatch(/\[\`votedUsers\./);
  });
  it('new polls are born without a votedUsers map and carry a timestamp deadline', () => {
    expect(pollsTab).toMatch(/totalVotes: 0/);
    expect(pollsTab).toMatch(/Timestamp\.fromMillis\(expirationMs\)/);
  });
  it('the audit view shows names only — never phone numbers', () => {
    expect(pollsTab).not.toMatch(/displayPhone/);
    expect(pollsTab).not.toMatch(/member\.phone/);
    expect(pollsTab).not.toMatch(/m\.phone/);
  });
  it('the committee reveal is logged to the audit chain', () => {
    expect(pollsTab).toMatch(/poll\.ballotsRevealed/);
    expect(pollsTab).toMatch(/noteAudit/);
  });
  it('the Remind button publishes through the real broadcast system', () => {
    expect(pollsTab).toMatch(/publishBroadcast/);
    expect(pollsTab).not.toMatch(/Final reminder sent to unvoted members/);
  });
  it('no cryptographic theatre remains in either desk', () => {
    expect(pollsTab.toLowerCase()).not.toMatch(/cryptographic/);
    expect(panchayat.toLowerCase()).not.toMatch(/cryptographic/);
    expect(panchayat).not.toMatch(/average 85% majority/);
    expect(panchayat).not.toMatch(/hasVotedLocally/);
  });
  it('resolution votes and conclusions are recorded in DataContext', () => {
    const dc = read('src/context/DataContext.tsx');
    expect(dc).toMatch(/tallyFromVoters/);
    expect(dc).toMatch(/pushToFirestore\('resolutions'/);
    expect(dc).toMatch(/'resolution\.concluded'/);
    expect(dc).toMatch(/Timestamp\.fromMillis\(res\.expiresAt\)/);
  });
});

describe('L6/L7: Utsav integrity', () => {
  it('posted lines store the REAL treasury transaction id, not the literal', () => {
    expect(read('src/utsav/BudgetTab.tsx')).not.toMatch(/treasuryTxId: 'posted'/);
    expect(read('src/utsav/VendorsTab.tsx')).not.toMatch(/treasuryTxId: 'posted'/);
    expect(read('src/context/DataContext.tsx')).toMatch(/onId\?\.\(id\)/);
  });
  it('UC numbers come from the persistent counter, not the festival count', () => {
    const store = read('src/utsav/utsavStore.tsx');
    expect(store).toMatch(/state\.ucSeq/);
    expect(store).not.toMatch(/state\.festivals\.length \+ 1/);
    expect(store).toMatch(/takeUCNo/);
  });
});
