import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kliper",
    short_name: "Kliper",
    description: "Book your barber in Davao.",
    start_url: "/",
    display: "standalone",
    background_color: "#e7e4df",
    theme_color: "#2b211a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
