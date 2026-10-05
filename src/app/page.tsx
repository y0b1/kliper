import Link from "next/link";
import { DemoButton } from "@/components/demo-button";
import { DirectoryList } from "@/components/directory-list";
import { TopBar } from "@/components/top-bar";
import { listDirectory } from "@/server/barbers";
import { toDirectory } from "@/server/directory";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const directory = toDirectory(await listDirectory());

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] md:max-w-4xl md:px-8">
      <TopBar>
        <Link href="/dashboard" className="underline-offset-4 hover:underline">
          For barbers
        </Link>
      </TopBar>

      <h1 className="font-sign mt-10 text-[3.4rem] leading-[0.92] font-extrabold tracking-[0.005em] md:text-[5rem]">
        Get a cut in
        <br />
        Davao today.
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        See who has a free chair, pick a time, and walk in when it&apos;s your turn.
      </p>

      <DirectoryList initial={directory} />
      <DemoButton />
    </main>
  );
}
