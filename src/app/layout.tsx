import type { Metadata, Viewport } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/oswald";
import "@fontsource-variable/playfair-display";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/bebas-neue";
import "@fontsource/righteous";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kliper · Book your barber in Davao", template: "%s · Kliper" },
  description: "Book a barber in Davao: shop barbers, solo barbers and home-service cuts. Pick a time, skip the queue.",
  applicationName: "Kliper",
};

export const viewport: Viewport = {
  themeColor: "#2b211a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-PH">
      <body>{children}</body>
    </html>
  );
}
