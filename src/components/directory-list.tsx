"use client";

import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { searchNearby } from "@/server/actions";
import type { Directory, DirectoryCard } from "@/server/directory";
import { BarberRow } from "./barber-row";
import { ShopBlock } from "./shop-sign";

/** Neighborhood centers, for visitors planning ahead or who'd rather not share a location. */
const AREAS = [
  { name: "Lanang", lat: 7.1003, lng: 125.6318 },
  { name: "Bajada", lat: 7.0872, lng: 125.6108 },
  { name: "Poblacion", lat: 7.0713, lng: 125.6127 },
  { name: "Matina", lat: 7.0612, lng: 125.597 },
  { name: "Buhangin", lat: 7.116, lng: 125.617 },
  { name: "Toril", lat: 7.018, lng: 125.498 },
];

type Filter = "all" | "today" | "home";
type Status = "idle" | "locating" | "denied" | "unavailable";

/**
 * The hero: today's soonest free chairs, times set large. A shop shows once,
 * under its own name, with its soonest chair; independents show by name.
 */
function NextChairs({ cards }: { cards: DirectoryCard[] }) {
  if (cards.length === 0) {
    return <p className="mt-3 text-ink-soft">No chairs left today. Tomorrow&apos;s openings are listed below.</p>;
  }
  return (
    <ol className="-mx-4 mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {cards.map((card) => (
        <li key={card.shopSlug ?? card.slug} className="snap-start">
          <Link
            href={card.shopSlug ? `/shop/${card.shopSlug}` : `/${card.slug}`}
            className="flex w-40 flex-col rounded-lg border-[1.5px] border-ink bg-paper px-4 pb-3.5 pt-3 transition-transform active:translate-y-px"
          >
            <span className="numeral text-[3.25rem] leading-[0.95] font-extrabold">{card.nextClock}</span>
            <span className="numeral text-lg font-bold leading-none">{card.nextMeridiem}</span>
            <span className="mt-3 truncate font-semibold">{card.shopName ?? card.name}</span>
            <span className="truncate text-sm text-ink-soft">
              {card.shopName || !card.homeService ? card.area : "Home service"}
              {card.distance && `, ${card.distance}`}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function DirectoryList({ initial }: { initial: Directory }) {
  const [directory, setDirectory] = useState(initial);
  const [sortedBy, setSortedBy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();

  const everyone = useMemo(
    () => [...directory.shops.flatMap((s) => s.barbers), ...directory.independents],
    [directory],
  );

  const nextChairs = useMemo(() => {
    const today = everyone.filter((c) => c.openToday && c.nextAt != null);
    // Soonest first, so the first card kept for each shop is its soonest chair.
    const soonest = [...today].sort((a, b) => a.nextAt! - b.nextAt!);
    const seen = new Set<string>();
    const onePerShop = soonest.filter((c) => {
      const key = c.shopSlug ?? c.slug;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Near someone: closest first. Otherwise: soonest first.
    if (sortedBy) {
      return onePerShop.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)).slice(0, 8);
    }
    return onePerShop.slice(0, 8);
  }, [everyone, sortedBy]);

  const shown = useMemo(() => {
    const keep = (b: DirectoryCard) => (filter === "today" ? b.openToday : filter === "home" ? b.homeService : true);
    return {
      shops: directory.shops
        .map((shop) => ({ ...shop, barbers: shop.barbers.filter(keep) }))
        .filter((shop) => shop.barbers.length > 0),
      independents: directory.independents.filter(keep),
    };
  }, [directory, filter]);

  function sortFrom(center: { lat: number; lng: number }, label: string) {
    startTransition(async () => {
      setDirectory(await searchNearby(center));
      setSortedBy(label);
    });
  }

  function locateMe() {
    if (!("geolocation" in navigator)) return setStatus("unavailable");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("idle");
        // Sent once in the action's request body; never put in the URL or stored.
        sortFrom({ lat: position.coords.latitude, lng: position.coords.longitude }, "you");
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const sortNote = pending
    ? "Sorting…"
    : status === "denied"
      ? "Location is blocked for this site. Pick an area instead."
      : status === "unavailable"
        ? "Couldn't find your location. Pick an area instead."
        : sortedBy === "you"
          ? "Closest to you first. Your location isn't saved."
          : sortedBy
            ? `Closest to ${sortedBy} first.`
            : "Soonest opening first.";

  return (
    <>
      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Sort by distance from">
        <button type="button" onClick={locateMe} disabled={pending} className="btn btn-ink shrink-0 rounded-full!">
          <LocateFixed size={18} aria-hidden />
          {status === "locating" ? "Finding you…" : "Near me"}
        </button>
        {AREAS.map((area) => (
          <button
            key={area.name}
            type="button"
            className="chip"
            aria-pressed={sortedBy === area.name}
            onClick={() => sortFrom(area, area.name)}
            disabled={pending}
          >
            {area.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
        {sortNote}
      </p>

      <section aria-labelledby="next-chairs" className={`mt-8 ${pending ? "opacity-50" : ""}`}>
        <h2 id="next-chairs" className="text-xl font-semibold">
          Free chairs today
        </h2>
        <NextChairs cards={nextChairs} />
      </section>

      <div className="mt-8 flex gap-2" role="tablist" aria-label="Show">
        {(
          [
            ["all", "Everyone"],
            ["today", "Open today"],
            ["home", "Home service"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className="chip"
          >
            {label}
          </button>
        ))}
      </div>

      <div className={pending ? "opacity-50" : ""}>
        {shown.shops.length > 0 && (
          <section aria-labelledby="shops" className="mt-6">
            <h2 id="shops" className="text-xl font-semibold">
              Barbershops
            </h2>
            <div className="mt-3 grid gap-7 md:grid-cols-2 md:gap-x-8">
              {shown.shops.map((shop) => (
                <ShopBlock key={shop.slug} shop={shop} />
              ))}
            </div>
          </section>
        )}

        {shown.independents.length > 0 && (
          <section aria-labelledby="independents" className="mt-10">
            <h2 id="independents" className="text-xl font-semibold">
              Independent barbers
            </h2>
            <p className="text-sm text-ink-soft">Their own chair, or they come to you.</p>
            <ul className="mt-2 divide-y divide-rule border-y border-rule px-1">
              {shown.independents.map((card) => (
                <li key={card.slug}>
                  <BarberRow card={card} showPlace />
                </li>
              ))}
            </ul>
          </section>
        )}

        {shown.shops.length === 0 && shown.independents.length === 0 && (
          <p className="mt-6 rounded-lg border-[1.5px] border-dashed border-rule p-6 text-ink-soft">
            Nobody matches that yet.{" "}
            <button type="button" className="font-semibold text-ink underline" onClick={() => setFilter("all")}>
              Show everyone
            </button>
          </p>
        )}
      </div>
    </>
  );
}
