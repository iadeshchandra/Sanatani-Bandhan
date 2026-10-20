/**
 * sosAlertEngine.test.ts — pins the unified SOS alert pipeline (QUEUED #16).
 *
 * The engine replaced the two hand-rolled pipelines inside
 * GlobalSOSListener (legacy yatra_broadcasts + Crisis Command
 * crisis_events). These tests pin the safety invariants: dedupe,
 * sender suppression, stand-down exactly-once, per-source isolation.
 */
import {
  SosAlertEngine,
  type SosAlertInput,
  type SosAlertSinks,
  type SosEmitAlert,
  type SosEmitResolved,
} from '../sosAlertEngine';

const ME = 'viewer-uid';

function makeSinks() {
  const calls = {
    sounds: 0,
    alerts: [] as SosEmitAlert[],
    resolved: [] as SosEmitResolved[],
    os: [] as Array<{ title: string; body?: string; navigateModule?: string }>,
  };
  const sinks: SosAlertSinks = {
    playSound: () => {
      calls.sounds += 1;
    },
    emitAlert: (a) => {
      calls.alerts.push(a);
    },
    emitResolved: (a) => {
      calls.resolved.push(a);
    },
    osNotify: (a) => {
      calls.os.push(a);
    },
  };
  return { sinks, calls };
}

function alert(over: Partial<SosAlertInput> = {}): SosAlertInput {
  return {
    id: 'evt-1',
    senderUid: 'sender-uid',
    senderName: 'Meera',
    situation: 'Medical',
    details: 'Need help near the ghat',
    osTitle: 'SOS title',
    osBody: 'SOS body',
    ...over,
  };
}

describe('SosAlertEngine — alert fan-out', () => {
  it('alerts the viewer exactly once: sound + emit + OS push', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('crisis', alert(), sinks, ME);
    expect(calls.sounds).toBe(1);
    expect(calls.alerts).toHaveLength(1);
    expect(calls.alerts[0]).toMatchObject({ eventId: 'evt-1', senderUid: 'sender-uid', senderName: 'Meera' });
    expect(calls.os).toHaveLength(1);
    expect(calls.os[0].title).toBe('SOS title');
  });

  it('dedupes a repeated add of the same source+id', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('legacy', alert(), sinks, ME);
    e.handleAdded('legacy', alert(), sinks, ME);
    expect(calls.sounds).toBe(1);
    expect(calls.alerts).toHaveLength(1);
    expect(calls.os).toHaveLength(1);
  });

  it('namespaces dedupe per source: the same id in the other collection alerts independently', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('legacy', alert(), sinks, ME);
    e.handleAdded('crisis', alert(), sinks, ME);
    expect(calls.sounds).toBe(2);
    expect(calls.alerts).toHaveLength(2);
  });

  it('fires multiple distinct alerts in order', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('crisis', alert({ id: 'a' }), sinks, ME);
    e.handleAdded('crisis', alert({ id: 'b' }), sinks, ME);
    e.handleAdded('crisis', alert({ id: 'c' }), sinks, ME);
    expect(calls.alerts.map((a) => a.eventId)).toEqual(['a', 'b', 'c']);
  });

  it('passes the legacy OS navigation module through untouched', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('legacy', alert({ osNavigateModule: 'crisis-command' }), sinks, ME);
    expect(calls.os[0].navigateModule).toBe('crisis-command');
  });
});

describe('SosAlertEngine — sender suppression', () => {
  it('never alerts the sender about their own SOS, in either source', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('legacy', alert({ senderUid: ME }), sinks, ME);
    e.handleAdded('crisis', alert({ senderUid: ME }), sinks, ME);
    expect(calls.sounds).toBe(0);
    expect(calls.alerts).toHaveLength(0);
    expect(calls.os).toHaveLength(0);
  });

  it('an own SOS that later departs produces no stand-down emit', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleActiveSet('crisis', ['evt-1'], sinks, ME);
    e.handleAdded('crisis', alert({ senderUid: ME }), sinks, ME);
    const departed = e.handleActiveSet('crisis', [], sinks, ME);
    expect(departed).toEqual(['evt-1']);
    expect(calls.resolved).toHaveLength(0);
  });
});

