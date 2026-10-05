import Link from "next/link";
import { Check, Home, Store, X } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { db } from "@/lib/db";
import { minutes, peso } from "@/lib/money";
import { resolveCardChrome, themePresetIds, themePresets, presetIdOrDefault, validateThemeRead } from "@/lib/theme";
import { addDays, formatManilaDate, formatManilaTime, manilaDateOf, manilaMidnight, manilaWeekday } from "@/lib/time";
import { respondToBooking, setPageTheme, updatePackage } from "@/server/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false } };

const LIVE = ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] as const;

/** Half-ring gauge like the reference "Security status" card: booked vs free chair time. */
function Gauge({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const arc = "M 20 110 A 90 90 0 0 1 200 110";
  return (
    <svg viewBox="0 0 220 125" className="mx-auto w-full max-w-72" role="img" aria-label={`${p}% of today's chair time booked`}>
      <path d={arc} pathLength={100} fill="none" stroke="#d9a56b" strokeWidth={26} strokeLinecap="round" strokeDasharray={`${p} 100`} />
      {p < 96 && (
        <path
          d={arc}
          pathLength={100}
          fill="none"
          stroke="#2b211a"
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray={`0 ${p + 4} ${Math.max(0, 96 - p)} 100`}
        />
      )}
    </svg>
  );
}

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
      <main className="mx-auto max-w-xl px-4 pt-6">
        <TopBar back="/" />
        <p className="soft-card mt-8 p-6">No barber found. Run the seed script first: pnpm db:seed</p>
      </main>
    );
  }

  const today = manilaDateOf(new Date());
  const [bookings, pending] = await Promise.all([
    db.booking.findMany({
      where: {
        barberId: barber.id,
        status: { in: [...LIVE] },
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
  const weekday = manilaWeekday(today);
  const workMin = barber.schedules.filter((s) => s.weekday === weekday).reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
  const bookedMin = todays.reduce((sum, b) => sum + (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000, 0);
  const percent = workMin > 0 ? Math.round((bookedMin / workMin) * 100) : 0;
  const done = todays.filter((b) => b.status === "COMPLETED").length;
  const currentPreset = presetIdOrDefault(barber.themePreset);
  const currentTokens = validateThemeRead(currentPreset, barber.themeTokens);

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-4xl">
      <TopBar back="/">
        <Link href={`/${barber.slug}`} className="pill">
          My page
        </Link>
        <Link href="/" className="pill">
          Directory
        </Link>
      </TopBar>

      <h1 className="mt-10 text-5xl font-light tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted">
        {barber.displayName}
        {barber.memberships[0] ? ` · ${barber.memberships[0].shop.name}` : " · Solo"}
      </p>

      <details className="mt-4 rounded-3xl border border-dashed border-oak/50 bg-oak-pale/30 px-5 py-3 text-sm">
        <summary className="cursor-pointer">Development: viewing as {barber.displayName}. Sign-in comes next.</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {barbers.map((b) => (
            <Link key={b.slug} href={`/dashboard?barber=${b.slug}`} className={`pill text-sm ${b.slug === slug ? "bg-walnut! text-cream!" : ""}`}>
              {b.displayName}
            </Link>
          ))}
        </div>
      </details>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="soft-card p-6 text-center" aria-labelledby="chair">
          <h2 id="chair" className="text-3xl font-light">
            Today&apos;s chair
          </h2>
          <div className="relative mt-4">
            <Gauge percent={percent} />
            <div className="absolute inset-x-0 bottom-0">
              <p className="text-5xl font-light">{percent}%</p>
              <p className="text-sm text-muted">{workMin === 0 ? "Day off" : `booked of ${minutes(workMin)}`}</p>
            </div>
          </div>
        </section>

        <section className="wood rounded-[2rem] p-6 text-cream" aria-labelledby="today">
          <div className="flex items-end justify-between">
            <h2 id="today" className="text-2xl font-light">
              Today
            </h2>
            <p className="text-5xl font-light">
              {done}/{todays.length}
            </p>
          </div>
          <ul className="mt-4 grid gap-3">
            {todays.length === 0 && <li className="text-cream-muted">No bookings yet today.</li>}
            {todays.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/90 text-walnut">
                  {b.locationType === "HOME" ? <Home size={17} /> : <Store size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{b.customer.name ?? "Customer"}</p>
                  <p className="text-sm text-cream-muted">
                    {formatManilaTime(b.startsAt)} · {b.package.name}
                  </p>
                </div>
                {b.status === "CONFIRMED" ? (
                  <form action={respondToBooking} className="flex gap-1.5">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <button name="decision" value="COMPLETED" className="rounded-full bg-white/15 px-3 py-1.5 text-xs">
                      Done
                    </button>
                    <button name="decision" value="NO_SHOW" className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-cream-muted">
                      No-show
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-cream-muted">{b.status === "PENDING" ? "Request" : b.status === "COMPLETED" ? "Done" : "No-show"}</span>
                )}
              </li>
            ))}
          </ul>
          {tomorrows.length > 0 && (
            <p className="mt-5 border-t border-white/15 pt-4 text-sm text-cream-muted">
              Tomorrow: {tomorrows.map((b) => formatManilaTime(b.startsAt)).join(", ")}
            </p>
          )}
        </section>
      </div>

      {pending.length > 0 && (
        <section className="mt-6" aria-labelledby="requests">
          <h2 id="requests" className="text-2xl font-light">
            Requests
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {pending.map((b) => (
              <div key={b.id} className="rounded-[2rem] bg-gradient-to-b from-oak-pale to-oak-light p-5">
                <p className="text-lg">{b.customer.name ?? "Customer"}</p>
                <p className="text-sm text-ink/70">
                  {formatManilaDate(manilaDateOf(b.startsAt))} · {formatManilaTime(b.startsAt)} · {b.package.name}
                </p>
                {b.note && <p className="mt-2 text-sm">&ldquo;{b.note}&rdquo;</p>}
                <form action={respondToBooking} className="mt-4 flex gap-2">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button name="decision" value="CONFIRMED" className="pill bg-walnut! text-cream!">
                    <Check size={16} /> Accept
                  </button>
                  <button name="decision" value="DECLINED" className="pill">
                    <X size={16} /> Decline
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="soft-card mt-6 p-6" aria-labelledby="packages">
        <h2 id="packages" className="text-2xl font-light">
          Packages
        </h2>
        <p className="mt-1 text-sm text-muted">Set the price and how long each cut takes. Booking slots follow these times.</p>
        <div className="mt-4 grid gap-3">
          {barber.packages.map((p) => (
            <form key={p.id} action={updatePackage} className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-3xl bg-white/60 p-4 sm:grid-cols-[1fr_7rem_7rem_auto]">
              <input type="hidden" name="packageId" value={p.id} />
              <div className="col-span-2 sm:col-span-1">
                <p>{p.name}</p>
                <p className="text-sm text-muted">
                  {peso(p.priceCentavos)} · {minutes(p.durationMin)}
                </p>
              </div>
              <label className="text-xs text-muted">
                Price (₱)
                <input name="pricePesos" type="number" min={0} step={10} defaultValue={p.priceCentavos / 100} className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-base text-ink" />
              </label>
              <label className="text-xs text-muted">
                Minutes
                <input name="durationMin" type="number" min={5} max={480} step={5} defaultValue={p.durationMin} className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-base text-ink" />
              </label>
              <button className="pill col-span-2 justify-center bg-walnut! text-cream! sm:col-span-1">Save</button>
            </form>
          ))}
        </div>
      </section>

      <section className="soft-card mt-6 p-6" aria-labelledby="look">
        <h2 id="look" className="text-2xl font-light">
          Page look
        </h2>
        <p className="mt-1 text-sm text-muted">Pick a preset for your page. Text contrast is corrected automatically.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {themePresetIds.map((id) => {
            const preset = themePresets[id];
            const chrome = resolveCardChrome(id, {});
            const active = id === currentPreset;
            return (
              <form key={id} action={setPageTheme}>
                <input type="hidden" name="barberId" value={barber.id} />
                <input type="hidden" name="preset" value={id} />
                <button
                  className={`w-full overflow-hidden rounded-3xl border text-left ${active ? "border-walnut ring-2 ring-walnut" : "border-line"}`}
                  aria-pressed={active}
                >
                  <span className="flex h-12">
                    <span className="flex-1" style={{ background: preset.palette.background }} />
                    <span className="flex-1" style={{ background: chrome["--card-accent"] }} />
                    <span className="flex-1" style={{ background: preset.palette.ink }} />
                  </span>
                  <span className="block bg-white/70 px-3 py-2.5">
                    <span className="block text-sm" style={{ fontFamily: chrome["--card-font-display"] }}>
                      {preset.name}
                    </span>
                    <span className="block text-xs text-muted">{active ? "Current" : "Use this"}</span>
                  </span>
                </button>
              </form>
            );
          })}
        </div>
        <form action={setPageTheme} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="barberId" value={barber.id} />
          <input type="hidden" name="preset" value={currentPreset} />
          <label className="flex items-center gap-2 text-sm text-muted">
            Accent color
            <input type="color" name="accent" defaultValue={currentTokens.accent} className="h-10 w-14 cursor-pointer rounded-xl border border-line bg-white" />
          </label>
          <button className="pill">Apply accent</button>
        </form>
      </section>
    </main>
  );
}
