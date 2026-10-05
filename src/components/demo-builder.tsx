"use client";

import { Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DEMO_LIMITS, demoNextOpening, demoSlots, demoTotal, demoWarnings, parseDemo, sampleDemo, type DemoBarber, type DemoShop } from "@/lib/demo";
import { minutes } from "@/lib/money";
import {
  defaultTokens,
  resolveCardChrome,
  resolveTheme,
  themePresetIds,
  themePresets,
  validateThemeRead,
  type ThemePresetId,
  type ThemeTexture,
  type ThemeTokens,
} from "@/lib/theme";
import { addDays, formatManilaDate, formatMinuteOfDay, manilaDateOf, manilaWeekday } from "@/lib/time";
import type { ShopCard } from "@/server/directory";
import { DayStrip, SlotGrid } from "./booking-pickers";
import { Price, PriceBoard } from "./price-board";
import { ShopBlock } from "./shop-sign";

/** The draft lives only in this browser. Bump the version if the shape changes. */
const STORAGE_KEY = "kliper-demo-v1";

const textureLabel: Record<ThemeTexture, string> = {
  none: "Plain",
  "wood-grain": "Wood grain",
  concrete: "Concrete",
  "pole-stripes": "Pole stripes",
  scanlines: "Scanlines",
  halftone: "Halftone",
  "paper-grain": "Paper grain",
};

const newId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_HOURS = { days: [1, 2, 3, 4, 5, 6], startMin: 9 * 60, endMin: 18 * 60, breakTime: null } satisfies Partial<DemoBarber>;

/** Monday first, the way a shop's week reads on the wall. 0 = Sunday. */
const WEEK = [
  [1, "Mon", "Mondays"],
  [2, "Tue", "Tuesdays"],
  [3, "Wed", "Wednesdays"],
  [4, "Thu", "Thursdays"],
  [5, "Fri", "Fridays"],
  [6, "Sat", "Saturdays"],
  [0, "Sun", "Sundays"],
] as const;

/** "Mon to Sat", "Every day", or "Tue, Thu, Sat". */
function daysLabel(days: number[]) {
  const ordered = WEEK.filter(([d]) => days.includes(d));
  if (ordered.length === 7) return "Every day";
  if (ordered.length === 0) return "No days yet";
  const positions = ordered.map(([d]) => WEEK.findIndex(([w]) => w === d));
  const contiguous = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (contiguous && ordered.length >= 3) return `${ordered[0][1]} to ${ordered.at(-1)![1]}`;
  return ordered.map(([, short]) => short).join(", ");
}

/** "Mon to Sat, 9:00 AM to 6:00 PM. Break 12:00 PM to 1:00 PM." */
function hoursLabel(b: DemoBarber) {
  const hours = `${daysLabel(b.days)}, ${formatMinuteOfDay(b.startMin)} to ${formatMinuteOfDay(b.endMin)}.`;
  return b.breakTime ? `${hours} Break ${formatMinuteOfDay(b.breakTime.startMin)} to ${formatMinuteOfDay(b.breakTime.endMin)}.` : hours;
}

/** Minutes from midnight ⇄ the "HH:MM" a time input uses. */
const toTimeValue = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
function fromTimeValue(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (min: number) => void }) {
  return (
    <label className="block w-36 shrink-0 text-sm font-medium">
      {label}
      <input
        type="time"
        step={900}
        value={toTimeValue(value)}
        onChange={(e) => {
          const min = fromTimeValue(e.target.value);
          if (min != null) onChange(min);
        }}
        className="field numeral text-lg font-bold"
      />
    </label>
  );
}

