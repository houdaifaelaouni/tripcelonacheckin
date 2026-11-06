import React, { useState, useEffect } from 'react';
import { X, Bus, Calendar, Clock, MapPin, Hash, Plus, AlertCircle, Armchair, Edit3, CreditCard } from 'lucide-react';
import { TravelTrip, DEFAULT_CAPACITY } from '../types';
import { createTrip, updateTrip } from '../utils/storage';

interface TravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: TravelTrip) => void;
  editingTrip?: TravelTrip | null;
}

const CAPACITY_PRESETS = [30, 45, 50, 55, 60, 70];
const PRICE_PRESETS = [15, 20, 25, 35, 45, 60];

export const TravelModal: React.FC<TravelModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
  editingTrip,
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:30');
  const [origin, setOrigin] = useState('Barcelona (Estació del Nord)');
  const [destination, setDestination] = useState('');
  const [viajesNumber, setViajesNumber] = useState('VIAJE-01');
  const [capacity, setCapacity] = useState<number>(DEFAULT_CAPACITY);
  const [price, setPrice] = useState<number>(25);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTrip) {
      setName(editingTrip.name);
      setDate(editingTrip.date);
      setTime(editingTrip.time || '08:30');
      setOrigin(editingTrip.origin);
      setDestination(editingTrip.destination);
      setViajesNumber(editingTrip.viajesNumber);
      setCapacity(editingTrip.capacity || DEFAULT_CAPACITY);
      setPrice(editingTrip.price !== undefined ? editingTrip.price : 25);
      setNotes(editingTrip.notes || '');
    } else {
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('08:30');
      setOrigin('Barcelona (Estació del Nord)');
      setDestination('');
      setViajesNumber(`VIAJE-${Math.floor(10 + Math.random() * 90)}`);
      setCapacity(DEFAULT_CAPACITY);
      setPrice(25);
      setNotes('');
    }
    setErrorMsg(null);
  }, [editingTrip, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a travel name.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Please enter a destination.');
      return;
    }
    if (!viajesNumber.trim()) {
      setErrorMsg('Please enter a travel/viaje code.');
      return;
    }
    if (capacity < 1 || capacity > 200) {
      setErrorMsg('Places capacity must be between 1 and 200 seats.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTrip) {
        await updateTrip(editingTrip.id, {
          name: name.trim(),
          date,
          time,
          origin: origin.trim(),
          destination: destination.trim(),
          viajesNumber: viajesNumber.trim().toUpperCase(),
          capacity: Number(capacity),
          price: Math.max(0, Number(price) || 0),
          currency: 'EUR',
          notes: notes.trim(),
        });
        onTripCreated({
          ...editingTrip,
          name: name.trim(),
          date,
          time,
          origin: origin.trim(),
          destination: destination.trim(),
          viajesNumber: viajesNumber.trim().toUpperCase(),
          capacity: Number(capacity),
          price: Math.max(0, Number(price) || 0),
          currency: 'EUR',
          notes: notes.trim(),
        });
      } else {
        const newTrip = await createTrip({
          name: name.trim(),
          date,
          time,
          origin: origin.trim(),
          destination: destination.trim(),
          viajesNumber: viajesNumber.trim().toUpperCase(),
          capacity: Number(capacity),
          price: Math.max(0, Number(price) || 0),
          currency: 'EUR',
          notes: notes.trim(),
        });
        onTripCreated(newTrip);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred saving the travel.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
      <div className="relative w-full max-w-[94%] sm:max-w-lg bg-white border border-[#D5D9E0] rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col font-gellix">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#D5D9E0] bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#000000] flex items-center justify-center text-white shrink-0">
              {editingTrip ? <Edit3 className="w-5 h-5 text-[#0052F2]" /> : <Bus className="w-5 h-5 text-[#0052F2]" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[#000000]">
                {editingTrip ? 'Edit Travel & Customize Places' : 'Create Travel & Customize Places'}
              </h3>
              <p className="text-xs text-[#697077]">
                Configure departure schedule, route, and coach capacity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body: Scrollable */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-[#FFF2F2] border border-[#FFCCD0] text-[#1E2024] text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#F23845]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Travel Name */}
          <div className="w-full">
            <label className="block text-xs font-semibold text-[#000000] mb-1.5">
              Travel Name <span className="text-[#0052F2]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Costa Brava Coastal Tour"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
            />
          </div>

          {/* 2. Custom Places / Capacity (Crucial feature requested) */}
          <div className="w-full bg-[#F2F4F8] border border-[#D5D9E0] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#000000] flex items-center gap-1.5">
                <Armchair className="w-4 h-4 text-[#0052F2]" />
                <span>Customize Places (Coach Capacity)</span>
                <span className="text-[#0052F2]">*</span>
              </label>
              <span className="font-mono text-xs font-bold text-[#0052F2] bg-white px-2 py-0.5 rounded border border-[#D5D9E0]">
                {capacity} Places
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="200"
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-28 bg-white border border-[#D5D9E0] rounded-lg px-3 py-1.5 text-sm font-semibold text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
              />
              <span className="text-xs text-[#697077]">seats max for this viaje</span>
            </div>

            {/* Quick capacity preset selectors */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-[#697077] uppercase font-semibold">Presets:</span>
              {CAPACITY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCapacity(preset)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    capacity === preset
                      ? 'bg-[#0052F2] text-white font-semibold'
                      : 'bg-white text-[#373D42] border border-[#D5D9E0] hover:border-[#0052F2]'
                  }`}
                >
                  {preset} {preset === 55 ? '(Default)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Number of Viajes / Trip Code */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#0052F2]" />
                Travel Viaje Identifier <span className="text-[#0052F2]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIAJE-01 or VIAJE-COSTA-01"
                value={viajesNumber}
                onChange={(e) => setViajesNumber(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] font-mono placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-[#0052F2]" />
                  Ticket Price per Seat <span className="text-[#0052F2]">*</span>
                </span>
                <span className="text-[11px] font-mono text-[#0052F2] font-semibold">EUR (€)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#697077]">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  placeholder="25.00"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-white border border-[#D5D9E0] rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-[#000000] font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap pt-1.5">
                <span className="text-[10px] text-[#697077] uppercase font-semibold">Presets:</span>
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrice(p)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      price === p
                        ? 'bg-[#000000] text-white font-semibold'
                        : 'bg-[#F2F4F8] text-[#373D42] hover:bg-[#D5D9E0]'
                    }`}
                  >
                    €{p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Origin & Destination */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#000000] mb-1.5">
                Departure Origin
              </label>
              <input
                type="text"
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0052F2]" />
                Destination <span className="text-[#0052F2]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tossa de Mar / Girona"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
              />
            </div>
          </div>

          {/* 5. Date & Time */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0052F2]" />
                Travel Date <span className="text-[#0052F2]">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#000000] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0052F2]" />
                Departure Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2.5 text-sm text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none"
              />
            </div>
          </div>

          {/* 6. Vehicle / Travel Notes */}
          <div className="w-full">
            <label className="block text-xs font-semibold text-[#000000] mb-1.5">
              Trip Details &amp; Coach Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Official tripcelona.com coach transfer with panoramic views and Wi-Fi."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#D5D9E0] rounded-lg px-3.5 py-2 text-xs text-[#000000] focus:ring-2 focus:ring-[#0052F2] focus:outline-none resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2.5 text-xs font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Cloud...' : editingTrip ? 'Save Places & Changes' : 'Create Travel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
