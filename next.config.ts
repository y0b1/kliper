import type { NextConfig } from "next";

/**
 * `KLIPER_BUILD=demo` builds the static barber demo for kliper-demo.peur.ph: only
 * `*.demo.tsx` files count as routes (the demo at "/" and the root layout), and the
 * output is plain files in `.next-demo/` with no server or database.
 */
const demo = process.env.KLIPER_BUILD === "demo";

const nextConfig: NextConfig = demo
  ? {
      output: "export",
      // Separate from .next so the demo's route types never mix with the app's. The export lands here too.
      distDir: ".next-demo",
      pageExtensions: ["demo.tsx", "demo.ts"],
      images: { unoptimized: true },
      // This build only knows "/", so typed routes for the app's other pages fail here.
      // `pnpm typecheck` covers the whole app, these files included.
      typescript: { ignoreBuildErrors: true },
    }
  : {};

export default nextConfig;
