/**
 * p2p.spec.ts — P2P money request tests.
 * Logic tests run pure; service tests mock firebase/firestore + ../src/firebase
 * (same pattern as tests/offline_sync.spec.ts).
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());
const snapshotCbs: Array<(snap: any) => void> = [];
let autoId = 0;

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db: any, ...segments: string[]) => ({
    _db: db,
    _path: segments.join("/"),
  })),
  doc: jest.fn((...args: any[]) => {
    const last = args[args.length - 1];
    if (typeof last === "object" && last !== null && "_path" in last) {
      autoId += 1;
      return { _path: `${last._path}/auto-${autoId}`, id: `auto-${autoId}` };
    }
    const segments = args.slice(1);
    return { _path: segments.join("/"), id: segments[segments.length - 1] };
  }),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  writeBatch: jest.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
  onSnapshot: jest.fn((_q: any, cb: any) => {
    snapshotCbs.push(cb);
    return jest.fn();
  }),
  query: jest.fn((ref: any) => ref),
  where: jest.fn((...a: any[]) => a),
}));

jest.mock("../src/firebase", () => ({ db: { _type: "MOCK_DB" } }));

import {
  MAX_REQUEST_AMOUNT,
  REQUEST_TTL_MS,
  counterDirection,
  effectiveStatus,
  generateRequestQR,
  parseRequestQR,
  validateAmount,
} from "../src/chat/p2pLogic";
import {
  P2PError,
  cancelRequest,
  confirmSettled,
  counterOffer,
  createRequest,
  markPaid,
  respondToRequest,
  subscribeUserRequests,
} from "../src/chat/p2pService";
import type { MoneyRequest } from "../src/chat/types";

beforeEach(() => {
  jest.clearAllMocks();
  snapshotCbs.length = 0;
  autoId = 0;
});

const baseRequest = (over: Partial<MoneyRequest> = {}): MoneyRequest => ({
  id: "req1",
  direction: "user_to_user",
  senderId: "alice",
  senderName: "Alice",
  receiverId: "bob",
  receiverName: "Bob",
  amount: 1000,
  currency: "BDT",
  note: "Dakshina",
  status: "pending",
  chatId: "chat1",
  expiresAt: Date.now() + REQUEST_TTL_MS,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...over,
});

const docSnap = (r: MoneyRequest) => ({
  exists: () => true,
  id: r.id,
  data: () => ({ ...r }),
});

const profileSnap = { exists: () => true, data: () => ({ id: "SAN-1" }) };

/** getDoc routes: profiles + requests + workspaceMembers edges. */
function routeGetDoc(opts: { role?: string } = {}) {
  mockGetDoc.mockImplementation((ref: any) => {
    const p: string = ref._path;
    if (p.startsWith("sanataniProfiles/")) return Promise.resolve(profileSnap);
    if (p.startsWith("workspaceMembers/")) {
      return Promise.resolve(
        opts.role
          ? { exists: () => true, data: () => ({ role: opts.role }) }
          : { exists: () => false, data: () => ({}) },
      );
    }
    return Promise.resolve(docSnap(baseRequest()));
  });
}

// ---------------------------------------------------------------------------
// p2pLogic
// ---------------------------------------------------------------------------

describe("validateAmount", () => {
  it("rejects zero, negative, NaN and over-limit", () => {
    expect(validateAmount(0)).toBeTruthy();
    expect(validateAmount(-5)).toBeTruthy();
    expect(validateAmount(NaN)).toBeTruthy();
    expect(validateAmount(MAX_REQUEST_AMOUNT + 1)).toBeTruthy();
  });
  it("accepts valid amounts up to the limit", () => {
    expect(validateAmount(1)).toBeNull();
    expect(validateAmount(500.5)).toBeNull();
    expect(validateAmount(MAX_REQUEST_AMOUNT)).toBeNull();
  });
});

describe("QR payload", () => {
  it("round-trips through generate + parse", () => {
    const r = baseRequest({
      id: "abc123",
      amount: 2500,
      currency: "INR",
      receiverId: "bob",
    });
    const payload = generateRequestQR(r);
    expect(payload.startsWith("SB-P2P:1:")).toBe(true);
    const parsed = parseRequestQR(payload);
    expect(parsed).toEqual({
      requestId: "abc123",
      amount: 2500,
      currency: "INR",
      receiverId: "bob",
    });
  });
  it("rejects malformed payloads", () => {
    expect(parseRequestQR("hello")).toBeNull();
    expect(parseRequestQR("SB-P2P:1:a:-5:BDT:b")).toBeNull();
    expect(parseRequestQR("SB-P2P:1:a:10:EUR:b")).toBeNull();
    expect(parseRequestQR("OTHER:1:a:10:BDT:b")).toBeNull();
    expect(parseRequestQR("SB-P2P:2:a:10:BDT:b")).toBeNull();
  });
});

