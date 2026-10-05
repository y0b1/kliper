import Link from "next/link";
import type { CSSProperties } from "react";
import type { DirectoryCard } from "@/server/directory";

export function Avatar({ initials, chrome, size = "md" }: { initials: string; chrome: Record<string, string>; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      style={{ ...(chrome as CSSProperties), background: "var(--card-accent)", color: "var(--card-on-accent)", fontFamily: "var(--card-font-display)" }}
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${size === "lg" ? "size-16 text-xl" : "size-11 text-[0.95rem]"}`}
    >
      {initials}
    </span>
  );
}

/** When the next opening is, in words, for screen readers and the small line under the time. */
function whenLabel(card: DirectoryCard) {
  if (card.nextClock == null) return "No openings this week";
  return card.openToday ? "today" : card.nextDay;
}

/**
 * One barber in a list: who they are on the left, their next free time on the
 * right, set large. The whole row opens their booking page.
 */
export function BarberRow({ card, showPlace = false }: { card: DirectoryCard; showPlace?: boolean }) {
  const place = card.homeService ? `${card.area}, does home service` : card.area;
  return (
    <Link
      href={`/${card.slug}`}
      className="group flex items-center gap-3 py-3.5 transition-colors hover:bg-paper/60 sm:-mx-3 sm:rounded-lg sm:px-3"
    >
      <Avatar initials={card.initials} chrome={card.chrome} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1.0625rem] font-semibold leading-snug">{card.name}</span>
        <span className="block truncate text-sm text-ink-soft">
          {showPlace ? place : card.specialties.join(", ")}
          {card.distance && `, ${card.distance} away`}
        </span>
        {card.from && <span className="block text-sm text-ink-soft">Cuts from {card.from}</span>}
      </span>
      <span className="shrink-0 text-right" aria-label={card.nextClock ? `Next opening ${card.next}` : "No openings this week"}>
        {card.nextClock ? (
          <>
            <span className="numeral block text-[2rem] leading-none font-bold">
              {card.nextClock}
              <span className="ml-0.5 text-base font-semibold">{card.nextMeridiem}</span>
            </span>
            <span className={`mt-1 inline-flex items-center gap-1.5 text-sm ${card.openToday ? "text-pole-blue" : "text-ink-soft"}`}>
              {card.openToday && <span className="size-2 rounded-full bg-pole-blue" />}
              {whenLabel(card)}
            </span>
          </>
        ) : (
          <span className="text-sm text-ink-soft">Booked up</span>
        )}
      </span>
    </Link>
  );
}
