import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Send, Phone, Users, Sparkles, MessageSquare, CheckCheck, Clock, Download } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { isValidPhoneIN } from '../../utils/validation';

const WHATSAPP_TEMPLATE_LIMIT = 1024;

export const WhatsAppBroadcasterDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { devotees } = useData();
  const { showToast } = useToast();

  const [messageTemplate, setMessageTemplate] = useState(
    'Hari Om {{FullName}} Ji (Gotra: {{Gotra}})! \n\nOn the sacred occasion of {{Occasion}}, special Abhishekam has been arranged at {{MandirName}}. Please present your Smart Pass PIN ({{PIN}}) at the gate for VIP Sanctum Prasadam.\n\nSadaiv Shubh Bhavatu,\n{{MandirName}} Seva Trust'
  );
  const [occasion, setOccasion] = useState('Shravan Maha Somavaara');
  const [targetAudience, setTargetAudience] = useState<'all' | 'Ratna' | 'Vishesh' | 'Karmi'>('all');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [deliveryCount, setDeliveryCount] = useState(0);

  const sampleDevotee = devotees[0] || {
    fullName: 'Sri Rameshwar Sharma',
    gotra: 'Kashyapa',
    pin: '7482',
  };

  const previewMessage = messageTemplate
    .replace(/{{FullName}}/g, sampleDevotee.fullName)
    .replace(/{{Gotra}}/g, sampleDevotee.gotra)
    .replace(/{{Occasion}}/g, occasion)
    .replace(/{{MandirName}}/g, activeWorkspace.name)
    .replace(/{{PIN}}/g, sampleDevotee.pin);

  const targetDevotees = devotees.filter((d) => {
    if (targetAudience === 'all') return true;
    return d.sevaTier === targetAudience;
  });

  // Only devotees with a valid Indian mobile can actually receive the Sandesh
  const { reachableDevotees, unreachableCount } = useMemo(() => {
    const reachable = targetDevotees.filter((d) => isValidPhoneIN(d.phone || ''));
    return { reachableDevotees: reachable, unreachableCount: targetDevotees.length - reachable.length };
  }, [targetDevotees]);

  const templateTooLong = messageTemplate.length > WHATSAPP_TEMPLATE_LIMIT;
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (broadcastTimer.current) clearTimeout(broadcastTimer.current);
    };
  }, []);

  const handleSendBroadcast = () => {
    if (!messageTemplate.trim()) {
      showToast('Message body is empty — compose the Sandesh before broadcasting', 'error', 'Empty Message');
      return;
    }
    if (templateTooLong) {
      showToast(
        `Message is ${messageTemplate.length} characters; WhatsApp utility templates are limited to ${WHATSAPP_TEMPLATE_LIMIT}. Please shorten it.`,
        'error',
        'Message Too Long'
      );
      return;
    }
    if (reachableDevotees.length === 0) {
      showToast('No devotees in this segment have a valid 10-digit mobile number — nothing to send', 'error', 'No Recipients');
      return;
    }
    if (unreachableCount > 0) {
      showToast(
        `${unreachableCount} devotee${unreachableCount === 1 ? '' : 's'} skipped — missing or invalid mobile number. Update their records to reach them.`,
        'warning',
        'Some Recipients Skipped'
      );
    }
    setIsBroadcasting(true);
    broadcastTimer.current = setTimeout(() => {
      setIsBroadcasting(false);
      setDeliveryCount(reachableDevotees.length);
      showToast(
        `Dispatched WhatsApp Sandesh to ${reachableDevotees.length} devotees with valid mobile numbers.`,
        'success',
        'Bulk Sandesh Broadcast Complete'
      );
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              High-Throughput Sandesh Engine
            </span>
            <span className="text-xs text-temple-400 font-mono">
              WhatsApp Business API & Twilio Meta Grounded
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            WhatsApp Broadcast & Sandesh Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Automated Utsav notifications, personalized Gotra merge tags, and temple emergency alerts
          </p>
        </div>

        <button
          type="button"
          disabled={isBroadcasting}
          onClick={handleSendBroadcast}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-temple-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isBroadcasting ? 'Broadcasting...' : `Send to ${reachableDevotees.length} Devotees`}</span>
        </button>
      </div>

      {/* Editor & Live Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-extrabold text-sm text-temple-100 pb-2 border-b border-temple-800">
            Broadcast Configuration
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-temple-300 font-semibold mb-1">Target Segment</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
              >
                <option value="all">All Community Members ({devotees.length})</option>
                <option value="Ratna">Ratna Diamond Patrons Only</option>
                <option value="Vishesh">Vishesh Sevadars</option>
                <option value="Karmi">Karmi Active Volunteers</option>
              </select>
            </div>

            <div>
              <label className="block text-temple-300 font-semibold mb-1">Occasion / Utsav</label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-temple-300 font-semibold">
                Message Body (Merge Tags Supported)
              </label>
              <span className={`text-[10px] font-mono ${templateTooLong ? 'text-rose-400 font-bold' : 'text-temple-400'}`}>
                {messageTemplate.length} / {WHATSAPP_TEMPLATE_LIMIT} chars
              </span>
            </div>
            <textarea
              rows={6}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full bg-temple-800 border border-temple-700 rounded-xl p-3 text-xs text-temple-100 font-mono focus:outline-none focus:border-saffron-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-temple-400 py-1">Quick Merge Tags:</span>
            {['{{FullName}}', '{{Gotra}}', '{{Occasion}}', '{{MandirName}}', '{{PIN}}'].map((tag, idx) => (
              <button
                key={tag}
                type="button"
                onClick={() => setMessageTemplate((prev) => `${prev} ${tag}`)}
                className="px-2 py-0.5 rounded bg-temple-800 hover:bg-temple-700 text-[10px] font-mono text-saffron-400 border border-temple-700 cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Live Mobile WhatsApp Chat Preview */}
        <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-temple-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-temple-100">Live Devotee Preview</h3>
              </div>
              <span className="text-[10px] text-temple-400 font-mono">
                Previewing for: {sampleDevotee.fullName}
              </span>
            </div>

            {/* Chat Bubble Canvas */}
            <div className="bg-temple-950 p-4 rounded-2xl border border-temple-800 mt-4 space-y-3 min-h-[220px]">
              <div className="bg-[#005c4b] text-temple-100 p-4 rounded-2xl rounded-tl-sm max-w-[90%] shadow-lg space-y-2 text-xs">
                <p className="whitespace-pre-wrap leading-relaxed">{previewMessage}</p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-temple-300">
                  <span>10:45 AM</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                </div>
              </div>
            </div>
          </div>

          {deliveryCount > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <span>Last Batch Delivered: {deliveryCount} Devotees</span>
              <span className="font-mono font-bold">100% Success</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
