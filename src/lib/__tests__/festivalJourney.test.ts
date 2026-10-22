/**
 * festivalJourney.test.ts — Blueprint D, deliverable 3: the journey's
 * honesty law. A checkmark exists only where real records prove the
 * step; steps with no truthful signal stay 'link' forever; a
 * festival planned entirely in PRACTICE rows shows an open budget
 * step — practice is not a budget.
 */
import {
  buildJourneySteps,
  festivalWeek,
  journeyDismissKey,
  journeySignals,
  pickJourneyFestival,
} from '../festivalJourney';
import type { PanjikaFestival } from '../panjikaFestivals';

const fest = (over: Partial<PanjikaFestival>): PanjikaFestival => ({
  date: '2026-11-08',
  nameEn: 'Diwali',
  nameBn: 'দীপাবলি',
  significanceEn: '',
  significanceBn: '',
  category: 'festival',
  variant: 'both',
  regions: [],
  confidence: 'verified',
  ...over,
} as PanjikaFestival);

describe('pickJourneyFestival', () => {
  it('picks the next festival/puja inside the window, skipping minor observances and far dates', () => {
    const list = [
      fest({ date: '2026-10-25', nameEn: 'Ekadashi', category: 'fasting' }),
      fest({ date: '2026-11-08', nameEn: 'Diwali' }),
      fest({ date: '2027-06-01', nameEn: 'Far Away' }),
    ];
    expect(pickJourneyFestival(list, '2026-10-22')?.nameEn).toBe('Diwali');
    expect(pickJourneyFestival(list, '2026-11-09')).toBeNull();
    expect(pickJourneyFestival([], '2026-10-22')).toBeNull();
  });
});

describe('journeySignals + buildJourneySteps', () => {
  const base = {
    festivalDate: '2026-11-08',
    treasury: [] as Array<{ type?: string; date?: string; isPractice?: boolean }>,
    bookings: [] as Array<{ bookingDate?: string }>,
    shifts: [] as Array<{ date?: string }>,
    publishedMonths: [] as string[],
  };

  it('an untouched festival: every signalled step open, link steps link, zero counts', () => {
    const steps = buildJourneySteps(journeySignals(base));
    const byId = new Map(steps.map((s) => [s.id, s]));
    expect(byId.get('plan')!.state).toBe('link');
    expect(byId.get('budget')!.state).toBe('open');
    expect(byId.get('budget')!.count).toBe(0);
    expect(byId.get('bookings')!.state).toBe('open');
    expect(byId.get('volunteers')!.state).toBe('open');
    expect(byId.get('queue')!.state).toBe('link');
    expect(byId.get('publish')!.state).toBe('open');
    expect(byId.get('thanks')!.state).toBe('link');
    expect(steps.map((s) => s.deskId)).toEqual([
      'utsav-one',
      'treasury',
      'poojaBooking',
      'sevadar-roster',
      'tirth-one',
      'treasury',
      'sandeshBroadcast',
    ]);
  });

  it('real records complete steps with real counts', () => {
    const signals = journeySignals({
      ...base,
      treasury: [
        { type: 'Expense', date: '2026-11-02' },
        { type: 'Expense', date: '2026-11-20' },
        { type: 'Income', date: '2026-11-02' }, // income is not a budget
        { type: 'Expense', date: '2026-10-31' }, // wrong month
      ],
      bookings: [{ bookingDate: '2026-11-08' }, { bookingDate: '2026-11-05' }, { bookingDate: '2026-12-01' }],
      shifts: [{ date: '2026-11-11' }],
      publishedMonths: ['2026-11'],
    });
    expect(signals.expenseCountInMonth).toBe(2);
    expect(signals.bookingsInWeek).toBe(2);
    expect(signals.shiftsInWeek).toBe(1);
    expect(signals.monthPublished).toBe(true);
    const byId = new Map(buildJourneySteps(signals).map((s) => [s.id, s]));
    expect(byId.get('budget')!.state).toBe('done');
    expect(byId.get('bookings')!.count).toBe(2);
    expect(byId.get('publish')!.state).toBe('done');
  });

  it('practice expenses are NOT a budget', () => {
    const signals = journeySignals({
      ...base,
      treasury: [{ type: 'Expense', date: '2026-11-02', isPractice: true }],
    });
    expect(signals.expenseCountInMonth).toBe(0);
    expect(buildJourneySteps(signals).find((s) => s.id === 'budget')!.state).toBe('open');
  });

  it('the festival week is ±3 days and dismissal keys are per festival', () => {
    expect(festivalWeek('2026-11-08')).toEqual({ from: '2026-11-05', to: '2026-11-11' });
    expect(journeyDismissKey('WS-1', '2026-11-08', 'Diwali')).not.toBe(
      journeyDismissKey('WS-1', '2027-03-03', 'Holi')
    );
  });
});
