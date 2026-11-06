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
      ? 'bg-brand text-white border-brand'
      : label === 'boarded'
        ? 'bg-emerald-500 text-white border-emerald-500'
        : isTaken
          ? 'bg-gray-200 text-gray-400 border-gray-200'
          : full
            ? 'bg-white text-gray-300 border-line'
            : 'bg-white text-ink border-line hover:border-brand hover:text-brand';
    return (
      <button
        key={n}
        type="button"
        disabled={!onToggle || isTaken || full}
        onClick={() => onToggle?.(n)}
        className={`h-10 w-10 rounded-lg border text-sm font-semibold transition ${cls} disabled:cursor-default`}
        aria-label={`Seat ${n}${isTaken ? ' (taken)' : ''}`}
      >
        {n}
      </button>
    );
  };

  return (
    <div className="inline-block rounded-3xl border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between px-1 text-xs font-medium text-muted">
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
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        <Legend cls="bg-white border-line" text="Free" />
        <Legend cls="bg-brand border-brand" text="Selected" />
        <Legend cls="bg-gray-200 border-gray-200" text="Taken" />
        {labels && <Legend cls="bg-emerald-500 border-emerald-500" text="Boarded" />}
      </div>
    </div>
  );
}

const Legend = ({ cls, text }: { cls: string; text: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`h-3 w-3 rounded border ${cls}`} />
    {text}
  </span>
);
