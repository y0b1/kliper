import { Scissors } from "lucide-react";
import Link from "next/link";

/**
 * Pinned to the bottom of browsing pages (directory and shop pages) so barbers can
 * always find the demo. Kept off barber pages, which have their own fixed booking bar.
 */
export function DemoButton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/demo"
        className="btn pointer-events-auto bg-pole-red text-white shadow-[0_6px_20px_rgb(0_0_0/0.25)] hover:brightness-110"
      >
        <Scissors size={18} aria-hidden />
        Barber? Try your shop on Kliper
      </Link>
    </div>
  );
}
