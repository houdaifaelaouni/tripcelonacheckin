// Passenger confirmations. Email is sent automatically when RESEND_API_KEY is
// set; WhatsApp uses a wa.me link the passenger or seller taps to send.
import type { Booking, Ticket, Trip } from '../shared/types';
import { formatEUR } from '../shared/logic';
import { env } from './env';

export const passUrl = (t: Pick<Ticket, 'code'>) => `${env.appUrl}/pass/${t.code}`;

/** With a phone number: opens a chat with that person (seller → customer).
 *  Without: opens WhatsApp's share picker (customer sends it to themselves or friends). */
export function whatsappLink(phone: string | undefined, trip: Trip, tickets: Ticket[]): string {
  const digits = (phone || '').replace(/[^\d]/g, '');
  const lines = [
    `Your Tripcelona ticket${tickets.length > 1 ? 's' : ''} 🚌`,
    `${trip.name} · ${trip.date}`,
    `Departure ${trip.departureTime} from ${trip.meetingPoint}`,
    ...(trip.meetingPointUrl ? [trip.meetingPointUrl] : []),
    '',
    ...tickets.map((t) => `Seat ${t.seat} · ${t.passengerName}: ${passUrl(t)}`),
    '',
    'Show the QR code to the driver when boarding. Please arrive 10 minutes early.',
  ];
  return `https://wa.me/${digits.length >= 8 ? digits : ''}?text=${encodeURIComponent(lines.join('\n'))}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendConfirmationEmail(trip: Trip, booking: Booking, tickets: Ticket[]): Promise<'sent' | 'skipped' | 'failed'> {
  const to = booking.payer.email;
  if (!to || !env.resendApiKey) return 'skipped';
  const rows = tickets
    .map(
      (t) => `<tr><td style="padding:8px 0">Seat <b>${t.seat}</b> · ${esc(t.passengerName)}</td>
      <td style="padding:8px 0;text-align:right"><a href="${passUrl(t)}" style="background:#0052F2;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">Open pass</a></td></tr>`,
    )
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#13171A">
    <h2 style="color:#0052F2;margin-bottom:4px">You're booked! 🚌</h2>
    <p style="margin-top:0">${esc(trip.name)}</p>
    <p><b>${esc(trip.date)}</b> · departure <b>${esc(trip.departureTime)}</b><br/>
    Meeting point: ${esc(trip.meetingPoint)}${trip.meetingPointUrl ? ` (<a href="${esc(trip.meetingPointUrl)}">map</a>)` : ''}</p>
    <table style="width:100%;border-top:1px solid #eee;border-bottom:1px solid #eee">${rows}</table>
    <p>Total paid: ${formatEUR(booking.amount)} · Booking ${booking.id}</p>
    <p style="color:#697077;font-size:13px">Show each QR code to the driver when boarding. Please arrive 10 minutes before departure.</p>
  </div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom, to: [to], subject: `Your Tripcelona tickets · ${trip.name} · ${trip.date}`, html }),
    });
    if (!res.ok) {
      console.warn('[email] Resend rejected', res.status, await res.text());
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.warn('[email] failed', err);
    return 'failed';
  }
}
