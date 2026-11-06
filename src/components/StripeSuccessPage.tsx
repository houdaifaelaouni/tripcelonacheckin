import React, { useState, useEffect, useRef } from 'react';
import { 
  Bus, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Mail, 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  RefreshCw,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Ticket, TravelTrip } from '../types';
import { TicketPass } from './TicketPass';
import { generateWhatsAppPassUrl } from '../utils/storage';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';

interface StripeSuccessPageProps {
  account: 1 | 2;
  onGoBackToBooking: () => void;
}

export const StripeSuccessPage: React.FC<StripeSuccessPageProps> = ({
  account,
  onGoBackToBooking,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [trip, setTrip] = useState<TravelTrip | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const hasCelebrated = useRef(false);

  // Read session_id from URL
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('session_id') || '';
    }
    return '';
  });

  const checkSession = async (sid: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/checkout/session?id=${encodeURIComponent(sid)}&account=${account}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}: Failed to check payment status`);
      }

      const data = await res.json();
      if (data.paid && data.ticket) {
        setTicket(data.ticket);
        setTrip(data.trip || null);
        setIsPaid(true);
        setLoading(false);
        setError(null);

        if (!hasCelebrated.current) {
          hasCelebrated.current = true;
          sounds.playSuccess();
          try {
            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#0052F2', '#13171A', '#4083FF', '#FFFFFF', '#25D366'],
            });
          } catch {
            // ignore confetti error
          }
        }
        return true;
      }
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return false;
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setError('Missing Stripe Checkout Session ID in URL. Please return to the booking page.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 15; // 15 attempts * 2s = 30 seconds

    const poll = async () => {
      attempts += 1;
      setPollCount(attempts);
      const paid = await checkSession(sessionId);

      if (!isMounted) return;

      if (!paid) {
        if (attempts < maxAttempts) {
          timer = setTimeout(poll, 2000);
        } else {
          setLoading(false);
          // 30s elapsed without paid status
          setError(
            'We are still waiting for Stripe confirmation. If your payment was completed, your pass has been registered and will be emailed to you shortly.'
          );
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, account]);

  const handleManualRetry = () => {
    setLoading(true);
    setError(null);
    setPollCount(0);
    checkSession(sessionId).then((paid) => {
      if (!paid) {
        setLoading(false);
      }
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 font-gellix text-[#000000] py-6 animate-fade-in">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBackToBooking}
          className="btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Coach Departures</span>
        </button>

        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0052F2] font-semibold flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Stripe Account {account} Checkout</span>
        </span>
      </div>

      {/* Loading & Polling State */}
      {loading && !isPaid && (
        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#0052F2]/10 border border-[#0052F2]/20 text-[#0052F2] flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#000000]">
              Confirming Payment with Stripe…
            </h2>
            <p className="text-xs sm:text-sm text-[#697077] max-w-md mx-auto">
              Please wait a moment while we verify your transaction and issue your digital QR boarding pass.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F2F4F8] border border-[#D5D9E0] text-[11px] font-mono text-[#50565B]">
            <span>Verification check {pollCount} of 15 (Polling every 2s)</span>
          </div>
        </div>
      )}

      {/* Error / Timeout State (when not paid yet) */}
      {!loading && !isPaid && error && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-bold text-base text-[#000000]">Payment Status Update</h3>
              <p className="text-xs text-[#50565B] leading-relaxed">
                {error}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleManualRetry}
              className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-check Status Now</span>
            </button>

            <button
              onClick={onGoBackToBooking}
              className="btn-secondary px-4 py-2 text-xs font-semibold"
            >
              Return to Bookings
            </button>
          </div>
        </div>
      )}

      {/* Confirmed & Paid: Render Official Gellix Boarding Pass ONLY */}
      {isPaid && ticket && (
        <div className="space-y-5">
          {/* Success Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-emerald-900 shadow-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h2 className="font-bold text-base sm:text-lg">
                Payment Confirmed · Place #{ticket.seatNumber} Reserved!
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your Stripe transaction of €{(ticket.amountPaid || trip?.price || 25).toFixed(2)} was successfully processed on Stripe Account {account}. Your boarding pass is verified and ready for check-in.
              </p>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email dispatch badge */}
            <div className="bg-white border border-[#D5D9E0] rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#0052F2]/10 text-[#0052F2] flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#000000]">Email Receipt &amp; Pass</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    DISPATCHED
                  </span>
                </div>
                <p className="text-xs text-[#50565B] truncate mt-0.5 font-mono">
                  {ticket.contactEmail}
                </p>
                <span className="text-[10px] text-[#868D95] block mt-1">
                  Full receipt and itinerary delivered to inbox
                </span>
              </div>
            </div>

            {/* WhatsApp pass button */}
            <div className="bg-white border border-[#D5D9E0] rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#000000]">WhatsApp Instant Pass</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    READY
                  </span>
                </div>
                <p className="text-xs text-[#50565B] truncate mt-0.5 font-mono">
                  {ticket.whatsappNumber || ticket.contactPhone || 'Available'}
                </p>
                {ticket.whatsappNumber && (
                  <a
                    href={generateWhatsAppPassUrl(ticket, trip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Open Pass on WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Scannable Gellix Boarding Pass with Instant Print */}
          <TicketPass
            ticket={ticket}
            trip={trip || {
              id: ticket.tripId,
              name: ticket.destination,
              destination: ticket.destination,
              origin: 'Barcelona Estació',
              date: new Date().toISOString().split('T')[0],
              time: '08:30',
              viajesNumber: 'TC-EXP',
              capacity: 55,
              status: 'scheduled',
              createdAt: new Date().toISOString(),
            }}
            onNewCheckIn={onGoBackToBooking}
          />
        </div>
      )}
    </div>
  );
};
