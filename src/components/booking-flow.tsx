"use client";

import { Check, Home, LocateFixed, ShieldCheck, Store } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { peso, minutes } from "@/lib/money";
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

const sectionTitle = "page-display text-2xl";

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
      <section className="page-card mt-5 p-5" aria-labelledby="choose-cut">
        <h2 id="choose-cut" className={sectionTitle}>
          Choose your cut
        </h2>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-labelledby="choose-cut">
          {props.packages.map((p) => {
            const selected = p.id === packageId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPackageId(p.id)}
                className="flex items-center justify-between gap-3 border px-4 py-3.5 text-left transition-colors"
                style={{
                  borderRadius: "calc(var(--page-radius) * 0.6)",
                  borderColor: selected ? "var(--page-accent)" : "var(--page-border)",
                  boxShadow: selected ? "inset 0 0 0 1px var(--page-accent)" : undefined,
                }}
              >
                <span className="min-w-0">
                  <span className="block">{p.name}</span>
                  {p.description && <span className="block text-sm text-[var(--page-muted)]">{p.description}</span>}
                </span>
                <span className="shrink-0 text-right text-sm">
                  <span className="text-[var(--page-muted)]">{minutes(p.durationMin)}</span>
                  <span className="ml-2 font-semibold">{peso(p.priceCentavos)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {props.addOns.length > 0 && (
          <>
            <h3 className="mt-6 text-sm uppercase tracking-[0.18em] text-[var(--page-muted)]">Add-ons</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {props.addOns.map((a) => {
                const on = addOnIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAddOn(a.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm"
                    style={{
                      borderColor: on ? "var(--page-accent)" : "var(--page-border)",
                      background: on ? "var(--page-accent)" : "transparent",
                      color: on ? "var(--page-on-accent)" : undefined,
                    }}
                  >
                    {on && <Check size={14} />}
                    {a.name} +{peso(a.priceCentavos)}
                    {a.durationMin > 0 && <span className="opacity-75">· {a.durationMin} min</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {props.homeService && props.hasShop && (
        <section className="page-card mt-4 grid grid-cols-2 gap-1 p-1.5" aria-label="Where">
          {(
            [
              ["SHOP", "At the shop", <Store key="s" size={16} />],
              ["HOME", `Home service +${peso(props.homeFeeCentavos)}`, <Home key="h" size={16} />],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={locationType === value}
              onClick={() => setLocationType(value)}
              className="inline-flex items-center justify-center gap-2 px-3 py-3 text-sm"
              style={{
                borderRadius: "calc(var(--page-radius) * 0.6)",
                background: locationType === value ? "var(--page-ink)" : "transparent",
                color: locationType === value ? "var(--page-on-ink)" : undefined,
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </section>
      )}

      <section className="page-card mt-4 p-5" aria-labelledby="pick-time">
        <h2 id="pick-time" className={sectionTitle}>
          Pick a time
        </h2>
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Day">
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
                className="flex w-16 shrink-0 flex-col items-center gap-0.5 border py-2.5"
                style={{
                  borderRadius: "calc(var(--page-radius) * 0.6)",
                  borderColor: on ? "var(--page-ink)" : "var(--page-border)",
                  background: on ? "var(--page-ink)" : "transparent",
                  color: on ? "var(--page-on-ink)" : undefined,
                }}
              >
                <span className="text-xs opacity-80">{d.weekday}</span>
                <span className="page-display text-xl">{d.day}</span>
              </button>
            );
          })}
        </div>

        <div className={`mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 ${loading ? "opacity-50" : ""}`} aria-live="polite">
          {result?.slots.map((s) => {
            const on = s.startsAt === startsAt;
            return (
              <button
                key={s.startsAt}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setStartsAt(s.startsAt);
                  setCheckout(false);
                }}
                className="border py-2.5 text-sm"
                style={{
                  borderRadius: "calc(var(--page-radius) * 0.5)",
                  borderColor: on ? "var(--page-accent)" : "var(--page-border)",
                  background: on ? "var(--page-accent)" : "transparent",
                  color: on ? "var(--page-on-accent)" : undefined,
                }}
              >
                {s.label}
              </button>
            );
          })}
          {result && result.slots.length === 0 && (
            <p className="col-span-full py-4 text-sm text-[var(--page-muted)]">
              No openings for a {minutes(duration)} booking that day. Try another day or a shorter package.
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
          summary={`${pkg.name}${chosenAddOns.length ? ` + ${chosenAddOns.map((a) => a.name).join(", ")}` : ""}`}
          when={`${dayLabel} · ${slot.label}`}
          total={total}
        />
      )}

      {!checkout && (
        <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="page-ink mx-auto flex max-w-xl items-center justify-between gap-3 p-4 shadow-2xl">
            <div className="min-w-0">
              <p className="truncate text-sm opacity-80">
                {pkg?.name ?? "Choose a cut"} · {minutes(duration)}
                {slot ? ` · ${slot.label}` : ""}
              </p>
              <p className="page-display text-2xl">{peso(total)}</p>
            </div>
            <button
              type="button"
              disabled={!slot}
              onClick={() => setCheckout(true)}
              className="shrink-0 rounded-full px-6 py-3.5 font-medium disabled:opacity-50"
              style={{ background: "var(--page-accent)", color: "var(--page-on-accent)" }}
            >
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
    when: string;
    total: number;
  },
) {
  const [state, action, submitting] = useActionState<BookingState, FormData>(createBooking, {});
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinStatus, setPinStatus] = useState("");

  const payNow = useMemo(() => {
    if (props.paymentMode === "FULL") return props.total;
    if (props.paymentMode === "DEPOSIT") return Math.min(props.depositCentavos, props.total);
    return 0;
  }, [props.paymentMode, props.depositCentavos, props.total]);

  function dropPin() {
    if (!("geolocation" in navigator)) return setPinStatus("Location isn't available on this device.");
    setPinStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPinStatus("Pin added. It's saved on this booking only and shown only to your barber.");
      },
      () => setPinStatus("Couldn't get your location. The address is enough."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const field =
    "mt-1.5 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-ink placeholder:text-muted/70 focus:border-oak focus:outline-none";

  return (
    <section className="soft-card mt-4 p-5 text-ink" style={{ fontFamily: "var(--font-outfit)" }} aria-labelledby="checkout">
      <div className="flex items-center justify-between gap-3">
        <h2 id="checkout" className="text-2xl font-light">
          Checkout
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs text-muted">
          <ShieldCheck size={14} /> Handled by Kliper
        </span>
      </div>

      <div className="wood mt-4 rounded-3xl p-4 text-cream">
        <p className="text-sm text-cream-muted">{props.barberName}</p>
        <p className="mt-1">{props.summary}</p>
        <p className="text-sm text-cream-muted">{props.when}</p>
        <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3">
          <span className="text-sm text-cream-muted">{payNow > 0 ? `Pay now ${peso(payNow)}` : "Pay at the shop"}</span>
          <span className="text-2xl">{peso(props.total)}</span>
        </div>
      </div>

      <form action={action} className="mt-5 grid gap-4">
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

        <label className="text-sm text-muted">
          Your name
          <input name="name" required autoComplete="given-name" className={field} placeholder="Juan" />
        </label>
        <label className="text-sm text-muted">
          Mobile number
          <input name="phone" required inputMode="tel" autoComplete="tel" className={field} placeholder="0917 123 4567" />
        </label>

        {props.locationType === "HOME" && (
          <div>
            <label className="text-sm text-muted">
              Address for the home visit
              <input name="address" required autoComplete="street-address" className={field} placeholder="House no., street, barangay" />
            </label>
            <button type="button" onClick={dropPin} className="pill mt-2 text-sm">
              <LocateFixed size={14} /> Add a map pin
            </button>
            {pinStatus && <p className="mt-1.5 text-sm text-muted">{pinStatus}</p>}
          </div>
        )}

        <label className="text-sm text-muted">
          Note for your barber <span className="text-muted/70">(optional)</span>
          <textarea name="note" rows={2} className={field} placeholder="Low fade, keep the top long" />
        </label>

        {state.error && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="wood rounded-full px-6 py-4 text-cream disabled:opacity-60"
        >
          {submitting
            ? "Booking…"
            : props.confirmMode === "REQUEST"
              ? "Send booking request"
              : payNow > 0
                ? `Book · ${peso(payNow)} due now`
                : "Confirm booking"}
        </button>
        <p className="text-center text-xs text-muted">
          {props.confirmMode === "REQUEST"
            ? `${props.barberName} confirms each booking. You'll get an SMS when they do.`
            : "You'll get an SMS confirmation and a reminder before your cut."}
        </p>
      </form>
    </section>
  );
}
