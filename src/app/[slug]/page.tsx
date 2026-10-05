import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
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

function joinWords(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
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
    return { iso, weekday: i === 0 ? "Today" : weekday, day: rest.split(" ")[1], label: formatManilaDate(iso) };
  });

  const where = location?.shopName
    ? `Works at ${location.shopName}, ${location.label}.`
    : location
      ? `Independent barber in ${location.label}.`
      : "Independent barber.";
  const home = barber.homeService
    ? ` Comes to you within ${barber.serviceRadiusKm} km${barber.homeFeeCentavos ? ` for ${peso(barber.homeFeeCentavos)} extra` : ""}.`
    : "";

  return (
    <div className="page-shell" style={theme.cssProperties as CSSProperties}>
      <main className="mx-auto max-w-xl px-4 pb-44 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex min-h-12 items-center justify-between">
          <Link
            href={location?.shopSlug ? `/shop/${location.shopSlug}` : "/"}
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 font-medium"
          >
            <ArrowLeft size={20} strokeWidth={2} aria-hidden />
            {location?.shopName ?? "All barbers"}
          </Link>
        </header>

        <h1 className="page-display mt-8 text-[3.5rem] leading-[0.92] font-bold break-words">{barber.displayName}</h1>
        <p className="mt-3 text-[1.0625rem] font-medium">{joinWords(barber.specialties)}.</p>
        <p className="mt-1 text-[var(--page-muted)]">
          {where}
          {home}
        </p>
        {barber.bio && <p className="mt-4 max-w-prose leading-relaxed">{barber.bio}</p>}

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

        <footer className="mt-14 flex justify-center opacity-70">
          <Link href="/" aria-label="Kliper home">
            <Wordmark />
          </Link>
        </footer>
      </main>
    </div>
  );
}
