"use client";

import { Check, LocateFixed } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { minutes, peso } from "@/lib/money";
import { createBooking, getSlots, type BookingState, type SlotResult } from "@/server/actions";

interface Pkg {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  durationMin: number;
}

interface AddOn {
  id: string;
  name: string;
  priceCentavos: number;
  durationMin: number;
}

interface Props {
  slug: string;
  barberName: string;
  packages: Pkg[];
  addOns: AddOn[];
  dates: Array<{ iso: string; weekday: string; day: string; label: string }>;
  hasShop: boolean;
  homeService: boolean;
  homeFeeCentavos: number;
  paymentMode: "FULL" | "DEPOSIT" | "AT_SHOP";
  depositCentavos: number;
  confirmMode: "INSTANT" | "REQUEST";
}

const radius = (factor: number) => ({ borderRadius: `calc(var(--page-radius) * ${factor})` });

/** "₱150" → the peso sign small, the number large. */
function Price({ centavos, plus = false }: { centavos: number; plus?: boolean }) {
  const text = peso(centavos).replace("₱", "");
  return (
    <span className="numeral whitespace-nowrap">
      <span className="text-[0.7em] font-semibold">{plus ? "+₱" : "₱"}</span>
      <span className="font-bold">{text}</span>
    </span>
  );
}

