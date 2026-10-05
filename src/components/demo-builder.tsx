"use client";

import { Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { DEMO_LIMITS, demoTotal, demoWarnings, parseDemo, sampleDemo, type DemoShop } from "@/lib/demo";
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
import type { ShopCard } from "@/server/directory";
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

          <Section id="barbers" title="Barbers" hint="Everyone who cuts at your shop. Each gets their own booking page.">
            <ul className="divide-y divide-rule border-y border-rule">
              {demo.barbers.map((barber, i) => (
                <li key={barber.id} className="flex items-start gap-3 py-3">
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
                      <input
                        className="field"
                        maxLength={DEMO_LIMITS.text}
                        value={barber.name}
                        onChange={(e) => set({ barbers: demo.barbers.map((b, j) => (j === i ? { ...b, name: e.target.value } : b)) })}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Good at
                      <input
                        className="field"
                        maxLength={DEMO_LIMITS.text}
                        value={barber.specialties}
                        placeholder="Fades, Kids, Beard"
                        onChange={(e) => set({ barbers: demo.barbers.map((b, j) => (j === i ? { ...b, specialties: e.target.value } : b)) })}
                      />
                    </label>
                  </div>
                  <RemoveButton label={`Remove ${barber.name || "this barber"}`} onClick={() => set({ barbers: demo.barbers.filter((_, j) => j !== i) })} />
                </li>
              ))}
            </ul>
            <AddButton
              disabled={demo.barbers.length >= DEMO_LIMITS.barbers}
              onClick={() => set({ barbers: [...demo.barbers, { id: newId(), name: "", specialties: "" }] })}
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
  const [cutId, setCutId] = useState("");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const warnings = demoWarnings(demo);

  // Keep the picked cut valid as cuts are added and removed.
  const pickedCut = demo.cuts.some((c) => c.id === cutId) ? cutId : (demo.cuts[0]?.id ?? "");
  const pickedAddOns = addOnIds.filter((id) => demo.addOns.some((a) => a.id === id));
  const total = demoTotal(demo, pickedCut, pickedAddOns);

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
  const firstBarber = demo.barbers.find((b) => b.name.trim())?.name.trim() ?? "Your barber";

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
        <ShopBlock shop={card} />
      </div>

      <p className="mt-8 text-sm font-medium text-ink-soft">Your shop page</p>
      <div className="page-shell mt-2 min-h-0! overflow-hidden border border-rule px-4 pb-5 pt-4" style={pageStyle} inert>
        <div className="sign-themed px-4 pb-3 pt-4">
          <p className="page-display text-[2.25rem] leading-[0.92] font-bold break-words">{name}</p>
        </div>
        <p className="mt-3 font-medium">
          {[demo.address.trim(), demo.area.trim()].filter(Boolean).join(", ") || "Your address"}
        </p>
        <p className="text-sm text-[var(--page-muted)]">
          {demo.chairs} {demo.chairs === 1 ? "chair" : "chairs"}, {demo.barbers.length} {demo.barbers.length === 1 ? "barber" : "barbers"}
        </p>
        <p className="page-display mt-5 text-[1.4rem] font-bold">Pick a barber</p>
        <ul className="mt-1 divide-y" style={{ borderColor: "var(--page-border)" }}>
          {demo.barbers.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3" style={{ borderColor: "var(--page-border)" }}>
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold"
                style={{ background: "var(--page-accent)", color: "var(--page-on-accent)", fontFamily: "var(--page-font-display)" }}
              >
                {initials(b.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{b.name.trim() || "Barber name"}</span>
                {b.specialties.trim() && <span className="block truncate text-sm text-[var(--page-muted)]">{b.specialties}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-sm font-medium text-ink-soft">Booking page. Try picking a cut and add-ons.</p>
      <div className="page-shell mt-2 min-h-0! overflow-hidden border border-rule px-4 pb-5 pt-4" style={pageStyle}>
        <p className="page-display text-[2.25rem] leading-[0.92] font-bold break-words">{firstBarber}</p>
        {demo.cuts.length > 0 ? (
          <>
            <PriceBoard
              packages={demo.cuts.map((c) => ({ ...c, name: c.name.trim() || "Unnamed cut", description: c.description.trim() || null }))}
              addOns={demo.addOns.map((a) => ({ ...a, name: a.name.trim() || "Unnamed add-on" }))}
              packageId={pickedCut}
              addOnIds={pickedAddOns}
              onPick={setCutId}
              onToggleAddOn={(id) => setAddOnIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
            />
            <p className="mt-4 flex items-baseline justify-between gap-3">
              <span className="text-[var(--page-muted)]">{minutes(total.durationMin)} in the chair</span>
              <span className="text-[2rem] leading-none">
                <Price centavos={total.priceCentavos} />
              </span>
            </p>
          </>
        ) : (
          <p className="mt-4 text-[var(--page-muted)]">Add a cut to see your price board.</p>
        )}
      </div>
    </div>
  );
}
