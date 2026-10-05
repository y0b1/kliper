import Link from "next/link";
import type { CSSProperties } from "react";
import type { DirectoryCard } from "@/server/directory";

/** Directory card, modeled on the reference "People" cards. Only the avatar takes the barber's theme. */
export function BarberCard({ card, highlight = false }: { card: DirectoryCard; highlight?: boolean }) {
  return (
    <Link
      href={`/${card.slug}`}
      style={card.chrome as CSSProperties}
      className={`group block rounded-[2rem] p-5 transition-transform duration-150 hover:-translate-y-0.5 ${
        highlight
          ? "bg-gradient-to-b from-oak-pale to-oak-light shadow-[0_16px_36px_-20px_rgb(138_90_46/0.7)]"
          : "soft-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full text-lg"
            style={{ background: "var(--card-accent)", color: "var(--card-on-accent)", fontFamily: "var(--card-font-display)" }}
          >
            {card.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight">{card.name}</p>
            <p className={`truncate text-sm ${highlight ? "text-ink/70" : "text-muted"}`}>{card.specialties.join(" · ")}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
            card.openToday ? "bg-white/70 text-success" : "bg-white/60 text-muted"
          }`}
        >
          <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${card.openToday ? "bg-success" : "bg-muted"}`} />
          {card.openToday ? "Open today" : card.nextDay === "Booked up" ? "Booked up" : `Next: ${card.nextDay}`}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className={highlight ? "text-ink/65" : "text-muted"}>{card.shopName ? "Shop" : "Works"}</dt>
          <dd className="mt-1 truncate">{card.shopName ?? (card.homeService ? "Solo + home" : "Solo")}</dd>
        </div>
        <div>
          <dt className={highlight ? "text-ink/65" : "text-muted"}>Area</dt>
          <dd className="mt-1 truncate">
            {card.area}
            {card.distance && <span className={highlight ? "text-ink/65" : "text-muted"}> · {card.distance}</span>}
          </dd>
        </div>
        <div>
          <dt className={highlight ? "text-ink/65" : "text-muted"}>From</dt>
          <dd className="mt-1">{card.from ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <span className={highlight ? "text-ink/65" : "text-muted"}>Next opening</span>{" "}
          <span className="font-medium">{card.next}</span>
        </p>
        <div className="flex gap-1.5">
          {card.homeService && <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs">Home service</span>}
          {card.instant && <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs">Instant</span>}
        </div>
      </div>
    </Link>
  );
}
