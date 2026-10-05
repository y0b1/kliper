/**
 * Sample Davao data for local development. Every shop and barber here is made up;
 * locations are approximate neighborhood centers, not real addresses.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays, atManilaMinute, manilaDateOf } from "../src/lib/time";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const H = (h: number, m = 0) => h * 60 + m;
const P = (pesos: number) => pesos * 100;

const shops = [
  { slug: "ironwood-barbers", name: "Ironwood Barbers", address: "JP Laurel Ave, Lanang", barangay: "Lanang", lat: 7.1003, lng: 125.6318, themePreset: "woodshop" },
  { slug: "kanto-cuts", name: "Kanto Cuts", address: "MacArthur Hwy, Matina", barangay: "Matina", lat: 7.0612, lng: 125.597, themePreset: "kanto" },
  { slug: "pole-and-pomade", name: "Pole & Pomade", address: "Dacudao Ave, Bo. Obrero", barangay: "Obrero", lat: 7.0824, lng: 125.6112, themePreset: "classic-pole" },
  { slug: "the-fade-lab", name: "The Fade Lab", address: "JP Laurel Ave, Bajada", barangay: "Bajada", lat: 7.0872, lng: 125.6108, themePreset: "neon-fade" },
];

type Seed = {
  slug: string;
  displayName: string;
  bio: string;
  specialties: string[];
  shop?: string;
  owner?: boolean;
  themePreset: string;
  paymentMode?: "FULL" | "DEPOSIT" | "AT_SHOP";
  depositCentavos?: number;
  confirmMode?: "INSTANT" | "REQUEST";
  home?: { feePesos: number; radiusKm: number; lat: number; lng: number };
  solo?: { lat: number; lng: number; area: string };
  packages: Array<[name: string, pesos: number, minutes: number, description?: string]>;
  addOns: Array<[name: string, pesos: number, minutes: number]>;
  days: number[];
  hours: Array<[start: number, end: number]>;
};

const barbers: Seed[] = [
  {
    slug: "kuya-jun",
    displayName: "Kuya Jun",
    bio: "Twelve years behind the chair. Skin fades, hair designs, and the cleanest line-ups on JP Laurel.",
    specialties: ["Fades", "Designs", "Line-ups"],
    shop: "ironwood-barbers",
    owner: true,
    themePreset: "woodshop",
    paymentMode: "DEPOSIT",
    depositCentavos: P(100),
    packages: [
      ["Basic cut", 150, 30, "Scissor or clipper cut, styled."],
      ["Cut + wash", 250, 45, "Cut, shampoo and blow-dry."],
      ["Fade + design", 350, 60, "Skin fade with a freehand design."],
    ],
    addOns: [["Beard trim", 80, 15], ["Hot towel", 50, 10]],
    days: [1, 2, 3, 4, 5, 6],
    hours: [[H(9), H(12)], [H(13), H(19)]],
  },
  {
    slug: "marco",
    displayName: "Marco Villanueva",
    bio: "Classic gentlemen's cuts and straight-razor shaves. Unhurried, every time.",
    specialties: ["Classic cuts", "Razor shave", "Beard"],
    shop: "ironwood-barbers",
    themePreset: "gentlemans-club",
    paymentMode: "FULL",
    packages: [
      ["Gentleman's cut", 300, 45],
      ["Cut + razor shave", 450, 75, "Cut, hot towel and straight-razor shave."],
    ],
    addOns: [["Beard sculpt", 120, 20], ["Scalp massage", 80, 10]],
    days: [2, 3, 4, 5, 6, 0],
    hours: [[H(10), H(14)], [H(15), H(20)]],
  },
  {
    slug: "bea",
    displayName: "Bea Santos",
    bio: "Long hair, layers and women's cuts. Bring a photo and we'll get it right.",
    specialties: ["Long hair", "Women's cuts", "Color"],
    shop: "pole-and-pomade",
    owner: true,
    themePreset: "classic-pole",
    confirmMode: "REQUEST",
    packages: [
      ["Trim", 200, 30],
      ["Layered cut", 450, 60],
      ["Cut + color", 1500, 150, "Single-process color with a cut."],
    ],
    addOns: [["Treatment", 300, 20], ["Blow-dry styling", 150, 20]],
    days: [1, 2, 3, 4, 5, 6],
    hours: [[H(10), H(18)]],
  },
  {
    slug: "rj",
    displayName: "RJ Fades",
    bio: "Burst fades, tapers and textured crops. Night owl: open late on weekends.",
    specialties: ["Fades", "Tapers", "Textured crops"],
    shop: "the-fade-lab",
    owner: true,
    themePreset: "neon-fade",
    paymentMode: "DEPOSIT",
    depositCentavos: P(50),
    packages: [
      ["Taper", 180, 30],
      ["Burst fade", 280, 45],
      ["Fade + beard", 380, 60],
    ],
    addOns: [["Eyebrow slit", 30, 5], ["Hair tattoo", 150, 20]],
    days: [3, 4, 5, 6, 0],
    hours: [[H(13), H(22)]],
  },
  {
    slug: "tonyo",
    displayName: "Tonyo",
    bio: "Barbero sa kanto since 2009. Fast, fair, and always a kwento.",
    specialties: ["Quick cuts", "Kids", "Senior cuts"],
    shop: "kanto-cuts",
    owner: true,
    themePreset: "kanto",
    packages: [
      ["Gupit", 100, 20],
      ["Gupit + shave", 160, 30],
      ["Kids cut", 90, 20],
    ],
    addOns: [["Hair wash", 40, 10]],
    days: [0, 1, 2, 3, 4, 5, 6],
    hours: [[H(8), H(12)], [H(13), H(18)]],
  },
  {
    slug: "migs",
    displayName: "Migs",
    bio: "One chair, one barber. Concrete stall near the Toril market, by appointment.",
    specialties: ["Crew cuts", "Buzz cuts", "Fades"],
    themePreset: "concrete-loft",
    solo: { lat: 7.018, lng: 125.498, area: "Toril" },
    packages: [
      ["Buzz cut", 120, 20],
      ["Fade", 200, 40],
    ],
    addOns: [["Beard line-up", 50, 10]],
    days: [1, 2, 3, 4, 5],
    hours: [[H(9), H(17)]],
  },
  {
    slug: "ate-lyn",
    displayName: "Ate Lyn",
    bio: "Home service for kids, lolos and lolas, and anyone who can't make it to a shop. Buhangin and nearby.",
    specialties: ["Home service", "Kids", "Senior cuts"],
    themePreset: "retro-pomade",
    confirmMode: "REQUEST",
    paymentMode: "FULL",
    home: { feePesos: 100, radiusKm: 8, lat: 7.116, lng: 125.617 },
    solo: { lat: 7.116, lng: 125.617, area: "Buhangin" },
    packages: [
      ["Kids cut", 200, 30],
      ["Senior cut", 220, 30],
      ["Family of three", 550, 90, "Three cuts, one visit."],
    ],
    addOns: [["Extra person", 180, 30]],
    days: [1, 2, 3, 4, 5, 6],
    hours: [[H(9), H(17)]],
  },
  {
    slug: "paolo",
    displayName: "Paolo Reyes",
    bio: "Minimal studio in Ma-a. Home visits for weddings and debuts on request.",
    specialties: ["Event grooming", "Classic cuts", "Fades"],
    themePreset: "clean-studio",
    paymentMode: "DEPOSIT",
    depositCentavos: P(150),
    home: { feePesos: 250, radiusKm: 15, lat: 7.095, lng: 125.588 },
    solo: { lat: 7.095, lng: 125.588, area: "Ma-a" },
    packages: [
      ["Studio cut", 350, 45],
      ["Event grooming", 900, 90, "Cut, shave and styling before a big day."],
    ],
    addOns: [["Hot towel shave", 200, 20], ["Styling", 100, 10]],
    days: [2, 3, 4, 5, 6],
    hours: [[H(10), H(19)]],
  },
];

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function main() {
  await db.$transaction([
    db.bookingAddOn.deleteMany(),
    db.booking.deleteMany(),
    db.timeOff.deleteMany(),
    db.weeklySchedule.deleteMany(),
    db.shopHours.deleteMany(),
    db.addOn.deleteMany(),
    db.package.deleteMany(),
    db.portfolioPhoto.deleteMany(),
    db.shopMembership.deleteMany(),
    db.barber.deleteMany(),
    db.shop.deleteMany(),
    db.user.deleteMany(),
  ]);

  const shopIds = new Map<string, string>();
  for (const shop of shops) {
    const created = await db.shop.create({
      data: {
        ...shop,
        hours: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, openMin: H(8), closeMin: H(22) })) },
      },
    });
    shopIds.set(shop.slug, created.id);
  }

  const customers = await Promise.all(
    ["+639170000001", "+639170000002", "+639170000003"].map((phone, i) =>
      db.user.create({ data: { phone, name: ["Carlo", "Jessa", "Dodong"][i] } }),
    ),
  );

  const today = manilaDateOf(new Date());

  for (const seed of barbers) {
    const barber = await db.barber.create({
      data: {
        slug: seed.slug,
        displayName: seed.displayName,
        bio: seed.bio,
        specialties: seed.specialties,
        themePreset: seed.themePreset,
        paymentMode: seed.paymentMode ?? "AT_SHOP",
        depositCentavos: seed.depositCentavos,
        confirmMode: seed.confirmMode ?? "INSTANT",
        homeService: Boolean(seed.home),
        homeFeeCentavos: seed.home ? P(seed.home.feePesos) : null,
        serviceLat: seed.home?.lat,
        serviceLng: seed.home?.lng,
        serviceRadiusKm: seed.home?.radiusKm,
        lat: seed.solo?.lat,
        lng: seed.solo?.lng,
        areaLabel: seed.solo?.area,
        packages: {
          create: seed.packages.map(([name, pesos, durationMin, description], sortOrder) => ({
            name,
            priceCentavos: P(pesos),
            durationMin,
            description,
            sortOrder,
          })),
        },
        addOns: { create: seed.addOns.map(([name, pesos, durationMin]) => ({ name, priceCentavos: P(pesos), durationMin })) },
        schedules: {
          create: seed.days.flatMap((weekday) => seed.hours.map(([startMin, endMin]) => ({ weekday, startMin, endMin }))),
        },
        memberships: seed.shop
          ? { create: { shopId: shopIds.get(seed.shop)!, role: seed.owner ? "OWNER" : "BARBER" } }
          : undefined,
      },
      include: { packages: true },
    });

    // A few bookings over the next two days so calendars and availability have gaps.
    const pkg = barber.packages[0];
    for (const [dayOffset, startHour, customer, status] of [
      [0, 15, 0, "CONFIRMED"],
      [1, 11, 1, "CONFIRMED"],
      [1, 16, 2, seed.confirmMode === "REQUEST" ? "PENDING" : "CONFIRMED"],
    ] as const) {
      const date = addDays(today, dayOffset);
      const startsAt = atManilaMinute(date, H(startHour));
      await db.booking.create({
        data: {
          code: code(),
          barberId: barber.id,
          shopId: seed.shop ? shopIds.get(seed.shop) : null,
          customerId: customers[customer].id,
          packageId: pkg.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + pkg.durationMin * 60_000),
          status,
          priceCentavos: pkg.priceCentavos,
          locationType: seed.home && !seed.shop && seed.slug === "ate-lyn" ? "HOME" : "SHOP",
          address: seed.slug === "ate-lyn" ? "Sample address, Buhangin" : null,
        },
      });
    }
  }

  console.log(`Seeded ${shops.length} shops and ${barbers.length} barbers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
