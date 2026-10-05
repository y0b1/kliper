import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="font-sign text-[1.7rem] leading-none font-extrabold tracking-[0.02em]">Kliper</span>
      <span className="pole mt-1" aria-hidden />
    </span>
  );
}

/** Wordmark (or a back link) on the left, a couple of plain links on the right. */
export function TopBar({ back, backLabel = "Back", children }: { back?: string; backLabel?: string; children?: ReactNode }) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-3">
      {back ? (
        <Link href={back} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 font-medium">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden />
          {backLabel}
        </Link>
      ) : (
        <Link href="/" aria-label="Kliper home">
          <Wordmark />
        </Link>
      )}
      <nav className="flex items-center gap-4 text-[0.9375rem] font-medium">{children}</nav>
    </header>
  );
}
