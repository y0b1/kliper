import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { db } from "@/lib/db";
import { minutes, peso } from "@/lib/money";
import { formatManilaDate, formatManilaTime, manilaDateOf } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your booking", robots: { index: false } };

const statusCopy = {
  CONFIRMED: { title: "You're booked.", note: "Your chair is held. Come a few minutes early." },
  PENDING: { title: "Request sent.", note: "Your barber accepts each booking personally. We'll text you when they do." },
  COMPLETED: { title: "All done.", note: "Thanks for booking with Kliper." },
  CANCELLED: { title: "Cancelled.", note: "This booking was cancelled." },
  DECLINED: { title: "Not this time.", note: "Your barber can't take this one. Pick another time on their page." },
  NO_SHOW: { title: "Missed.", note: "This booking was marked as a no-show." },
} as const;

export default async function BookingPage(props: PageProps<"/booking/[code]">) {
  const { code } = await props.params;
  const booking = await db.booking.findUnique({
    where: { code: code.toUpperCase() },
    include: { barber: true, shop: true, package: true, addOns: { include: { addOn: true } } },
  });
  if (!booking) notFound();

  const copy = statusCopy[booking.status];
  const duration = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);
  const [clock, meridiem] = formatManilaTime(booking.startsAt).split(" ");
  const where =
    booking.locationType === "HOME" ? (booking.address ?? "Your place") : booking.shop ? `${booking.shop.name}, ${booking.shop.address}` : "The barber's chair";

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-[max(1rem,env(safe-area-inset-top))]">
      <TopBar back={`/${booking.barber.slug}`} backLabel={booking.barber.displayName} />

      <h1 className="font-sign mt-8 text-[3rem] leading-none font-extrabold">{copy.title}</h1>
      <p className="mt-2 text-ink-soft">{copy.note}</p>

      <div className="ticket mt-6 rounded-lg">
        <div className="flex items-end justify-between gap-4 px-5 pb-5 pt-5">
          <div>
            <p className="text-sm text-ink-soft">{formatManilaDate(manilaDateOf(booking.startsAt))}</p>
            <p className="numeral text-[4.5rem] leading-[0.85] font-extrabold">
              {clock}
              <span className="ml-1 text-2xl font-bold">{meridiem}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-soft">Booking code</p>
            <p className="numeral text-[1.75rem] leading-none font-bold tracking-[0.12em]">{booking.code}</p>
          </div>
        </div>
        <div className="ticket-tear mx-4" />
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2.5 px-5 py-5">
          <dt className="text-ink-soft">Barber</dt>
          <dd className="font-semibold">{booking.barber.displayName}</dd>
          <dt className="text-ink-soft">Cut</dt>
          <dd>
            {[booking.package.name, ...booking.addOns.map((a) => a.addOn.name)].join(" + ")}, {minutes(duration)}
          </dd>
          <dt className="text-ink-soft">Where</dt>
          <dd>{where}</dd>
          <dt className="text-ink-soft">Total</dt>
          <dd>
            <span className="numeral text-2xl font-bold">{peso(booking.priceCentavos)}</span>
            <span className="block text-sm text-ink-soft">
              {booking.depositCentavos === 0
                ? "Pay at the shop"
                : booking.depositCentavos >= booking.priceCentavos
                  ? "Paid by GCash before your cut"
                  : `${peso(booking.depositCentavos)} by GCash now, the rest at the shop`}
            </span>
          </dd>
        </dl>
      </div>

      {booking.depositCentavos > 0 && booking.paymentStatus !== "PAID" && (
        <p className="mt-4 rounded-lg border-[1.5px] border-dashed border-rule px-4 py-3 text-sm text-ink-soft">
          GCash checkout isn&apos;t connected yet, so this booking is saved with payment pending.
        </p>
      )}

      <p className="mt-6 text-ink-soft">
        Keep this page or your code. Show it at the shop if they ask.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/${booking.barber.slug}`} className="btn btn-quiet">
          Book {booking.barber.displayName} again
        </Link>
        <Link href="/" className="btn btn-quiet">
          All barbers
        </Link>
      </div>
    </main>
  );
}
