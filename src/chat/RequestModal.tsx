/**
 * RequestModal.tsx — "₨ Request" composer for in-chat money requests.
 * ====================================================================
 * Opened from the ChatThread's request button (Phase 1):
 *   const [reqOpen, setReqOpen] = useState(false);
 *   <button onClick={() => setReqOpen(true)}>₨ <T en="Request" .../></button>
 *   <RequestModal open={reqOpen} onClose={() => setReqOpen(false)}
 *     chatId={thread.id} currentUser={me} recipient={otherParty} asOrg={orgCtx} />
 *
 * Semantics: the SENDER proposes to PAY the recipient (sender = payer).
 * The receiver accepts, the sender marks paid with their own bKash/Nagad/UPI
 * reference, the receiver confirms — coordination only, never custody.
 */

import { useEffect, useMemo, useState } from "react";
import { Building2, HandCoins, Send, X } from "lucide-react";
import { formatMoney, type MoneyRequest, type RequestDirection } from "./types";
import {
  REQUEST_CURRENCIES,
  REQUEST_NOTE_MAX,
  validateAmount,
  type RequestCurrency,
} from "./p2pLogic";
import { P2PError, createRequest } from "./p2pService";
import { T } from "../solo/ui";
import MoneyRequestCard from "./MoneyRequestCard";

export interface RequestRecipient {
  id: string;
  name: string;
  photoUrl?: string;
  /** Set when the recipient is an org (user_to_org). */
  orgId?: string;
  orgName?: string;
  orgLogoUrl?: string;
}

export interface RequestModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  currentUser: { uid: string; displayName: string; photoUrl?: string };
  recipient: RequestRecipient;
  /** Set when a trustee/accountant sends on behalf of an org (org_to_user). */
  asOrg?: { orgId: string; orgName: string; orgLogoUrl?: string } | null;
  onSent?: (requestId: string) => void;
}

const FIELD =
  "min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus:border-amber-500 focus:outline-none";

