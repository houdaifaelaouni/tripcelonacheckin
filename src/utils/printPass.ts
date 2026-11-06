import { Ticket, TravelTrip } from '../types';

/**
 * Robust print helper that handles iframe restrictions, creates printable documents,
 * and generates high-resolution print-ready boarding pass images.
 */

export function triggerPrintWindow(ticket: Ticket, trip: TravelTrip, qrDataUrl: string): boolean {
  // Try direct window.print() first
  try {
    if (typeof window !== 'undefined') {
      window.print();
    }
  } catch (err) {
    console.warn('Direct window.print() was restricted by browser/iframe:', err);
  }

  // Create an isolated printable iframe to bypass parent CSS or sandbox limits
  try {
    const iframeId = 'tripcelona_print_frame';
    let printFrame = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (printFrame) {
      document.body.removeChild(printFrame);
    }

    printFrame = document.createElement('iframe');
    printFrame.id = iframeId;
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tripcelona Boarding Pass - ${ticket.id}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: 'Gellix', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 20px;
            }
            .pass-card {
              max-width: 650px;
              margin: 0 auto;
              border: 2px solid #000000;
              border-radius: 12px;
              overflow: hidden;
            }
            .header {
              background: #000000;
              color: #ffffff;
              padding: 20px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 12px;
              color: #B9BFC7;
              margin-top: 2px;
            }
            .viaje-badge {
              text-align: right;
              font-family: monospace;
              font-size: 16px;
              font-weight: 700;
            }
            .divider {
              border-top: 2px dashed #B9BFC7;
              margin: 0;
            }
            .body {
              padding: 24px;
              display: flex;
              gap: 24px;
            }
            .info-col {
              flex: 1;
            }
            .qr-col {
              width: 170px;
              text-align: center;
              border-left: 1px solid #D5D9E0;
              padding-left: 20px;
            }
            .label {
              font-size: 10px;
              text-transform: uppercase;
              color: #697077;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .passenger-name {
              font-size: 24px;
              font-weight: 700;
              color: #000000;
              margin: 4px 0 16px 0;
            }
            .route-box {
              background: #F2F4F8;
              border: 1px solid #D5D9E0;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 16px;
            }
            .dest-title {
              font-size: 15px;
              font-weight: 700;
              color: #000000;
            }
            .origin-text {
              font-size: 11px;
              color: #50565B;
              margin-top: 4px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
            }
            .meta-item {
              background: #F2F4F8;
              border: 1px solid #D5D9E0;
              border-radius: 8px;
              padding: 8px;
            }
            .meta-val {
              font-size: 12px;
              font-weight: 700;
              color: #000000;
              margin-top: 2px;
            }
            .seat-box {
              border: 2px solid #0052F2;
              background: #ffffff;
            }
            .seat-val {
              color: #0052F2;
              font-size: 14px;
              font-weight: 800;
            }
            .qr-img {
              width: 140px;
              height: 140px;
              margin-top: 8px;
            }
            .ticket-id {
              font-family: monospace;
              font-size: 11px;
              font-weight: 700;
              margin-top: 8px;
            }
            .footer {
              background: #F2F4F8;
              border-top: 1px solid #D5D9E0;
              padding: 10px 24px;
              font-size: 10px;
              color: #697077;
              display: flex;
              justify-content: space-between;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="pass-card">
            <div class="header">
              <div>
                <div class="brand">Tripcelona • Boarding Pass</div>
                <div class="subtitle">${trip.name}</div>
              </div>
              <div class="viaje-badge">
                <div style="font-size: 10px; color: #B9BFC7;">TRIP VIAJE</div>
                ${trip.viajesNumber}
              </div>
            </div>

            <hr class="divider" />

            <div class="body">
              <div class="info-col">
                <div class="label">Passenger (Name &amp; Surname)</div>
                <div class="passenger-name">${ticket.firstName} ${ticket.lastName}</div>

                <div class="route-box">
                  <div class="label">Destination</div>
                  <div class="dest-title">${ticket.destination}</div>
                  <div class="origin-text">Origin: ${trip.origin}</div>
                </div>

                <div class="meta-grid">
                  <div class="meta-item">
                    <div class="label">Travel Date</div>
                    <div class="meta-val">${trip.date}</div>
                  </div>
                  <div class="meta-item">
                    <div class="label">Time</div>
                    <div class="meta-val">${trip.time || '08:00 AM'}</div>
                  </div>
                  <div class="meta-item seat-box">
                    <div class="label" style="color: #0052F2;">Seat Place</div>
                    <div class="meta-val seat-val">#${ticket.seatNumber} <span style="font-size: 9px; font-weight: normal; color: #697077;">/ 55</span></div>
                  </div>
                </div>
              </div>

              <div class="qr-col">
                <div class="label">Boarding Scan</div>
                <img src="${qrDataUrl}" class="qr-img" alt="QR" />
                <div class="ticket-id">${ticket.id}</div>
                <div style="font-size: 9px; color: #697077; margin-top: 4px;">1 of 55 Limited Places</div>
              </div>
            </div>

            <div class="footer">
              <span>tripcelona.com • Official Passenger Boarding Pass</span>
              <span>Limited 55 Places</span>
            </div>
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (e) {
          console.warn('iframe print triggered an exception:', e);
        }
      }, 350);
    }
  } catch (err) {
    console.error('Print frame creation failed:', err);
  }

  return true;
}

