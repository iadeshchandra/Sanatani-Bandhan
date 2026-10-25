/**
 * TempleReceiptCard.tsx — VIBE B3: the temple-acknowledgment receipt.
 * ============================================================================
 * The north-star's money-with-sanctity signature: a completed donation
 * yields a receipt composed like a temple acknowledgment — the org's
 * name in display type, the amount in tabular brass, the date WITH
 * its tithi (from the canonical panchang engine, computed from the
 * record's own date), the receipt number the record actually carries,
 * one line of blessing in the user's language, and a working share
 * action (platform share sheet; clipboard fallback).
 *
 * REAL DATA ONLY: every field renders from the transaction record it
 * is handed. A field the record does not carry (no receipt number,
 * no donor name, no payment mode) simply does not appear — nothing
 * is invented, no fallback numbers are fabricated.
 *
 * The card is PAPER: its colours are fixed in CSS (.receipt-paper)
 * and do not flip with Sandhya Mode — a paper receipt stays paper on
 * the counter at dusk, exactly like the printed one.
 *
 * Used at the immediate post-donation moment (Quick Chanda success)
 * and when re-opening a past receipt (devotee donation history, 80G
 * receipts, the Solo personal receipt copy).
 */

import React, { useMemo, useState } from 'react';
import { Share2, Check, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { appLocale } from '../../lib/format';
import { calculatePanchang } from '../../utils/panchang';
import { OrgLogo } from './OrgLogo';
import { useSanctumLite } from './PanchangHeader';
import type { TreasuryTransaction } from '../../types';
import type { GivingRecord } from '../../solo/types';

export interface TempleReceiptData {
  orgName: string;
  logoUrl?: string | null;
  donorName?: string;
  amount: number;
  currencySymbol: string;
  /** ISO timestamp or YYYY-MM-DD, exactly as the record carries it. */
  dateISO: string;
  purpose?: string;
  paymentMode?: string;
  receiptNo?: string;
}

/** Adapter — an org treasury record (donation counter / history / 80G). */
export function receiptDataFromTx(
  tx: TreasuryTransaction,
  orgName: string,
  currencySymbol = '₹',
  logoUrl?: string | null
): TempleReceiptData {
  return {
    orgName,
    logoUrl,
    donorName: tx.devoteeName || undefined,
    amount: tx.amount,
    currencySymbol,
    dateISO: tx.date,
    purpose: tx.purpose || tx.subcategory || tx.category || undefined,
    paymentMode: tx.paymentMode || undefined,
    // Only the number the record actually carries — never a derived
    // placeholder (the widget's TX-80G-… fallback stays out of here).
    receiptNo: tx.taxReceiptNumber || undefined,
  };
}

/** Adapter — a Solo personal giving record (the devotee's own copy). */
export function receiptDataFromGiving(g: GivingRecord): TempleReceiptData {
  return {
    orgName: g.orgName,
    amount: g.amount,
    currencySymbol: '₹',
    dateISO: g.date,
    purpose: g.purpose || undefined,
    receiptNo: g.receiptNo || undefined,
  };
}

/** Parse a record date as the civil day it names: a bare YYYY-MM-DD
 *  is read at LOCAL noon (never UTC-midnight-shifted into the wrong
 *  tithi); full ISO timestamps parse as themselves. */
export function parseRecordDate(dateISO: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const d = new Date(dateISO);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The record date's tithi from the canonical engine — '' when the
 *  engine cannot answer (degrade honestly, never invent). */
export function tithiForDate(dateISO: string): string {
  try {
    const d = parseRecordDate(dateISO);
    if (!d) return '';
    return (calculatePanchang(d).tithi || '').trim();
  } catch {
    return '';
  }
}

export interface ReceiptLabels {
  title: string;
  offeredBy: string;
  purpose: string;
  mode: string;
  receiptNo: string;
  date: string;
  tithi: string;
  blessing: string;
  shareLine: string;
}

/**
 * The share text, built ONLY from the record's own fields (+ the
 * engine's tithi for its date). Lines for absent fields are omitted.
 */
export function buildReceiptShareText(
  data: TempleReceiptData,
  labels: ReceiptLabels,
  tithi: string,
  formattedDate: string,
  formattedAmount: string
): string {
  const lines: string[] = [];
  lines.push(`🪔 ${data.orgName} — ${labels.title}`);
  lines.push(
    labels.shareLine
      .replace('{amount}', formattedAmount)
      .replace('{org}', data.orgName)
  );
  lines.push(`${labels.date}: ${formattedDate}`);
  if (tithi) lines.push(`${labels.tithi}: ${tithi}`);
  if (data.receiptNo) lines.push(`${labels.receiptNo}: ${data.receiptNo}`);
  if (data.purpose) lines.push(`${labels.purpose}: ${data.purpose}`);
  lines.push(labels.blessing);
  return lines.join('\n');
}

export const TempleReceiptCard: React.FC<{
  data: TempleReceiptData;
  /** Hide the share action (e.g. embedded where a parent owns sharing). */
  hideShare?: boolean;
}> = ({ data, hideShare = false }) => {
  const { t } = useLanguage();
  const lite = useSanctumLite();
  const [copied, setCopied] = useState(false);

  const labels: ReceiptLabels = {
    title: t('vibe.receiptTitle'),
    offeredBy: t('vibe.receiptOfferedBy'),
    purpose: t('vibe.receiptPurpose'),
    mode: t('vibe.receiptMode'),
    receiptNo: t('vibe.receiptNo'),
    date: t('vibe.receiptDate'),
    tithi: t('vibe.receiptTithi'),
    blessing: t('vibe.receiptBlessing'),
    shareLine: t('vibe.receiptShareLine'),
  };

  const formattedAmount = useMemo(
    () => `${data.currencySymbol}${data.amount.toLocaleString('en-IN')}`,
    [data.amount, data.currencySymbol]
  );
  const formattedDate = useMemo(() => {
    try {
      const d = parseRecordDate(data.dateISO);
      if (!d) return data.dateISO;
      return new Intl.DateTimeFormat(appLocale(), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return data.dateISO;
    }
  }, [data.dateISO]);
  const tithi = useMemo(() => tithiForDate(data.dateISO), [data.dateISO]);

  const share = async () => {
    const text = buildReceiptShareText(data, labels, tithi, formattedDate, formattedAmount);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `${data.orgName} — ${labels.title}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  };

  const fields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: labels.date, value: formattedDate },
    ...(tithi ? [{ label: labels.tithi, value: tithi }] : []),
    ...(data.receiptNo
      ? [{ label: labels.receiptNo, value: data.receiptNo, mono: true }]
      : []),
    ...(data.donorName ? [{ label: labels.offeredBy, value: data.donorName }] : []),
    ...(data.paymentMode ? [{ label: labels.mode, value: data.paymentMode }] : []),
  ];

  return (
    <article
      className={`receipt-paper lamplight rounded-[24px] px-6 py-6 text-center ${lite ? 'sanctum-lite' : ''}`}
      aria-label={`${data.orgName} — ${labels.title}`}
    >
      <div className="flex justify-center mb-3">
        <OrgLogo name={data.orgName} logoUrl={data.logoUrl} size={64} withRing />
      </div>
      <div className="rp-eyebrow text-[10px] font-black uppercase tracking-[0.28em]">
        ॥ {labels.title} ॥
      </div>
      <h3 className="font-display text-2xl font-black rp-title mt-1.5 leading-snug">
        {data.orgName}
      </h3>

      <div className="hairline-gold mx-auto w-44 my-4" aria-hidden="true" />

      <div className="tnum font-display text-4xl font-black rp-amount">
        {formattedAmount}
      </div>
      {data.purpose && (
        <p className="rp-soft text-sm font-semibold mt-1.5">{data.purpose}</p>
      )}

      <div className="lotus-divider my-4" aria-hidden="true" />

      <dl className="text-left space-y-2 max-w-xs mx-auto">
        {fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4">
            <dt className="rp-faint text-[11px] font-bold uppercase tracking-wider shrink-0">
              {f.label}
            </dt>
            <dd
              className={`rp-ink text-[13px] font-semibold text-right ${f.mono ? 'font-mono tabular-nums' : ''}`}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="rp-blessing text-[13px] italic leading-relaxed mt-5 px-2">
        {labels.blessing}
      </p>

      {!hideShare && (
        <button
          type="button"
          onClick={share}
          className="pressable mt-5 min-h-[48px] w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-sm font-black shadow-lg shadow-amber-600/25 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? t('vibe.receiptCopied') : t('vibe.receiptShare')}
        </button>
      )}
    </article>
  );
};

/** Modal wrapper for re-opening a past receipt from a history list. */
export const TempleReceiptModal: React.FC<{
  data: TempleReceiptData | null;
  onClose: () => void;
}> = ({ data, onClose }) => {
  const { t } = useLanguage();
  if (!data) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('vibe.receiptTitle')}
      onClick={onClose}
    >
      <div className="relative w-full max-w-sm my-auto" onClick={(e) => e.stopPropagation()}>
        <TempleReceiptCard data={data} />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('vibe.receiptClose')}
          className="pressable absolute -top-3 -right-3 min-w-[44px] min-h-[44px] rounded-full bg-white border border-amber-200 text-stone-600 shadow-lg flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TempleReceiptCard;
