import React from 'react';
import { 
  Bus, 
  Calendar, 
  MapPin, 
  Clock, 
  Plus, 
  CheckCircle2, 
  ArrowRight,
  Edit2,
  Trash2,
  QrCode,
  Armchair
} from 'lucide-react';
import { TravelTrip, Ticket } from '../types';

interface TripsListProps {
  trips: TravelTrip[];
  activeTrip: TravelTrip | null;
  onSelectTrip: (trip: TravelTrip) => void;
  onOpenNewTripModal: () => void;
  onEditTrip?: (trip: TravelTrip) => void;
  onDeleteTrip?: (tripId: string) => void;
  tickets: Ticket[];
  onGoToCheckIn: () => void;
  onGoToValidator: () => void;
}

export const TripsList: React.FC<TripsListProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTripModal,
  onEditTrip,
  onDeleteTrip,
  tickets,
  onGoToCheckIn,
  onGoToValidator,
}) => {
  return (
    <div className="w-full max-w-[100%] sm:max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in font-gellix">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-[#0052F2]" />
            <h2 className="text-lg sm:text-xl font-semibold text-[#000000]">Travels &amp; Places Management</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#697077] mt-0.5 sm:mt-1">
            Configure coach departures, customize capacity places, and monitor manifests
          </p>
        </div>

        <button
          onClick={onOpenNewTripModal}
          className="btn-primary w-full sm:w-auto px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Travel &amp; Places</span>
        </button>
      </div>

      {/* Empty State */}
      {trips.length === 0 ? (
        <div className="bg-white border border-[#D5D9E0] rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <Bus className="w-10 h-10 text-[#B9BFC7] mx-auto" />
          <h3 className="text-base font-semibold text-[#000000]">No Scheduled Travels Found</h3>
          <p className="text-xs text-[#697077] max-w-sm mx-auto">
            You currently have no travels stored in the cloud. Click below to create your first travel with custom places.
          </p>
          <button
            onClick={onOpenNewTripModal}
            className="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Travel</span>
          </button>
        </div>
      ) : (
        /* Grid of Travels */
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {trips.map(trip => {
            const tripCapacity = trip.capacity || 55;
            const tripTickets = tickets.filter(t => t.tripId === trip.id && t.status !== 'cancelled');
            const bookedCount = tripTickets.length;
            const checkedInCount = tripTickets.filter(t => t.status === 'checked_in').length;
            const remaining = Math.max(0, tripCapacity - bookedCount);
            const isSelected = activeTrip?.id === trip.id;
            const percent = Math.round((bookedCount / tripCapacity) * 100);

            return (
              <div
                key={trip.id}
                className={`w-full relative bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0052F2] ring-1 ring-[#0052F2]'
                    : 'border-[#D5D9E0] hover:border-[#9FA5AD]'
                }`}
              >
                <div>
                  {/* Header line */}
                  <div className="w-full flex items-start justify-between gap-2 mb-2 sm:mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F4F8] text-[#0052F2] border border-[#D5D9E0]">
                          {trip.viajesNumber}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#000000] tabular-nums">
                          €{(trip.price !== undefined ? trip.price : 25).toFixed(2)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base text-[#000000] mt-1.5 leading-snug">
                        {trip.name}
                      </h3>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0052F2]/10 text-[#0052F2] font-mono font-semibold text-[10px] tracking-wide border border-[#0052F2]/30 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> ACTIVE VIAJE
                      </span>
                    )}
                  </div>

                  {/* Route */}
                  <div className="w-full space-y-1.5 py-2 text-xs text-[#50565B]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#868D95] shrink-0" />
                      <span className="text-[#697077]">Origin:</span>
                      <span className="text-[#000000] font-medium truncate">{trip.origin}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#0052F2] shrink-0" />
                      <span className="text-[#697077]">Destination:</span>
                      <span className="text-[#000000] font-bold truncate">{trip.destination}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#868D95] shrink-0" />
                      <span className="text-[#697077]">Date &amp; Time:</span>
                      <span className="text-[#000000] font-medium">{trip.date} • {trip.time || '08:00 AM'}</span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar with Custom Places */}
                  <div className="w-full mt-2 pt-2 border-t border-[#D5D9E0] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#697077] flex items-center gap-1">
                        <Armchair className="w-3.5 h-3.5 text-[#0052F2]" />
                        <span>Capacity:</span>
                      </span>
                      <span className="font-semibold text-[#000000]">
                        {bookedCount} / {tripCapacity} places <span className="font-normal text-[#697077]">({remaining} free)</span>
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#E5E9F0] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percent >= 100 ? 'bg-[#F23845]' : 'bg-[#0052F2]'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="w-full flex items-center justify-between gap-2 pt-4 mt-3 border-t border-[#D5D9E0]">
                  <div className="flex items-center gap-1.5">
                    {onEditTrip && (
                      <button
                        onClick={() => onEditTrip(trip)}
                        className="btn-secondary px-2.5 py-1.5 text-xs text-[#50565B] flex items-center gap-1"
                        title="Edit Travel and Places"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Places</span>
                      </button>
                    )}

                    {onDeleteTrip && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete travel "${trip.name}"?`)) {
                            onDeleteTrip(trip.id);
                          }
                        }}
                        className="btn-secondary p-1.5 text-[#868D95] hover:text-[#F23845]"
                        title="Delete travel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onSelectTrip(trip);
                        onGoToCheckIn();
                      }}
                      className="btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Check-in Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
