import React from 'react';
import { X, Check, Armchair } from 'lucide-react';

interface SeatMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  occupiedSeats: number[];
  selectedSeat: number | null;
  onSelectSeat: (seatNum: number) => void;
  travelName: string;
  viajesNumber: string;
  capacity?: number;
}

export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  isOpen,
  onClose,
  occupiedSeats,
  selectedSeat,
  onSelectSeat,
  travelName,
  viajesNumber,
  capacity = 55,
}) => {
  if (!isOpen) return null;

  const occupiedSet = new Set(occupiedSeats);
  const totalOccupied = occupiedSeats.length;
  const remainingSeats = Math.max(0, capacity - totalOccupied);

  // Dynamically calculate coach rows based on customized capacity
  // For standard 4-abreast coach (2 left, 2 right) with back row
  const backRowSize = capacity % 4 === 0 ? 4 : capacity % 4;
  const regularSeatsCount = capacity - backRowSize;
  const rowCount = Math.floor(regularSeatsCount / 4);

  const rows: { rowNum: number; left: number[]; right: number[] }[] = [];
  for (let r = 0; r < rowCount; r++) {
    const base = r * 4;
    rows.push({
      rowNum: r + 1,
      left: [base + 1, base + 2],
      right: [base + 3, base + 4],
    });
  }

  const backRowSeats: number[] = [];
  for (let s = regularSeatsCount + 1; s <= capacity; s++) {
    backRowSeats.push(s);
  }

  const renderSeat = (num: number) => {
    const isOccupied = occupiedSet.has(num);
    const isSelected = selectedSeat === num;

    return (
      <button
        key={num}
        type="button"
        disabled={isOccupied}
        onClick={() => {
          onSelectSeat(num);
          onClose();
        }}
        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all shrink-0 ${
          isOccupied
            ? 'bg-[#F2F4F8] text-[#868D95] cursor-not-allowed border border-[#D5D9E0]'
            : isSelected
            ? 'bg-[#0052F2] text-white shadow-xs ring-2 ring-[#0052F2] ring-offset-1 scale-105'
            : 'bg-white hover:bg-[#F2F4F8] text-[#1E2024] border border-[#D5D9E0] hover:border-[#0052F2]'
        }`}
        title={`Seat #${num} ${isOccupied ? '(Occupied)' : isSelected ? '(Selected)' : '(Available)'}`}
      >
        <span className="text-[11px] font-mono leading-none">{num}</span>
        {isSelected && (
          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white absolute -top-1 -right-1 bg-[#0052F2] rounded-full p-0.5" />
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[3%] sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-gellix">
      <div className="relative w-full max-w-[94%] sm:max-w-md bg-white border border-[#D5D9E0] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] font-gellix">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#D5D9E0] bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Armchair className="w-4 h-4 sm:w-5 sm:h-5 text-[#0052F2]" />
              <h3 className="font-semibold text-[#000000] text-sm sm:text-base">
                Coach Seat Map ({capacity} Places)
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-[#697077] mt-0.5">
              {viajesNumber} • {remainingSeats} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#697077] hover:text-[#000000] rounded-lg hover:bg-[#F2F4F8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="w-full px-3 py-2 bg-[#F2F4F8] border-b border-[#D5D9E0] flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-white border border-[#D5D9E0]" />
            <span className="text-[#373D42] text-[11px]">Free</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#0052F2]" />
            <span className="text-[#0052F2] font-semibold text-[11px]">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#F2F4F8] border border-[#D5D9E0]" />
            <span className="text-[#868D95] text-[11px]">Booked</span>
          </div>
        </div>

        {/* Bus Layout Body: Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#F2F4F8]/50">
          <div className="w-full max-w-[280px] mx-auto bg-white border-2 border-[#D5D9E0] rounded-3xl p-3 sm:p-4 shadow-xs relative">
            {/* Front windshield & Driver */}
            <div className="w-full h-8 border-b-2 border-dashed border-[#D5D9E0] flex items-center justify-between px-3 text-[10px] text-[#697077] mb-3 uppercase tracking-wider font-semibold">
              <span className="text-[#0052F2]">Coach Front</span>
              <span className="bg-[#13171A] text-white px-2 py-0.5 rounded text-[9px]">Driver Cabin</span>
            </div>

            {/* Coach Seats Grid */}
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.rowNum} className="flex items-center justify-between gap-1">
                  {/* Left pair (Window + Aisle) */}
                  <div className="flex gap-1.5">
                    {row.left.map((seatNum) => renderSeat(seatNum))}
                  </div>

                  {/* Aisle label */}
                  <div className="w-4 text-center text-[9px] text-[#868D95] font-mono select-none">
                    R{row.rowNum}
                  </div>

                  {/* Right pair (Aisle + Window) */}
                  <div className="flex gap-1.5">
                    {row.right.map((seatNum) => renderSeat(seatNum))}
                  </div>
                </div>
              ))}

              {/* Rear Seats Row */}
              {backRowSeats.length > 0 && (
                <div className="pt-2 border-t border-[#D5D9E0]">
                  <div className="text-[9px] uppercase tracking-wider text-center text-[#868D95] mb-1 font-semibold">
                    Rear Lounge ({backRowSeats.length} places)
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {backRowSeats.map((seatNum) => renderSeat(seatNum))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#D5D9E0] bg-white text-center text-[11px] text-[#697077]">
          Tap any available seat to assign it to the passenger.
        </div>
      </div>
    </div>
  );
};
