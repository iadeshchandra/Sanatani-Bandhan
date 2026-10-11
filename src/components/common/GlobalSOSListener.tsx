import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Megaphone, MapPin, X } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNotifications } from '../../context/NotificationContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

export const GlobalSOSListener: React.FC = () => {
  const { addNotification } = useNotifications();
  const { currentUser, isAuthenticated, firebaseUser, activeWorkspace } = useAuthWorkspace();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processedSOS = useRef<Set<string>>(new Set());
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Only listen if user is authenticated and active workspace is set to avoid permission errors
    if (!isAuthenticated || !firebaseUser || !activeWorkspace?.id) return;

    // Reset processed SOS on workspace switch
    processedSOS.current.clear();
    setActiveAlerts([]);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'yatra_broadcasts'),
      where('communityId', '==', activeWorkspace.id),
      where('type', '==', 'RICH_SOS')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentActive: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.sosStatus !== 'RESOLVED' && data.status !== 'RESOLVED') {
          currentActive.push({ id: doc.id, ...data });
        }
      });
      setActiveAlerts(currentActive);

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const sos = { id: change.doc.id, ...change.doc.data() } as any;

          // Don't notify if the SOS is already resolved or if we've already processed it locally
          if (sos.sosStatus === 'RESOLVED' || processedSOS.current.has(sos.id)) {
            return;
          }

          // Don't notify the sender themselves
          if (sos.senderId === currentUser?.id) {
            processedSOS.current.add(sos.id);
            return;
          }

          // Mark as processed
          processedSOS.current.add(sos.id);

          // 1. Play intense audio alarm
          if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Intense alert sound
            audioRef.current.loop = false;
          }
          audioRef.current.play().catch(e => console.log('Audio auto-play blocked by browser.'));

          // 2. Trigger In-App Notification Bell
          addNotification({
            title: `🚨 EMERGENCY: ${sos.situation?.replace('_', ' ') || 'SOS'}`,
            message: `${sos.senderName || 'A devotee'} needs urgent help: ${sos.details || sos.text}`,
            type: 'error',
          });

          // 3. Trigger OS Native Push Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`🚨 GLOBAL SOS: ${sos.senderName}`, {
              body: sos.text || sos.details,
              icon: '/favicon.ico',
              requireInteraction: true, // Persist on screen until user clicks
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
              window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'socialWall' }));
            };
          }
        }
      });
    }, (err) => console.warn("Firebase SOS sync:", err.message));

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [addNotification, currentUser?.id, isAuthenticated, firebaseUser, activeWorkspace?.id]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none flex flex-col items-center pt-4 px-4 space-y-2">
      {activeAlerts.map(alert => (
        <div key={alert.id} className="pointer-events-auto w-full max-w-4xl bg-rose-600 border-2 border-rose-400 rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row shadow-rose-900/50">
          <div className="bg-rose-950/40 p-4 sm:w-48 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-rose-500/30 shrink-0">
            <div className="relative">
              <ShieldAlert className="w-10 h-10 text-rose-300 animate-pulse" />
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-rose-900 animate-ping" />
            </div>
            <p className="font-black text-rose-50 text-sm mt-2 tracking-widest text-center">CODE RED</p>
            <p className="text-[10px] text-rose-300 font-bold uppercase mt-0.5">Emergency SOS</p>
          </div>
          
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {alert.situation?.replace('_', ' ') || alert.text || 'Immediate Assistance Required'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-200 bg-rose-950/30 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5" />
                      {alert.location || 'Unknown Location'}
                    </span>
                    <span className="text-xs text-rose-200/80 font-medium">
                      Reported by: <span className="text-white font-bold">{alert.senderName || 'Anonymous'}</span>
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-rose-100 mt-3 border-l-2 border-rose-400/50 pl-3">
                {alert.details || 'A devotee has triggered the SOS alarm. Please mobilize immediate assistance to the reported coordinates.'}
              </p>
            </div>
            
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'socialWall' }))}
                className="px-4 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 transition-colors shadow-lg"
              >
                View in Command Center
              </button>
              
              <button 
                onClick={() => {
                  const msg = `🚨 EMERGENCY ALERT: ${alert.situation?.replace('_', ' ') || 'SOS'} reported by ${alert.senderName || 'a devotee'}. Location: ${alert.location || 'Unknown'}. Please mobilize immediately.`;
                  window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'whatsapp-broadcast' }));
                  // You'd typically pass this to the broadcast module via state/context
                  alert('Navigate to WhatsApp Broadcaster to send: ' + msg);
                }}
                className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-400/30 text-rose-50 font-bold text-xs hover:bg-rose-950/60 transition-colors flex items-center gap-2"
              >
                <Megaphone className="w-3.5 h-3.5" />
                Evacuation Broadcast
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => {
               // To clear it locally for this session if needed, though usually you'd resolve it in DB.
               setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
            }}
            className="absolute top-2 right-2 p-2 text-rose-300 hover:text-white hover:bg-rose-950/50 rounded-xl transition-colors sm:static sm:m-4 sm:self-start"
            title="Dismiss Local Alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );

};
