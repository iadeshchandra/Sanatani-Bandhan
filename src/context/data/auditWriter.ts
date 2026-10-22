/**
 * auditWriter.ts — Blueprint A: the master audit stream's recorder
 * (policy; the Firestore adapter lives in ./auditStore.ts, the chain
 * math in src/lib/auditChain.ts).
 * ============================================================================
 * Every committed organisation mutation reported by the data layer
 * becomes ONE append-only, hash-chained event in `auditEvents`
 * (research §2: one stream for everything; actor + role at the time;
 * before/after digest where cheap; prev_hash/row_hash per record).
 *
 * Laws (mirroring summaryWriter, because derived trust data must
 * never become a way to break the app):
 *   - NEVER throws, NEVER blocks or fails the underlying mutation.
 *     record() is synchronous and fire-and-forget; the write happens
 *     on a per-workspace serialised queue. Failures log loudly as
 *     `[audit] …` and the event is dropped.
 *   - NEVER corrupts the chain: the per-workspace chain head advances
 *     ONLY when an event has actually landed. A dropped event is an
 *     absence; the next event chains onto the last landed one, so
 *     verification stays meaningful.
 *   - NEVER fabricates: events are built only from what the commit
 *     point reports (actor resolved via resolveActorName by the
 *     caller; an actorless report — no signed-in uid — is skipped,
 *     because rules bind actorUid to the caller and a forged actor
 *     is worse than an absence).
 *   - DEMO_ workspaces are skipped entirely (orgGlance law, same as
 *     the summary writer): demo records are ephemeral/local.
 *
 * Ordering: mutations are serialised per workspace through a promise
 * queue, so seq order == commit order on this device. The chain head
 * is primed once per workspace per session from the stored stream
 * (the adapter reads the highest-seq event).
 */

import {
  buildAuditEvent,
  type AuditEvent,
  type AuditEventInput,
} from '../../lib/auditChain';

export interface AuditChainHead {
  seq: number;
  hash: string;
}

/** Persistence for the stream. Implementations throw on error so the
 *  recorder can tell "landed" from "lost". */
export interface AuditStore {
  /** The highest-seq stored event's head, or null when the workspace
   *  has no events yet. Throw on read error. */
  readChainHead(workspaceId: string): Promise<AuditChainHead | null>;
  /** Append one fully-chained event. Throw on error. */
  appendEvent(event: AuditEvent): Promise<void>;
}

const isDemoWorkspace = (id: string) => id.startsWith('DEMO_');

interface WorkspaceChain {
  /** undefined = not primed yet; null = primed, chain is empty. */
  head: AuditChainHead | null | undefined;
  /** Tail of the serialised write queue. */
  tail: Promise<void>;
}

export class AuditRecorder {
  private chains = new Map<string, WorkspaceChain>();
  private readonly now: () => number;
  private readonly log: (msg: string, err?: unknown) => void;
  private readonly makeId: () => string;

  constructor(
    private store: AuditStore,
    opts: {
      now?: () => number;
      log?: (msg: string, err?: unknown) => void;
      makeId?: () => string;
    } = {}
  ) {
    this.now = opts.now ?? Date.now;
    this.log =
      opts.log ??
      ((msg, err) => console.warn(`[audit] ${msg}`, err ?? ''));
    let counter = 0;
    this.makeId =
      opts.makeId ??
      (() =>
        `aud_${this.now().toString(36)}${(counter++).toString(36)}${Math.floor(
          Math.random() * 1e6
        ).toString(36)}`);
  }

  /**
   * Report one committed mutation. Synchronous, safe to call from
   * inside any mutator: it only enqueues the chained write.
   */
  record(input: AuditEventInput): void {
    const { workspaceId, actorUid } = input;
    if (!workspaceId || isDemoWorkspace(workspaceId)) return;
    if (!actorUid) {
      this.log(
        `event skipped for ${workspaceId}: no actor uid (${input.action} on ${input.entityType}/${input.entityId})`
      );
      return;
    }
    const chain = this.chainFor(workspaceId);
    chain.tail = chain.tail.then(() => this.appendOne(chain, input));
  }

  /** Prime a workspace's chain head (idempotent; record() also does
   *  this lazily). Never throws. */
  async prime(workspaceId: string): Promise<void> {
    if (!workspaceId || isDemoWorkspace(workspaceId)) return;
    const chain = this.chainFor(workspaceId);
    chain.tail = chain.tail.then(async () => {
      try {
        await this.ensurePrimed(chain, workspaceId);
      } catch (err) {
        this.log(`prime failed for ${workspaceId}`, err);
      }
    });
    await chain.tail;
  }

  /** Resolve when every queued write for the workspace (or all) has
   *  settled — for tests and for surfaces that verify right after
   *  acting. Never throws. */
  async flush(workspaceId?: string): Promise<void> {
    if (workspaceId) {
      await this.chains.get(workspaceId)?.tail;
      return;
    }
    await Promise.all([...this.chains.values()].map((c) => c.tail));
  }

  /** The last landed head this session knows for a workspace. */
  getHead(workspaceId: string): AuditChainHead | null {
    return this.chains.get(workspaceId)?.head ?? null;
  }

  private chainFor(workspaceId: string): WorkspaceChain {
    let chain = this.chains.get(workspaceId);
    if (!chain) {
      chain = { head: undefined, tail: Promise.resolve() };
      this.chains.set(workspaceId, chain);
    }
    return chain;
  }

  private async ensurePrimed(
    chain: WorkspaceChain,
    workspaceId: string
  ): Promise<void> {
    if (chain.head !== undefined) return;
    chain.head = await this.store.readChainHead(workspaceId);
  }

  private async appendOne(
    chain: WorkspaceChain,
    input: AuditEventInput
  ): Promise<void> {
    try {
      await this.ensurePrimed(chain, input.workspaceId);
    } catch (err) {
      // Without the true head we cannot chain honestly — drop this
      // event (loudly) rather than fork the chain. The next mutation
      // retries priming.
      this.log(
        `chain head unavailable for ${input.workspaceId}; dropping ${input.action} on ${input.entityType}/${input.entityId}`,
        err
      );
      chain.head = undefined;
      return;
    }
    const event = buildAuditEvent(
      input,
      chain.head ?? null,
      this.makeId(),
      this.now()
    );
    try {
      await this.store.appendEvent(event);
      chain.head = { seq: event.seq, hash: event.hash };
    } catch (err) {
      // Fail-open: the mutation already committed; the audit write
      // is what failed. Head does NOT advance — the next event
      // chains onto the last landed one.
      this.log(
        `append failed for ${input.workspaceId} (${input.action} on ${input.entityType}/${input.entityId}); event dropped, chain head unchanged`,
        err
      );
    }
  }
}
