import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Armchair, 
  QrCode, 
  Bus, 
  Calendar, 
  Clock,
  Hash,
  AlertCircle, 
  Plus, 
  ChevronRight,
  Mail,
  MessageCircle
} from 'lucide-react';
import { TravelTrip, Ticket, DEFAULT_CAPACITY } from '../types';
import { createTicket, getOccupiedSeats, getNextAvailableSeat } from '../utils/storage';
import { SeatMapModal } from './SeatMapModal';

const COUNTRY_CODES = [
  { code: '+34', country: 'ES', label: 'Spain (+34)' },
  { code: '+33', country: 'FR', label: 'France (+33)' },
  { code: '+44', country: 'GB', label: 'UK (+44)' },
  { code: '+49', country: 'DE', label: 'Germany (+49)' },
  { code: '+39', country: 'IT', label: 'Italy (+39)' },
  { code: '+351', country: 'PT', label: 'Portugal (+351)' },
  { code: '+1', country: 'US', label: 'US/CA (+1)' },
  { code: '+212', country: 'MA', label: 'Morocco (+212)' },
];

interface CheckInFormProps {
  trips: TravelTrip[];
  activeTrip: TravelTrip | null;
  onSelectTrip: (trip: TravelTrip) => void;
  onOpenNewTripModal: () => void;
  onTicketGenerated: (ticket: Ticket) => void;
  bookedCount: number;
}

