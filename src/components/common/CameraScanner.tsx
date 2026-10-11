import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface CameraScannerProps {
  onScan: (data: string) => Promise<boolean> | boolean;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<'idle' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        setError('Camera access denied or unavailable.');
        console.error(err);
      }
    };

    const tick = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      if (isScanning && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.width = videoRef.current.videoWidth;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            setIsScanning(false);
            const isValid = await onScan(code.data);
            if (isValid) {
              setScanResult('valid');
              setTimeout(() => {
                onClose();
              }, 1500);
            } else {
              setScanResult('invalid');
              setTimeout(() => {
                setScanResult('idle');
                setIsScanning(true);
              }, 2000);
            }
            return;
          }
        }
      }
      if (isScanning) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onScan, isScanning, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-temple-950">
      <div className="flex items-center justify-between p-4 bg-temple-900 border-b border-temple-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-saffron-500" />
          <h2 className="text-sm font-bold text-temple-100">Scan Digital Puja Pass</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-temple-800 hover:bg-temple-700 text-temple-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="text-red-400 text-sm font-semibold p-4 text-center">{error}</div>
        ) : (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanner Overlay */}
            <div className={`absolute inset-0 z-10 pointer-events-none border-[40px] sm:border-[80px] transition-all duration-300 ${
              scanResult === 'valid' ? 'border-emerald-500/60' : 
              scanResult === 'invalid' ? 'border-rose-500/60' : 
              'border-temple-950/60'
            }`}>
              <div className={`w-full h-full border-2 border-dashed relative transition-colors duration-300 ${
                scanResult === 'valid' ? 'border-emerald-400 text-emerald-400' : 
                scanResult === 'invalid' ? 'border-rose-400 text-rose-400' : 
                'border-saffron-500/50 text-saffron-500'
              }`}>
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-current rounded-tl-lg" />
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-current rounded-tr-lg" />
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-current rounded-bl-lg" />
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-current rounded-br-lg" />
                 
                 {scanResult === 'valid' && (
                   <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm">
                     <div className="bg-emerald-500 text-white p-3 rounded-full animate-bounce shadow-xl shadow-emerald-500/20">
                       <CheckCircle2 className="w-10 h-10" />
                     </div>
                   </div>
                 )}
                 {scanResult === 'invalid' && (
                   <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20 backdrop-blur-sm">
                     <div className="bg-rose-500 text-white p-3 rounded-full animate-bounce shadow-xl shadow-rose-500/20">
                       <XCircle className="w-10 h-10" />
                     </div>
                   </div>
                 )}
              </div>
            </div>
            
            <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20">
              <div className={`backdrop-blur text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl transition-colors duration-300 ${
                scanResult === 'valid' ? 'bg-emerald-500/90' : 
                scanResult === 'invalid' ? 'bg-rose-500/90' : 
                'bg-temple-900/80 text-temple-300'
              }`}>
                {scanResult === 'idle' && <Loader2 className="w-4 h-4 animate-spin text-saffron-500" />}
                {scanResult === 'valid' && <CheckCircle2 className="w-4 h-4" />}
                {scanResult === 'invalid' && <XCircle className="w-4 h-4" />}
                
                {scanResult === 'idle' && 'Align QR Code within the frame'}
                {scanResult === 'valid' && 'Valid Pass! Checking in...'}
                {scanResult === 'invalid' && 'Invalid Pass. Try again.'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
