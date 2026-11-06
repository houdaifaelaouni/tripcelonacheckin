import QRCode from 'qrcode';

export async function generateQrDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    throw err;
  }
}

export function createTicketQrPayload(ticketId: string, tripId: string, passengerName: string): string {
  const validationToken = `TRIPCELONA:${ticketId}:${tripId}`;
  return JSON.stringify({
    app: 'Tripcelona',
    domain: 'tripcelona.com',
    id: ticketId,
    tripId: tripId,
    name: passengerName,
    token: validationToken,
    verifyUrl: `${window.location.origin}${window.location.pathname}?validate=${ticketId}`
  });
}
