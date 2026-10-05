import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/outfit";
import "@fontsource-variable/oswald";
import "@fontsource-variable/playfair-display";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/bebas-neue";
import "@fontsource/righteous";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kliper: book a barber in Davao", template: "%s | Kliper" },
  description: "Find a free chair near you and book it. Barbershops, solo barbers and home-service cuts in Davao.",
  applicationName: "Kliper",
};

export const viewport: Viewport = {
  themeColor: "#e3e1dc",
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
