import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import type { CSSProperties } from "react";
import type { ShopCard as Shop } from "@/server/directory";

/**
 * Directory entry for a shop: the shop's name leads, its barbers sit inside.
 * Each barber row goes straight to that barber's booking page.
 */
export function ShopCard({ shop, highlight = false }: { shop: Shop; highlight?: boolean }) {
  const subtle = highlight ? "text-ink/65" : "text-muted";
  return (
    <article
      style={shop.chrome as CSSProperties}
      className={`rounded-[2rem] p-5 ${
        highlight ? "bg-gradient-to-b from-oak-pale to-oak-light shadow-[0_16px_36px_-20px_rgb(138_90_46/0.7)]" : "soft-card"
      }`}
    >
      <Link href={`/shop/${shop.slug}`} className="group flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-2xl"
            style={{ background: "var(--card-accent)", color: "var(--card-on-accent)" }}
          >
            <Store size={24} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xl leading-tight" style={{ fontFamily: "var(--card-font-display)" }}>
              {shop.name}
            </h3>
            <p className={`truncate text-sm ${subtle}`}>
              {shop.area}
              {shop.distance && ` · ${shop.distance}`} · {shop.barbers.length} {shop.barbers.length === 1 ? "barber" : "barbers"}
            </p>
          </div>
        </div>
        <span className="round-button size-10! shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden>
          <ChevronRight size={18} strokeWidth={1.75} />
        </span>
      </Link>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className={subtle}>From</dt>
          <dd className="mt-1">{shop.from ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className={subtle}>Next opening</dt>
          <dd className="mt-1 font-medium">{shop.next}</dd>
        </div>
      </dl>

      <ul className="mt-4 grid gap-2" aria-label={`Barbers at ${shop.name}`}>
        {shop.barbers.map((barber) => (
          <li key={barber.slug}>
            <Link
              href={`/${barber.slug}`}
              style={barber.chrome as CSSProperties}
              className="flex items-center gap-3 rounded-2xl bg-white/55 px-3 py-2.5 transition-colors hover:bg-white/85"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full text-sm"
                style={{ background: "var(--card-accent)", color: "var(--card-on-accent)", fontFamily: "var(--card-font-display)" }}
              >
                {barber.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{barber.name}</span>
                <span className={`block truncate text-xs ${subtle}`}>{barber.specialties.join(" · ")}</span>
              </span>
              <span className="shrink-0 text-right text-xs">
                <span className="block">{barber.from && `from ${barber.from}`}</span>
                <span className={`block ${barber.openToday ? "text-success" : subtle}`}>{barber.next}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
