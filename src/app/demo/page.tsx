import type { Metadata } from "next";
import { DemoPage } from "@/components/demo-page";

export const metadata: Metadata = {
  title: "Try your shop",
  description: "Set up a practice barbershop and see how it would look on Kliper.",
};

export default function Page() {
  return <DemoPage />;
}
