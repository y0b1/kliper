import { useMemo } from "react";

const radius = (factor: number) => ({ borderRadius: `calc(var(--page-radius) * ${factor})` });

export interface PickerDate {
  /** Manila date, YYYY-MM-DD. */
  iso: string;
  /** "Today", "Tue", … */
  weekday: string;
  /** Day of the month. */
  day: string;
  /** "Tue, Oct 6", for screen readers. */
  label: string;
}

export interface PickerSlot {
  /** ISO instant; used as the slot's id. */
  startsAt: string;
  /** "3:30 PM" */
  label: string;
}

/**
 * The booking page's day strip and time grid. Used by the real booking flow and
 * by the demo page's preview, so the two always match.
 */
export function DayStrip({ dates, selected, onPick }: { dates: PickerDate[]; selected: string; onPick: (iso: string) => void }) {
  return (
    <div className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist" aria-label="Day">
      {dates.map((d) => {
        const on = d.iso === selected;
        return (
          <button
            key={d.iso}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={d.label}
            onClick={() => onPick(d.iso)}
            className="flex min-w-[3.75rem] flex-col items-center px-2 pb-2 pt-1.5"
            style={{
              ...radius(0.5),
              background: on ? "var(--page-text)" : "transparent",
              color: on ? "var(--page-bg)" : "var(--page-text)",
            }}
          >
            <span className="text-sm">{d.weekday}</span>
            <span className="numeral text-[1.75rem] leading-none font-bold">{d.day}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Open times, grouped into morning / afternoon / evening so a long day stays scannable. */
export function SlotGrid({
  slots,
  selected,
  onPick,
  loading = false,
  empty,
}: {
  slots: PickerSlot[];
  selected: string | null;
  onPick: (startsAt: string) => void;
  loading?: boolean;
  /** Shown when there are no slots; null while there's nothing to say yet. */
  empty: string | null;
}) {
  const groups = useMemo(() => {
    const out: Array<{ name: string; slots: PickerSlot[] }> = [];
    for (const s of slots) {
      const [clock, meridiem] = s.label.split(" ");
      const hour = (Number(clock.split(":")[0]) % 12) + (meridiem === "PM" ? 12 : 0);
      const name = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
      if (out.at(-1)?.name !== name) out.push({ name, slots: [] });
      out.at(-1)!.slots.push(s);
    }
    return out;
  }, [slots]);

  return (
    <div className={`mt-4 min-h-24 ${loading ? "opacity-40" : ""}`} aria-live="polite" aria-busy={loading}>
      {groups.map((group) => (
        <div key={group.name} className="mt-4 first:mt-0">
          <h3 className="text-sm font-medium text-[var(--page-muted)]">{group.name}</h3>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {group.slots.map((s) => {
              const on = s.startsAt === selected;
              const [clock, meridiem] = s.label.split(" ");
              return (
                <button
                  key={s.startsAt}
                  type="button"
                  aria-pressed={on}
                  aria-label={s.label}
                  onClick={() => onPick(s.startsAt)}
                  className="numeral flex min-h-12 items-baseline justify-center gap-0.5 border-[1.5px] text-[1.375rem] font-bold"
                  style={{
                    ...radius(0.5),
                    borderColor: on ? "var(--page-accent)" : "var(--page-border)",
                    background: on ? "var(--page-accent)" : "var(--page-surface)",
                    color: on ? "var(--page-on-accent)" : "var(--page-text)",
                  }}
                >
                  {clock}
                  <span className="text-xs font-semibold">{meridiem}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {slots.length === 0 && empty && <p className="py-3 text-[var(--page-muted)]">{empty}</p>}
    </div>
  );
}
