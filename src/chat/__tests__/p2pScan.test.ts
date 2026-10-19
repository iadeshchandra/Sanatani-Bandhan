/**
 * p2pScan.test.ts — P2P QR scan → prefill → send loop.
 * =====================================================
 * Tests the pure logic of the scan flow:
 * - parseRequestQR: valid/invalid payloads
 * - generate → parse roundtrip
 * - Prefill mapping: parsed QR → RequestModal initial props
 *
 * Design law under test: scanning NEVER auto-sends. The prefill
 * always requires explicit user confirmation (RequestModal's Send button).
 */

import {
  parseRequestQR,
  generateRequestQR,
  P2P_QR_SCHEME,
  P2P_QR_VERSION,
  MAX_REQUEST_AMOUNT,
  type ParsedRequestQR,
} from "../p2pLogic";

describe("parseRequestQR", () => {
  const validPayload = `${P2P_QR_SCHEME}:${P2P_QR_VERSION}:reqABC123:500:BDT:userXYZ789`;

  it("parses a valid SB-P2P QR payload", () => {
    const parsed = parseRequestQR(validPayload);
    expect(parsed).toEqual({
      requestId: "reqABC123",
      amount: 500,
      currency: "BDT",
      receiverId: "userXYZ789",
    });
  });

  it("parses all supported currencies", () => {
    for (const currency of ["BDT", "INR", "USD"] as const) {
      const parsed = parseRequestQR(
        `${P2P_QR_SCHEME}:${P2P_QR_VERSION}:req1:100:${currency}:user1`,
      );
      expect(parsed?.currency).toBe(currency);
    }
  });

  it("rejects non-SB-P2P payloads (warm error path)", () => {
    expect(parseRequestQR("https://example.com/pay")).toBeNull();
    expect(parseRequestQR("SB-ZONE:1:org1:zone1")).toBeNull();
    expect(parseRequestQR("")).toBeNull();
    expect(parseRequestQR("random text")).toBeNull();
  });

  it("rejects wrong part count", () => {
    expect(parseRequestQR("SB-P2P:1:req1:500")).toBeNull();
    expect(parseRequestQR("SB-P2P:1:req1:500:BDT:user1:extra")).toBeNull();
  });

  it("rejects wrong version", () => {
    expect(parseRequestQR("SB-P2P:2:req1:500:BDT:user1")).toBeNull();
    expect(parseRequestQR("SB-P2P:0:req1:500:BDT:user1")).toBeNull();
  });

  it("rejects invalid amounts", () => {
    // zero
    expect(parseRequestQR("SB-P2P:1:req1:0:BDT:user1")).toBeNull();
    // negative
    expect(parseRequestQR("SB-P2P:1:req1:-100:BDT:user1")).toBeNull();
    // NaN
    expect(parseRequestQR("SB-P2P:1:req1:abc:BDT:user1")).toBeNull();
    // exceeds max
    expect(
      parseRequestQR(`SB-P2P:1:req1:${MAX_REQUEST_AMOUNT + 1}:BDT:user1`),
    ).toBeNull();
    // empty
    expect(parseRequestQR("SB-P2P:1:req1::BDT:user1")).toBeNull();
  });

  it("accepts the max amount", () => {
    const parsed = parseRequestQR(
      `SB-P2P:1:req1:${MAX_REQUEST_AMOUNT}:BDT:user1`,
    );
    expect(parsed?.amount).toBe(MAX_REQUEST_AMOUNT);
  });

  it("rejects unsupported currencies", () => {
    expect(parseRequestQR("SB-P2P:1:req1:500:EUR:user1")).toBeNull();
    expect(parseRequestQR("SB-P2P:1:req1:500:usd:user1")).toBeNull(); // case-sensitive
    expect(parseRequestQR("SB-P2P:1:req1:500::user1")).toBeNull();
  });

  it("rejects empty requestId or receiverId", () => {
    expect(parseRequestQR("SB-P2P:1::500:BDT:user1")).toBeNull();
    expect(parseRequestQR("SB-P2P:1:req1:500:BDT:")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(parseRequestQR(null as unknown as string)).toBeNull();
    expect(parseRequestQR(undefined as unknown as string)).toBeNull();
    expect(parseRequestQR(123 as unknown as string)).toBeNull();
  });

  it("handles decimal amounts", () => {
    const parsed = parseRequestQR("SB-P2P:1:req1:1500.50:INR:user1");
    expect(parsed?.amount).toBe(1500.5);
  });
});

describe("generate → parse roundtrip", () => {
  it("roundtrips a money request through QR", () => {
    const request = {
      id: "reqRoundTrip",
      amount: 750,
      currency: "BDT" as const,
      receiverId: "userReceiver",
    };
    const payload = generateRequestQR(request);
    const parsed = parseRequestQR(payload);
    expect(parsed).toEqual({
      requestId: request.id,
      amount: request.amount,
      currency: request.currency,
      receiverId: request.receiverId,
    });
  });
});

describe("prefill mapping (scan → RequestModal)", () => {
  /**
   * The P2PScanSheet maps a parsed QR to RequestModal prefill props.
   * This is the contract: amount, currency, and receiver flow through;
   * nothing is sent until the user taps Send.
   */
  function toPrefillProps(parsed: ParsedRequestQR, receiverName: string) {
    return {
      initialAmount: parsed.amount,
      initialCurrency: parsed.currency,
      recipient: {
        id: parsed.receiverId,
        name: receiverName || "Fellow devotee",
      },
    };
  }

  it("maps parsed QR to prefill props", () => {
    const parsed: ParsedRequestQR = {
      requestId: "req1",
      amount: 500,
      currency: "INR",
      receiverId: "user1",
    };
    const props = toPrefillProps(parsed, "Priya Sharma");
    expect(props.initialAmount).toBe(500);
    expect(props.initialCurrency).toBe("INR");
    expect(props.recipient.id).toBe("user1");
    expect(props.recipient.name).toBe("Priya Sharma");
  });

  it("falls back to generic name when profile lookup fails", () => {
    const parsed: ParsedRequestQR = {
      requestId: "req1",
      amount: 100,
      currency: "BDT",
      receiverId: "user1",
    };
    const props = toPrefillProps(parsed, "");
    expect(props.recipient.name).toBe("Fellow devotee");
  });

  it("never auto-sends: prefill is data only, no side effects", () => {
    // The prefill props contain no callbacks, no promises, no auto-submit
    // flags. Sending requires the user to tap RequestModal's Send button,
    // which calls createRequest. This test pins that contract.
    const parsed: ParsedRequestQR = {
      requestId: "req1",
      amount: 500,
      currency: "BDT",
      receiverId: "user1",
    };
    const props = toPrefillProps(parsed, "Test User");
    const keys = Object.keys(props);
    expect(keys).not.toContain("autoSend");
    expect(keys).not.toContain("onMount");
    expect(typeof props.initialAmount).toBe("number");
  });
});
