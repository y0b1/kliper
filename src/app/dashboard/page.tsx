import Link from "next/link";
import { Check, Home, X } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { db } from "@/lib/db";
import { minutes } from "@/lib/money";
import { resolveCardChrome, themePresetIds, themePresets, presetIdOrDefault, validateThemeRead } from "@/lib/theme";
import {
  addDays,
  formatManilaDate,
  formatManilaTime,
  formatMinuteOfDay,
  manilaDateOf,
  manilaMidnight,
  manilaWeekday,
} from "@/lib/time";
import { respondToBooking, setPageTheme, updatePackage } from "@/server/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your book", robots: { index: false } };

const SHOWN = ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] as const;
const PX_PER_MIN = 0.95;

const statusText = { PENDING: "Request", CONFIRMED: "Booked", COMPLETED: "Done", NO_SHOW: "No-show" } as const;

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const search = await props.searchParams;
  const barbers = await db.barber.findMany({ orderBy: { displayName: "asc" }, select: { slug: true, displayName: true } });
  const slug = typeof search.barber === "string" ? search.barber : "kuya-jun";

  const barber = await db.barber.findUnique({
    where: { slug },
    include: {
      packages: { orderBy: { sortOrder: "asc" } },
      schedules: true,
      memberships: { where: { active: true }, include: { shop: true } },
    },
  });

  if (!barber) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-4">
        <TopBar back="/" backLabel="Kliper" />
        <p className="mt-10">No barbers yet. Load the sample data with pnpm db:seed, then refresh.</p>
      </main>
    );
  }

  const today = manilaDateOf(new Date());
  const dayStart = manilaMidnight(today).getTime();
  const [bookings, requests] = await Promise.all([
    db.booking.findMany({
      where: {
        barberId: barber.id,
        status: { in: [...SHOWN] },
        startsAt: { gte: manilaMidnight(today), lt: manilaMidnight(addDays(today, 2)) },
      },
      include: { customer: true, package: true },
      orderBy: { startsAt: "asc" },
    }),
    db.booking.findMany({
      where: { barberId: barber.id, status: "PENDING", startsAt: { gte: new Date() } },
      include: { customer: true, package: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const todays = bookings.filter((b) => manilaDateOf(b.startsAt) === today);
  const tomorrows = bookings.filter((b) => manilaDateOf(b.startsAt) !== today);
  const shifts = barber.schedules.filter((s) => s.weekday === manilaWeekday(today)).sort((a, b) => a.startMin - b.startMin);
  const workMin = shifts.reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
  const bookedMin = todays
    .filter((b) => b.status !== "NO_SHOW")
    .reduce((sum, b) => sum + (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000, 0);

  // Timeline bounds: whole hours around the working day (or the bookings, on a day off).
  const minuteOf = (d: Date) => (d.getTime() - dayStart) / 60_000;
  const starts = [...shifts.map((s) => s.startMin), ...todays.map((b) => minuteOf(b.startsAt))];
  const ends = [...shifts.map((s) => s.endMin), ...todays.map((b) => minuteOf(b.endsAt))];
  const top = starts.length ? Math.floor(Math.min(...starts) / 60) * 60 : 9 * 60;
  const bottom = ends.length ? Math.ceil(Math.max(...ends) / 60) * 60 : 18 * 60;
  const hours = Array.from({ length: (bottom - top) / 60 + 1 }, (_, i) => top + i * 60);
  const y = (min: number) => (min - top) * PX_PER_MIN;

  const currentPreset = presetIdOrDefault(barber.themePreset);
  const currentTokens = validateThemeRead(currentPreset, barber.themeTokens);
  const shop = barber.memberships[0]?.shop;

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] md:max-w-4xl md:px-8">
      <TopBar>
        <Link href={`/${barber.slug}`} className="underline-offset-4 hover:underline">
          My page
        </Link>
      </TopBar>

      <details className="mt-4 rounded-lg border-[1.5px] border-dashed border-rule px-4 py-2.5 text-sm">
        <summary className="cursor-pointer text-ink-soft">Development preview. Sign-in comes next. Switch barber</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {barbers.map((b) => (
            <Link key={b.slug} href={`/dashboard?barber=${b.slug}`} aria-current={b.slug === slug} className="chip aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-paper">
              {b.displayName}
            </Link>
          ))}
        </div>
      </details>

      <h1 className="font-sign mt-8 text-[3rem] leading-[0.92] font-extrabold">{formatManilaDate(today)}</h1>
      <p className="mt-2 text-ink-soft">
        {barber.displayName}
        {shop ? ` at ${shop.name}` : ", independent"}.{" "}
        {workMin === 0
          ? "Day off."
          : `${todays.length} ${todays.length === 1 ? "booking" : "bookings"}, ${minutes(Math.round(bookedMin))} booked of ${minutes(workMin)}.`}
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_1fr] md:gap-12">
        <div>
          {requests.length > 0 && (
            <section aria-labelledby="requests" className="mb-10">
              <h2 id="requests" className="text-xl font-semibold">
                Waiting for you
              </h2>
              <ul className="mt-3 grid gap-3">
                {requests.map((b) => {
                  const [clock, meridiem] = formatManilaTime(b.startsAt).split(" ");
                  return (
                    <li key={b.id} className="rounded-lg border-[1.5px] border-ink bg-paper p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{b.customer.name ?? "Customer"}</p>
                          <p className="text-sm text-ink-soft">
                            {formatManilaDate(manilaDateOf(b.startsAt))}, {b.package.name}
                          </p>
                          {b.note && <p className="mt-1.5 text-sm">&ldquo;{b.note}&rdquo;</p>}
                        </div>
                        <p className="numeral shrink-0 text-[2rem] leading-none font-bold">
                          {clock}
                          <span className="text-sm">{meridiem}</span>
                        </p>
                      </div>
                      <form action={respondToBooking} className="mt-3 flex gap-2">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button name="decision" value="CONFIRMED" className="btn btn-ink flex-1">
                          <Check size={18} aria-hidden /> Accept
                        </button>
                        <button name="decision" value="DECLINED" className="btn btn-quiet flex-1">
                          <X size={18} aria-hidden /> Decline
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="today">
            <h2 id="today" className="text-xl font-semibold">
              Today
            </h2>
            <div className="relative mt-4" style={{ height: y(bottom) + 12 }}>
              {/* Working hours: plain wall. Everything else: hatched, not bookable. */}
              <div
                aria-hidden
                className="absolute bottom-3 left-15 right-0 rounded-md"
                style={{ top: 0, background: "repeating-linear-gradient(135deg, rgb(28 30 34 / 0.07) 0 1.5px, transparent 1.5px 8px)" }}
              />
              {shifts.map((s) => (
                <div
                  key={s.id}
                  aria-hidden
                  className="absolute left-15 right-0 rounded-md bg-plaster"
                  style={{ top: y(s.startMin), height: (s.endMin - s.startMin) * PX_PER_MIN }}
                />
              ))}

              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 flex items-start gap-3" style={{ top: y(h) }}>
                  <span className="numeral w-12 shrink-0 -translate-y-2 text-right text-sm font-semibold text-ink-soft">
                    {formatMinuteOfDay(h).replace(":00", "")}
                  </span>
                  <span className="mt-px h-px flex-1 bg-rule" />
                </div>
              ))}

              <ol>
                {todays.map((b) => {
                  const start = minuteOf(b.startsAt);
                  const length = minuteOf(b.endsAt) - start;
                  const done = b.status === "COMPLETED" || b.status === "NO_SHOW";
                  return (
                    <li
                      key={b.id}
                      className={`absolute left-16 right-1 overflow-hidden rounded-md border-l-4 px-3 py-1.5 ${
                        b.status === "PENDING" ? "border-pole-blue bg-paper" : done ? "border-ink-soft bg-paper/70" : "border-pole-red bg-paper"
                      }`}
                      style={{ top: y(start) + 1, height: Math.max(length * PX_PER_MIN - 2, 44) }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm">
                          <span className="font-semibold">{b.customer.name ?? "Customer"}</span>
                          <span className="text-ink-soft">
                            {" "}
                            {formatManilaTime(b.startsAt)}, {b.package.name}
                          </span>
                          {b.locationType === "HOME" && <Home size={13} className="ml-1 inline align-[-2px]" aria-label="Home visit" />}
                        </p>
                        {b.status === "CONFIRMED" ? (
                          <form action={respondToBooking} className="flex shrink-0 gap-1">
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button name="decision" value="COMPLETED" className="min-h-8 rounded px-2 text-xs font-semibold underline underline-offset-2">
                              Done
                            </button>
                            <button name="decision" value="NO_SHOW" className="min-h-8 rounded px-2 text-xs text-ink-soft underline underline-offset-2">
                              No-show
                            </button>
                          </form>
                        ) : (
                          <span className="shrink-0 text-xs text-ink-soft">{statusText[b.status as keyof typeof statusText]}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            {tomorrows.length > 0 && (
              <p className="mt-4 text-sm text-ink-soft">
                Tomorrow: {tomorrows.map((b) => `${formatManilaTime(b.startsAt)} ${b.customer.name ?? ""}`.trim()).join(", ")}.
              </p>
            )}
          </section>
        </div>

        <div>
          <section aria-labelledby="board">
            <h2 id="board" className="text-xl font-semibold">
              Your price board
            </h2>
            <p className="text-sm text-ink-soft">What each cut costs and how long it takes. Your open times follow these lengths.</p>
            <div className="sign mt-3 rounded-lg px-4 pb-2 pt-1">
              {barber.packages.map((p) => (
                <form key={p.id} action={updatePackage} className="border-b border-white/15 py-3 last:border-b-0">
                  <input type="hidden" name="packageId" value={p.id} />
                  <p className="font-semibold">{p.name}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <label className="w-24 text-xs opacity-85">
                      Price, ₱
                      <input
                        name="pricePesos"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={10}
                        defaultValue={p.priceCentavos / 100}
                        className="numeral mt-1 h-11 w-full rounded-md border border-white/25 bg-black/20 px-2.5 text-xl font-bold text-sign-text"
                      />
                    </label>
                    <label className="w-24 text-xs opacity-85">
                      Minutes
                      <input
                        name="durationMin"
                        type="number"
                        inputMode="numeric"
                        min={5}
                        max={480}
                        step={5}
                        defaultValue={p.durationMin}
                        className="numeral mt-1 h-11 w-full rounded-md border border-white/25 bg-black/20 px-2.5 text-xl font-bold text-sign-text"
                      />
                    </label>
                    <button className="ml-auto h-11 rounded-md bg-sign-text px-4 font-semibold text-walnut-dark">Save</button>
                  </div>
                </form>
              ))}
            </div>
          </section>

          <section aria-labelledby="look" className="mt-10">
            <h2 id="look" className="text-xl font-semibold">
              Your page&apos;s look
            </h2>
            <p className="text-sm text-ink-soft">Customers see this on your booking page. Text stays readable whatever you pick.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {themePresetIds.map((id) => {
                const preset = themePresets[id];
                const chrome = resolveCardChrome(id, {});
                const active = id === currentPreset;
                return (
                  <form key={id} action={setPageTheme}>
                    <input type="hidden" name="barberId" value={barber.id} />
                    <input type="hidden" name="preset" value={id} />
                    <button
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 rounded-lg border-[1.5px] p-2 text-left ${active ? "border-ink bg-paper" : "border-rule"}`}
                    >
                      <span aria-hidden className="flex h-10 w-12 shrink-0 overflow-hidden rounded">
                        <span className="flex-1" style={{ background: preset.palette.background }} />
                        <span className="flex-1" style={{ background: preset.palette.ink }} />
                        <span className="flex-1" style={{ background: chrome["--card-accent"] }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{preset.name}</span>
                        <span className="block text-xs text-ink-soft">{active ? "In use" : "Use this"}</span>
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
            <form action={setPageTheme} className="mt-3 flex items-center gap-3">
              <input type="hidden" name="barberId" value={barber.id} />
              <input type="hidden" name="preset" value={currentPreset} />
              <label className="flex items-center gap-2 text-sm font-medium">
                Accent color
                <input type="color" name="accent" defaultValue={currentTokens.accent} className="h-11 w-14 cursor-pointer rounded-md border-[1.5px] border-rule bg-paper" />
              </label>
              <button className="btn btn-quiet min-h-11">Use this color</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
