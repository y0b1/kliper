import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { DirectoryList } from "@/components/directory-list";
import { TopBar } from "@/components/top-bar";
import { listDirectory } from "@/server/barbers";
import { toCard } from "@/server/directory";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const cards = (await listDirectory()).map(toCard);
  const shops = new Set(cards.map((c) => c.shopName).filter(Boolean)).size;
  const stats = [
    { label: "Open today", value: cards.filter((c) => c.openToday).length, className: "bg-walnut text-cream" },
    { label: "Home service", value: cards.filter((c) => c.homeService).length, className: "bg-oak-light text-ink" },
    { label: "Instant", value: cards.filter((c) => c.instant).length, className: "hatched text-ink" },
    { label: "Shops", value: shops, className: "border border-ink/70 text-ink" },
  ];

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] md:max-w-4xl">
      <TopBar>
        <Link href="/" className="pill">
          Directory
        </Link>
        <Link href="/dashboard" className="pill">
          For barbers
        </Link>
        <span className="round-button hidden! sm:inline-grid!" aria-hidden>
          <SlidersHorizontal size={18} strokeWidth={1.75} />
        </span>
      </TopBar>

      <h1 className="mt-10 text-5xl font-light tracking-tight md:text-6xl">Barbers</h1>
      <p className="mt-2 text-muted">Davao City · book a time, skip the queue</p>

      <section aria-label="At a glance" className="mt-6 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className="truncate pb-2 text-xs text-muted sm:text-sm">{stat.label}</p>
            <p className={`rounded-full px-4 py-3 text-sm ${stat.className}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      <DirectoryList initial={cards} />
    </main>
  );
}
