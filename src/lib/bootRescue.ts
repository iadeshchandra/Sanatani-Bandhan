/**
 * bootRescue.ts — the boot gate's rescue timer (FIX BATCH F1).
 * =====================================================================
 * Full-App Test #2, finding F1 (HIGH): the app's splash is gated by
 * `isLoading` in AuthWorkspaceContext, which cleared only inside the
 * onAuthStateChanged callback paths — after an awaited Firestore
 * profile fetch. A network that HANGS (black-holed proxy, captive
 * portal, dying temple Wi-Fi) never resolves and never rejects, so
 * nothing ever cleared the gate: the app sat on "Initializing Secure
 * Environment…" forever, even though the service worker had already
 * served the whole app from cache. The founding Zero-Internet
 * promise broke in exactly the conditions it was made for.
 *
 * The rescue: a bounded timer armed when the auth effect starts.
 * If auth state has not resolved within BOOT_RESCUE_MS, the gate
 * opens on the locally persisted session state (the provider's
 * initial state already comes from on-device persistence) and auth
 * resolution continues in the background; when the real callback
 * lands it supersedes the rescued state through the same setState
 * paths it always used — exactly once per auth event, no second
 * gate, no flash of invented content (the rescue invents nothing:
 * it only stops WAITING).
 *
 * The bound: Test #2 measured a merely SLOW network (400 Kbps /
 * 400 ms RTT) booting to usable in ~3.4 s. 10 s is ~3× that — a
 * slow network never trips it — while a true hang, which would
 * otherwise wait forever, is rescued while the splash's own
 * progress story is still young. The auth observer's ERROR
 * callback takes the same rescue path (fast-fail ≡ hang: open on
 * local state, keep resolving in the background).
 *
 * This class is deliberately framework-free so the three boot
 * timings can be unit-tested under fake timers:
 *   (a) resolve before the bound  → the rescue never fires;
 *   (b) never resolve             → the rescue fires once, at the bound;
 *   (c) resolve after the rescue  → no second fire, no error; the
 *       gate's work is done and the provider's real state takes over.
 */

/** The boot-rescue bound, in milliseconds. See the header for why 10 s. */
export const BOOT_RESCUE_MS = 10_000;

export type BootGateStatus = 'pending' | 'resolved' | 'rescued';

export class BootGate {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private state: BootGateStatus = 'pending';

  constructor(
    private readonly onRescue: () => void,
    private readonly timeoutMs: number = BOOT_RESCUE_MS,
  ) {}

  get status(): BootGateStatus {
    return this.state;
  }

  /** True once the rescue has fired (a session fact; never un-fires). */
  get rescued(): boolean {
    return this.state === 'rescued';
  }

  /** Start the countdown. Idempotent: re-arming changes nothing. */
  arm(): void {
    if (this.state !== 'pending' || this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.rescueNow();
    }, this.timeoutMs);
  }

  /**
   * The real resolution arrived: cancel the countdown. Before the
   * bound this is the normal path (the rescue never fires); after a
   * rescue it is a no-op beyond cancelling — the rescue already
   * opened the gate, and the provider's resolved state supersedes.
   */
  resolve(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.state === 'pending') this.state = 'resolved';
  }

  /**
   * Open the gate on local state NOW (the timer firing, or the auth
   * observer's error callback). Fires onRescue exactly once; any
   * later call — a second error, a late timer — is a no-op.
   */
  rescueNow(): void {
    if (this.state !== 'pending') return;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state = 'rescued';
    this.onRescue();
  }

  /** Cancel without resolving (the provider is unmounting). */
  dispose(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
