import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatStars } from "@/lib/ratings";
import type { ShopCard } from "@/server/directory";

/**
 * A shop in the directory: its photo, with the walnut sign mounted across the
 * bottom edge. Name, rating and area on the sign, logo on its right. Barbers are
 * named on the shop page.
 */
export function ShopBlock({ shop, linked = true }: { shop: ShopCard; linked?: boolean }) {
  // Previews (the barber demo) render the same block without a link to a shop page that doesn't exist.
  const body = (children: ReactNode) =>
    linked ? (
      <Link href={`/shop/${shop.slug}`} className="group block">
        {children}
      </Link>
    ) : (
      <div className="group block">{children}</div>
    );
  const reviews = shop.rating && `${shop.rating.count} ${shop.rating.count === 1 ? "review" : "reviews"}`;
  return (
    <article aria-labelledby={`shop-${shop.slug}`}>
      {body(
        <>
          {shop.imageUrl && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-plaster-deep">
              <Image
                src={shop.imageUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 27rem, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className={`sign relative flex items-center gap-3 rounded-md px-4 pb-3 pt-3 ${shop.imageUrl ? "mx-3 -mt-10 shadow-md" : ""}`}>
            <div className="min-w-0 flex-1">
              <h3 id={`shop-${shop.slug}`} className="font-sign text-[1.75rem] leading-none font-bold tracking-[0.015em]">
                {shop.name}
              </h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm">
                {shop.rating ? (
                  <>
                    <Star size={15} className="fill-current" aria-hidden />
                    <span className="numeral text-lg leading-none font-bold" aria-label={`Rated ${formatStars(shop.rating.average)} out of 5`}>
                      {formatStars(shop.rating.average)}
                    </span>
                    <span className="opacity-85">({reviews})</span>
                  </>
                ) : (
                  <span className="opacity-85">No ratings yet</span>
                )}
              </p>
              <p className="mt-1 text-sm opacity-85">
                {shop.area}
                {shop.distance && `, ${shop.distance} away`}
              </p>
            </div>
            {shop.logoUrl && (
              <Image src={shop.logoUrl} alt={`${shop.name} logo`} width={56} height={56} className="size-14 shrink-0" />
            )}
          </div>
        </>,
      )}
    </article>
  );
}
