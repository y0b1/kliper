import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Home, Store } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { db } from "@/lib/db";
import { minutes, peso } from "@/lib/money";
import { formatManilaDate, formatManilaTime, manilaDateOf } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your booking", robots: { index: false } };

const statusCopy = {
  CONFIRMED: { title: "You're booked", note: "See you there. Arrive a few minutes early." },
  PENDING: { title: "Request sent", note: "Your barber confirms each booking. We'll text you when they do." },
  COMPLETED: { title: "All done", note: "Thanks for booking with Kliper." },
  CANCELLED: { title: "Cancelled", note: "This booking was cancelled." },
  DECLINED: { title: "Not available", note: "Your barber couldn't take this one. Try another time." },
  NO_SHOW: { title: "Missed", note: "This booking was marked as a no-show." },
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
  const rows: Array<[string, string]> = [
    ["Barber", booking.barber.displayName],
    ["When", `${formatManilaDate(manilaDateOf(booking.startsAt))} · ${formatManilaTime(booking.startsAt)}`],
    ["Cut", [booking.package.name, ...booking.addOns.map((a) => a.addOn.name)].join(" + ")],
    ["Length", minutes(duration)],
    ["Where", booking.locationType === "HOME" ? "Home service" : (booking.shop?.name ?? "Barber's spot")],
  ];

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <TopBar back={`/${booking.barber.slug}`} />

      <section className="soft-card mt-8 p-6 text-center">
        {booking.status === "PENDING" ? (
          <Clock className="mx-auto text-oak" size={48} strokeWidth={1.5} />
        ) : (
          <CheckCircle2 className="mx-auto text-success" size={48} strokeWidth={1.5} />
        )}
        <h1 className="mt-4 text-4xl font-light">{copy.title}</h1>
        <p className="mt-2 text-muted">{copy.note}</p>
        <p className="mt-6 text-sm text-muted">Booking code</p>
        <p className="font-display text-4xl tracking-[0.3em]">{booking.code}</p>
      </section>

      <section className="wood mt-4 rounded-[2rem] p-6 text-cream">
        <dl className="grid gap-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-cream-muted">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-end justify-between border-t border-white/15 pt-4">
          <span className="text-cream-muted">
            {booking.depositCentavos > 0 ? `${peso(booking.depositCentavos)} due now` : "Pay at the shop"}
          </span>
          <span className="text-3xl">{peso(booking.priceCentavos)}</span>
        </div>
      </section>

      {booking.depositCentavos > 0 && booking.paymentStatus !== "PAID" && (
        <p className="mt-4 rounded-3xl border border-dashed border-oak/50 bg-oak-pale/40 px-5 py-4 text-sm">
          GCash checkout through PayMongo isn&apos;t connected yet. In development, this booking stays marked as payment
          pending.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href={`/${booking.barber.slug}`} className="pill">
          {booking.locationType === "HOME" ? <Home size={16} /> : <Store size={16} />} Back to {booking.barber.displayName}
        </Link>
        <Link href="/" className="pill">
          All barbers
        </Link>
      </div>
    </main>
  );
}