/** When one barber takes appointments: working days, hours, and an optional break. */
function BarberHours({ barber, onChange }: { barber: DemoBarber; onChange: (patch: Partial<DemoBarber>) => void }) {
  const toggleDay = (day: number) => onChange({ days: barber.days.includes(day) ? barber.days.filter((d) => d !== day) : [...barber.days, day] });
  const middle = Math.round((barber.startMin + barber.endMin) / 2 / 60) * 60;
  return (
    <div className="mt-3 sm:pl-14">
      <fieldset>
        <legend className="text-sm font-medium">Takes appointments on</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {WEEK.map(([day, short, plural]) => (
            <button key={day} type="button" aria-pressed={barber.days.includes(day)} aria-label={plural} onClick={() => toggleDay(day)} className="chip min-w-[3.25rem] justify-center px-2">
              {short}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <TimeField label="From" value={barber.startMin} onChange={(startMin) => onChange({ startMin })} />
        <TimeField label="Until" value={barber.endMin} onChange={(endMin) => onChange({ endMin })} />
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={barber.breakTime != null}
          onChange={(e) => onChange({ breakTime: e.target.checked ? { startMin: middle, endMin: middle + 60 } : null })}
          className="size-5 accent-ink"
        />
        Takes a break, like lunch
      </label>
      {barber.breakTime && (
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <TimeField label="Break from" value={barber.breakTime.startMin} onChange={(startMin) => onChange({ breakTime: { ...barber.breakTime!, startMin } })} />
          <TimeField label="Back at" value={barber.breakTime.endMin} onChange={(endMin) => onChange({ breakTime: { ...barber.breakTime!, endMin } })} />
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** Whole pesos in the field, centavos in the draft. An empty field reads as 0. */
function pesosToCentavos(value: string) {
  const pesos = Math.max(0, Math.round(Number(value) || 0));
  return Math.min(pesos * 100, DEMO_LIMITS.priceCentavos);
}

function clampMinutes(value: string) {
  return Math.min(Math.max(0, Math.round(Number(value) || 0)), DEMO_LIMITS.minutes.max);
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn btn-quiet mt-3 w-full disabled:opacity-40 sm:w-auto">
      <Plus size={18} aria-hidden />
      {children}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-12 shrink-0 place-items-center self-end rounded-lg text-ink-soft hover:bg-plaster-deep hover:text-pole-red"
    >
      <Trash2 size={19} aria-hidden />
    </button>
  );
}

function NumberField({ label, value, onChange, prefix, width = "w-28" }: { label: string; value: number; onChange: (v: string) => void; prefix?: string; width?: string }) {
  return (
    <label className={`${width} shrink-0 text-sm font-medium`}>
      {label}
      <span className="relative block">
        {prefix && <span className="numeral pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-lg text-ink-soft">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className={`field numeral text-xl font-bold ${prefix ? "pl-7" : ""}`}
        />
      </span>
    </label>
  );
}

function loadDraft(): DemoShop {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseDemo(JSON.parse(saved)) : sampleDemo;
  } catch {
    // Private window, blocked storage or a corrupt draft: start from the sample.
    return sampleDemo;
  }
}

/** Client-only (see demo-builder-client.tsx): the draft is read from this browser's storage on first render. */
export function DemoBuilder() {
  const [demo, setDemo] = useState<DemoShop>(loadDraft);
  const [view, setView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    } catch {
      // Storage is a convenience here; the demo works without it.
    }
  }, [demo]);

  const set = (patch: Partial<DemoShop>) => setDemo((d) => ({ ...d, ...patch }));

  function setTheme(preset: ThemePresetId, tokens: ThemeTokens) {
    set({ theme: { preset, tokens: validateThemeRead(preset, tokens) } });
  }
  const setToken = (patch: Partial<ThemeTokens>) => setTheme(demo.theme.preset, { ...demo.theme.tokens, ...patch });

  function startOver() {
    if (window.confirm("Clear everything and start from the sample shop?")) setDemo(sampleDemo);
  }

  const preset = themePresets[demo.theme.preset];
  const theme = useMemo(() => resolveTheme(demo.theme.preset, demo.theme.tokens), [demo.theme]);

  return (
    <>
      <div className="mt-6 flex gap-2 md:hidden" role="tablist" aria-label="Demo view">
        {(
          [
            ["edit", "Set up"],
            ["preview", "Preview"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)} className="chip">
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-10 lg:gap-14">
        <div className={view === "edit" ? "" : "hidden md:block"}>
          <Section id="shop" title="Your shop">
            <div className="grid gap-4">
              <label className="block text-sm font-medium">
                Shop name
                <input className="field font-sign text-2xl font-bold" maxLength={DEMO_LIMITS.text} value={demo.name} onChange={(e) => set({ name: e.target.value })} />
              </label>
              <label className="block text-sm font-medium">
                Address
                <input className="field" maxLength={DEMO_LIMITS.text} value={demo.address} placeholder="Street and building" onChange={(e) => set({ address: e.target.value })} />
              </label>
              <label className="block text-sm font-medium">
                Area or barangay
                <input className="field" maxLength={DEMO_LIMITS.text} value={demo.area} placeholder="Poblacion" onChange={(e) => set({ area: e.target.value })} />
              </label>
              <div>
                <p className="text-sm font-medium" id="chairs-label">
                  Chairs
                </p>
                <div className="mt-1.5 flex items-center gap-3" role="group" aria-labelledby="chairs-label">
                  <button
                    type="button"
                    aria-label="One less chair"
                    disabled={demo.chairs <= DEMO_LIMITS.chairs.min}
                    onClick={() => set({ chairs: demo.chairs - 1 })}
                    className="grid size-12 place-items-center rounded-lg border-[1.5px] border-ink disabled:opacity-30"
                  >
                    <Minus size={20} aria-hidden />
                  </button>
                  <span className="numeral w-12 text-center text-[2.5rem] leading-none font-bold" aria-live="polite">
                    {demo.chairs}
                  </span>
                  <button
                    type="button"
                    aria-label="One more chair"
                    disabled={demo.chairs >= DEMO_LIMITS.chairs.max}
                    onClick={() => set({ chairs: demo.chairs + 1 })}
                    className="grid size-12 place-items-center rounded-lg border-[1.5px] border-ink disabled:opacity-30"
                  >
                    <Plus size={20} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </Section>

          <Section id="barbers" title="Barbers" hint="Everyone who cuts at your shop, and when each one takes appointments. Customers can only book these hours.">
            <ul className="divide-y divide-rule border-y border-rule">
              {demo.barbers.map((barber, i) => {
                const update = (patch: Partial<DemoBarber>) => set({ barbers: demo.barbers.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
                return (
                  <li key={barber.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-7 grid size-11 shrink-0 place-items-center rounded-full font-semibold"
                        style={{ background: theme.cssProperties["--page-accent"], color: theme.cssProperties["--page-on-accent"] }}
                      >
                        {initials(barber.name)}
                      </span>
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                          Name
                          <input className="field" maxLength={DEMO_LIMITS.text} value={barber.name} onChange={(e) => update({ name: e.target.value })} />
                        </label>
                        <label className="block text-sm font-medium">
                          Good at
                          <input
                            className="field"
                            maxLength={DEMO_LIMITS.text}
                            value={barber.specialties}
                            placeholder="Fades, Kids, Beard"
                            onChange={(e) => update({ specialties: e.target.value })}
                          />
                        </label>
                      </div>
                      <RemoveButton label={`Remove ${barber.name || "this barber"}`} onClick={() => set({ barbers: demo.barbers.filter((_, j) => j !== i) })} />
                    </div>
                    <BarberHours barber={barber} onChange={update} />
                  </li>
                );
              })}
            </ul>
            <AddButton
              disabled={demo.barbers.length >= DEMO_LIMITS.barbers}
              onClick={() => set({ barbers: [...demo.barbers, { id: newId(), name: "", specialties: "", ...DEFAULT_HOURS }] })}
            >
              Add a barber
            </AddButton>
          </Section>

          <Section id="cuts-editor" title="Cuts" hint="Price and how long each takes. Customers' open times follow these lengths.">
            <ul className="divide-y divide-rule border-y border-rule">
              {demo.cuts.map((cut, i) => {
                const update = (patch: Partial<DemoShop["cuts"][number]>) => set({ cuts: demo.cuts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
                return (
                  <li key={cut.id} className="py-3">
                    <div className="flex items-end gap-2">
                      <label className="block min-w-0 flex-1 text-sm font-medium">
                        Cut
                        <input className="field font-semibold" maxLength={DEMO_LIMITS.text} value={cut.name} placeholder="Basic cut" onChange={(e) => update({ name: e.target.value })} />
                      </label>
                      <RemoveButton label={`Remove ${cut.name || "this cut"}`} onClick={() => set({ cuts: demo.cuts.filter((_, j) => j !== i) })} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <NumberField label="Price" prefix="₱" value={cut.priceCentavos / 100} onChange={(v) => update({ priceCentavos: pesosToCentavos(v) })} />
                      <NumberField label="Minutes" value={cut.durationMin} onChange={(v) => update({ durationMin: clampMinutes(v) })} width="w-24" />
                      <label className="block min-w-[12rem] flex-1 text-sm font-medium">
                        What&apos;s included <span className="font-normal text-ink-soft">(optional)</span>
                        <input
                          className="field"
                          maxLength={DEMO_LIMITS.description}
                          value={cut.description}
                          placeholder="Cut, shampoo and blow-dry"
                          onChange={(e) => update({ description: e.target.value })}
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
            <AddButton
              disabled={demo.cuts.length >= DEMO_LIMITS.cuts}
              onClick={() => set({ cuts: [...demo.cuts, { id: newId(), name: "", priceCentavos: 0, durationMin: 30, description: "" }] })}
            >
              Add a cut
            </AddButton>
          </Section>

          <Section id="addons-editor" title="Add-ons" hint="Extras customers can add to any cut. They add to the price and the time.">
            <ul className="divide-y divide-rule border-y border-rule">
              {demo.addOns.map((addOn, i) => {
                const update = (patch: Partial<DemoShop["addOns"][number]>) => set({ addOns: demo.addOns.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
                return (
                  <li key={addOn.id} className="py-3">
                    <div className="flex items-end gap-2">
                      <label className="block min-w-0 flex-1 text-sm font-medium">
                        Add-on
                        <input className="field" maxLength={DEMO_LIMITS.text} value={addOn.name} placeholder="Beard trim" onChange={(e) => update({ name: e.target.value })} />
                      </label>
                      <RemoveButton label={`Remove ${addOn.name || "this add-on"}`} onClick={() => set({ addOns: demo.addOns.filter((_, j) => j !== i) })} />
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <NumberField label="Price" prefix="₱" value={addOn.priceCentavos / 100} onChange={(v) => update({ priceCentavos: pesosToCentavos(v) })} />
                      <NumberField label="Minutes" value={addOn.durationMin} onChange={(v) => update({ durationMin: clampMinutes(v) })} width="w-24" />
                    </div>
                  </li>
                );
              })}
            </ul>
            <AddButton
              disabled={demo.addOns.length >= DEMO_LIMITS.addOns}
              onClick={() => set({ addOns: [...demo.addOns, { id: newId(), name: "", priceCentavos: 0, durationMin: 10 }] })}
            >
              Add an add-on
            </AddButton>
          </Section>

          <Section id="look" title="Your colors and style" hint="Start from a style, then make it yours. Text stays readable whatever you pick.">
            <div className="grid grid-cols-2 gap-2">
              {themePresetIds.map((id) => {
                const p = themePresets[id];
                const chrome = resolveCardChrome(id, {});
                const active = id === demo.theme.preset;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(id, defaultTokens(id))}
                    className={`flex w-full items-center gap-3 rounded-lg border-[1.5px] p-2 text-left ${active ? "border-ink bg-paper" : "border-rule"}`}
                  >
                    <span aria-hidden className="flex h-10 w-12 shrink-0 overflow-hidden rounded">
                      <span className="flex-1" style={{ background: p.palette.background }} />
                      <span className="flex-1" style={{ background: p.palette.ink }} />
                      <span className="flex-1" style={{ background: chrome["--card-accent"] }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{active ? "In use" : p.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6">
              <div>
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    type="color"
                    value={demo.theme.tokens.accent}
                    onChange={(e) => setToken({ accent: e.target.value.toLowerCase() })}
                    className="h-12 w-16 cursor-pointer rounded-md border-[1.5px] border-rule bg-paper"
                  />
                  <span>
                    Main color
                    <span className="block font-normal text-ink-soft">Buttons, checkmarks and your initials.</span>
                  </span>
                </label>
                {theme.accentAdjusted && (
                  <p className="mt-2 text-sm text-ink-soft">
                    Customers will see{" "}
                    <span className="inline-block size-3 rounded-sm align-[-1px]" style={{ background: theme.cssProperties["--page-accent"] }} /> a slightly
                    adjusted shade, so white or black text on it stays readable.
                  </p>
                )}
              </div>

              <fieldset>
                <legend className="text-sm font-medium">Lettering</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preset.fonts.map((font) => (
                    <button
                      key={font}
                      type="button"
                      aria-pressed={demo.theme.tokens.fontDisplay === font}
                      onClick={() => setToken({ fontDisplay: font })}
                      className="chip text-lg"
                      style={{ fontFamily: resolveTheme(demo.theme.preset, { ...demo.theme.tokens, fontDisplay: font }).cssProperties["--page-font-display"] }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </fieldset>

              {preset.textures.length > 1 && (
                <fieldset>
                  <legend className="text-sm font-medium">Background</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preset.textures.map((texture) => (
                      <button key={texture} type="button" aria-pressed={demo.theme.tokens.texture === texture} onClick={() => setToken({ texture })} className="chip">
                        {textureLabel[texture]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <label className="block text-sm font-medium">
                Corners
                <span className="mt-2 flex items-center gap-3">
                  <span className="text-ink-soft">Square</span>
                  <input
                    type="range"
                    min={preset.radius.min}
                    max={preset.radius.max}
                    step={0.25}
                    value={demo.theme.tokens.radius}
                    onChange={(e) => setToken({ radius: Number(e.target.value) })}
                    className="h-12 flex-1 accent-ink"
                  />
                  <span className="text-ink-soft">Round</span>
                </span>
              </label>
            </div>
          </Section>

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            <button type="button" className="btn btn-ink md:hidden" onClick={() => (setView("preview"), window.scrollTo({ top: 0 }))}>
              See how it looks
            </button>
            <button type="button" className="btn btn-quiet" onClick={startOver}>
              <RotateCcw size={18} aria-hidden />
              Start over
            </button>
          </div>
        </div>

        <div className={`${view === "preview" ? "" : "hidden md:block"} md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:self-start md:overflow-y-auto md:pb-4`}>
          <DemoPreview demo={demo} theme={theme} />
        </div>
      </div>
    </>
  );
}

function DemoPreview({ demo, theme }: { demo: DemoShop; theme: ReturnType<typeof resolveTheme> }) {
  const [now] = useState(() => new Date());
  const [barberId, setBarberId] = useState("");
  const [cutId, setCutId] = useState("");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);
  const warnings = demoWarnings(demo);

  // Keep picks valid as the barber edits: removed cuts, barbers or add-ons fall back.
  const barber = demo.barbers.find((b) => b.id === barberId) ?? demo.barbers[0];
  const pickedCut = demo.cuts.some((c) => c.id === cutId) ? cutId : (demo.cuts[0]?.id ?? "");
  const pickedAddOns = addOnIds.filter((id) => demo.addOns.some((a) => a.id === id));
  const total = demoTotal(demo, pickedCut, pickedAddOns);

  // Shop page "next free" times use each barber's quickest cut, like real shop pages.
  const quickest = Math.min(...demo.cuts.map((c) => c.durationMin).filter((m) => m > 0));
  const nextFor = (b: DemoBarber) => (Number.isFinite(quickest) ? demoNextOpening(b, quickest, now) : null);

  const today = manilaDateOf(now);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(today, i);
    return { iso, weekday: i === 0 ? "Today" : formatManilaDate(iso).split(",")[0], day: String(Number(iso.slice(8))), label: formatManilaDate(iso) };
  });
  const dayWord = (iso: string) => (iso === today ? "today" : iso === addDays(today, 1) ? "tomorrow" : formatManilaDate(iso).split(",")[0]);

  // Open on the selected barber's first free day until the visitor picks one.
  const shownDate = date ?? (barber ? nextFor(barber)?.date : null) ?? today;
  const slots = barber && total.durationMin > 0 ? demoSlots(barber, shownDate, total.durationMin, now) : [];
  const pickerSlots = slots.map((sl) => ({ startsAt: sl.startsAt.toISOString(), label: sl.label }));
  const pickedSlot = pickerSlots.find((sl) => sl.startsAt === startsAt) ?? null;
  const dayOff = barber && !barber.days.includes(manilaWeekday(shownDate));
  const barberName = barber?.name.trim() || "Your barber";

  function chooseBarber(id: string) {
    setBarberId(id);
    setDate(null);
    setStartsAt(null);
    setBooked(false);
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const name = demo.name.trim() || "Your shop";
  const card: ShopCard = {
    slug: "demo",
    name,
    area: demo.area.trim() || "Davao",
    address: demo.address,
    imageUrl: null,
    logoUrl: null,
    distance: null,
    from: null,
    next: "",
    openToday: false,
    homeService: false,
    rating: null,
    chrome: { ...resolveCardChrome(demo.theme.preset, demo.theme.tokens) },
    barbers: [],
  };
  const pageStyle = { ...(theme.cssProperties as CSSProperties), borderRadius: "calc(var(--page-radius) * 1.25)" };

  return (
    <div aria-label="Preview" role="region">
      {warnings.length > 0 && (
        <div className="mb-6 border-l-4 border-pole-blue bg-paper px-4 py-3" aria-live="polite">
          <p className="font-semibold">Before you&apos;d go live</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm font-medium text-ink-soft">On the Kliper homepage</p>
      <div className="mt-2" inert>
        <ShopBlock shop={card} linked={false} />
      </div>

      <p className="mt-8 text-sm font-medium text-ink-soft">Your shop page. Tap a barber to book with them.</p>
      <div className="page-shell mt-2 min-h-0! overflow-hidden border border-rule px-4 pb-5 pt-4" style={pageStyle}>
        <div className="sign-themed px-4 pb-3 pt-4">
          <p className="page-display text-[2.25rem] leading-[0.92] font-bold break-words">{name}</p>
        </div>
        <p className="mt-3 font-medium">{[demo.address.trim(), demo.area.trim()].filter(Boolean).join(", ") || "Your address"}</p>
        <p className="text-sm text-[var(--page-muted)]">
          {demo.chairs} {demo.chairs === 1 ? "chair" : "chairs"}, {demo.barbers.length} {demo.barbers.length === 1 ? "barber" : "barbers"}
        </p>
        <p className="page-display mt-5 text-[1.4rem] font-bold">Pick a barber</p>
        <ul className="mt-1 divide-y" style={{ borderColor: "var(--page-border)" }}>
          {demo.barbers.map((b) => {
            const next = nextFor(b);
            const [clock, meridiem] = next ? next.slot.label.split(" ") : [null, null];
            const on = b.id === barber?.id;
            return (
              <li key={b.id} style={{ borderColor: "var(--page-border)" }}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseBarber(b.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 px-2 py-3 text-left"
                  style={{ borderRadius: "calc(var(--page-radius) * 0.5)", background: on ? "rgb(127 127 127 / 0.12)" : "transparent" }}
                >
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold"
                    style={{ background: "var(--page-accent)", color: "var(--page-on-accent)", fontFamily: "var(--page-font-display)" }}
                  >
                    {initials(b.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{b.name.trim() || "Barber name"}</span>
                    {b.specialties.trim() && <span className="block truncate text-sm text-[var(--page-muted)]">{b.specialties}</span>}
                  </span>
                  <span className="shrink-0 text-right" aria-label={next ? `Next opening ${dayWord(next.date)} ${next.slot.label}` : "No openings this week"}>
                    {next ? (
                      <>
                        <span className="numeral block text-[1.6rem] leading-none font-bold">
                          {clock}
                          <span className="ml-0.5 text-sm font-semibold">{meridiem}</span>
                        </span>
                        <span className="text-sm" style={{ color: next.date === today ? "var(--page-accent)" : "var(--page-muted)" }}>
                          {dayWord(next.date)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--page-muted)]">Booked up</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-8 text-sm font-medium text-ink-soft">Booking page. Pick a cut, add-ons and a time.</p>
      <div ref={bookingRef} className="page-shell mt-2 min-h-0! scroll-mt-4 overflow-hidden border border-rule px-4 pb-5 pt-4" style={pageStyle}>
        <p className="page-display text-[2.25rem] leading-[0.92] font-bold break-words">{barberName}</p>
        {barber && <p className="mt-2 text-sm text-[var(--page-muted)]">{hoursLabel(barber)}</p>}
        {demo.cuts.length > 0 && barber ? (
          <>
            <PriceBoard
              packages={demo.cuts.map((c) => ({ ...c, name: c.name.trim() || "Unnamed cut", description: c.description.trim() || null }))}
              addOns={demo.addOns.map((a) => ({ ...a, name: a.name.trim() || "Unnamed add-on" }))}
              packageId={pickedCut}
              addOnIds={pickedAddOns}
              onPick={(id) => (setCutId(id), setBooked(false))}
              onToggleAddOn={(id) => (setAddOnIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])), setBooked(false))}
            />

            <section aria-labelledby="demo-when" className="mt-8">
              <h2 id="demo-when" className="page-display text-[1.75rem] font-bold">
                When
              </h2>
              <DayStrip dates={dates} selected={shownDate} onPick={(iso) => (setDate(iso), setStartsAt(null), setBooked(false))} />
              <SlotGrid
                slots={pickerSlots}
                selected={pickedSlot?.startsAt ?? null}
                onPick={(value) => (setStartsAt(value), setBooked(false))}
                empty={
                  dayOff
                    ? `${barberName} doesn't take appointments on ${WEEK.find(([d]) => d === manilaWeekday(shownDate))![2]}. Try another day.`
                    : `No ${minutes(total.durationMin)} openings on ${formatManilaDate(shownDate)}. Try another day, or a shorter cut.`
                }
              />
            </section>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-paper px-4 py-3 text-ink">
              <div className="min-w-0">
                <p className="text-[1.75rem] leading-none">
                  <Price centavos={total.priceCentavos} />
                </p>
                <p className="mt-1 truncate text-sm text-ink-soft">
                  {pickedSlot ? `${formatManilaDate(shownDate)}, ${pickedSlot.label}` : `${minutes(total.durationMin)} in the chair`}
                </p>
              </div>
              <button type="button" disabled={!pickedSlot} onClick={() => setBooked(true)} className="btn btn-ink shrink-0">
                {pickedSlot ? "Book" : "Pick a time"}
              </button>
            </div>
            {booked && pickedSlot && (
              <p className="mt-3 text-sm" role="status">
                This is the demo, so nothing was booked. A customer would now confirm with their phone number and get a booking code.
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-[var(--page-muted)]">{barber ? "Add a cut to see your price board." : "Add a barber to see their booking page."}</p>
        )}
      </div>
    </div>
  );
}
