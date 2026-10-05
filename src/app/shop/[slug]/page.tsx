import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowLeft, ChevronRight, Clock, Home, MapPin } from "lucide-react";
import { Wordmark } from "@/components/top-bar";
import { minutes, peso } from "@/lib/money";
import { resolveCardChrome, resolveTheme } from "@/lib/theme";
import { addDays, formatManilaDate, formatMinuteOfDay, manilaDateOf, manilaWeekday } from "@/lib/time";
import { getShopBySlug, nextOpening } from "@/server/barbers";
import { initials } from "@/server/directory";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const shop = await getShopBySlug(slug);
  if (!shop) return {};
  return { title: shop.name, description: `Book a barber at ${shop.name}, ${shop.barangay ?? shop.city}.` };
}

export default async function ShopPage(props: PageProps<"/shop/[slug]">) {
  const { slug } = await props.params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const theme = resolveTheme(shop.themePreset, shop.themeTokens);
  const today = manilaDateOf(new Date());
  const hoursToday = shop.hours.find((h) => h.weekday === manilaWeekday(today));

  const barbers = await Promise.all(
    shop.memberships.map(async ({ barber, role }) => {
      const next = await nextOpening(barber);
      const prices = barber.packages.map((p) => p.priceCentavos);
      const durations = barber.packages.map((p) => p.durationMin);
      const day = !next
        ? null
        : next.date === today
          ? "Today"
          : next.date === addDays(today, 1)
            ? "Tomorrow"
            : formatManilaDate(next.date).split(",")[0];
      return {
        barber,
        role,
        next: next && day ? `${day} ${next.slot.label}` : "None this week",
        openToday: next?.date === today,
        from: prices.length ? peso(Math.min(...prices)) : null,
        shortest: durations.length ? minutes(Math.min(...durations)) : null,
        chrome: resolveCardChrome(barber.themePreset, barber.themeTokens),
      };
    }),
  );

  return (
    <div className="page-shell" style={theme.cssProperties as CSSProperties}>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-3xl">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Back to all barbershops"
            className="grid size-13 place-items-center rounded-full border border-[var(--page-border)] bg-[var(--page-surface)]"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Link>
          <span className="rounded-full border border-[var(--page-border)] bg-[var(--page-surface)] px-4 py-2.5 text-sm">
            {barbers.length} {barbers.length === 1 ? "barber" : "barbers"}
          </span>
        </header>

        <section className="page-ink mt-6 p-6">
          <p className="text-sm uppercase tracking-[0.2em] opacity-75">Barbershop</p>
          <h1 className="page-display mt-2 text-5xl leading-none">{shop.name}</h1>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <MapPin size={14} /> {shop.address}
              {shop.barangay ? "" : `, ${shop.city}`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <Clock size={14} />
              {hoursToday ? `Open today ${formatMinuteOfDay(hoursToday.openMin)}–${formatMinuteOfDay(hoursToday.closeMin)}` : "Closed today"}
            </span>
          </div>
        </section>

        <h2 className="page-display mt-8 text-3xl">Choose your barber</h2>
        <p className="mt-1 text-sm text-[var(--page-muted)]">Each barber sets their own cuts, prices and hours.</p>

        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {barbers.map(({ barber, role, next, openToday, from, shortest, chrome }) => (
            <li key={barber.id}>
              <Link href={`/${barber.slug}`} className="page-card group flex h-full flex-col gap-4 p-5">
                <div className="flex items-center gap-3" style={chrome as CSSProperties}>
                  <span
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-full text-lg"
                    style={{ background: "var(--card-accent)", color: "var(--card-on-accent)", fontFamily: "var(--card-font-display)" }}
                  >
                    {initials(barber.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg leading-tight">{barber.displayName}</p>
                    <p className="truncate text-sm text-[var(--page-muted)]">
                      {role === "OWNER" ? "Owner · " : ""}
                      {barber.specialties.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--page-muted)]">From</dt>
                    <dd className="mt-1">{from ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--page-muted)]">Quickest</dt>
                    <dd className="mt-1">{shortest ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--page-muted)]">Next</dt>
                    <dd className="mt-1 font-medium" style={openToday ? { color: "var(--page-accent)" } : undefined}>
                      {next}
                    </dd>
                  </div>
                </dl>
                {barber.homeService && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-[var(--page-muted)]">
                    <Home size={13} /> Also does home service
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-10 flex items-center justify-center gap-2 text-sm opacity-70">
          Booking by <Wordmark className="text-base" />
        </footer>
      </main>
    </div>
  );
}
