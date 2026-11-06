import React from 'react';

/**
 * Coach seat map: 4 seats per row (2 + aisle + 2), driver at the front.
 * `taken` seats are disabled; `selected` seats are highlighted.
 */
export function SeatMap({
  capacity,
  taken,
  selected,
  onToggle,
  max,
  labels,
}: {
  capacity: number;
  taken: number[];
  selected: number[];
  onToggle?: (seat: number) => void;
  max?: number;
  labels?: Record<number, 'boarded' | 'booked'>;
}) {
  const rows: number[][] = [];
  for (let s = 1; s <= capacity; s += 4) rows.push([s, s + 1, s + 2, s + 3].filter((n) => n <= capacity));
  const takenSet = new Set(taken);

  const seat = (n: number) => {
    const isSel = selected.includes(n);
    const label = labels?.[n];
    const isTaken = takenSet.has(n) && !isSel;
    const full = !!max && selected.length >= max && !isSel;
    const cls = isSel
      ? 'bg-accent text-ink border-moss'
      : label === 'boarded'
        ? 'bg-brand text-accent border-brand'
        : isTaken
          ? 'bg-line/60 text-muted/70 border-transparent'
          : full
            ? 'bg-white text-line border-line'
            : 'bg-white text-ink border-line hover:border-ink';
    return (
      <button
        key={n}
        type="button"
        disabled={!onToggle || isTaken || full}
        onClick={() => onToggle?.(n)}
        className={`h-11 w-11 rounded-lg border-[1.5px] text-sm font-extrabold transition-colors ${cls} disabled:cursor-default`}
        aria-label={`Seat ${n}${isTaken ? ' (taken)' : ''}`}
      >
        {n}
      </button>
    );
  };

  return (
    <div className="inline-block rounded-xl2 border-[1.5px] border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between border-b border-dashed border-line px-1 pb-3 text-[13px] font-bold text-body">
        <span>Door</span>
        <span>Driver</span>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            {r.slice(0, 2).map(seat)}
            <div className="w-5" />
            {r.slice(2).map(seat)}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-[13px] text-body">
        <Legend cls="bg-white border-line" text="Free" />
        {onToggle && <Legend cls="bg-accent border-moss" text="Selected" />}
        <Legend cls="bg-line/60 border-transparent" text="Taken" />
        {labels && <Legend cls="bg-brand border-brand" text="Boarded" />}
      </div>
    </div>
  );
}

const Legend = ({ cls, text }: { cls: string; text: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`h-3.5 w-3.5 rounded border-[1.5px] ${cls}`} />
    {text}
  </span>
);
