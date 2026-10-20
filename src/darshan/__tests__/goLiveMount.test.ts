/**
 * darshan/__tests__/goLiveMount.test.ts — mount logic for GoLiveButton.
 */
import { shouldShowGoLive, toDarshanLang } from '../goLiveMount';

describe('toDarshanLang', () => {
  it('maps hi variants to hi', () => {
    expect(toDarshanLang('hi')).toBe('hi');
    expect(toDarshanLang('hi-IN')).toBe('hi');
  });

  it('maps bn variants to bn', () => {
    expect(toDarshanLang('bn')).toBe('bn');
    expect(toDarshanLang('bn-BD')).toBe('bn');
  });

  it('falls back to en for unknown/empty', () => {
    expect(toDarshanLang('en')).toBe('en');
    expect(toDarshanLang('ta')).toBe('en');
    expect(toDarshanLang('')).toBe('en');
    expect(toDarshanLang(null)).toBe('en');
    expect(toDarshanLang(undefined)).toBe('en');
  });
});

describe('shouldShowGoLive', () => {
  const base = { id: 'pb-1', status: 'In-Progress' };

  it('shows for priest on an In-Progress booking', () => {
    expect(shouldShowGoLive(base, true)).toBe(true);
  });

  it('shows for priest on a Confirmed booking', () => {
    expect(shouldShowGoLive({ ...base, status: 'Confirmed' }, true)).toBe(true);
  });

  it('hides from devotees (non-priest roles)', () => {
    expect(shouldShowGoLive(base, false)).toBe(false);
  });

  it('hides when a stream URL already exists (Watch covers it)', () => {
    expect(
      shouldShowGoLive({ ...base, liveStreamUrl: 'https://youtu.be/x' }, true),
    ).toBe(false);
  });

  it('hides on Completed bookings', () => {
    expect(shouldShowGoLive({ ...base, status: 'Completed' }, true)).toBe(false);
  });

  it('hides on Cancelled bookings', () => {
    expect(shouldShowGoLive({ ...base, status: 'Cancelled' }, true)).toBe(false);
  });

  it('hides on Standby bookings', () => {
    expect(shouldShowGoLive({ ...base, status: 'Standby' }, true)).toBe(false);
  });

  it('is null-safe', () => {
    expect(shouldShowGoLive(null, true)).toBe(false);
    expect(shouldShowGoLive(undefined, true)).toBe(false);
    expect(shouldShowGoLive({ id: 'x' }, true)).toBe(false); // no status
  });
});