export function BookingFlow(props: Props) {
  const [packageId, setPackageId] = useState(props.packages[0]?.id ?? "");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<"SHOP" | "HOME">(props.hasShop || !props.homeService ? "SHOP" : "HOME");
  const [date, setDate] = useState(props.dates[0]?.iso ?? "");
  const [result, setResult] = useState<SlotResult | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (!packageId || !date) return;
    startLoading(async () => {
      const next = await getSlots({ slug: props.slug, date, packageId, addOnIds, locationType });
      setResult(next);
      setStartsAt((current) => (current && next.slots.some((s) => s.startsAt === current) ? current : null));
    });
  }, [props.slug, packageId, addOnIds, locationType, date]);

  const pkg = props.packages.find((p) => p.id === packageId);
  const chosenAddOns = props.addOns.filter((a) => addOnIds.includes(a.id));
  const duration = (pkg?.durationMin ?? 0) + chosenAddOns.reduce((s, a) => s + a.durationMin, 0);
  const total =
    (pkg?.priceCentavos ?? 0) +
    chosenAddOns.reduce((s, a) => s + a.priceCentavos, 0) +
    (locationType === "HOME" ? props.homeFeeCentavos : 0);
  const slot = result?.slots.find((s) => s.startsAt === startsAt);
  const dayLabel = props.dates.find((d) => d.iso === date)?.label;

  // Group times into morning / afternoon / evening so a long day stays scannable.
  const groups = useMemo(() => {
    const out: Array<{ name: string; slots: NonNullable<typeof result>["slots"] }> = [];
    for (const s of result?.slots ?? []) {
      const [clock, meridiem] = s.label.split(" ");
      const hour = Number(clock.split(":")[0]) % 12 + (meridiem === "PM" ? 12 : 0);
      const name = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
      if (out.at(-1)?.name !== name) out.push({ name, slots: [] });
      out.at(-1)!.slots.push(s);
    }
    return out;
  }, [result]);

  function toggleAddOn(id: string) {
    setAddOnIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <>
      {/* The price board: painted on the barber's own board color (walnut by default). */}
      <section aria-labelledby="cuts" className="mt-8 px-5 pb-5 pt-4" style={{ ...radius(1), background: "var(--page-ink)", color: "var(--page-on-ink)" }}>
        <h2 id="cuts" className="page-display text-[1.75rem] font-bold">
          Cuts
        </h2>
        <div role="radiogroup" aria-labelledby="cuts" className="mt-2">
          {props.packages.map((p) => {
            const on = p.id === packageId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPackageId(p.id)}
                className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 px-2 py-3 text-left"
                style={{ ...radius(0.5), background: on ? "rgb(255 255 255 / 0.1)" : "transparent" }}
              >
                <span
                  aria-hidden
                  className="mt-1.5 grid size-5 shrink-0 place-items-center rounded-full border-2"
                  style={{ borderColor: on ? "var(--page-accent)" : "currentColor", background: on ? "var(--page-accent)" : "transparent", opacity: on ? 1 : 0.6 }}
                >
                  {on && <Check size={12} strokeWidth={3.5} style={{ color: "var(--page-on-accent)" }} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-[1.0625rem] font-semibold">{p.name}</span>
                    <span className="leader" />
                    <span className="text-[1.6rem] leading-none">
                      <Price centavos={p.priceCentavos} />
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm opacity-80">
                    {minutes(p.durationMin)}
                    {p.description && `. ${p.description}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {props.addOns.length > 0 && (
          <>
            <h3 className="mt-4 border-t border-current/20 pt-4 font-semibold">Add to it</h3>
            <div className="mt-1">
              {props.addOns.map((a) => {
                const on = addOnIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleAddOn(a.id)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-3 px-2 py-2.5 text-left"
                    style={radius(0.5)}
                  >
                    <span
                      aria-hidden
                      className="grid size-5 shrink-0 translate-y-1 place-items-center rounded border-2"
                      style={{ borderColor: on ? "var(--page-accent)" : "currentColor", background: on ? "var(--page-accent)" : "transparent", opacity: on ? 1 : 0.6 }}
                    >
                      {on && <Check size={12} strokeWidth={3.5} style={{ color: "var(--page-on-accent)" }} />}
                    </span>
                    <span>{a.name}</span>
                    <span className="text-sm opacity-75">{a.durationMin > 0 ? `${a.durationMin} min` : ""}</span>
                    <span className="leader" />
                    <span className="text-xl leading-none">
                      <Price centavos={a.priceCentavos} plus />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {props.homeService && props.hasShop && (
        <fieldset className="mt-6">
          <legend className="font-semibold">Where</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["SHOP", "At the shop"],
                ["HOME", `Come to me, +${peso(props.homeFeeCentavos)}`],
              ] as const
            ).map(([value, label]) => {
              const on = locationType === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setLocationType(value)}
                  className="min-h-12 border-[1.5px] px-3 font-medium"
                  style={{
                    ...radius(0.6),
                    borderColor: on ? "var(--page-text)" : "var(--page-border)",
                    background: on ? "var(--page-text)" : "var(--page-surface)",
                    color: on ? "var(--page-bg)" : "var(--page-text)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <section aria-labelledby="when" className="mt-8">
        <h2 id="when" className="page-display text-[1.75rem] font-bold">
          When
        </h2>
        <div className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist" aria-label="Day">
          {props.dates.map((d) => {
            const on = d.iso === date;
            return (
              <button
                key={d.iso}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={d.label}
                onClick={() => setDate(d.iso)}
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

        <div className={`mt-4 min-h-24 ${loading ? "opacity-40" : ""}`} aria-live="polite" aria-busy={loading}>
          {groups.map((group) => (
            <div key={group.name} className="mt-4 first:mt-0">
              <h3 className="text-sm font-medium text-[var(--page-muted)]">{group.name}</h3>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {group.slots.map((s) => {
                  const on = s.startsAt === startsAt;
                  const [clock, meridiem] = s.label.split(" ");
                  return (
                    <button
                      key={s.startsAt}
                      type="button"
                      aria-pressed={on}
                      aria-label={s.label}
                      onClick={() => {
                        setStartsAt(s.startsAt);
                        setCheckout(false);
                      }}
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
          {result && result.slots.length === 0 && (
            <p className="py-3 text-[var(--page-muted)]">
              No {minutes(duration)} openings on {dayLabel}. Try another day, or pick a shorter cut.
            </p>
          )}
        </div>
      </section>

      {checkout && slot && pkg && (
        <Checkout
          {...props}
          packageId={packageId}
          addOnIds={addOnIds}
          locationType={locationType}
          date={date}
          startsAt={slot.startsAt}
          summary={[pkg.name, ...chosenAddOns.map((a) => a.name)].join(" + ")}
          day={dayLabel ?? ""}
          time={slot.label}
          duration={duration}
          total={total}
        />
      )}

      {!checkout && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/15 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-ink backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="numeral text-[1.875rem] leading-none font-bold">
                <Price centavos={total} />
              </p>
              <p className="mt-1 truncate text-sm text-ink-soft">
                {slot ? `${dayLabel}, ${slot.label}` : `${pkg?.name ?? "Pick a cut"}, ${minutes(duration)}`}
              </p>
            </div>
            <button type="button" disabled={!slot} onClick={() => setCheckout(true)} className="btn btn-ink min-w-36 shrink-0">
              {slot ? "Continue" : "Pick a time"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Checkout keeps Kliper's own look on every barber page, so customers always
 * know who is handling their details and payment.
 */
function Checkout(
  props: Props & {
    packageId: string;
    addOnIds: string[];
    locationType: "SHOP" | "HOME";
    date: string;
    startsAt: string;
    summary: string;
    day: string;
    time: string;
    duration: number;
    total: number;
  },
) {
  const [state, action, submitting] = useActionState<BookingState, FormData>(createBooking, {});
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinStatus, setPinStatus] = useState("");

  const payNow =
    props.paymentMode === "FULL" ? props.total : props.paymentMode === "DEPOSIT" ? Math.min(props.depositCentavos, props.total) : 0;
  const [clock, meridiem] = props.time.split(" ");

  function dropPin() {
    if (!("geolocation" in navigator)) return setPinStatus("This device can't share a location. The address is enough.");
    setPinStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPinStatus("Pin added. Only your barber sees it, and only for this booking.");
      },
      () => setPinStatus("Couldn't find your location. The address is enough."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <section aria-labelledby="checkout" className="mt-10 rounded-xl bg-plaster px-4 pb-6 pt-5 font-sans text-ink shadow-[0_0_0_1.5px_var(--color-rule)]">
      <h2 id="checkout" className="font-sign text-[1.75rem] font-bold">
        Your booking
      </h2>

      <div className="ticket mt-3 rounded-lg">
        <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <p className="font-semibold">{props.barberName}</p>
            <p className="text-sm text-ink-soft">{props.summary}</p>
            <p className="text-sm text-ink-soft">
              {props.day}, {minutes(props.duration)}
              {props.locationType === "HOME" ? ", at your place" : ""}
            </p>
          </div>
          <p className="numeral shrink-0 text-right text-[2.75rem] leading-[0.85] font-extrabold">
            {clock}
            <span className="block text-base font-bold">{meridiem}</span>
          </p>
        </div>
        <div className="ticket-tear mx-4" />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-ink-soft">
            {payNow === 0 ? "Pay at the shop" : payNow === props.total ? "Pay now with GCash" : `${peso(payNow)} now with GCash, the rest at the shop`}
          </span>
          <span className="numeral text-[1.75rem] leading-none font-bold">
            <Price centavos={props.total} />
          </span>
        </div>
      </div>

      <form action={action} className="mt-6 grid gap-4">
        <input type="hidden" name="slug" value={props.slug} />
        <input type="hidden" name="packageId" value={props.packageId} />
        {props.addOnIds.map((id) => (
          <input key={id} type="hidden" name="addOnIds" value={id} />
        ))}
        <input type="hidden" name="locationType" value={props.locationType} />
        <input type="hidden" name="date" value={props.date} />
        <input type="hidden" name="startsAt" value={props.startsAt} />
        {pin && (
          <>
            <input type="hidden" name="lat" value={pin.lat} />
            <input type="hidden" name="lng" value={pin.lng} />
          </>
        )}

        <label className="block font-medium">
          Your name
          <input name="name" required autoComplete="given-name" className="field" />
        </label>
        <label className="block font-medium">
          Mobile number
          <input name="phone" required inputMode="tel" autoComplete="tel" className="field" placeholder="0917 123 4567" />
          <span className="mt-1 block text-sm font-normal text-ink-soft">We text your confirmation and a reminder here.</span>
        </label>

        {props.locationType === "HOME" && (
          <div>
            <label className="block font-medium">
              Address for the home visit
              <input name="address" required autoComplete="street-address" className="field" placeholder="House number, street, barangay" />
            </label>
            <button type="button" onClick={dropPin} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
              <LocateFixed size={16} aria-hidden /> Add a map pin
            </button>
            {pinStatus && <p className="text-sm text-ink-soft">{pinStatus}</p>}
          </div>
        )}

        <label className="block font-medium">
          Anything your barber should know? <span className="font-normal text-ink-soft">Optional</span>
          <textarea name="note" rows={2} className="field" placeholder="Low fade, keep the top long" />
        </label>

        {state.error && (
          <p role="alert" className="rounded-lg border-[1.5px] border-pole-red bg-paper px-4 py-3 text-pole-red">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-ink min-h-14 w-full text-[1.0625rem]">
          {submitting
            ? "Booking…"
            : props.confirmMode === "REQUEST"
              ? "Send booking request"
              : payNow > 0
                ? `Book and pay ${peso(payNow)}`
                : "Book this time"}
        </button>
        <p className="text-center text-sm text-ink-soft">
          {props.confirmMode === "REQUEST"
            ? `${props.barberName} accepts each booking personally. We'll text you when they do.`
            : "Your chair is held the moment you book."}
        </p>
      </form>
    </section>
  );
}
