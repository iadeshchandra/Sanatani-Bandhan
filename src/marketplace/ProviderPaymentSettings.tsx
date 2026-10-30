/**
 * ProviderPaymentSettings — provider payment method management.
 * =============================================================
 * Option A (default): platform rail — zero setup, commission auto-handled.
 * Option B: own QR / UPI / payment link — needs OWNER APPROVAL.
 * Also: strike transparency + contact-owner channel.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, QrCode, Link2, CheckCircle2, Clock, XCircle, Info, Send, ShieldCheck, AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { friendlyErrorText } from '../lib/friendlyError';
import {
  myPaymentMethod, submitOwnPaymentMethod, usePlatformPayment,
  contactOwner, myInquiries, myStrikes,
  type ProviderPaymentMethod, type ProviderInquiry, type ProviderStrike,
} from '../lib/providerPayments';

const inputCls = 'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm outline-none focus:ring-2 focus:ring-amber-500';
const btnP = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40';
const btnG = 'px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600';

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
  platform_assigned: 'bg-sky-100 text-sky-800',
};

const strikeTypeLabel: Record<string, string> = {
  bypass_attempt: 'Off-platform payment/contact attempt',
  payment_fraud: 'Payment fraud',
  fake_completion: 'False completion claim',
  other: 'Policy violation',
};

export const ProviderPaymentSettings: React.FC<{ providerType: 'purohit' | 'jyotishi'; providerName?: string }> = ({ providerType, providerName }) => {
  const { currentLang } = useLanguage();
  const { showToast } = useToast();
  const [method, setMethod] = useState<ProviderPaymentMethod | null>(null);
  const [strikes, setStrikes] = useState<ProviderStrike[]>([]);
  const [inquiries, setInquiries] = useState<ProviderInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Own-method form
  const [ownType, setOwnType] = useState<'own_qr' | 'own_upi' | 'own_link'>('own_qr');
  const [qrUrl, setQrUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [payLink, setPayLink] = useState('');
  const [acctLabel, setAcctLabel] = useState('');
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Contact owner form
  const [contactOpen, setContactOpen] = useState(false);
  const [cSubject, setCSubject] = useState('');
  const [cMessage, setCMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s, iq] = await Promise.all([myPaymentMethod(), myStrikes(), myInquiries()]);
      setMethod(m); setStrikes(s); setInquiries(iq);
    } catch (e: any) { console.error(e); showToast(friendlyErrorText(e, currentLang, 'save'), 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const submitOwn = async () => {
    setSubmitting(true);
    try {
      await submitOwnPaymentMethod({
        providerType, providerName,
        methodType: ownType,
        details: { qrImageUrl: qrUrl.trim(), upiId: upiId.trim(), paymentLink: payLink.trim(), accountLabel: acctLabel.trim() },
        reason,
      });
      showToast('Submitted for owner approval.', 'success');
      setShowForm(false); setReason(''); setQrUrl(''); setUpiId(''); setPayLink(''); setAcctLabel('');
      load();
    } catch (e: any) { console.error(e); showToast(friendlyErrorText(e, currentLang, 'save'), 'error'); }
    setSubmitting(false);
  };

  const switchToPlatform = async () => {
    if (!confirm('Switch to platform payment? Clients will pay through the platform.')) return;
    try {
      await usePlatformPayment(providerType, providerName);
      showToast('Switched to platform payment.', 'success');
      load();
    } catch (e: any) { console.error(e); showToast(friendlyErrorText(e, currentLang, 'save'), 'error'); }
  };

  const sendInquiry = async () => {
    try {
      await contactOwner({ subject: cSubject, message: cMessage, providerType, providerName });
      showToast('Message sent to the owner.', 'success');
      setContactOpen(false); setCSubject(''); setCMessage(''); load();
    } catch (e: any) { console.error(e); showToast(friendlyErrorText(e, currentLang, 'save'), 'error'); }
  };

  if (loading) return <p className="text-sm text-stone-500 py-10 text-center"><RefreshCw className="w-4 h-4 animate-spin inline" /> Loading…</p>;

  const currentIsPlatform = !method || method.methodType === 'platform' || method.status === 'platform_assigned';

  return (
    <div className="space-y-3">
      {/* Current status */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <p className="text-[11px] font-black text-stone-500 uppercase mb-2">{t('marketplace.provider.currentMethod')}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {currentIsPlatform ? (
            <><ShieldCheck className="w-5 h-5 text-emerald-600" /><p className="text-sm font-black">{t('marketplace.provider.platformPayment')}</p></>
          ) : (
            <><CreditCard className="w-5 h-5 text-amber-600" /><p className="text-sm font-black">
              {method?.methodType === 'own_qr' ? 'My QR code' : method?.methodType === 'own_upi' ? 'My UPI ID' : 'My payment link'}
            </p></>
          )}
          {method && <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${statusBadge[method.status] || 'bg-stone-100'}`}>{method.status.replace('_', ' ')}</span>}
        </div>
        {method?.status === 'rejected' && method.reviewNotes && (
          <p className="text-xs text-red-700 bg-red-50 rounded-xl p-2.5 mt-2">Reason: {method.reviewNotes}</p>
        )}
        <p className="text-[11px] text-stone-500 mt-2">
          {currentIsPlatform
            ? '🪔 Yajmans offer dakshina through the platform. A small seva contribution sustains our dharmic mission; your net dakshina is available for payout.'
            : '🪔 Your approved method is shown to yajmans at booking. The seva contribution still applies to every seva — it sustains Sanatani Bandhan.'}
        </p>
      </div>

      {/* Platform protection note */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-emerald-900">
          <p className="font-black mb-0.5">{t('marketplace.provider.platformProtection')}</p>
          <p>On-platform sevas receive dispute resolution, verified badge, ashirvad accumulation, and guaranteed dakshina processing. Direct arrangements outside the platform receive none of these protections.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        {!currentIsPlatform ? (
          <button type="button" onClick={switchToPlatform} className={`${btnP} w-full`}>{t('marketplace.provider.usePlatform')}</button>
        ) : (
          <button type="button" onClick={() => setShowForm(!showForm)} className={`${btnG} w-full`}>
            <QrCode className="w-3.5 h-3.5 inline mr-1" /> Use my own method
          </button>
        )}
        <button type="button" onClick={() => setContactOpen(true)} className={`${btnG} w-full`}>
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Contact owner
        </button>
      </div>

      {/* Own-method form */}
      {showForm && (
        <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-black">{t('marketplace.provider.requestOwnMethod')}</p>
          <p className="text-[11px] text-stone-500">Requires owner approval. Explain why you need it — e.g. lower fees in your region, existing merchant account.</p>
          <div className="flex gap-1.5">
            {([['own_qr', 'QR code', QrCode], ['own_upi', 'UPI ID', CreditCard], ['own_link', 'Pay link', Link2]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setOwnType(id)}
                className={`flex-1 px-2 py-2.5 min-h-[44px] rounded-xl text-[11px] font-black flex items-center justify-center gap-1 ${ownType === id ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          {ownType === 'own_qr' && (
            <label className="text-[11px] font-bold text-stone-500">{t('marketplace.provider.qrUrl')}<input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} className={inputCls} placeholder="https://…/my-qr.png" /></label>
          )}
          {ownType === 'own_upi' && (
            <label className="text-[11px] font-bold text-stone-500">{t('marketplace.provider.upiId')}<input value={upiId} onChange={(e) => setUpiId(e.target.value)} className={inputCls} placeholder="name@upi" /></label>
          )}
          {ownType === 'own_link' && (
            <label className="text-[11px] font-bold text-stone-500">{t('marketplace.provider.paymentLink')}<input value={payLink} onChange={(e) => setPayLink(e.target.value)} className={inputCls} placeholder="https://…" /></label>
          )}
          <label className="text-[11px] font-bold text-stone-500">Account label (shown to clients)<input value={acctLabel} onChange={(e) => setAcctLabel(e.target.value)} className={inputCls} placeholder="e.g. My bKash merchant" /></label>
          <label className="text-[11px] font-bold text-stone-500">{t('marketplace.provider.whyNeedOwn')}<textarea value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} rows={3} placeholder={t('marketplace.provider.explainBriefly')} /></label>
          <button type="button" disabled={submitting} onClick={submitOwn} className={`${btnP} w-full`}>
            <Send className="w-3.5 h-3.5 inline mr-1" />{submitting ? 'Submitting…' : 'Submit for approval'}
          </button>
        </div>
      )}

      {/* Strikes transparency */}
      {strikes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-[11px] font-black text-red-800 uppercase mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Policy strikes ({strikes.length})</p>
          <div className="space-y-2">
            {strikes.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-2.5 text-[11px]">
                <p className="font-black text-red-700">Strike {s.strikeNumber}: {strikeTypeLabel[s.type] || s.type}</p>
                <p className="text-stone-600 mt-0.5">{s.notes}</p>
                <p className="text-stone-400 mt-1">Action: {s.actionTaken.replace('_', ' ')} · {String((s.createdAt as any)?.toDate?.() || s.createdAt || '').slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inquiry history */}
      {inquiries.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-[11px] font-black text-stone-500 uppercase mb-2">{t('marketplace.provider.myMessages')}</p>
          <div className="space-y-2">
            {inquiries.map((q) => (
              <div key={q.id} className="rounded-xl bg-stone-50 p-2.5 text-[11px]">
                <div className="flex justify-between items-center"><p className="font-black">{q.subject}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${q.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'}`}>{q.status}</span></div>
                <p className="text-stone-600 mt-1">{q.message}</p>
                {q.ownerReply && <p className="text-emerald-800 bg-emerald-50 rounded-lg p-2 mt-1.5"><CheckCircle2 className="w-3 h-3 inline mr-1" />{q.ownerReply}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact owner modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setContactOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black mb-3">{t('marketplace.provider.contactOwner')}</h3>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-stone-500">{t('marketplace.provider.subject')}<input value={cSubject} onChange={(e) => setCSubject(e.target.value)} className={inputCls} placeholder={t('marketplace.provider.subjectExample')} /></label>
              <label className="text-[11px] font-bold text-stone-500">{t('marketplace.provider.message')}<textarea value={cMessage} onChange={(e) => setCMessage(e.target.value)} className={inputCls} rows={4} placeholder={t('marketplace.provider.writeMessage')} /></label>
              <div className="flex gap-2">
                <button type="button" onClick={sendInquiry} className={`${btnP} flex-1`}><Send className="w-3.5 h-3.5 inline mr-1" />Send</button>
                <button type="button" onClick={() => setContactOpen(false)} className={`${btnG} flex-1`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending notice */}
      {method?.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex gap-2 items-start">
          <Clock className="w-4 h-4 text-yellow-700 mt-0.5 shrink-0" />
          <p className="text-[11px] text-yellow-900">Your payment method request is under review. You'll be notified here when the owner decides.</p>
        </div>
      )}
      {method?.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex gap-2 items-start">
          <XCircle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-900">Your request was not approved. You can submit a new request or use the platform payment method.</p>
        </div>
      )}
      <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1"><Info className="w-3 h-3" /> Every seva carries a small seva contribution that sustains our dharmic mission.</p>
    </div>
  );
};
