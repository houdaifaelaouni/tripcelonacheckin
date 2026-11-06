import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bus, 
  MapPin, 
  Calendar, 
  Armchair, 
  ShieldCheck, 
  Search, 
  CreditCard, 
  QrCode, 
  ArrowRight, 
  Check, 
  Sparkles, 
  X,
  User,
  Mail,
  Phone,
  ChevronRight,
  AlertCircle,
  MessageCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { TravelTrip, Ticket } from '../types';
import { getOccupiedSeats } from '../utils/storage';

interface ClientLandingPageProps {
  trips: TravelTrip[];
  tickets: Ticket[];
  account?: 1 | 2;
  onOpenTripPass?: (ticket: Ticket) => void;
  onGoToStaffLogin?: () => void;
  onSwitchAccount?: (acc: 1 | 2) => void;
}

const COUNTRY_CODES = [
  { code: '+34', label: 'Spain (+34)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+212', label: 'Morocco (+212)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+32', label: 'Belgium (+32)' },
];

export const ClientLandingPage: React.FC<ClientLandingPageProps> = ({
  trips,
  tickets,
  account = 1,
  onOpenTripPass,
  onGoToStaffLogin,
  onSwitchAccount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<TravelTrip | null>(null);

  // Booking Flow State
  const [bookingStep, setBookingStep] = useState<'details' | 'seat'>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+34');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [showCancelledBanner, setShowCancelledBanner] = useState(false);

  // Check if user arrived from a cancelled checkout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('cancelled') === '1') {
        setShowCancelledBanner(true);
      }
    }
  }, []);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchQuery =
        !searchQuery ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.viajesNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDate = !selectedDate || trip.date === selectedDate;

      return matchQuery && matchDate;
    });
  }, [trips, searchQuery, selectedDate]);

  // Start booking a trip
  const handleStartBooking = (trip: TravelTrip) => {
    setSelectedTrip(trip);
    setBookingStep('details');
    setFirstName('');
    setLastName('');
    setEmail('');
    setCountryCode('+34');
    setWhatsappNumber('');
    setSelectedSeat(null);
    setBookingError(null);
    setIsSubmittingCheckout(false);
  };

  const handleCloseBooking = () => {
    setSelectedTrip(null);
    setIsSubmittingCheckout(false);
  };

  // Get occupied seats for the selected trip (excluding expired pending reservations)
  const occupiedSeats = useMemo(() => {
    if (!selectedTrip) return new Set<number>();
    return new Set(getOccupiedSeats(selectedTrip.id, tickets));
  }, [selectedTrip, tickets]);

  // Auto-allocate first free seat
  const handleAutoSelectSeat = () => {
    if (!selectedTrip) return;
    const capacity = selectedTrip.capacity || 55;
    for (let s = 1; s <= capacity; s++) {
      if (!occupiedSeats.has(s)) {
        setSelectedSeat(s);
        break;
      }
    }
  };

  // Proceed from passenger details to seat selection
  const handleProceedToSeat = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setBookingError('Please enter both passenger first name and surname.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setBookingError('Please provide a valid email address to receive your ticket confirmation.');
      return;
    }
    const cleanDigits = whatsappNumber.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 6) {
      setBookingError('Please enter a valid WhatsApp mobile number to receive your boarding pass link.');
      return;
    }

    // Auto-pick seat if none chosen yet
    if (!selectedSeat) {
      handleAutoSelectSeat();
    }
    setBookingStep('seat');
  };

  // Trigger Real Stripe Checkout session via server API
  const handleCreateStripeCheckout = async () => {
    if (!selectedTrip || !selectedSeat) {
      setBookingError('Please choose a valid coach seat.');
      return;
    }

    setBookingError(null);
    setIsSubmittingCheckout(true);

    const fullWhatsApp = `${countryCode} ${whatsappNumber.trim()}`;
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seat: selectedSeat,
          name: fullName,
          email: email.trim(),
          whatsapp: fullWhatsApp,
          account,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize Stripe checkout session.');
      }

      if (data.url) {
        // Redirect browser directly to official Stripe Checkout page
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err: unknown) {
      console.error('Stripe Checkout Error:', err);
      setIsSubmittingCheckout(false);
      setBookingError(
        err instanceof Error
          ? err.message
          : 'Could not redirect to Stripe checkout. Please verify your connection.'
      );
    }
  };

  const currentCapacity = selectedTrip ? selectedTrip.capacity || 55 : 55;
  const tripPrice = selectedTrip ? (selectedTrip.price !== undefined ? selectedTrip.price : 25) : 25;

  return (
    <div className="w-full space-y-8 font-gellix text-[#000000] pb-12 animate-fade-in">
      {/* Cancelled Banner if user returns from Stripe cancel */}
      {showCancelledBanner && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs sm:text-sm">
              Your Stripe checkout was cancelled. Your seat hold was released and you can select a departure again.
            </span>
          </div>
          <button
            onClick={() => setShowCancelledBanner(false)}
            className="p-1 text-amber-700 hover:text-amber-900 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Hero Showcase Section */}
      <section className="relative overflow-hidden rounded-3xl bg-[#13171A] text-white border border-[#242A2E] p-6 sm:p-10 lg:p-12 shadow-md">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052F2]/20 border border-[#0052F2]/40 text-[#4083FF] text-xs font-semibold">
              <Bus className="w-3.5 h-3.5" />
              <span>Official Catalonia Coach Booking · Tripcelona</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-mono">
              <CreditCard className="w-3.5 h-3.5 text-[#4083FF]" />
              <span>Gateway: Account {account}</span>
              {onSwitchAccount && (
                <button
                  onClick={() => onSwitchAccount(account === 1 ? 2 : 1)}
                  className="ml-1 text-[#4083FF] hover:underline font-bold"
                >
                  (Switch to Acc {account === 1 ? '2' : '1'})
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
            Direct Coach Journeys from Barcelona.
          </h1>

          <p className="text-sm sm:text-base text-[#9FA5AD] leading-relaxed max-w-2xl">
            Reserve guaranteed seats on premium 55-place coaches to Costa Brava, Montserrat, Girona, and beyond. Instant digital QR boarding pass issued directly upon official Stripe payment completion.
          </p>

          {/* Quick Search & Filter Bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch gap-2.5 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#868D95] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search destination (e.g. Costa Brava, Montserrat)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#242A2E] border border-[#373D42] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#868D95] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative sm:w-44">
              <Calendar className="w-4 h-4 text-[#868D95] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#242A2E] border border-[#373D42] rounded-xl pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#868D95] hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ambient subtle decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#0052F2]/20 to-transparent pointer-events-none" />
      </section>

      {/* 2. Value Bento Grid: 4 Pillars */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#0052F2] uppercase tracking-wider block mb-1">
            01 · Real-Time
          </span>
          <h3 className="font-bold text-sm text-[#000000]">Live Seat Selection</h3>
          <p className="text-xs text-[#697077] mt-1 leading-snug">
            Choose your window, aisle, or front-row coach seat directly on the 55-place bus map.
          </p>
        </div>

        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#0052F2] uppercase tracking-wider block mb-1">
            02 · Transparent
          </span>
          <h3 className="font-bold text-sm text-[#000000]">Custom Trip Fares</h3>
          <p className="text-xs text-[#697077] mt-1 leading-snug">
            All taxes and luggage included in the listed ticket fare. Zero surprise booking fees.
          </p>
        </div>

        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#0052F2] uppercase tracking-wider block mb-1">
            03 · Seamless
          </span>
          <h3 className="font-bold text-sm text-[#000000]">Instant QR Pass</h3>
          <p className="text-xs text-[#697077] mt-1 leading-snug">
            Board the coach with a single scan. 1-click printable pass and mobile download.
          </p>
        </div>

        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#0052F2] uppercase tracking-wider block mb-1">
            04 · Official
          </span>
          <h3 className="font-bold text-sm text-[#000000]">Real Stripe Checkout</h3>
          <p className="text-xs text-[#697077] mt-1 leading-snug">
            Server-verified checkout with 15-minute seat holds and bank-grade card encryption.
          </p>
        </div>
      </section>

      {/* 3. Scheduled Travels List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#000000] tracking-tight">
              Scheduled Viajes &amp; Departures
            </h2>
            <p className="text-xs text-[#697077] mt-0.5">
              Select a coach departure to choose your seat and reserve your ticket
            </p>
          </div>

          <span className="text-xs font-mono font-semibold text-[#50565B] bg-[#F2F4F8] px-2.5 py-1 rounded-md border border-[#D5D9E0]">
            {filteredTrips.length} {filteredTrips.length === 1 ? 'Viaje' : 'Viajes'} Available
          </span>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="bg-white border border-[#D5D9E0] rounded-2xl p-10 text-center space-y-3">
            <Bus className="w-10 h-10 text-[#B9BFC7] mx-auto" />
            <h3 className="text-base font-semibold text-[#000000]">No Scheduled Travels Found</h3>
            <p className="text-xs text-[#697077] max-w-sm mx-auto">
              There are currently no departures matching your search filters. Try clearing your search query or check back soon.
            </p>
            {(searchQuery || selectedDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDate('');
                }}
                className="btn-secondary px-4 py-2 text-xs font-medium"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((trip) => {
              const capacity = trip.capacity || 55;
              const occupied = getOccupiedSeats(trip.id, tickets);
              const booked = occupied.length;
              const remaining = Math.max(0, capacity - booked);
              const isSoldOut = remaining === 0;
              const price = trip.price !== undefined ? trip.price : 25;

              return (
                <div
                  key={trip.id}
                  className="bg-white border border-[#D5D9E0] hover:border-[#0052F2] rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Tag & Price */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F4F8] text-[#0052F2] border border-[#D5D9E0]">
                        {trip.viajesNumber}
                      </span>
                      <div className="text-right">
                        <span className="font-mono text-xl font-bold text-[#000000] tabular-nums">
                          €{price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#697077] block">per seat</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg text-[#000000] leading-snug">
                      {trip.name}
                    </h3>

                    {/* Route Details */}
                    <div className="space-y-2 py-3 text-xs text-[#50565B]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#868D95] shrink-0" />
                        <span className="text-[#697077]">From:</span>
                        <span className="text-[#000000] font-medium truncate">{trip.origin}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#0052F2] shrink-0" />
                        <span className="text-[#697077]">To:</span>
                        <span className="text-[#000000] font-bold truncate">{trip.destination}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#868D95] shrink-0" />
                        <span className="text-[#697077]">Date:</span>
                        <span className="text-[#000000] font-medium">{trip.date} · {trip.time || '08:30'}</span>
                      </div>
                    </div>

                    {/* Capacity pill */}
                    <div className="pt-2 border-t border-[#E5E9F0] mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#697077] flex items-center gap-1">
                          <Armchair className="w-3.5 h-3.5 text-[#0052F2]" />
                          <span>Coach Seats:</span>
                        </span>
                        <span className={`font-semibold font-mono ${remaining <= 5 ? 'text-[#F23845]' : 'text-[#000000]'}`}>
                          {remaining} / {capacity} available
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-[#E5E9F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isSoldOut ? 'bg-[#F23845]' : 'bg-[#0052F2]'}`}
                          style={{ width: `${Math.min(100, (booked / capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartBooking(trip)}
                    disabled={isSoldOut}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors min-h-[42px] ${
                      isSoldOut
                        ? 'bg-[#E5E9F0] text-[#868D95] cursor-not-allowed'
                        : 'bg-[#0052F2] hover:bg-[#0043c7] text-white shadow-xs'
                    }`}
                  >
                    <span>{isSoldOut ? 'Sold Out' : 'Select Seat & Book'}</span>
                    {!isSoldOut && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Multi-Step Reservation Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
          <div className="relative w-full max-w-[94%] sm:max-w-2xl bg-white border border-[#D5D9E0] rounded-2xl shadow-xl overflow-hidden max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D5D9E0] bg-white sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052F2]/10 border border-[#0052F2]/20 flex items-center justify-center text-[#0052F2]">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#0052F2]">
                      {selectedTrip.viajesNumber}
                    </span>
                    <span className="text-xs text-[#697077]">·</span>
                    <span className="font-mono text-xs font-bold text-[#000000]">
                      €{tripPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-[#697077]">·</span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Stripe Acc {account}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#000000] leading-snug">
                    {selectedTrip.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleCloseBooking}
                disabled={isSubmittingCheckout}
                className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper indicator */}
            <div className="bg-[#F8F9FA] px-4 py-2.5 border-b border-[#D5D9E0] flex items-center justify-between text-xs font-medium">
              <div className={`flex items-center gap-1.5 ${bookingStep === 'details' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'}`}>
                <span className="w-5 h-5 rounded-full bg-white border border-current flex items-center justify-center text-[11px] font-mono">1</span>
                <span>Passenger Details</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#B9BFC7]" />
              <div className={`flex items-center gap-1.5 ${bookingStep === 'seat' ? 'text-[#0052F2] font-semibold' : 'text-[#697077]'}`}>
                <span className="w-5 h-5 rounded-full bg-white border border-current flex items-center justify-center text-[11px] font-mono">2</span>
                <span>Coach Seat &amp; Pay</span>
              </div>
            </div>

            {/* Error Message */}
            {bookingError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* STEP 1: Passenger Details */}
              {bookingStep === 'details' && (
                <form onSubmit={handleProceedToSeat} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#0052F2]" />
                        <span>First Name <span className="text-[#0052F2]">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maria"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#0052F2]" />
                        <span>Surname / Last Name <span className="text-[#0052F2]">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Puigdemont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#0052F2]" />
                        <span>Email Address (For E-Ticket Pass) <span className="text-[#0052F2]">*</span></span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="passenger@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#697077] mt-1 block">
                        We send your receipt and scannable boarding pass here.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                          <span>WhatsApp Mobile Number <span className="text-[#0052F2]">*</span></span>
                        </span>
                        <span className="text-[10px] font-mono text-[#25D366] font-semibold">Instant Pass</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="bg-white border border-[#D5D9E0] rounded-lg px-2 py-2.5 text-xs text-[#000000] font-mono focus:ring-2 focus:ring-[#0052F2] focus:outline-none shrink-0"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          placeholder="612 345 678"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="flex-1 min-w-0 bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] font-mono focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-[#697077] mt-1 block">
                        Direct 1-click boarding pass link sent to your WhatsApp.
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#E5E9F0] text-xs text-[#50565B] space-y-1">
                    <div className="font-semibold text-[#000000] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0052F2]" />
                      <span>Passenger Verification &amp; Pass Delivery:</span>
                    </div>
                    <p>
                      Passenger name must match government photo ID. Your digital boarding pass with scannable QR code will be dispatched to your email and accessible via instant WhatsApp link once Stripe payment completes.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary px-6 py-2.5 text-xs font-semibold flex items-center gap-2 min-h-[42px]"
                    >
                      <span>Continue to Seat Selection</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Interactive Coach Seat Blueprint & Stripe Checkout Redirect */}
              {bookingStep === 'seat' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-[#000000]">Select Coach Seat (1 to {currentCapacity})</h4>
                      <p className="text-xs text-[#697077]">
                        Tap any free seat or let us auto-assign the best available place
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoSelectSeat}
                      className="text-xs font-semibold text-[#0052F2] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Select Best Place</span>
                    </button>
                  </div>

                  {/* Seat Legend */}
                  <div className="flex items-center gap-4 text-xs text-[#697077] py-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-[#0052F2]"></div>
                      <span>Selected ({selectedSeat ? `#${selectedSeat}` : 'None'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-white border border-[#D5D9E0]"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-[#E5E9F0] border border-[#D5D9E0]"></div>
                      <span>Occupied / Held</span>
                    </div>
                  </div>

                  {/* Bus floor plan container */}
                  <div className="bg-[#F8F9FA] border border-[#D5D9E0] rounded-2xl p-4 sm:p-5">
                    {/* Front Cabin */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#D5D9E0] text-[11px] text-[#868D95] font-mono">
                      <span>FRONT OF COACH (DRIVER)</span>
                      <span>ENTRANCE DOOR</span>
                    </div>

                    {/* 4-column seat grid with central aisle */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {Array.from({ length: Math.ceil(currentCapacity / 4) }).map((_, rowIndex) => {
                        const seatLeft1 = rowIndex * 4 + 1;
                        const seatLeft2 = rowIndex * 4 + 2;
                        const seatRight1 = rowIndex * 4 + 3;
                        const seatRight2 = rowIndex * 4 + 4;

                        const renderSeatBtn = (seatNum: number) => {
                          if (seatNum > currentCapacity) return <div key={seatNum} />;
                          const isOccupied = occupiedSeats.has(seatNum);
                          const isCurrent = selectedSeat === seatNum;

                          return (
                            <button
                              key={seatNum}
                              type="button"
                              disabled={isOccupied || isSubmittingCheckout}
                              onClick={() => setSelectedSeat(seatNum)}
                              className={`h-9 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition-all ${
                                isCurrent
                                  ? 'bg-[#0052F2] text-white ring-2 ring-[#0052F2] ring-offset-1 shadow-sm'
                                  : isOccupied
                                  ? 'bg-[#E5E9F0] text-[#B9BFC7] cursor-not-allowed border border-[#D5D9E0]'
                                  : 'bg-white text-[#000000] border border-[#D5D9E0] hover:border-[#0052F2] hover:bg-[#F2F4F8]'
                              }`}
                            >
                              {seatNum}
                            </button>
                          );
                        };

                        return (
                          <React.Fragment key={rowIndex}>
                            {renderSeatBtn(seatLeft1)}
                            {renderSeatBtn(seatLeft2)}
                            {/* Central Aisle */}
                            <div className="flex items-center justify-center text-[10px] text-[#B9BFC7] font-mono select-none">
                              ·
                            </div>
                            {renderSeatBtn(seatRight1)}
                            {renderSeatBtn(seatRight2)}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary & Checkout Button */}
                  <div className="p-4 bg-white border border-[#D5D9E0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="text-xs text-[#697077]">
                        Passenger: <strong className="text-[#000000]">{firstName} {lastName}</strong>
                      </div>
                      <div className="text-xs text-[#697077] mt-0.5">
                        Selected: <strong className="text-[#0052F2]">Seat #{selectedSeat || 'None'}</strong> · Official Fare:{' '}
                        <strong className="text-[#000000] font-mono">€{tripPrice.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-[#697077] flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Holds seat for 15 minutes</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={isSubmittingCheckout}
                      onClick={() => setBookingStep('details')}
                      className="btn-secondary px-4 py-2.5 text-xs font-medium"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateStripeCheckout}
                      disabled={!selectedSeat || isSubmittingCheckout}
                      className="btn-primary px-6 py-2.5 text-xs font-semibold flex items-center gap-2 min-h-[42px]"
                    >
                      {isSubmittingCheckout ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting to Stripe…</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Pay with Stripe (€{tripPrice.toFixed(2)})</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
