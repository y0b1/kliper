import Link from "next/link";
import type { ShopCard } from "@/server/directory";
import { BarberRow } from "./barber-row";

/** A shop in the directory: its walnut sign first, then the barbers working there. */
export function ShopBlock({ shop }: { shop: ShopCard }) {
  const count = `${shop.barbers.length} ${shop.barbers.length === 1 ? "barber" : "barbers"}`;
  return (
    <article aria-labelledby={`shop-${shop.slug}`}>
      <Link href={`/shop/${shop.slug}`} className="sign block rounded-md px-4 pb-2.5 pt-3">
        <h3 id={`shop-${shop.slug}`} className="font-sign text-[1.75rem] leading-none font-bold tracking-[0.015em]">
          {shop.name}
        </h3>
        <p className="mt-1.5 text-sm opacity-85">
          {shop.area}
          {shop.distance && `, ${shop.distance} away`}. {count}, cuts from {shop.from}
        </p>
      </Link>
      <ul className="divide-y divide-rule px-1">
        {shop.barbers.map((barber) => (
          <li key={barber.slug}>
            <BarberRow card={barber} />
          </li>
        ))}
      </ul>
    </article>
  );
}
