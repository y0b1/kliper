"use client";

import { LocateFixed } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { minutes, peso } from "@/lib/money";
import { createBooking, getSlots, type BookingState, type SlotResult } from "@/server/actions";
import { DayStrip, SlotGrid } from "./booking-pickers";
import { Price, PriceBoard, type PriceBoardAddOn as AddOn, type PriceBoardPackage as Pkg } from "./price-board";

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

  function toggleAddOn(id: string) {
    setAddOnIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <>
      <PriceBoard
        packages={props.packages}
        addOns={props.addOns}
        packageId={packageId}
        addOnIds={addOnIds}
        onPick={setPackageId}
        onToggleAddOn={toggleAddOn}
      />

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
        <DayStrip dates={props.dates} selected={date} onPick={setDate} />

        <SlotGrid
          slots={result?.slots ?? []}
          selected={startsAt}
          loading={loading}
          onPick={(value) => {
            setStartsAt(value);
            setCheckout(false);
          }}
          empty={result ? `No ${minutes(duration)} openings on ${dayLabel}. Try another day, or pick a shorter cut.` : null}
        />
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