describe("counterDirection", () => {
  it("flips org/user directions, keeps user_to_user", () => {
    expect(counterDirection("org_to_user")).toBe("user_to_org");
    expect(counterDirection("user_to_org")).toBe("org_to_user");
    expect(counterDirection("user_to_user")).toBe("user_to_user");
  });
});

describe("effectiveStatus", () => {
  it("derives expired for stale pending requests (never written to rules)", () => {
    const stale = baseRequest({
      status: "pending",
      expiresAt: Date.now() - 1000,
    });
    expect(effectiveStatus(stale)).toBe("expired");
    const fresh = baseRequest({
      status: "pending",
      expiresAt: Date.now() + 1000,
    });
    expect(effectiveStatus(fresh)).toBe("pending");
    const accepted = baseRequest({
      status: "accepted",
      expiresAt: Date.now() - 1000,
    });
    expect(effectiveStatus(accepted)).toBe("accepted");
  });
});

// ---------------------------------------------------------------------------
// p2pService — create
// ---------------------------------------------------------------------------

describe("createRequest", () => {
  it("rejects invalid amounts before touching Firestore", async () => {
    await expect(
      createRequest({
        chatId: "chat1",
        direction: "user_to_user",
        senderUid: "alice",
        senderName: "Alice",
        receiverId: "bob",
        receiverName: "Bob",
        amount: 0,
        currency: "BDT",
      }),
    ).rejects.toMatchObject({ code: "invalid-amount" });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("writes the request + request_card message atomically for verified users", async () => {
    routeGetDoc();
    const id = await createRequest({
      chatId: "chat1",
      direction: "user_to_user",
      senderUid: "alice",
      senderName: "Alice",
      receiverId: "bob",
      receiverName: "Bob",
      amount: 1500,
      currency: "BDT",
      note: "Pranami",
    });
    expect(id).toBe("auto-1");
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    const reqData = mockBatchSet.mock.calls[0][1];
    expect(reqData.status).toBe("pending");
    expect(reqData.amount).toBe(1500);
    expect(reqData.senderId).toBe("alice");
    expect(reqData.receiverId).toBe("bob");
    expect(reqData.expiresAt - reqData.createdAt).toBe(REQUEST_TTL_MS);
    const msgData = mockBatchSet.mock.calls[1][1];
    expect(msgData.kind).toBe("request_card");
    expect(msgData.requestId).toBe("auto-1");
    expect(msgData.senderId).toBe("alice");
  });

  it("blocks org_to_user when the sender lacks Trustee/Accountant role", async () => {
    routeGetDoc({ role: "Devotee" });
    await expect(
      createRequest({
        chatId: "chat1",
        direction: "org_to_user",
        senderUid: "mallory",
        senderName: "Mandir",
        receiverId: "bob",
        receiverName: "Bob",
        amount: 500,
        currency: "BDT",
        orgId: "org1",
        orgName: "Mandir",
      }),
    ).rejects.toMatchObject({ code: "org-role" });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("allows org_to_user for a Trustee (logs trustee identity)", async () => {
    routeGetDoc({ role: "Trustee" });
    const id = await createRequest({
      chatId: "chat1",
      direction: "org_to_user",
      senderUid: "trustee1",
      senderName: "Mandir",
      receiverId: "bob",
      receiverName: "Bob",
      amount: 500,
      currency: "BDT",
      orgId: "org1",
      orgName: "Mandir",
      orgLogoUrl: "https://logo",
      senderTrusteeId: "trustee1",
      senderTrusteeName: "T. Rao",
    });
    expect(id).toBeTruthy();
    const reqData = mockBatchSet.mock.calls[0][1];
    expect(reqData.orgId).toBe("org1");
    expect(reqData.senderTrusteeName).toBe("T. Rao");
  });
});

// ---------------------------------------------------------------------------
// p2pService — transitions
// ---------------------------------------------------------------------------

describe("respondToRequest", () => {
  it("lets the receiver accept a pending request", async () => {
    routeGetDoc();
    await respondToRequest("req1", "bob", "accepted");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "accepted" }),
    );
  });
  it("forbids the sender from answering their own request", async () => {
    routeGetDoc();
    await expect(
      respondToRequest("req1", "alice", "accepted"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
  it("rejects answering an already-answered request", async () => {
    mockGetDoc.mockImplementation((ref: any) =>
      ref._path.startsWith("sanataniProfiles/")
        ? Promise.resolve(profileSnap)
        : Promise.resolve(docSnap(baseRequest({ status: "accepted" }))),
    );
    await expect(
      respondToRequest("req1", "bob", "declined"),
    ).rejects.toMatchObject({ code: "bad-state" });
  });
  it("rejects answering an expired request", async () => {
    mockGetDoc.mockImplementation((ref: any) =>
      ref._path.startsWith("sanataniProfiles/")
        ? Promise.resolve(profileSnap)
        : Promise.resolve(
            docSnap(
              baseRequest({ status: "pending", expiresAt: Date.now() - 1 }),
            ),
          ),
    );
    await expect(
      respondToRequest("req1", "bob", "accepted"),
    ).rejects.toMatchObject({ code: "bad-state" });
  });
});

describe("counterOffer", () => {
  it("marks the old request countered and creates a flipped new request", async () => {
    routeGetDoc();
    const newId = await counterOffer("req1", "bob", 1200);
    expect(newId).toBe("auto-1");
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    // Old request: status -> countered with supersededBy link
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "countered", supersededBy: "auto-1" }),
    );
    // New request: roles swapped, direction stays user_to_user
    const newReq = mockBatchSet.mock.calls[0][1];
    expect(newReq.senderId).toBe("bob");
    expect(newReq.receiverId).toBe("alice");
    expect(newReq.amount).toBe(1200);
    expect(newReq.status).toBe("pending");
    expect(newReq.countersRequestId).toBe("req1");
    expect(newReq.direction).toBe("user_to_user");
  });
  it("rejects invalid counter amounts", async () => {
    routeGetDoc();
    await expect(counterOffer("req1", "bob", 0)).rejects.toMatchObject({
      code: "invalid-amount",
    });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});

describe("markPaid", () => {
  const acceptedSnap = (ref: any) =>
    ref._path.startsWith("sanataniProfiles/")
      ? Promise.resolve(profileSnap)
      : Promise.resolve(docSnap(baseRequest({ status: "accepted" })));

  it("lets the sender record their own rail reference", async () => {
    mockGetDoc.mockImplementation(acceptedSnap);
    await markPaid("req1", "alice", "TRX9ABCD", "bkash");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "paid",
        paidRef: "TRX9ABCD",
        paidVia: "bkash",
      }),
    );
    const data = mockUpdateDoc.mock.calls[0][1];
    expect(typeof data.paidAt).toBe("number");
  });
  it("requires a reference and blocks the receiver", async () => {
    mockGetDoc.mockImplementation(acceptedSnap);
    await expect(
      markPaid("req1", "alice", "   ", "bkash"),
    ).rejects.toMatchObject({ code: "invalid-amount" });
    await expect(
      markPaid("req1", "bob", "TRX1", "bkash"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
  it("blocks marking paid before acceptance", async () => {
    mockGetDoc.mockImplementation((ref: any) =>
      ref._path.startsWith("sanataniProfiles/")
        ? Promise.resolve(profileSnap)
        : Promise.resolve(docSnap(baseRequest({ status: "pending" }))),
    );
    await expect(
      markPaid("req1", "alice", "TRX1", "upi"),
    ).rejects.toMatchObject({ code: "bad-state" });
  });
});

describe("confirmSettled", () => {
  it("lets the receiver settle a paid request", async () => {
    mockGetDoc.mockImplementation((ref: any) =>
      ref._path.startsWith("sanataniProfiles/")
        ? Promise.resolve(profileSnap)
        : Promise.resolve(
            docSnap(
              baseRequest({
                status: "paid",
                paidRef: "TRX1",
                paidVia: "bkash",
              }),
            ),
          ),
    );
    await confirmSettled("req1", "bob");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "settled" }),
    );
  });
  it("blocks settling before payment and blocks the sender", async () => {
    mockGetDoc.mockImplementation((ref: any) =>
      ref._path.startsWith("sanataniProfiles/")
        ? Promise.resolve(profileSnap)
        : Promise.resolve(docSnap(baseRequest({ status: "accepted" }))),
    );
    await expect(confirmSettled("req1", "bob")).rejects.toMatchObject({
      code: "bad-state",
    });
    await expect(confirmSettled("req1", "alice")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("cancelRequest", () => {
  it("lets the sender cancel a pending request", async () => {
    routeGetDoc();
    await cancelRequest("req1", "alice");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "cancelled" }),
    );
  });
  it("blocks the receiver from cancelling", async () => {
    routeGetDoc();
    await expect(cancelRequest("req1", "bob")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("subscribeUserRequests", () => {
  it("merges sender + receiver queries and sorts by updatedAt desc", () => {
    const seen: MoneyRequest[][] = [];
    const unsub = subscribeUserRequests("alice", (reqs) => seen.push(reqs));
    expect(snapshotCbs.length).toBe(2);
    const now = Date.now();
    snapshotCbs[0]({
      docChanges: () => [
        {
          type: "added",
          doc: {
            id: "r1",
            data: () => baseRequest({ id: "r1", updatedAt: now - 100 }),
          },
        },
      ],
    });
    snapshotCbs[1]({
      docChanges: () => [
        {
          type: "added",
          doc: {
            id: "r2",
            data: () => baseRequest({ id: "r2", updatedAt: now }),
          },
        },
      ],
    });
    const last = seen[seen.length - 1];
    expect(last.map((r) => r.id)).toEqual(["r2", "r1"]);
    unsub();
  });
});

describe("P2PError", () => {
  it("carries a machine-readable code", () => {
    const e = new P2PError("forbidden", "nope");
    expect(e.code).toBe("forbidden");
    expect(e.message).toBe("nope");
  });
});
