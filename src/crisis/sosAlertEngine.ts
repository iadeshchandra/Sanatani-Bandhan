/**
 * sosAlertEngine.ts — the ONE SOS alert pipeline (QUEUED #16).
 * ============================================================================
 * Research finding (2026-10-20): the app has exactly one app-global SOS
 * listener component — GlobalSOSListener — but inside it, TWO parallel
 * hand-rolled copies of the same alert pipeline had grown up:
 *
 *   L1  yatra_broadcasts (type == RICH_SOS, workspace-scoped) — the legacy
 *       SOS write path (SanataniSocialFeed SOS modal, DevoteeAccountPortal,
 *       OfflineSyncManager queue flush).
 *   L2  crisis_events (status == 'active') — the Crisis Command write path
 *       (SOSFlow → sosService.triggerSOS, crowd auto-escalation).
 *
 * Both write paths are still LIVE, and Firestore cannot subscribe to two
 * collections with one onSnapshot — so the two subscriptions stay. What
 * was genuinely duplicated (and divergent) was the pipeline around them:
 * a dedupe set, a stand-down meta map, active-set diffing, the audio
 * channel, the NotificationCenter emit and the OS push — implemented
 * twice, with drift (e.g. only L1 reset its state on workspace switch;
 * the Audio element was created in two places).
 *
 * This engine is that pipeline, written ONCE. Both subscriptions in
 * GlobalSOSListener feed it through thin per-source adapters that only
 * normalize fields (legacy `senderId` vs crisis `senderUid`, situation
 * label formatting, OS-notification wording). Banner rendering, ACK
 * counts, "I'm coming" and the responder map stay in the component.
 *
 * Invariants (pinned by __tests__/sosAlertEngine.test.ts):
 *   - An alert doc alerts the viewer AT MOST once per source (dedupe is
 *     namespaced `source:id` — the two collections are independent id
 *     spaces and must never suppress each other).
 *   - The sender is never alerted about their own SOS (no sound, no
 *     emit, no OS push) but IS marked processed.
 *   - Sound + OS push fire regardless of sign-in emit availability; the
 *     NotificationCenter emit (and therefore the stand-down "All is
 *     well") happens only when a recipient uid exists — exactly the
 *     pre-unification behavior of both pipelines.
 *   - Stand-down: when an id leaves a source's active set, a viewer who
 *     was alerted about it gets exactly one emitResolved.
 *
 * Screen-scoped subscriptions are deliberately NOT part of this: the
 * member feed's emergencies strip observes the identical yatra query
 * for DISPLAY only (the Firestore SDK shares the watch target for
 * identical queries), and CrisisDashboard / SOSTimeline subscribe only
 * while their desk/sheet is open.
 */

export type SosAlertSource = 'legacy' | 'crisis';

/** One newly-added SOS doc, normalized by the per-source adapter. */
export interface SosAlertInput {
  id: string;
  senderUid: string;
  senderName: string;
  /** Display-ready situation string for the NotificationCenter emit. */
  situation: string;
  /** Situation string recorded for the stand-down ("All is well") emit.
   *  Defaults to `situation`. The legacy pipeline stored the RAW
   *  situation in its meta while emitting the display form — preserved
   *  here so unification changes no emitted payload. */
  metaSituation?: string;
  /** Optional details for the emit body. */
  details?: string;
  /** OS-notification content, pre-built by the adapter (wording differs
   *  per source and must not change). */
  osTitle: string;
  osBody?: string;
  /** When set, the OS-notification click also dispatches
   *  `navigate_module` with this detail (legacy alerts only). */
  osNavigateModule?: string;
}

export interface SosEmitAlert {
  eventId: string;
  senderUid: string;
  senderName: string;
  situation: string;
  details?: string;
}

export interface SosEmitResolved {
  eventId: string;
  senderUid: string;
  senderName: string;
  situation: string;
}

/** Side-effect channels, supplied by the host component. The engine
 *  calls emitAlert / emitResolved ONLY when a recipient uid exists. */
