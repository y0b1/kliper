"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { distanceKm, isValidLatLng } from "@/lib/geo";
import { quote } from "@/lib/slots";
import { themePresetIdSchema, validateThemeWrite, defaultTokens } from "@/lib/theme";
import { getAvailability, getBarberBySlug, listDirectory } from "./barbers";
import { toCard, type DirectoryCard } from "./directory";
import { normalizePhMobile } from "./phone";

/* ---------- Near me ---------- */

/**
 * The visitor's position arrives in the request body, is used to sort this one
 * response, and is not logged or stored.
 */
export async function searchNearby(input: { lat: number; lng: number }): Promise<DirectoryCard[]> {
  const center = { lat: Number(input?.lat), lng: Number(input?.lng) };
  if (!isValidLatLng(center)) return (await listDirectory()).map(toCard);
  return (await listDirectory(center)).map(toCard);
}

/* ---------- Availability ---------- */

const slotQuery = z.object({
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  packageId: z.string().min(1),
  addOnIds: z.array(z.string()).max(10),
  locationType: z.enum(["SHOP", "HOME"]),
});

export interface SlotResult {
  slots: Array<{ startsAt: string; label: string }>;
  durationMin: number;
  priceCentavos: number;
}

export async function getSlots(input: z.infer<typeof slotQuery>): Promise<SlotResult> {
  const query = slotQuery.parse(input);
  const barber = await getBarberBySlug(query.slug);
  const pkg = barber?.packages.find((p) => p.id === query.packageId);
  if (!barber || !pkg) return { slots: [], durationMin: 0, priceCentavos: 0 };
  const addOns = barber.addOns.filter((a) => query.addOnIds.includes(a.id));
  const total = quote(pkg, addOns);
  const home = query.locationType === "HOME" && barber.homeService;
  const slots = await getAvailability({ barber, date: query.date, durationMin: total.durationMin, locationType: home ? "HOME" : "SHOP" });
  return {
    slots: slots.map((s) => ({ startsAt: s.startsAt.toISOString(), label: s.label })),
    durationMin: total.durationMin,
    priceCentavos: total.priceCentavos + (home ? (barber.homeFeeCentavos ?? 0) : 0),
  };
}

/* ---------- Booking ---------- */

