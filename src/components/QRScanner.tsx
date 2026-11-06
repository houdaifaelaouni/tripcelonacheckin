import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  Search, 
  RefreshCw, 
  AlertCircle
} from 'lucide-react';
import { Ticket } from '../types';

interface QRScannerProps {
  onScan: (code: string) => void;
  sampleTickets: Ticket[];
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, sampleTickets }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this device/browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access in browser settings.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError(err.message || 'Could not start camera stream.');
        }
      } else {
        setCameraError('Could not start camera stream.');
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            stopCamera();
            onScan(code.data);
            return;
          }
        }
      }
    }

    if (isScanning || streamRef.current) {
      animationFrameId.current = requestAnimationFrame(tick);
    }
  };

  const toggleFacingMode = () => {
    stopCamera();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            onScan(code.data);
          } else {
            alert('No valid QR code was detected in this image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 md:p-6 shadow-xs space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="w-full flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-[#000000] flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#0052F2]" />
            Live Pass Scanner
          </h3>
          <p className="text-xs text-[#697077] mt-0.5">
            Scan passenger QR code with camera, or enter Ticket ID
          </p>
        </div>

        {isScanning && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleFacingMode}
              className="btn-secondary p-2 text-[#1E2024]"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={stopCamera}
              className="btn-secondary px-2.5 py-1.5 text-xs text-[#F23845] border-[#FFCCD0] hover:bg-[#FFF2F2]"
            >
              <CameraOff className="w-3.5 h-3.5 sm:mr-1 inline" /> <span className="hidden sm:inline">Stop</span>
            </button>
          </div>
        )}
      </div>

      {/* Video Viewport / Scanner Window (Fluid Percentage Width) */}
      <div className="w-full aspect-[4/3] sm:aspect-video max-w-full sm:max-w-md mx-auto bg-[#13171A] rounded-xl overflow-hidden border border-[#D5D9E0] flex items-center justify-center relative">
        <canvas ref={canvasRef} className="hidden" />

        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`}
        />

        {/* Overlay Target Box when scanning */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
            <div className="relative w-[75%] max-w-[220px] aspect-square border-2 border-[#0052F2] rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-[#0052F2] rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-[#0052F2] rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-[#0052F2] rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-[#0052F2] rounded-br-sm" />

              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0052F2] to-transparent animate-scan" />
            </div>
            <div className="absolute bottom-3 bg-black/90 text-white text-[10px] font-mono font-semibold px-3 py-1 rounded-md border border-white/20 backdrop-blur-xs text-center tracking-wide">
              ALIGN PASS QR IN RETICLE
            </div>
          </div>
        )}

        {/* Idle / Camera Off State */}
        {!isScanning && (
          <div className="text-center p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center mx-auto text-[#4083FF]">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Camera Scanner Ready</p>
              <p className="text-xs text-[#9FA5AD] mt-0.5 max-w-xs mx-auto">
                Scan passenger QR code on phone or printed pass
              </p>
            </div>

            {cameraError && (
              <div className="p-2.5 rounded-lg bg-white/10 text-white text-xs flex items-center gap-2 max-w-xs mx-auto text-left border border-white/20">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#FF7D78]" />
                <span className="text-[11px] leading-snug">{cameraError}</span>
              </div>
            )}

            <button
              onClick={startCamera}
              className="btn-primary w-full sm:w-auto px-4 py-2.5 text-xs font-medium inline-flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Camera className="w-4 h-4" /> Start Camera Scanner
            </button>
          </div>
        )}
      </div>

      {/* Manual Input or Image File Upload */}
      <div className="w-full space-y-2.5 pt-1">
        <form onSubmit={handleManualSubmit} className="w-full flex flex-col sm:flex-row gap-2">
          <div className="relative w-full flex-1">
            <Search className="w-4 h-4 text-[#868D95] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Or enter Ticket ID (e.g. VIAJE-01-001)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full bg-white border border-[#D5D9E0] rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-xs text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2] font-mono"
            />
          </div>
          <button
            type="submit"
            className="btn-secondary w-full sm:w-auto px-4 py-2.5 text-xs font-medium min-h-[42px] flex items-center justify-center"
          >
            Validate
          </button>
        </form>

        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#697077] pt-1 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#0052F2] transition-colors font-medium">
            <Upload className="w-3.5 h-3.5 text-[#0052F2]" />
            <span>Upload QR image file</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>

          {/* Quick test buttons */}
          {sampleTickets.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#868D95]">Test:</span>
              <button
                type="button"
                onClick={() => onScan(sampleTickets[0].id)}
                className="px-2 py-1 rounded bg-[#F2F4F8] hover:bg-[#D5D9E0] text-[#0052F2] text-[10px] font-mono border border-[#D5D9E0]"
                title="Test scan ticket"
              >
                {sampleTickets[0].id}
              </button>
              {sampleTickets.length > 3 && (
                <button
                  type="button"
                  onClick={() => onScan(sampleTickets[3].id)}
                  className="px-2 py-1 rounded bg-[#F2F4F8] hover:bg-[#D5D9E0] text-[#0052F2] text-[10px] font-mono border border-[#D5D9E0]"
                  title="Test scan ticket"
                >
                  {sampleTickets[3].id}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
