import React, { useEffect, useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  Bus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Armchair,
  FileDown,
  X,
  MessageCircle,
  Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Ticket, TravelTrip } from '../types';
import { generateQrDataUrl } from '../utils/qr';
import { triggerPrintWindow, downloadPrintablePassImage } from '../utils/printPass';
import { generateWhatsAppPassUrl } from '../utils/storage';

interface TicketPassProps {
  ticket: Ticket;
  trip: TravelTrip;
  onNewCheckIn: () => void;
  onGoToValidator?: () => void;
}

export const TicketPass: React.FC<TicketPassProps> = ({
  ticket,
  trip,
  onNewCheckIn,
  onGoToValidator,
}) => {
  const [qrSrc, setQrSrc] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadingPass, setIsDownloadingPass] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateQrDataUrl(ticket.qrPayload)
      .then(url => setQrSrc(url))
      .catch(console.error);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0052F2', '#13171A', '#6980FF', '#B9BFC7'],
      });
    } catch {
      // ignore
    }
  }, [ticket]);

  const validationUrl = `${window.location.origin}${window.location.pathname}?validate=${ticket.id}`;

  const handleCopyValidationLink = async () => {
    try {
      await navigator.clipboard.writeText(validationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadQrOnly = () => {
    if (!qrSrc) return;
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `Tripcelona-QR-${ticket.id}.png`;
    a.click();
  };

  const handleDownloadFullPass = async () => {
    if (!qrSrc) return;
    try {
      setIsDownloadingPass(true);
      await downloadPrintablePassImage(ticket, trip, qrSrc);
      setIsDownloadingPass(false);
    } catch (err) {
      console.error('Failed to generate full pass image:', err);
      setIsDownloadingPass(false);
    }
  };

  const handlePrint = () => {
    if (!qrSrc) return;
    triggerPrintWindow(ticket, trip, qrSrc);
    setShowPrintModal(true);
  };

  return (
    <div className="w-full max-w-[100%] sm:max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in font-gellix">
      {/* Top Notification Banner */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 text-[#1E2024]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-[#D5D9E0] flex items-center justify-center text-[#0052F2] shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#0052F2]" />
          </div>
          <div>
            <h4 className="font-semibold text-[#000000] text-sm">Pass Ready • 55 Places Limited</h4>
            <p className="text-xs text-[#50565B]">
              Passenger: {ticket.firstName} {ticket.lastName} • Seat #{ticket.seatNumber}
            </p>
          </div>
        </div>

        <button
          onClick={onNewCheckIn}
          className="btn-primary w-full sm:w-auto px-3.5 py-2 text-xs flex items-center justify-center gap-1.5 shrink-0 min-h-[40px] sm:min-h-[auto]"
        >
          Check-in Another <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Printable Boarding Pass Card */}
      <div 
        ref={ticketRef} 
        id="printable-ticket" 
        className="w-full relative bg-white border border-[#D5D9E0] rounded-xl sm:rounded-2xl shadow-xs overflow-hidden"
      >
        {/* Pass Header: Brand, Domain, Travel Name, Viajes Code */}
        <div className="w-full p-4 sm:p-6 bg-[#13171A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0052F2] flex items-center justify-center text-white shrink-0">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">Tripcelona</span>
                <span className="text-[11px] font-mono text-[#9FA5AD]">
                  tripcelona.com
                </span>
              </div>
              <p className="text-xs text-[#D5D9E0] font-medium truncate max-w-[260px]">{trip.name}</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:block text-left sm:text-right pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
            <div className="text-[10px] uppercase tracking-wider text-[#9FA5AD] font-mono">Viaje Code</div>
            <div className="font-bold text-sm sm:text-base font-mono text-white tracking-wide">{trip.viajesNumber}</div>
          </div>
        </div>

        {/* Perforated Divider */}
        <div className="relative h-4 bg-white flex items-center justify-between px-2 overflow-hidden border-t border-b border-dashed border-[#D5D9E0]">
          <div className="w-3.5 h-4 -ml-3.5 bg-[#F2F4F8] rounded-r-full border-r border-[#D5D9E0]" />
          <div className="w-full" />
          <div className="w-3.5 h-4 -mr-3.5 bg-[#F2F4F8] rounded-l-full border-l border-[#D5D9E0]" />
        </div>

        {/* Ticket Body: Exact Hierarchical Sequence */}
        <div className="w-full p-4 sm:p-6 md:p-8 flex flex-col md:grid md:grid-cols-3 gap-5 sm:gap-6 bg-white">
          {/* Passenger & Travel Info */}
          <div className="w-full md:col-span-2 space-y-3.5 sm:space-y-4">
            {/* 1. Passenger Name & Surname */}
            <div>
              <div className="eyebrow-s text-[#0052F2] mb-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0052F2]" />
                Passenger
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#000000]">
                {ticket.firstName} {ticket.lastName}
              </div>
            </div>

            {/* 2. Destination Route Box */}
            <div className="w-full bg-[#F2F4F8] rounded-xl p-3.5 sm:p-4 border border-[#D5D9E0]">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#697077] font-semibold mb-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0052F2]" /> Destination Route
              </div>
              <div className="text-base sm:text-lg font-bold text-[#000000]">
                {ticket.destination}
              </div>
              <div className="text-xs text-[#50565B] mt-1 flex items-center gap-1">
                <span>Origin Departure:</span> <span className="text-[#000000] font-semibold">{trip.origin}</span>
              </div>
            </div>

            {/* 3. Travel Meta Grid: Date, Time, Seat Place */}
            <div className="w-full grid grid-cols-3 gap-2 pt-0.5">
              <div className="w-full bg-[#F2F4F8] p-2.5 rounded-lg border border-[#D5D9E0] text-center sm:text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#697077] flex items-center justify-center sm:justify-start gap-1">
                  <Calendar className="w-3 h-3 text-[#0052F2]" /> Date
                </div>
                <div className="text-xs font-semibold text-[#000000] mt-1 truncate font-mono">
                  {trip.date}
                </div>
              </div>

              <div className="w-full bg-[#F2F4F8] p-2.5 rounded-lg border border-[#D5D9E0] text-center sm:text-left">
                <div className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#697077] flex items-center justify-center sm:justify-start gap-1">
                  <Clock className="w-3 h-3 text-[#0052F2]" /> Time
                </div>
                <div className="text-xs font-semibold text-[#000000] mt-1 truncate font-mono">
                  {trip.time || '08:00 AM'}
                </div>
              </div>

              <div className="w-full bg-white p-2.5 rounded-lg border-2 border-[#0052F2] text-center sm:text-left shadow-2xs">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-[#0052F2] flex items-center justify-center sm:justify-start gap-1">
                  <Armchair className="w-3 h-3 text-[#0052F2]" /> Coach Seat
                </div>
                <div className="text-sm sm:text-base font-bold text-[#000000] mt-0.5 font-mono tabular-nums">
                  #{ticket.seatNumber} <span className="text-[10px] font-normal text-[#697077]">/ {trip.capacity || 55}</span>
                </div>
              </div>
            </div>

            {/* 4. Ticket Code & Status */}
            <div className="w-full flex items-center justify-between pt-2.5 text-xs border-t border-[#D5D9E0]">
              <div className="font-mono text-[#50565B] text-[11px]">
                ID: <strong className="text-[#000000] tracking-wider">{ticket.id}</strong>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md font-mono font-semibold text-[10px] tracking-wide border ${
                ticket.status === 'checked_in'
                  ? 'bg-[#00D668]/15 text-[#008A43] border-[#00D668]/40'
                  : 'bg-[#0052F2]/10 text-[#0052F2] border-[#0052F2]/30'
              }`}>
                {ticket.status === 'checked_in' ? 'BOARDED' : 'VALID PASS'}
              </span>
            </div>
          </div>

          {/* 5. Scannable QR Code Column */}
          <div className="w-full md:w-auto flex flex-col items-center justify-center p-4 bg-[#F2F4F8] rounded-xl border border-[#D5D9E0] text-[#000000]">
            <div className="eyebrow-s text-[#0052F2] mb-1.5 text-center text-xs">
              Optical Pass QR
            </div>
            {qrSrc ? (
              <img
                src={qrSrc}
                alt={`QR code for ticket ${ticket.id}`}
                className="w-[80%] max-w-[180px] sm:max-w-[160px] aspect-square object-contain rounded-lg border border-[#D5D9E0] bg-white p-1.5 shadow-2xs"
              />
            ) : (
              <div className="w-36 h-36 bg-white border border-[#D5D9E0] rounded-lg flex items-center justify-center text-xs text-[#868D95]">
                Generating QR...
              </div>
            )}
            <div className="mt-2.5 text-xs font-mono font-bold text-[#000000] tracking-wider text-center">
              {ticket.id}
            </div>
            <div className="text-[10px] text-[#697077] text-center mt-0.5 font-medium font-mono">
              Place {ticket.seatNumber} of {trip.capacity || 55}
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="w-full px-4 sm:px-6 py-2.5 bg-[#F2F4F8] border-t border-[#D5D9E0] flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-[11px] text-[#697077] font-mono gap-1 text-center sm:text-left">
          <span>tripcelona.com · Official Boarding Pass</span>
          <span>Optical Conductor Verification</span>
        </div>
      </div>

      {/* Confirmation & Delivery Dispatch Bar */}
      {(ticket.contactEmail || ticket.whatsappNumber) && (
        <div className="bg-white border border-[#D5D9E0] rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            {ticket.contactEmail && (
              <div className="flex items-center gap-1.5 text-[#000000]">
                <Mail className="w-3.5 h-3.5 text-[#0052F2]" />
                <span>Confirmation sent to: <strong className="font-mono">{ticket.contactEmail}</strong></span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Dispatched</span>
              </div>
            )}
            {ticket.whatsappNumber && (
              <div className="flex items-center gap-1.5 text-[#000000]">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                <span>WhatsApp Mobile: <strong className="font-mono">{ticket.whatsappNumber}</strong></span>
              </div>
            )}
          </div>

          {ticket.whatsappNumber && (
            <a
              href={generateWhatsAppPassUrl(ticket, trip, validationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold text-xs transition-colors shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </a>
          )}
        </div>
      )}

      {/* 6. Action Buttons in Sequence */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <button
          onClick={handlePrint}
          className="btn-primary w-full flex items-center justify-center gap-1.5 py-3 sm:py-2.5 px-2 text-xs min-h-[44px]"
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>1. Print Pass</span>
        </button>

        <button
          onClick={handleDownloadFullPass}
          disabled={isDownloadingPass}
          className="btn-secondary w-full flex items-center justify-center gap-1.5 py-3 sm:py-2.5 px-2 text-xs min-h-[44px]"
          title="Save complete boarding pass card image"
        >
          <FileDown className="w-4 h-4 text-[#0052F2] shrink-0" />
          <span>{isDownloadingPass ? 'Saving...' : '2. Download Pass'}</span>
        </button>

        <button
          onClick={handleCopyValidationLink}
          className="btn-secondary w-full flex items-center justify-center gap-1.5 py-3 sm:py-2.5 px-2 text-xs min-h-[44px]"
          title="Copies separate validation link"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-[#0052F2] shrink-0" />
              <span className="text-[#0052F2]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#50565B] shrink-0" />
              <span>3. Copy Link</span>
            </>
          )}
        </button>

        {onGoToValidator && (
          <button
            onClick={onGoToValidator}
            className="btn-secondary w-full flex items-center justify-center gap-1.5 py-3 sm:py-2.5 px-2 text-xs min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4 text-[#0052F2] shrink-0" />
            <span>4. Validator</span>
          </button>
        )}
      </div>

      {/* Print Options / Fallback Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[4%] bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
          <div className="relative w-full max-w-md bg-white border border-[#D5D9E0] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D5D9E0] pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#0052F2]" />
                <h3 className="font-semibold text-base text-[#000000]">Print Boarding Pass</h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#50565B] leading-relaxed">
              Print dialog triggered! If your phone or browser blocked the pop-up, you can save the pass graphic directly below:
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => triggerPrintWindow(ticket, trip, qrSrc)}
                className="btn-primary w-full py-3 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                <span>Open Printer Dialog Again</span>
              </button>

              <button
                onClick={handleDownloadFullPass}
                disabled={isDownloadingPass}
                className="btn-secondary w-full py-3 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <FileDown className="w-4 h-4 text-[#0052F2]" />
                <span>Save High-Res Boarding Pass (PNG)</span>
              </button>

              <button
                onClick={handleDownloadQrOnly}
                className="btn-tertiary w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Code Only</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#D5D9E0] text-[11px] text-[#697077] text-center">
              Pass ID: <code className="text-[#000000] font-mono font-bold">{ticket.id}</code> • Seat #{ticket.seatNumber}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
