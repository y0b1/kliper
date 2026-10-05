import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-semibold uppercase tracking-[0.18em] ${className}`}>
      Kliper<span className="text-oak">.ph</span>
    </span>
  );
}

/** The reference UI's header: a round back button on the left, pills on the right. */
export function TopBar({ back, children }: { back?: string; children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      {back ? (
        <Link href={back} className="round-button" aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
      ) : (
        <Link href="/" aria-label="Kliper home" className="pl-1">
          <Wordmark />
        </Link>
      )}
      <nav className="flex items-center gap-2">{children}</nav>
    </header>
  );
}
