import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrImage({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-paper" />;
  return <img src={src} width={size} height={size} alt="Boarding pass QR code" className="rounded-xl" />;
}