/**
 * Generates and downloads a high-resolution 300 DPI boarding pass PNG image
 * that the user can print directly from any printer, smartphone, or photo viewer.
 */
export async function downloadPrintablePassImage(
  ticket: Ticket, 
  trip: TravelTrip, 
  qrDataUrl: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  // High resolution for crisp printing (1200 x 600 px)
  canvas.width = 1200;
  canvas.height = 620;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer border
  ctx.strokeStyle = '#D5D9E0';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Header Banner: Black
  ctx.fillStyle = '#000000';
  ctx.fillRect(10, 10, canvas.width - 20, 120);

  // Brand Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Gellix", "Poppins", sans-serif';
  ctx.fillText('Tripcelona', 40, 65);

  ctx.fillStyle = '#0052F2';
  ctx.fillRect(250, 40, 140, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 14px "Gellix", "Poppins", sans-serif';
  ctx.fillText('tripcelona.com', 265, 60);

  ctx.fillStyle = '#B9BFC7';
  ctx.font = '500 16px "Gellix", "Poppins", sans-serif';
  ctx.fillText(trip.name, 40, 100);

  // Viaje Badge Right
  ctx.fillStyle = '#B9BFC7';
  ctx.font = '600 14px "Gellix", "Poppins", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('TRAVEL VIAJE', canvas.width - 40, 55);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(trip.viajesNumber, canvas.width - 40, 95);
  ctx.textAlign = 'left';

  // Perforated line
  ctx.strokeStyle = '#B9BFC7';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(10, 130);
  ctx.lineTo(canvas.width - 10, 130);
  ctx.stroke();
  ctx.setLineDash([]);

  // Passenger Name
  ctx.fillStyle = '#0052F2';
  ctx.font = '600 14px "Gellix", "Poppins", sans-serif';
  ctx.fillText('PASSENGER (NAME & SURNAME)', 40, 175);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 40px "Gellix", "Poppins", sans-serif';
  ctx.fillText(`${ticket.firstName} ${ticket.lastName}`, 40, 225);

  // Route Box
  ctx.fillStyle = '#F2F4F8';
  ctx.fillRect(40, 255, 750, 120);
  ctx.strokeStyle = '#D5D9E0';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 255, 750, 120);

  ctx.fillStyle = '#697077';
  ctx.font = '600 14px "Gellix", "Poppins", sans-serif';
  ctx.fillText('DESTINATION', 60, 285);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px "Gellix", "Poppins", sans-serif';
  ctx.fillText(ticket.destination, 60, 320);

  ctx.fillStyle = '#50565B';
  ctx.font = '500 16px "Gellix", "Poppins", sans-serif';
  ctx.fillText(`Origin Departure: ${trip.origin}`, 60, 355);

  // Metadata Grid: Date, Time, Seat
  // Date
  ctx.fillStyle = '#F2F4F8';
  ctx.fillRect(40, 395, 230, 90);
  ctx.strokeRect(40, 395, 230, 90);
  ctx.fillStyle = '#697077';
  ctx.font = '600 13px "Gellix", "Poppins", sans-serif';
  ctx.fillText('TRAVEL DATE', 60, 425);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Gellix", "Poppins", sans-serif';
  ctx.fillText(trip.date, 60, 460);

  // Time
  ctx.fillStyle = '#F2F4F8';
  ctx.fillRect(290, 395, 230, 90);
  ctx.strokeRect(290, 395, 230, 90);
  ctx.fillStyle = '#697077';
  ctx.font = '600 13px "Gellix", "Poppins", sans-serif';
  ctx.fillText('DEPARTURE TIME', 310, 425);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Gellix", "Poppins", sans-serif';
  ctx.fillText(trip.time || '08:00 AM', 310, 460);

  // Seat Badge (Highlighted in Amplitude Blue)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(540, 395, 250, 90);
  ctx.strokeStyle = '#0052F2';
  ctx.lineWidth = 4;
  ctx.strokeRect(540, 395, 250, 90);

  ctx.fillStyle = '#0052F2';
  ctx.font = 'bold 13px "Gellix", "Poppins", sans-serif';
  ctx.fillText('COACH SEAT PLACE', 560, 425);
  ctx.fillStyle = '#0052F2';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(`#${ticket.seatNumber} / 55`, 560, 465);

  // Draw QR Code on the right side
  const qrImage = new Image();
  qrImage.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    qrImage.onload = () => {
      // White container for QR
      ctx.fillStyle = '#F2F4F8';
      ctx.fillRect(830, 155, 330, 370);
      ctx.strokeStyle = '#D5D9E0';
      ctx.lineWidth = 2;
      ctx.strokeRect(830, 155, 330, 370);

      ctx.fillStyle = '#0052F2';
      ctx.font = 'bold 14px "Gellix", "Poppins", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO VALIDATE', 995, 190);

      // QR Image centered
      ctx.drawImage(qrImage, 875, 210, 240, 240);

      // Ticket ID
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(ticket.id, 995, 480);

      ctx.fillStyle = '#697077';
      ctx.font = '500 12px "Gellix", "Poppins", sans-serif';
      ctx.fillText('1 of 55 Limited Places • tripcelona.com', 995, 505);

      resolve();
    };
    qrImage.src = qrDataUrl;
  });

  // Footer bar
  ctx.fillStyle = '#F2F4F8';
  ctx.fillRect(10, 560, canvas.width - 20, 50);
  ctx.fillStyle = '#50565B';
  ctx.font = '500 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Official Tripcelona Passenger Boarding Pass • Limited 55 Places', 30, 590);
  ctx.textAlign = 'right';
  ctx.fillText('Valid for Boarding with Driver QR Scanner', canvas.width - 30, 590);

  // Trigger download
  const imageUri = canvas.toDataURL('image/png');
  const downloadLink = document.createElement('a');
  downloadLink.href = imageUri;
  downloadLink.download = `Tripcelona-BoardingPass-${ticket.id}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

export function triggerPrintManifest(trip: TravelTrip, tickets: Ticket[]): void {
  try {
    const iframeId = 'tripcelona_manifest_frame';
    let printFrame = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (printFrame) {
      document.body.removeChild(printFrame);
    }

    printFrame = document.createElement('iframe');
    printFrame.id = iframeId;
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      const sortedTickets = [...tickets].sort((a, b) => a.seatNumber - b.seatNumber);
      const rowsHtml = sortedTickets.map(t => `
        <tr>
          <td style="font-weight: bold; color: #0052F2; padding: 8px 12px; border-bottom: 1px solid #D5D9E0;">#${t.seatNumber}</td>
          <td style="font-weight: 600; padding: 8px 12px; border-bottom: 1px solid #D5D9E0;">${t.firstName} ${t.lastName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #D5D9E0;">${t.destination}</td>
          <td style="font-family: monospace; padding: 8px 12px; border-bottom: 1px solid #D5D9E0;">${t.id}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #D5D9E0;">${t.status === 'checked_in' ? '✓ BOARDED' : 'PENDING'}</td>
          <td style="font-size: 11px; padding: 8px 12px; border-bottom: 1px solid #D5D9E0;">${t.checkedInAt ? new Date(t.checkedInAt).toLocaleTimeString() : '—'}</td>
        </tr>
      `).join('');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tripcelona Manifest - ${trip.viajesNumber}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Gellix', 'Poppins', -apple-system, sans-serif; color: #000; padding: 10px; margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #000; color: #fff; text-align: left; padding: 8px 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <div>
              <h1 style="margin: 0; font-size: 20px;">Tripcelona Passenger Boarding Manifest</h1>
              <p style="margin: 3px 0 0 0; font-size: 13px; color: #50565B;">${trip.name} • ${trip.origin} ➔ ${trip.destination}</p>
            </div>
            <div style="text-align: right; font-family: monospace;">
              <div style="font-size: 16px; font-weight: bold;">${trip.viajesNumber}</div>
              <div style="font-size: 12px; color: #697077;">Date: ${trip.date} • ${sortedTickets.length}/55 Seats Booked</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Seat</th>
                <th>Passenger Name</th>
                <th>Destination</th>
                <th>Ticket ID</th>
                <th>Status</th>
                <th>Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (e) {
          console.warn('iframe print exception:', e);
        }
      }, 350);
    }
  } catch (err) {
    console.error('Failed to print manifest:', err);
  }
}

