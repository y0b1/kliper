import Link from "next/link";
import { DemoBuilderClient } from "./demo-builder-client";
import { TopBar } from "./top-bar";

/**
 * The demo page body. `standalone` is the static build served at kliper-demo.peur.ph,
 * which has no directory to link back to.
 */
export function DemoPage({ standalone = false }: { standalone?: boolean }) {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] md:max-w-6xl md:px-8">
      <TopBar>
        {!standalone && (
          <Link href="/" className="underline-offset-4 hover:underline">
            Find a barber
          </Link>
        )}
      </TopBar>

      <h1 className="font-sign mt-10 text-[3rem] leading-[0.92] font-extrabold md:text-[4.5rem]">
        Try your shop
        <br />
        on Kliper.
      </h1>
      <p className="mt-3 max-w-lg text-ink-soft">
        Add your cuts, barbers and colors, and see what customers would see. This is practice: nothing is saved to Kliper or shown to
        anyone. Your draft stays in this browser.
      </p>

      <DemoBuilderClient />
    </main>
  );
}