export default function RequestModal({
  open,
  onClose,
  chatId,
  currentUser,
  recipient,
  asOrg,
  onSent,
}: RequestModalProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<RequestCurrency>("BDT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const direction: RequestDirection = asOrg
    ? "org_to_user"
    : recipient.orgId
      ? "user_to_org"
      : "user_to_user";

  const amountNum = Number(amount);
  const amountErr = amount.trim() === "" ? null : validateAmount(amountNum);

  const draft: MoneyRequest | null = useMemo(() => {
    if (amount.trim() === "" || validateAmount(amountNum) !== null) return null;
    const now = Date.now();
    const receiverIsOrg = direction === "user_to_org";
    return {
      id: "preview",
      direction,
      senderId: currentUser.uid,
      senderName: asOrg ? asOrg.orgName : currentUser.displayName,
      senderPhotoUrl: currentUser.photoUrl,
      senderTrusteeId: asOrg ? currentUser.uid : undefined,
      senderTrusteeName: asOrg ? currentUser.displayName : undefined,
      orgId: asOrg?.orgId ?? recipient.orgId,
      orgName: asOrg?.orgName ?? recipient.orgName,
      orgLogoUrl: asOrg?.orgLogoUrl ?? recipient.orgLogoUrl,
      receiverId: receiverIsOrg ? (recipient.orgId as string) : recipient.id,
      receiverName: receiverIsOrg
        ? (recipient.orgName ?? recipient.name)
        : recipient.name,
      amount: amountNum,
      currency,
      note: note.trim(),
      status: "pending",
      chatId,
      expiresAt: now + 48 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    };
  }, [
    amount,
    amountNum,
    currency,
    note,
    direction,
    asOrg,
    recipient,
    currentUser,
    chatId,
  ]);

  if (!open) return null;

  async function handleSend() {
    const err = validateAmount(Number(amount));
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const receiverIsOrg = direction === "user_to_org";
      const requestId = await createRequest({
        chatId,
        direction,
        senderUid: currentUser.uid,
        senderName: asOrg ? asOrg.orgName : currentUser.displayName,
        senderPhotoUrl: currentUser.photoUrl,
        receiverId: receiverIsOrg ? (recipient.orgId as string) : recipient.id,
        receiverName: receiverIsOrg
          ? (recipient.orgName ?? recipient.name)
          : recipient.name,
        amount: Number(amount),
        currency,
        note: note.trim(),
        orgId: asOrg?.orgId ?? recipient.orgId,
        orgName: asOrg?.orgName ?? recipient.orgName,
        orgLogoUrl: asOrg?.orgLogoUrl ?? recipient.orgLogoUrl,
        senderTrusteeId: asOrg ? currentUser.uid : undefined,
        senderTrusteeName: asOrg ? currentUser.displayName : undefined,
      });
      onSent?.(requestId);
      onClose();
    } catch (e) {
      setError(
        e instanceof P2PError
          ? e.message
          : "Could not send the request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-amber-100 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-extrabold">
              ₨
            </span>
            <T en="Money request" bn="টাকার অনুরোধ" hi="पैसे का अनुरोध" />
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-stone-100"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Direction explainer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900 flex gap-2">
            <HandCoins className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              {asOrg ? (
                <T
                  en={`${asOrg.orgName} will send money to ${recipient.name} after they accept.`}
                  bn={`${asOrg.orgName} গ্রহণের পর ${recipient.name}-কে টাকা পাঠাবে।`}
                  hi={`${asOrg.orgName} स्वीकार करने के बाद ${recipient.name} को पैसे भेजेगा।`}
                />
              ) : (
                <T
                  en={`You will send money to ${recipient.name} after they accept.`}
                  bn={`তারা গ্রহণ করার পর আপনি ${recipient.name}-কে টাকা পাঠাবেন।`}
                  hi={`उनके स्वीकार करने के बाद आप ${recipient.name} को पैसे भेजेंगे।`}
                />
              )}
            </span>
          </div>

          {asOrg && (
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              {asOrg.orgLogoUrl ? (
                <img
                  src={asOrg.orgLogoUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-amber-200"
                />
              ) : (
                <Building2 className="w-5 h-5 text-amber-700" />
              )}
              <T en="Sending as" bn="পাঠানো হচ্ছে" hi="भेजा जा रहा है" />{" "}
              {asOrg.orgName}
            </div>
          )}

          {/* Amount + currency */}
          <div>
            <label className="text-sm font-bold text-stone-800 block mb-1.5">
              <T en="Amount" bn="পরিমাণ" hi="राशि" />
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={1_000_000}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1,000"
                className={`${FIELD} text-xl font-extrabold tabular-nums`}
              />
              <div
                className="flex rounded-xl border border-stone-300 overflow-hidden shrink-0"
                role="group"
                aria-label="Currency"
              >
                {REQUEST_CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`min-h-[44px] min-w-[52px] px-2 text-sm font-bold ${currency === c ? "bg-amber-500 text-white" : "bg-white text-stone-600"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {amountErr && (
              <p className="text-sm font-semibold text-red-600 mt-1">
                {amountErr}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-bold text-stone-800 block mb-1.5">
              <T en="Note (optional)" bn="নোট (ঐচ্ছিক)" hi="नोट (वैकल्पिक)" />
            </label>
            <textarea
              value={note}
              onChange={(e) =>
                setNote(e.target.value.slice(0, REQUEST_NOTE_MAX))
              }
              rows={2}
              maxLength={REQUEST_NOTE_MAX}
              placeholder="e.g. Dakshina for the puja"
              className={`${FIELD} py-2.5 resize-none`}
            />
            <p className="text-xs text-stone-400 text-right tabular-nums">
              {note.length}/{REQUEST_NOTE_MAX}
            </p>
          </div>

          {/* Preview */}
          {draft && (
            <div>
              <p className="text-sm font-bold text-stone-800 mb-1.5">
                <T en="Preview" bn="প্রাকদর্শন" hi="पूर्वावलोकन" />
              </p>
              <MoneyRequestCard
                request={draft}
                currentUid={currentUser.uid}
                preview
                senderVerified={!asOrg}
              />
            </div>
          )}

          {error && (
            <div className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={busy || !draft}
            className="min-h-[48px] w-full rounded-2xl bg-amber-500 text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
          >
            <Send className="w-5 h-5" />
            {busy ? (
              "…"
            ) : (
              <T
                en={
                  draft
                    ? `Send · ${formatMoney(draft.amount, draft.currency)}`
                    : "Send request"
                }
                bn={
                  draft
                    ? `পাঠান · ${formatMoney(draft.amount, draft.currency)}`
                    : "অনুরোধ পাঠান"
                }
                hi={
                  draft
                    ? `भेजें · ${formatMoney(draft.amount, draft.currency)}`
                    : "अनुरोध भेजें"
                }
              />
            )}
          </button>
          <p className="text-xs text-stone-400 text-center">
            <T
              en="Money moves on your own bKash / Nagad / UPI account — this app only tracks the agreement."
              bn="টাকা আপনার নিজের বিকাশ / নগদ / ইউপিআই অ্যাকাউন্টে যাবে — এই অ্যাপ শুধু সমঝোতা ট্র্যাক করে।"
              hi="पैसे आपके अपने बीकैश / नगद / यूपीआई खाते से जाएंगे — यह ऐप केवल समझौते को ट्रैक करता है।"
            />
          </p>
        </div>
      </div>
    </div>
  );
}
