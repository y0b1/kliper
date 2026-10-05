import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/top-bar";
import { peso } from "@/lib/money";
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
      const day = !next
        ? null
        : next.date === today
          ? "today"
          : next.date === addDays(today, 1)
            ? "tomorrow"
            : formatManilaDate(next.date).split(",")[0];
      const [clock, meridiem] = next ? next.slot.label.split(" ") : [null, null];
      return {
        barber,
        owner: role === "OWNER",
        clock,
        meridiem,
        day,
        openToday: next?.date === today,
        from: prices.length ? peso(Math.min(...prices)) : null,
        chrome: resolveCardChrome(barber.themePreset, barber.themeTokens),
      };
    }),
  );

  return (
    <div className="page-shell" style={theme.cssProperties as CSSProperties}>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex min-h-12 items-center">
          <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 font-medium">
            <ArrowLeft size={20} strokeWidth={2} aria-hidden />
            All barbers
          </Link>
        </header>

        <div className="sign-themed mt-8 px-5 pb-4 pt-5">
          <h1 className="page-display text-[3rem] leading-[0.92] font-bold">{shop.name}</h1>
        </div>
        <p className="mt-4 font-medium">
          {shop.address}
          {shop.barangay ? "" : `, ${shop.city}`}
        </p>
        <p className="text-[var(--page-muted)]">
          {hoursToday
            ? `Open today from ${formatMinuteOfDay(hoursToday.openMin)} to ${formatMinuteOfDay(hoursToday.closeMin)}.`
            : "Closed today."}
        </p>

        <h2 className="page-display mt-10 text-[1.75rem] font-bold">Pick a barber</h2>
        <p className="text-[var(--page-muted)]">Each barber sets their own cuts, prices and hours.</p>

        <ul className="mt-3 divide-y" style={{ borderColor: "var(--page-border)" }}>
          {barbers.map(({ barber, owner, clock, meridiem, day, openToday, from, chrome }) => (
            <li key={barber.id} style={{ borderColor: "var(--page-border)" }}>
              <Link href={`/${barber.slug}`} className="flex items-center gap-3 py-4">
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-full font-semibold"
                  style={{ ...(chrome as CSSProperties), background: "var(--card-accent)", color: "var(--card-on-accent)", fontFamily: "var(--card-font-display)" }}
                >
                  {initials(barber.displayName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1.0625rem] font-semibold">
                    {barber.displayName}
                    {owner && <span className="ml-2 text-sm font-normal text-[var(--page-muted)]">Owner</span>}
                  </span>
                  <span className="block truncate text-sm text-[var(--page-muted)]">{barber.specialties.join(", ")}</span>
                  {from && <span className="block text-sm text-[var(--page-muted)]">Cuts from {from}</span>}
                </span>
                <span className="shrink-0 text-right">
                  {clock ? (
                    <>
                      <span className="numeral block text-[2rem] leading-none font-bold">
                        {clock}
                        <span className="ml-0.5 text-base font-semibold">{meridiem}</span>
                      </span>
                      <span className="text-sm" style={{ color: openToday ? "var(--page-accent)" : "var(--page-muted)" }}>
                        {day}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--page-muted)]">Booked up</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-14 flex justify-center opacity-70">
          <Link href="/" aria-label="Kliper home">
            <Wordmark />
          </Link>
        </footer>
      </main>
    </div>
  );
}
