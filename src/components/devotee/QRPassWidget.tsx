import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import { RefreshCw, Maximize, X, Shield, Clock, WifiOff } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';

export const QRPassWidget: React.FC = () => {
  const { currentDevotee, activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  
  const [qrData, setQrData] = useState<string>('');
  const [expiryTime, setExpiryTime] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const generateQR = async (force = false) => {
    if (!currentDevotee || !activeWorkspace) return;
    
    // Check rate limit (max 10 per hour)
    const history = JSON.parse(localStorage.getItem('qr_gen_history') || '[]');
    const oneHourAgo = Date.now() - 3600000;
    const recentGens = history.filter((t: number) => t > oneHourAgo);
    
    if (recentGens.length >= 10 && !force) {
      showToast('Rate limit exceeded. Try again later.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      let secret = currentDevotee.qrSecretVaultToken;
      
      // Auto-provision secret if missing (requires online)
      if (!secret) {
        if (isOffline) {
          showToast('Cannot generate first-time QR while offline', 'error');
          setIsGenerating(false);
          return;
        }
        secret = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
        const userRef = doc(db, 'devotees', currentDevotee.id);
        await updateDoc(userRef, { qrSecretVaultToken: secret });
      }

      const timestamp = Date.now();
      const expiry = timestamp + 24 * 60 * 60 * 1000; // 24 hours
      
      const payloadObj = {
        uid: currentDevotee.id,
        workspaceId: activeWorkspace.id,
        timestamp,
        expiry,
        isPublic: currentDevotee.isQrPublic || false
      };
      
      const payloadString = JSON.stringify(payloadObj);
      const signature = CryptoJS.HmacSHA256(payloadString, secret!).toString(CryptoJS.enc.Hex);
      
      const finalQrData = JSON.stringify({
        payload: payloadObj,
        signature
      });

      setQrData(finalQrData);
      setExpiryTime(expiry);
      
      // Cache for offline
      localStorage.setItem('cached_qr_pass', JSON.stringify({
        data: finalQrData,
        expiry
      }));
      
      // Update rate limit history
      localStorage.setItem('qr_gen_history', JSON.stringify([...recentGens, timestamp]));
      
      if (force) showToast('QR Pass Regenerated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to generate QR Pass', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    const cached = localStorage.getItem('cached_qr_pass');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiry > Date.now()) {
        setQrData(parsed.data);
        setExpiryTime(parsed.expiry);
        return;
      }
    }
    generateQR();
  }, [currentDevotee]);

  if (!currentDevotee) return null;

  const hoursLeft = Math.max(0, Math.floor((expiryTime - Date.now()) / 3600000));
  const photo = currentDevotee.photoUrl || currentDevotee.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDevotee.fullName || 'Devotee')}&background=fde68a&color=92400e`;

  return (
    <div className="bg-white rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl border border-saffron-100 max-w-md mx-auto w-full relative overflow-hidden">
      {/* Dynamic Brightness Enhancer */}
      <div className="absolute inset-0 bg-white pointer-events-none mix-blend-overlay brightness-150 z-0" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex justify-between items-center w-full mb-6">
          <h2 className="text-xl font-semibold text-saffron-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Digital Entry Pass
          </h2>
          {isOffline && (
            <span className="flex items-center gap-1 text-xs font-bold bg-temple-50 text-temple-500 px-2 py-1 rounded-full">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        {/* QR Code Canvas Container */}
        <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-temple-100 mb-6 relative">
          {qrData ? (
            <div className="brightness-125 contrast-125">
              <QRCodeSVG 
                value={qrData} 
                size={220} 
                level="H" 
                includeMargin={true}
                fgColor="#1c1917" // temple-900
                bgColor="#ffffff"
              />
            </div>
          ) : (
            <div className="w-[220px] h-[220px] bg-temple-50 flex flex-col items-center justify-center text-temple-400 rounded-xl">
              <RefreshCw className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs font-bold">Generating Secure Pass...</span>
            </div>
          )}
          
          {/* Logo overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow-sm">
            <div className="w-10 h-10 bg-saffron-100 rounded-full flex items-center justify-center border-2 border-white">
              <Shield className="w-5 h-5 text-saffron-700" />
            </div>
          </div>
        </div>

        {/* Devotee Info */}
        <div className="flex items-center gap-4 bg-temple-50 w-full p-4 rounded-xl border border-temple-100 mb-6">
          <img src={photo} alt={currentDevotee.fullName} className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" />
          <div className="text-left">
            <h3 className="font-bold text-temple-900">{currentDevotee.fullName}</h3>
            <p className="text-xs text-temple-500 font-medium tracking-wide">{currentDevotee.sevaTier} • {activeWorkspace?.name}</p>
          </div>
        </div>

        {/* Expiry & Refresh */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs font-bold text-temple-500">
            <Clock className="w-4 h-4 text-saffron-600" />
            {expiryTime > 0 ? (
              <span>Valid for {hoursLeft} hours</span>
            ) : (
              <span>Calculating...</span>
            )}
          </div>
          
          <button 
            onClick={() => generateQR(true)}
            disabled={isGenerating || isOffline}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-temple-50 hover:bg-temple-200 text-temple-700 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