export interface SosAlertSinks {
  playSound: () => void;
  emitAlert: (a: SosEmitAlert) => void;
  emitResolved: (a: SosEmitResolved) => void;
  osNotify: (a: { title: string; body?: string; navigateModule?: string }) => void;
}

interface LiveMeta {
  senderUid: string;
  senderName: string;
  situation: string;
}

export class SosAlertEngine {
  /** Namespaced (`source:id`) ids that have been processed. */
  private processed = new Set<string>();
  /** Namespaced id -> alert meta, recorded ONLY for alerts the viewer
   *  was actually emitted about (drives the stand-down emit). */
  private liveMeta = new Map<string, LiveMeta>();
  /** Per-source active-id set from the previous snapshot. */
  private prevIds = new Map<SosAlertSource, Set<string>>();

  private key(source: SosAlertSource, id: string): string {
    return `${source}:${id}`;
  }

  /**
   * Reset ONE source's pipeline state. Called when that source's
   * subscription (re)starts — auth change for both, workspace switch
   * for the workspace-scoped legacy source. The other source is
   * untouched, so a workspace switch can never re-alert crisis events.
   */
  reset(source: SosAlertSource): void {
    const prefix = `${source}:`;
    for (const k of Array.from(this.processed)) {
      if (k.startsWith(prefix)) this.processed.delete(k);
    }
    for (const k of Array.from(this.liveMeta.keys())) {
      if (k.startsWith(prefix)) this.liveMeta.delete(k);
    }
    this.prevIds.set(source, new Set());
  }

  /**
   * Diff a source's active-id set against the previous snapshot.
   * Departed ids that the viewer was alerted about produce exactly one
   * emitResolved ("All is well"). Returns ALL departed ids so callers
   * can tear down per-event watchers (crisis ACK subscriptions).
   */
  handleActiveSet(
    source: SosAlertSource,
    activeIds: Iterable<string>,
    sinks: Pick<SosAlertSinks, 'emitResolved'>,
    myUid: string | null,
  ): string[] {
    const prev = this.prevIds.get(source) ?? new Set<string>();
    const now = new Set(activeIds);
    const departed: string[] = [];
    for (const id of prev) {
      if (now.has(id)) continue;
      departed.push(id);
      const meta = this.liveMeta.get(this.key(source, id));
      if (meta && myUid) {
        sinks.emitResolved({ eventId: id, ...meta });
      }
      this.liveMeta.delete(this.key(source, id));
    }
    this.prevIds.set(source, now);
    return departed;
  }

  /**
   * Process one newly-added alert doc from a source subscription.
   * `myUid` is the viewer's uid (null when unavailable): the sender
   * check, the NotificationCenter emit and meta recording key off it;
   * sound and OS push fire regardless — matching both legacy pipelines.
   */
  handleAdded(
    source: SosAlertSource,
    alert: SosAlertInput,
    sinks: SosAlertSinks,
    myUid: string | null,
  ): void {
    const k = this.key(source, alert.id);
    if (this.processed.has(k)) return;
    this.processed.add(k);

    // Never alert the sender about their own SOS.
    if (myUid && alert.senderUid === myUid) return;

    // 1. Audio alarm (single channel, owned by the host component).
    sinks.playSound();

    // 2. NotificationCenter emit (CRITICAL — breaks through quiet hours).
    if (myUid) {
      this.liveMeta.set(k, {
        senderUid: alert.senderUid,
        senderName: alert.senderName,
        situation: alert.metaSituation ?? alert.situation,
      });
      sinks.emitAlert({
        eventId: alert.id,
        senderUid: alert.senderUid,
        senderName: alert.senderName,
        situation: alert.situation,
        details: alert.details,
      });
    }

    // 3. OS native push.
    sinks.osNotify({
      title: alert.osTitle,
      body: alert.osBody,
      navigateModule: alert.osNavigateModule,
    });
  }
}