const bookingForm = z.object({
  slug: z.string().min(1),
  packageId: z.string().min(1),
  addOnIds: z.array(z.string()).max(10),
  locationType: z.enum(["SHOP", "HOME"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.iso.datetime(),
  name: z.string().trim().min(1, "Add your name").max(60),
  phone: z.string().trim().min(1, "Add your mobile number"),
  note: z.string().trim().max(500).optional(),
  address: z.string().trim().max(200).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export interface BookingState {
  error?: string;
}

function bookingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function isOverlapError(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : String(error);
  return text.includes("Booking_no_overlap") || text.includes("23P01");
}

export async function createBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const parsed = bookingForm.safeParse({
    ...Object.fromEntries(formData),
    addOnIds: formData.getAll("addOnIds").map(String),
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    note: formData.get("note") || undefined,
    address: formData.get("address") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const input = parsed.data;

  const phone = normalizePhMobile(input.phone);
  if (!phone) return { error: "Enter a Philippine mobile number, like 0917 123 4567." };

  const barber = await getBarberBySlug(input.slug);
  const pkg = barber?.packages.find((p) => p.id === input.packageId);
  if (!barber || !pkg) return { error: "That barber or package is no longer available." };
  const addOns = barber.addOns.filter((a) => input.addOnIds.includes(a.id));

  const home = input.locationType === "HOME";
  if (home) {
    if (!barber.homeService) return { error: `${barber.displayName} doesn't do home service.` };
    if (!input.address) return { error: "Add the address for the home visit." };
    const pin = { lat: input.lat, lng: input.lng };
    if (isValidLatLng(pin) && barber.serviceLat != null && barber.serviceLng != null && barber.serviceRadiusKm != null) {
      const km = distanceKm(pin, { lat: barber.serviceLat, lng: barber.serviceLng });
      if (km > barber.serviceRadiusKm) return { error: `That address is outside ${barber.displayName}'s ${barber.serviceRadiusKm} km service area.` };
    }
  }

  const total = quote(pkg, addOns);
  const price = total.priceCentavos + (home ? (barber.homeFeeCentavos ?? 0) : 0);

  // Re-check on the server: the slot must still be open right now.
  const slots = await getAvailability({ barber, date: input.date, durationMin: total.durationMin, locationType: home ? "HOME" : "SHOP" });
  const startsAt = new Date(input.startsAt);
  if (!slots.some((s) => s.startsAt.getTime() === startsAt.getTime())) {
    return { error: "That time was just taken. Pick another slot." };
  }

  const deposit =
    barber.paymentMode === "FULL" ? price : barber.paymentMode === "DEPOSIT" ? Math.min(barber.depositCentavos ?? 0, price) : 0;

  // TODO(auth): confirm the number with an SMS one-time code before creating the booking.
  const customer = await db.user.upsert({ where: { phone }, update: { name: input.name }, create: { phone, name: input.name } });

  let code = "";
  for (let attempt = 0; attempt < 3 && !code; attempt += 1) {
    const candidate = bookingCode();
    try {
      await db.booking.create({
        data: {
          code: candidate,
          barberId: barber.id,
          shopId: home ? null : (barber.memberships[0]?.shopId ?? null),
          customerId: customer.id,
          packageId: pkg.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + total.durationMin * 60_000),
          status: barber.confirmMode === "INSTANT" ? "CONFIRMED" : "PENDING",
          locationType: home ? "HOME" : "SHOP",
          address: home ? input.address : null,
          lat: home && isValidLatLng({ lat: input.lat, lng: input.lng }) ? input.lat : null,
          lng: home && isValidLatLng({ lat: input.lat, lng: input.lng }) ? input.lng : null,
          note: input.note,
          priceCentavos: price,
          depositCentavos: deposit,
          // TODO(payments): start a PayMongo GCash checkout when deposit > 0.
          paymentStatus: deposit > 0 ? "PENDING" : "UNPAID",
          addOns: { create: addOns.map((a) => ({ addOnId: a.id })) },
        },
      });
      code = candidate;
    } catch (error) {
      if (isOverlapError(error)) return { error: "That time was just taken. Pick another slot." };
      // Retry only when the random booking code collided with an existing one.
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  if (!code) return { error: "Something went wrong. Please try again." };

  revalidatePath(`/${barber.slug}`);
  redirect(`/booking/${code}`);
}

/* ---------- Dashboard (development only until sign-in exists) ---------- */

function requireDevDashboard() {
  if (process.env.NODE_ENV === "production" && process.env.KLIPER_DEV_DASHBOARD !== "1") {
    throw new Error("The dashboard needs sign-in before it can run in production.");
  }
}

export async function respondToBooking(formData: FormData) {
  requireDevDashboard();
  const id = z.string().parse(formData.get("bookingId"));
  const decision = z.enum(["CONFIRMED", "DECLINED", "COMPLETED", "NO_SHOW"]).parse(formData.get("decision"));
  await db.booking.update({ where: { id }, data: { status: decision } });
  revalidatePath("/dashboard");
}

const packageUpdate = z.object({
  packageId: z.string(),
  pricePesos: z.coerce.number().int().min(0).max(100_000),
  durationMin: z.coerce
    .number()
    .int()
    .min(5)
    .max(480)
    .refine((v) => v % 5 === 0, "Use 5-minute steps"),
});

export async function updatePackage(formData: FormData) {
  requireDevDashboard();
  const input = packageUpdate.parse(Object.fromEntries(formData));
  const pkg = await db.package.update({
    where: { id: input.packageId },
    data: { priceCentavos: input.pricePesos * 100, durationMin: input.durationMin },
    include: { barber: true },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/${pkg.barber.slug}`);
}

export async function setPageTheme(formData: FormData) {
  requireDevDashboard();
  const barberId = z.string().parse(formData.get("barberId"));
  const preset = themePresetIdSchema.parse(formData.get("preset"));
  const accent = formData.get("accent");
  const tokens = validateThemeWrite(preset, {
    ...defaultTokens(preset),
    ...(typeof accent === "string" && accent ? { accent } : {}),
  });
  const barber = await db.barber.update({ where: { id: barberId }, data: { themePreset: preset, themeTokens: { ...tokens } } });
  revalidatePath("/dashboard");
  revalidatePath(`/${barber.slug}`);
  revalidatePath("/");
}
