"use client";

import dynamic from "next/dynamic";

/** The demo reads its draft from localStorage, so it renders in the browser only. */
export const DemoBuilderClient = dynamic(() => import("./demo-builder").then((m) => m.DemoBuilder), {
  ssr: false,
  loading: () => <p className="mt-10 text-ink-soft">Loading your draft…</p>,
});