describe('SosAlertEngine — stand-down', () => {
  it('emits "All is well" exactly once when an alerted SOS leaves the active set', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleActiveSet('crisis', ['evt-1'], sinks, ME);
    e.handleAdded('crisis', alert(), sinks, ME);
    e.handleActiveSet('crisis', [], sinks, ME);
    e.handleActiveSet('crisis', [], sinks, ME);
    expect(calls.resolved).toHaveLength(1);
    expect(calls.resolved[0]).toMatchObject({ eventId: 'evt-1', senderUid: 'sender-uid', senderName: 'Meera' });
  });

  it('stand-down meta uses metaSituation (raw) over the display situation', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleActiveSet('legacy', ['evt-1'], sinks, ME);
    e.handleAdded('legacy', alert({ situation: 'MEDICAL EMERGENCY', metaSituation: 'MEDICAL_EMERGENCY' }), sinks, ME);
    expect(calls.alerts[0].situation).toBe('MEDICAL EMERGENCY');
    e.handleActiveSet('legacy', [], sinks, ME);
    expect(calls.resolved[0].situation).toBe('MEDICAL_EMERGENCY');
  });

  it('returns departed ids (ACK unwatches) but not ids still active', () => {
    const e = new SosAlertEngine();
    const { sinks } = makeSinks();
    e.handleActiveSet('crisis', ['a', 'b', 'c'], sinks, ME);
    const departed = e.handleActiveSet('crisis', ['b'], sinks, ME);
    expect(departed.sort()).toEqual(['a', 'c']);
  });

  it('an SOS never alerted about (added while uid unknown) departs silently', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleActiveSet('crisis', ['evt-1'], sinks, null);
    e.handleAdded('crisis', alert(), sinks, null);
    // Sound + OS push still fired; only the emit is uid-gated.
    expect(calls.sounds).toBe(1);
    expect(calls.os).toHaveLength(1);
    expect(calls.alerts).toHaveLength(0);
    e.handleActiveSet('crisis', [], sinks, ME);
    expect(calls.resolved).toHaveLength(0);
  });

  it('stand-down in one source does not touch the other source', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleActiveSet('legacy', ['evt-1'], sinks, ME);
    e.handleActiveSet('crisis', ['evt-1'], sinks, ME);
    e.handleAdded('legacy', alert(), sinks, ME);
    e.handleAdded('crisis', alert(), sinks, ME);
    e.handleActiveSet('legacy', [], sinks, ME);
    expect(calls.resolved).toHaveLength(1);
    // Crisis copy is still live; its own departure emits separately.
    e.handleActiveSet('crisis', [], sinks, ME);
    expect(calls.resolved).toHaveLength(2);
  });
});

describe('SosAlertEngine — reset', () => {
  it('reset(source) re-arms only that source (workspace-switch semantics)', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleAdded('legacy', alert(), sinks, ME);
    e.handleAdded('crisis', alert(), sinks, ME);
    expect(calls.alerts).toHaveLength(2);
    e.reset('legacy');
    e.handleAdded('legacy', alert(), sinks, ME); // alerts again
    e.handleAdded('crisis', alert(), sinks, ME); // still deduped
    expect(calls.alerts).toHaveLength(3);
  });

  it('reset clears stand-down tracking for that source only', () => {
    const e = new SosAlertEngine();
    const { sinks, calls } = makeSinks();
    e.handleActiveSet('crisis', ['evt-1'], sinks, ME);
    e.handleAdded('crisis', alert(), sinks, ME);
    e.reset('crisis');
    const departed = e.handleActiveSet('crisis', [], sinks, ME);
    expect(departed).toEqual([]);
    expect(calls.resolved).toHaveLength(0);
  });
});
