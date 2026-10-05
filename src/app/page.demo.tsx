// Static demo build only (KLIPER_BUILD=demo, see next.config.ts): the demo at "/".
import type { Metadata } from "next";
import { DemoPage } from "@/components/demo-page";

export const metadata: Metadata = {
  title: { absolute: "Try your shop on Kliper" },
  description: "Set up a practice barbershop and see how it would look on Kliper.",
};

export default function Page() {
  return <DemoPage standalone />;
}
