"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { searchNearby } from "@/server/actions";
import type { DirectoryCard } from "@/server/directory";
import { BarberCard } from "./barber-card";

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

export function DirectoryList({ initial }: { initial: DirectoryCard[] }) {
  const [cards, setCards] = useState(initial);
  const [sortedBy, setSortedBy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();

  const shown = useMemo(
    () => cards.filter((c) => (filter === "today" ? c.openToday : filter === "home" ? c.homeService : true)),
    [cards, filter],
  );

  function sortFrom(center: { lat: number; lng: number }, label: string) {
    startTransition(async () => {
      setCards(await searchNearby(center));
      setSortedBy(label);
    });
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("idle");
        // Sent once in the action's request body; not put in the URL and not stored.
        sortFrom({ lat: position.coords.latitude, lng: position.coords.longitude }, "you");
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <>
      <section className="soft-card mt-6 p-6" aria-labelledby="near-me">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="near-me" className="text-2xl font-light">
              Near me
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              On the road, or just landed in Davao? Sort by distance. Your location is used for this search only and
              isn&apos;t saved.
            </p>
          </div>
          <button
            type="button"
            onClick={locateMe}
            disabled={status === "locating" || pending}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-walnut text-cream disabled:opacity-60"
            aria-label="Use my location"
          >
            <LocateFixed size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={locateMe} className="pill bg-walnut! text-cream!" disabled={pending}>
            <MapPin size={16} strokeWidth={1.75} />
            {status === "locating" ? "Finding you…" : "Use my location"}
          </button>
          {AREAS.map((area) => (
            <button key={area.name} type="button" className="pill" onClick={() => sortFrom(area, area.name)} disabled={pending}>
              {area.name}
            </button>
          ))}
        </div>

        <p className="mt-3 min-h-5 text-sm text-muted" aria-live="polite">
          {pending
            ? "Sorting…"
            : status === "denied"
              ? "Location is off for this site. Pick an area instead."
              : status === "unavailable"
                ? "Couldn't get your location. Pick an area instead."
                : sortedBy === "you"
                  ? "Sorted by distance from you."
                  : sortedBy
                    ? `Sorted by distance from ${sortedBy}.`
                    : "Sorted by soonest opening."}
        </p>
      </section>

      <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="Filter barbers">
        {(
          [
            ["all", "All"],
            ["today", "Open today"],
            ["home", "Home service"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            type="button"
            onClick={() => setFilter(value)}
            className={`pill ${filter === value ? "bg-walnut! text-cream!" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`mt-4 grid gap-4 md:grid-cols-2 ${pending ? "opacity-60" : ""}`}>
        {shown.map((card, index) => (
          <BarberCard key={card.slug} card={card} highlight={index === 0} />
        ))}
        {shown.length === 0 && <p className="soft-card p-6 text-muted">No barbers match that filter yet.</p>}
      </div>
    </>
  );
}
