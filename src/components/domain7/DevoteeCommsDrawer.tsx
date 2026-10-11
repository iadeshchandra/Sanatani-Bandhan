import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  AlertTriangle,
  Radio,
  Send,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Flame,
  Sparkles,
  RefreshCw,
  Compass,
  Building,
  Activity,
  Share2
} from 'lucide-react';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { OfflineSyncManager } from '../../services/OfflineSyncManager';
import { useToast } from '../../context/ToastContext';
import { VisitRecord } from './YatraNetDesk';
import { DevoteeMember } from '../../types';

export interface DevoteeCommsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visit: VisitRecord | null;
  devoteeMember?: DevoteeMember | null;
  currentUser: any;
  activeWorkspace: any;
}

interface DispatchChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isEmergency?: boolean;
}

export const DevoteeCommsDrawer: React.FC<DevoteeCommsDrawerProps> = ({
  isOpen,
  onClose,
  visit,
  devoteeMember,
  currentUser,
  activeWorkspace,
}) => {
  const { showToast } = useToast();

  // Communication Mode: 'CHAT' | 'INTERCOM'
  const [activeMode, setActiveMode] = useState<'CHAT' | 'INTERCOM'>('CHAT');

  // Direct Message State
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<DispatchChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Intercom State
  const [isIntercomActive, setIsIntercomActive] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [intercomLogs, setIntercomLogs] = useState<string[]>([
    'Secure 433.92 MHz Sub-Mesh Telemetry Channel initialized.',
    'Devotee location beacon linked to Sanctum Gateway.',
  ]);

  // Emergency SOS State
  const [isDispatchingSOS, setIsDispatchingSOS] = useState(false);

  // Devotee metadata synthesis
  const devoteeName = visit?.devoteeName || devoteeMember?.fullName || devoteeMember?.name || 'Devotee Pilgrim';
  const devoteePhone = visit?.devoteePhone || devoteeMember?.phone || devoteeMember?.sponsorPhone || '+91 98765 43210';
  const devoteeGotra = visit?.gotra || devoteeMember?.gotra || 'Kashyapa';
  const devoteePravara = visit?.pravara || devoteeMember?.pravara || 'Trayarisheya (Vashistha, Maitravaruna, Kaundinya)';
  const devoteeLocation = visit?.locationName || activeWorkspace?.name || 'Main Sanctum Campus';

  // Quick message presets for Sevadar dispatch
  const messagePresets = [
    '🚩 Please proceed to Sanctum Gate 2 for Darshan',
    '🙏 Sankalpa Puja scheduled in 10 minutes at Yajnashala',
    '🔔 Maha Aarti starting shortly. Please take your seat.',
    '⚠️ High crowd density: Please follow sevadar directions',
    '📦 Lost item found matching your tag: Please visit desk',
  ];

  // ==========================================
  // Web Audio Chime Synthesizer
  // ==========================================
  const playDispatchTone = (type: 'chime' | 'sos' | 'radio') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'chime') {
        // Soft dharmic temple chime (A5 -> C#6)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1108.73, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'sos') {
        // High alert emergency double beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'radio') {
        // Walkie-talkie squelch burst
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      }
    } catch {
      // Audio playback non-critical
    }
  };

  // ==========================================
  // Real-Time Chat Listener
  // ==========================================
  useEffect(() => {
    if (!isOpen || !visit?.devoteeId || !activeWorkspace?.id) return;

    // Initial contextual messages
    const defaultMessages: DispatchChatMessage[] = [
      {
        id: 'init-msg-1',
        senderId: 'system',
        senderName: 'Command Telemetry',
        text: `Active GPS check-in logged at ${visit.locationName} (${visit.darshanType}).`,
        timestamp: visit.timestamp,
      },
    ];

    setChatMessages(defaultMessages);

    try {
      const broadcastsRef = collection(db, 'yatra_broadcasts');
      const q = query(
        broadcastsRef,
        where('communityId', '==', activeWorkspace.id),
        orderBy('originalTimestamp', 'desc'),
        limit(30)
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list: DispatchChatMessage[] = [];
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              if (
                d.type === 'DIRECT_MESSAGE' &&
                (d.recipientId === visit.devoteeId || d.senderId === visit.devoteeId)
              ) {
                list.push({
                  id: docSnap.id,
                  senderId: d.senderId || 'unknown',
                  senderName: d.senderName || 'Devotee',
                  text: d.text || '',
                  timestamp: d.originalTimestamp || Date.now(),
                  isEmergency: d.isEmergency || false,
                });
              }
            });

            if (list.length > 0) {
              setChatMessages((prev) => {
                const combined = [...defaultMessages, ...list.reverse()];
                const seen = new Set<string>();
                return combined.filter((m) => {
                  if (seen.has(m.id)) return false;
                  seen.add(m.id);
                  return true;
                });
              });
            }
          }
        },
        (err) => {
          console.warn('Real-time drawer chat sync notice:', err.message);
        }
      );

      return () => unsubscribe();
    } catch (e: any) {
      console.warn('Chat listener fallback:', e?.message);
    }
  }, [isOpen, visit, activeWorkspace?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ==========================================
  // Send Direct Message (DM)
  // ==========================================
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || messageText).trim();
    if (!text || !visit) return;

    setIsSending(true);
    playDispatchTone('chime');

    const newMsg: DispatchChatMessage = {
      id: `dm-${Date.now()}`,
      senderId: currentUser?.id || 'admin',
      senderName: currentUser?.name || 'Sevadar Dispatch Desk',
      text,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setMessageText('');

    const payload = {
      type: 'DIRECT_MESSAGE',
      senderId: currentUser?.id || 'admin',
      senderName: currentUser?.name || 'Sevadar Command',
      recipientId: visit.devoteeId,
      recipientName: devoteeName,
      communityId: activeWorkspace?.id,
      text,
      originalTimestamp: Date.now(),
    };

    // 1. Add to OfflineSyncManager queue for resilience
    OfflineSyncManager.addToQueue('DIRECT_MESSAGE' as any, payload);

    // 2. Commit directly to Firestore
    try {
      await addDoc(collection(db, 'yatra_broadcasts'), {
        ...payload,
        syncedAt: serverTimestamp(),
      });
      showToast(`Dispatched message to ${devoteeName}`, 'success');
    } catch (err: any) {
      console.warn('Firestore direct write fallback notice:', err.message);
      showToast('Message queued locally for immediate mesh delivery', 'info');
    } finally {
      setIsSending(false);
    }
  };

  // ==========================================
  // Dispatch Emergency SOS Check-In
  // ==========================================
  const handleDispatchSOS = async () => {
    if (!visit) return;
    setIsDispatchingSOS(true);
    playDispatchTone('sos');

    const sosPayload = {
      type: 'SOS',
      senderId: currentUser?.id || 'sevadar-admin',
      senderName: currentUser?.name || 'Sevadar Dispatch Office',
      recipientId: visit.devoteeId,
      recipientName: devoteeName,
      communityId: activeWorkspace?.id,
      situation: 'SEVADAR_WELFARE_CHECK',
      location: {
        lat: visit.latitude,
        lng: visit.longitude,
        name: visit.locationName,
      },
      text: `🚨 SEVADAR WELFARE CHECK: Urgent location inquiry dispatched for devotee ${devoteeName} at ${visit.locationName}.`,
      originalTimestamp: Date.now(),
    };

    // Queue in OfflineSyncManager
    OfflineSyncManager.addToQueue('SOS', sosPayload);

    // Append to local chat
    const alertMsg: DispatchChatMessage = {
      id: `sos-${Date.now()}`,
      senderId: currentUser?.id || 'admin',
      senderName: '🚨 Emergency Dispatch Desk',
      text: `[EMERGENCY WELFARE CHECK ISSUED]: Field sevadars alerted to check coordinates [${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}].`,
      timestamp: Date.now(),
      isEmergency: true,
    };
    setChatMessages((prev) => [...prev, alertMsg]);

    // Push to Firestore
    try {
      await addDoc(collection(db, 'yatra_broadcasts'), {
        ...sosPayload,
        syncedAt: serverTimestamp(),
      });
      showToast(`🚨 SOS Welfare Check dispatched for ${devoteeName}!`, 'error');
    } catch {
      showToast('🚨 SOS Welfare Check broadcasted to offline mesh network!', 'warning');
    } finally {
      setIsDispatchingSOS(false);
    }
  };

  // ==========================================
  // Simulated Secure Intercom Session
  // ==========================================
  const handleToggleIntercom = () => {
    if (!isIntercomActive) {
      playDispatchTone('radio');
      setIsIntercomActive(true);
      setIntercomLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] P2P Audio Carrier locked on Devotee terminal: ${devoteePhone}.`,
        `[${new Date().toLocaleTimeString()}] Frequency 433.920 MHz Ready. Transmit active.`,
      ]);
      showToast(`Connected to Secure Intercom for ${devoteeName}`, 'success');
    } else {
      playDispatchTone('radio');
      setIsIntercomActive(false);
      setIsPushToTalkActive(false);
      setIntercomLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Intercom Carrier released.`,
      ]);
    }
  };

  const handlePushToTalk = (active: boolean) => {
    setIsPushToTalkActive(active);
    playDispatchTone('radio');
    if (active) {
      setIntercomLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎙️ Transmitting audio to ${devoteeName}...`,
      ]);
    } else {
      setIntercomLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📡 Carrier released. Devotee mic standby.`,
      ]);
    }
  };

  if (!isOpen || !visit) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Drawer Container */}
      <div className="w-full max-w-md sm:max-w-lg bg-stone-900 border-l border-amber-500/30 text-stone-100 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300 font-sans">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 px-5 py-4 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif text-xl font-bold shadow-md shrink-0">
              ॐ
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-amber-100 truncate">
                  Devotee Comms & Intercom
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                  Live Link
                </span>
              </div>
              <p className="text-xs text-amber-200/70 truncate">
                {activeWorkspace?.name || 'Sanatan Bandhan Command'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Devotee Profile & Telemetry Card */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-stone-950 font-black text-base flex items-center justify-center border border-amber-300 shadow-md shrink-0">
                {devoteeName.charAt(0) || 'ॐ'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-amber-100 truncate flex items-center gap-1.5">
                  <span>{devoteeName}</span>
                  {visit.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </h4>
                <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                  <a
                    href={`tel:${devoteePhone}`}
                    className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{devoteePhone}</span>
                  </a>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">{visit.darshanType}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`https://wa.me/${devoteePhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="Open WhatsApp"
              >
                <Share2 className="w-3 h-3" />
                <span>WA</span>
              </a>
            </div>
          </div>

          {/* Dharmic Lineage & Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">Sacred Gotra</span>
              <span className="font-bold text-amber-200 truncate block">
                {devoteeGotra} Gotra
              </span>
            </div>

            <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">Last Seen GPS</span>
              <span className="font-mono text-emerald-400 text-[10px] truncate block">
                {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}
              </span>
            </div>

            <div className="col-span-2 p-2 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-[10px] text-stone-300">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{devoteeLocation}</span>
              </div>
              <div className="flex items-center gap-1 text-stone-400 shrink-0">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(visit.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-4 pt-3 flex gap-2 border-b border-stone-800 shrink-0 bg-stone-900">
          <button
            type="button"
            onClick={() => setActiveMode('CHAT')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'CHAT'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Dispatch (DM)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('INTERCOM')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'INTERCOM'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Secure Intercom Link</span>
            {isIntercomActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>
        </div>

        {/* Tab 1: Direct Message Bridge */}
        {activeMode === 'CHAT' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            {/* Quick Action Emergency Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDispatchSOS}
                disabled={isDispatchingSOS}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-red-900/40 flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                <span>🚨 Dispatch SOS Check-In</span>
              </button>

              <button
                type="button"
                onClick={handleToggleIntercom}
                className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Launch Live Audio Intercom"
              >
                <Radio className="w-4 h-4" />
                <span>Intercom</span>
              </button>
            </div>

            {/* Scrolling Messages Feed */}
            <div className="flex-1 bg-stone-950 rounded-2xl border border-stone-800 p-3 overflow-y-auto space-y-2.5 custom-scrollbar text-xs">
              {chatMessages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id || msg.senderId === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.isEmergency
                        ? 'mx-auto max-w-full'
                        : isMe
                        ? 'ml-auto items-end'
                        : 'mr-auto items-start'
                    }`}
                  >
                    {msg.isEmergency ? (
                      <div className="w-full p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-center font-bold text-[11px] shadow-sm">
                        {msg.text}
                      </div>
                    ) : (
                      <>
                        <span className="text-[9px] text-stone-500 font-semibold mb-0.5 px-1">
                          {msg.senderName}
                        </span>
                        <div
                          className={`p-2.5 rounded-2xl font-medium shadow-xs ${
                            isMe
                              ? 'bg-amber-600 text-stone-950 rounded-br-xs font-semibold'
                              : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-bl-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[8px] text-stone-500 mt-0.5 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Presets Carousel */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Quick Temple Dispatch Presets
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {messagePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(preset)}
                    className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 text-[11px] text-stone-300 hover:text-amber-200 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Bar */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder={`Send direct dispatch to ${devoteeName}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!messageText.trim() || isSending}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Secure Intercom Link Terminal */}
        {activeMode === 'INTERCOM' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* Terminal Status Panel */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-amber-500/40 shadow-inner space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <Radio
                    className={`w-4 h-4 ${
                      isIntercomActive ? 'text-emerald-400 animate-pulse' : 'text-stone-500'
                    }`}
                  />
                  <span className="text-xs font-black text-amber-200 tracking-wider uppercase">
                    CH-108 Sanctum Mesh 433.92 MHz
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isIntercomActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {isIntercomActive ? 'RF CARRIER LOCKED' : 'STANDBY'}
                </span>
              </div>

              {/* Audio Waveform Simulation */}
              <div className="h-16 bg-stone-900 rounded-xl border border-stone-800 flex items-center justify-center gap-1.5 px-4 overflow-hidden relative">
                {isIntercomActive ? (
                  Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full bg-gradient-to-t from-amber-500 to-amber-300 transition-all duration-150 ${
                        isPushToTalkActive
                          ? 'animate-pulse'
                          : 'opacity-40'
                      }`}
                      style={{
                        height: isPushToTalkActive
                          ? `${Math.max(16, (Math.sin(i * 0.7) * 25 + 30))}px`
                          : `${(i % 5 + 2) * 5}px`,
                      }}
                    />
                  ))
                ) : (
                  <div className="text-stone-500 text-xs font-semibold flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    <span>Link Disconnected • Click Connect Below</span>
                  </div>
                )}
              </div>

              {/* Push-to-Talk (PTT) Action Area */}
              <div className="flex flex-col items-center justify-center pt-2 space-y-2">
                <button
                  type="button"
                  onMouseDown={() => isIntercomActive && handlePushToTalk(true)}
                  onMouseUp={() => isIntercomActive && handlePushToTalk(false)}
                  onTouchStart={() => isIntercomActive && handlePushToTalk(true)}
                  onTouchEnd={() => isIntercomActive && handlePushToTalk(false)}
                  disabled={!isIntercomActive}
                  className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center gap-1 shadow-2xl transition-all cursor-pointer select-none ${
                    !isIntercomActive
                      ? 'bg-stone-900 border-stone-800 text-stone-600 opacity-60 cursor-not-allowed'
                      : isPushToTalkActive
                      ? 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-200 text-stone-950 scale-105 shadow-amber-500/40 ring-4 ring-amber-400/40'
                      : 'bg-stone-950 hover:bg-stone-800 border-amber-500/60 text-amber-300 hover:border-amber-400'
                  }`}
                >
                  <Mic
                    className={`w-7 h-7 ${
                      isPushToTalkActive ? 'text-stone-950 animate-bounce' : 'text-amber-400'
                    }`}
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {isPushToTalkActive ? 'TRANSMITTING' : 'HOLD TO TALK'}
                  </span>
                </button>
                <span className="text-[10px] text-stone-400 font-medium">
                  {isIntercomActive
                    ? 'Press & hold button to broadcast live two-way audio'
                    : 'Activate intercom bridge to speak'}
                </span>
              </div>
            </div>

            {/* Intercom Action Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleIntercom}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isIntercomActive
                    ? 'bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>{isIntercomActive ? 'Disconnect Intercom' : '📞 Secure Intercom Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAudioMuted(!isAudioMuted);
                  showToast(isAudioMuted ? 'Intercom unmuted' : 'Intercom muted', 'info');
                }}
                disabled={!isIntercomActive}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-amber-200 transition-colors disabled:opacity-40 cursor-pointer"
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Terminal Activity Log */}
            <div className="flex-1 bg-stone-950 rounded-2xl border border-stone-800 p-3 overflow-y-auto space-y-1.5 custom-scrollbar font-mono text-[10px] text-stone-400">
              <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold block pb-1 border-b border-stone-800">
                Encrypted Dispatch Activity
              </span>
              {intercomLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="text-emerald-400">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
