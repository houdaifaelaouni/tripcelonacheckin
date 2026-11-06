import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff } from 'lucide-react';

/**
 * Continuous camera QR scanner. Calls onScan once per new code; while `paused`
 * it keeps the camera on but ignores frames (so the result screen can show).
 */
export function QRScanner({ onScan, paused }: { onScan: (code: string) => void; paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [error, setError] = useState<string | null>(null);
  pausedRef.current = paused;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const v = video.current;
      const c = canvas.current;
      if (!pausedRef.current && v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        const w = 480;
        const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          const now = Date.now();
          // Ignore the same code for 4s so one pass isn't scanned twice.
          if (found?.data && (found.data !== last.current.code || now - last.current.at > 4000)) {
            last.current = { code: found.data, at: now };
            navigator.vibrate?.(60);
            onScan(found.data);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        raf = requestAnimationFrame(tick);
      } catch (e) {
        const name = e instanceof Error ? e.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings, then reload.'
            : 'No camera available. Use the passenger list to board people by name.',
        );
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl2 bg-brand p-6 text-center text-sm text-white/80">
        <CameraOff className="h-8 w-8" />
        {error}
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl2 bg-black">
      <video ref={video} playsInline muted className="h-full w-full object-cover" />
      <canvas ref={canvas} className="hidden" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-3/5 w-3/5 rounded-2xl border-4 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
    </div>
  );
}