export const CheckInForm: React.FC<CheckInFormProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTripModal,
  onTicketGenerated,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+34');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [destination, setDestination] = useState(activeTrip?.destination || '');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTrip) {
      setDestination(activeTrip.destination);
      setSelectedSeat(null);
    }
  }, [activeTrip]);

  if (!activeTrip || trips.length === 0) {
    return (
      <div className="w-full max-w-[100%] sm:max-w-2xl mx-auto font-gellix">
        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#F2F4F8] border border-[#D5D9E0] flex items-center justify-center text-[#0052F2] mx-auto">
            <Bus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="title-s text-[#000000]">No Travels Available Yet</h3>
            <p className="text-xs sm:text-sm text-[#697077] max-w-md mx-auto mt-1">
              Create your first scheduled travel and customize the coach places to start generating boarding passes.
            </p>
          </div>
          <button
            onClick={onOpenNewTripModal}
            className="btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Travel &amp; Places</span>
          </button>
        </div>
      </div>
    );
  }

  const tripCapacity = activeTrip.capacity || DEFAULT_CAPACITY;
  const occupiedSeats = getOccupiedSeats(activeTrip.id);
  const isFull = occupiedSeats.length >= tripCapacity;
  const remaining = Math.max(0, tripCapacity - occupiedSeats.length);
  const nextSeat = getNextAvailableSeat(activeTrip.id, tripCapacity);
  const percentBooked = Math.round((occupiedSeats.length / tripCapacity) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim()) {
      setErrorMsg('Please enter passenger first name.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg('Please enter passenger surname.');
      return;
    }
    if (isFull) {
      setErrorMsg(`Cannot generate pass: all ${tripCapacity} places are fully booked for this travel.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanWa = whatsappPhone.trim() ? `${countryCode}${whatsappPhone.trim().replace(/\D/g, '')}` : undefined;
      const ticket = await createTicket({
        tripId: activeTrip.id,
        firstName,
        lastName,
        contactEmail: email.trim() || undefined,
        whatsappNumber: cleanWa,
        destination: destination.trim() || activeTrip.destination,
        preferredSeat: selectedSeat || undefined,
        capacity: tripCapacity,
        emailDeliveryStatus: email.trim() ? 'sent' : undefined,
        whatsappDeliveryStatus: cleanWa ? 'ready' : undefined,
      });

      setFirstName('');
      setLastName('');
      setEmail('');
      setWhatsappPhone('');
      setSelectedSeat(null);
      setIsSubmitting(false);

      onTicketGenerated(ticket);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred generating ticket.');
      }
    }
  };

  return (
    <div className="w-full max-w-[100%] sm:max-w-2xl mx-auto space-y-4 sm:space-y-6 font-gellix">
      {/* 1. Travel Details Block: Travel Name, Date, Number of Viajes */}
      <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="w-full sm:w-auto">
            <span className="eyebrow-s text-[#0052F2]">
              Travel Details
            </span>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
              <h2 className="title-s text-[#000000]">{activeTrip.name}</h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#F2F4F8] text-[#0052F2] border border-[#D5D9E0]">
                {activeTrip.viajesNumber}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <select
              value={activeTrip.id}
              onChange={(e) => {
                const found = trips.find(t => t.id === e.target.value);
                if (found) {
                  onSelectTrip(found);
                  setDestination(found.destination);
                  setSelectedSeat(null);
                }
              }}
              className="w-full sm:w-auto bg-white border border-[#D5D9E0] text-[#1E2024] text-xs font-medium rounded-lg px-3 py-2 sm:py-1.5 focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
            >
              {trips.map(t => (
                <option key={t.id} value={t.id}>
                  {t.viajesNumber}: {t.name} ({t.capacity || DEFAULT_CAPACITY} places)
                </option>
              ))}
            </select>

            <button
              onClick={onOpenNewTripModal}
              className="btn-secondary p-2 sm:p-1.5 rounded-lg text-[#1E2024] shrink-0"
              title="Create New Travel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sequential Travel Info: Name, Date, Viajes Number */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-[#D5D9E0] text-xs text-[#50565B]">
          <div className="flex items-center gap-2 bg-[#F2F4F8] p-2.5 rounded-lg">
            <Calendar className="w-4 h-4 text-[#0052F2] shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#697077]">1. Travel Date</div>
              <div className="font-semibold text-[#000000] truncate">{activeTrip.date} • {activeTrip.time || '08:00 AM'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#F2F4F8] p-2.5 rounded-lg">
            <Hash className="w-4 h-4 text-[#0052F2] shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#697077]">2. Viajes Number</div>
              <div className="font-semibold text-[#000000] font-mono truncate">{activeTrip.viajesNumber}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#F2F4F8] p-2.5 rounded-lg">
            <Bus className="w-4 h-4 text-[#0052F2] shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#697077]">3. Places Capacity</div>
              <div className="font-semibold text-[#000000]">{tripCapacity} Places Max</div>
            </div>
          </div>
        </div>

        {/* 2. Capacity Indicator: Customized Places Limit */}
        <div className="w-full mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[#D5D9E0]">
          <div className="w-full flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-medium text-[#373D42]">
              <span>Capacity:</span>
              <strong className={isFull ? 'text-[#F23845]' : 'text-[#0052F2]'}>
                {occupiedSeats.length} / {tripCapacity} places booked
              </strong>
            </div>
            <div className="text-[#697077] font-mono text-[11px]">
              {isFull ? (
                <span className="text-[#F23845] font-semibold uppercase">Capacity Full ({tripCapacity}/{tripCapacity})</span>
              ) : (
                <span>{remaining} places remaining</span>
              )}
            </div>
          </div>

          <div className="w-full h-2.5 bg-[#E5E9F0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFull
                  ? 'bg-[#F2F4F8]'
                  : 'bg-[#0052F2]'
              }`}
              style={{ width: `${percentBooked}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Passenger Details Form: First Name, Surname, Destination, Seat Number */}
      <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-6 md:p-8 shadow-xs">
        <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="title-s text-[#000000]">Passenger Check-in</h3>
            <p className="text-s-amp text-[#697077] mt-0.5">
              Enter passenger credentials to issue cloud-backed boarding pass
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="w-full mb-4 sm:mb-6 p-3 rounded-lg bg-[#FFF2F2] border border-[#FFCCD0] text-[#1E2024] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#F23845] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isFull ? (
          <div className="w-full p-6 bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#F23845] mx-auto" />
            <h4 className="font-semibold text-base text-[#000000]">Travel is at Maximum Capacity ({tripCapacity}/{tripCapacity})</h4>
            <p className="text-xs text-[#697077] max-w-md mx-auto">
              All {tripCapacity} places for &quot;{activeTrip.name}&quot; have been generated.
            </p>
            <button
              onClick={onOpenNewTripModal}
              className="btn-primary mt-2 px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Next Viaje
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
            {/* Field 1: First Name */}
            <div className="w-full">
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#0052F2]" />
                1. First Name <span className="text-[#0052F2]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Passenger first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-3 text-base sm:text-sm text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2] transition-all"
              />
            </div>

            {/* Field 2: Surname */}
            <div className="w-full">
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#0052F2]" />
                2. Surname (Last Name) <span className="text-[#0052F2]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Passenger surname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-3 text-base sm:text-sm text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2] transition-all"
              />
            </div>

            {/* Email & WhatsApp Confirmation Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 bg-[#F8F9FA] rounded-xl border border-[#D5D9E0]">
              <div>
                <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#0052F2]" />
                  <span>Email Confirmation</span>
                </label>
                <input
                  type="email"
                  placeholder="passenger@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3 py-2 text-xs text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
                />
                <span className="text-[10px] text-[#697077] block mt-1">Sends PDF boarding pass copy</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp Mobile</span>
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 bg-white border border-[#D5D9E0] text-xs font-mono rounded-lg px-1.5 py-2 text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
                  >
                    {COUNTRY_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.country} {item.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="612 345 678"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    className="flex-1 min-w-0 bg-white border border-[#D5D9E0] rounded-lg px-3 py-2 text-xs text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
                  />
                </div>
                <span className="text-[10px] text-[#697077] block mt-1">Instant 1-click WhatsApp QR pass</span>
              </div>
            </div>

            {/* Field 3: Destination */}
            <div className="w-full">
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0052F2]" />
                3. Destination <span className="text-[#0052F2]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Travel destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-3 text-base sm:text-sm text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2] transition-all"
              />
              <div className="w-full flex items-center gap-1.5 mt-2 text-[11px] text-[#697077] flex-wrap">
                <span>Default route:</span>
                <button
                  type="button"
                  onClick={() => setDestination(activeTrip.destination)}
                  className="text-[#0052F2] hover:underline font-medium text-left"
                >
                  {activeTrip.destination}
                </button>
              </div>
            </div>

            {/* Field 4: Seat Allocation */}
            <div className="w-full bg-[#F2F4F8] rounded-xl p-3.5 sm:p-4 border border-[#D5D9E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-[#D5D9E0] flex items-center justify-center text-[#0052F2] shrink-0">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#000000]">
                    4. Coach Seat Allocation (1 to {tripCapacity})
                  </div>
                  <div className="text-xs text-[#697077]">
                    {selectedSeat ? (
                      <span>
                        Chosen: <strong className="text-[#0052F2] font-semibold">Seat #{selectedSeat}</strong>
                      </span>
                    ) : (
                      <span>
                        Auto-assigned: <strong className="text-[#000000]">Seat #{nextSeat ?? 'N/A'}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSeatModalOpen(true)}
                className="btn-secondary w-full sm:w-auto px-3.5 py-2 sm:py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Select on {tripCapacity}-Seat Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Submit Action: Primary Button with 8px radius */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 px-4 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              <QrCode className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering in Cloud...' : 'Generate QR Code & Boarding Pass'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Seat Map Modal */}
      <SeatMapModal
        isOpen={isSeatModalOpen}
        onClose={() => setIsSeatModalOpen(false)}
        occupiedSeats={occupiedSeats}
        selectedSeat={selectedSeat}
        onSelectSeat={(num) => setSelectedSeat(num)}
        travelName={activeTrip.name}
        viajesNumber={activeTrip.viajesNumber}
        capacity={tripCapacity}
      />
    </div>
  );
};
