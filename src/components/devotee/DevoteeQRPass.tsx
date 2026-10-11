import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import { X, RefreshCw, Shield, Clock, WifiOff, Award, User, CheckCircle } from 'lucide-react';
import { DevoteeMember } from '../../types';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';

interface DevoteeQRPassProps {
  isOpen: boolean;
  onClose: () => void;
  devotee: DevoteeMember | null;
  workspaceName?: string;
}

export const DevoteeQRPass: React.FC<DevoteeQRPassProps> = ({ isOpen, onClose, devotee, workspaceName }) => {
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
    if (!devotee || !isOpen) return;
    
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
      let secret = devotee.qrSecretVaultToken;
      
      // Auto-provision secret if missing (requires online)
      if (!secret) {
        if (isOffline) {
          showToast('Cannot generate first-time QR while offline', 'error');
          setIsGenerating(false);
          return;
        }
        secret = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
        const userRef = doc(db, 'devotees', devotee.id);
        await updateDoc(userRef, { qrSecretVaultToken: secret });
      }

      const timestamp = Date.now();
      const expiry = timestamp + 24 * 60 * 60 * 1000; // 24 hours
      
      const payloadObj = {
        uid: devotee.id,
        workspaceId: devotee.workspaceId,
        timestamp,
        expiry,
        isPublic: devotee.isQrPublic || false
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
      showToast('Failed to generate secure QR Pass', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, devotee]);

  if (!isOpen || !devotee) return null;

  const hoursLeft = Math.max(0, Math.floor((expiryTime - Date.now()) / 3600000));
  const photo = devotee.avatarUrl || devotee.photoUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-temple-900/90 backdrop-blur-md">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 border border-temple-200 brightness-110">
        
        {/* Header Pattern */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-600 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-20 backdrop-blur-md"
        >
          <X className="w-4 h-4" />
        </button>

        {isOffline && (
          <div className="absolute top-4 left-4 z-20 bg-temple-900/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
            <WifiOff className="w-3 h-3" /> Offline Mode
          </div>
        )}
        
        <div className="p-8 text-center relative z-10 mt-10">
          {/* Avatar */}
          <div className="w-20 h-20 mx-auto bg-white rounded-xl p-1 shadow-sm mb-3 rotate-3 hover:rotate-0 transition-transform">
            <div className="w-full h-full rounded-xl bg-temple-50 overflow-hidden flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-temple-300" />
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-temple-900 mb-1 leading-tight">
            {devotee.spiritualName || devotee.fullName || devotee.name}
          </h3>
          <p className="text-xs text-temple-500 font-bold uppercase tracking-widest mb-6">
            {workspaceName || 'Digital Pass'}
          </p>
          
          {/* QR Container */}
          <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-temple-100 inline-block mb-6 relative">
            {qrData ? (
              <div className="brightness-110 contrast-125">
                <QRCodeSVG 
                  value={qrData} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
            ) : (
              <div className="w-[200px] h-[200px] bg-temple-50 flex flex-col items-center justify-center text-temple-400 rounded-xl">
                <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-bold">Securing...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-temple-500">
              <Clock className="w-4 h-4 text-emerald-600" />
              {expiryTime > 0 ? (
                <span>Valid {hoursLeft}h</span>
              ) : (
                <span>Loading</span>
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

          <div className="mt-6 flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-50 py-2.5 px-4 rounded-xl border border-emerald-100 w-full">
            <Shield className="w-4 h-4" /> SECURE ENTRY PASS
          </div>
        </div>
      </div>
    </div>
  );
};
