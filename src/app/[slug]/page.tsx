import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowLeft, Home, MapPin, Store } from "lucide-react";
import { BookingFlow } from "@/components/booking-flow";
import { Wordmark } from "@/components/top-bar";
import { peso } from "@/lib/money";
import { resolveTheme } from "@/lib/theme";
import { addDays, formatManilaDate, manilaDateOf } from "@/lib/time";
import { barberLocation, getBarberBySlug } from "@/server/barbers";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const barber = await getBarberBySlug(slug);
  if (!barber) return {};
  return { title: barber.displayName, description: barber.bio ?? `Book ${barber.displayName} on Kliper.` };
}

export default async function BarberPage(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const barber = await getBarberBySlug(slug);
  if (!barber) notFound();

  const theme = resolveTheme(barber.themePreset, barber.themeTokens);
  const location = barberLocation(barber);
  const today = manilaDateOf(new Date());
  const dates = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(today, i);
    const [weekday, rest] = formatManilaDate(iso).split(", ");
    return { iso, weekday: i === 0 ? "Today" : i === 1 ? "Tmrw" : weekday, day: rest.split(" ")[1], label: formatManilaDate(iso) };
  });
  const initials = barber.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page-shell" style={theme.cssProperties as CSSProperties}>
      <main className="mx-auto max-w-xl px-4 pb-40 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <Link
            href={location?.shopSlug ? `/shop/${location.shopSlug}` : "/"}
            aria-label={location?.shopName ? `Back to ${location.shopName}` : "Back to all barbershops"}
            className="grid size-13 place-items-center rounded-full border border-[var(--page-border)] bg-[var(--page-surface)]"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Link>
          <span className="rounded-full border border-[var(--page-border)] bg-[var(--page-surface)] px-4 py-2.5 text-sm">
            {theme.preset.name} theme
          </span>
        </header>

        <section className="page-ink mt-6 p-6">
          {location?.shopName ? (
            <Link
              href={`/shop/${location.shopSlug}`}
              className="mb-4 inline-flex items-center gap-1.5 text-sm uppercase tracking-[0.2em] opacity-80 hover:opacity-100"
            >
              <Store size={14} /> {location.shopName}
            </Link>
          ) : (
            <p className="mb-4 text-sm uppercase tracking-[0.2em] opacity-80">Independent barber</p>
          )}
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="page-display grid size-20 shrink-0 place-items-center rounded-full text-2xl"
              style={{ background: "var(--page-accent)", color: "var(--page-on-accent)" }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h1 className="page-display text-4xl leading-none">{barber.displayName}</h1>
              <p className="mt-2 text-sm opacity-80">{barber.specialties.join(" · ")}</p>
            </div>
          </div>
          {barber.bio && <p className="mt-5 leading-relaxed opacity-90">{barber.bio}</p>}
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <MapPin size={14} /> {location.label}
              </span>
            )}
            {barber.homeService && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Home size={14} /> Home service · {barber.serviceRadiusKm} km
                {barber.homeFeeCentavos ? ` · +${peso(barber.homeFeeCentavos)}` : ""}
              </span>
            )}
          </div>
        </section>

        <BookingFlow
          slug={barber.slug}
          barberName={barber.displayName}
          packages={barber.packages.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            priceCentavos: p.priceCentavos,
            durationMin: p.durationMin,
          }))}
          addOns={barber.addOns.map((a) => ({ id: a.id, name: a.name, priceCentavos: a.priceCentavos, durationMin: a.durationMin }))}
          dates={dates}
          hasShop={barber.memberships.length > 0}
          homeService={barber.homeService}
          homeFeeCentavos={barber.homeFeeCentavos ?? 0}
          paymentMode={barber.paymentMode}
          depositCentavos={barber.depositCentavos ?? 0}
          confirmMode={barber.confirmMode}
        />

        <footer className="mt-10 flex items-center justify-center gap-2 text-sm opacity-70">
          Booking by <Wordmark className="text-base" />
        </footer>
      </main>
    </div>
  );
}
