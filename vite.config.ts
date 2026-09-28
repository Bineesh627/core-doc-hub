// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Nitro's vercel preset writes the Vercel Build Output API files
// (.vercel/output/config.json and functions/__server.func/.vc-config.json) in
// its own `compiled` hook. The Lovable build config wraps that hook for its
// prerender shim and drops the preset's version, so we call it ourselves here.
async function runVercelPresetCompiled(nitro: unknown) {
  const { pathToFileURL } = await import("node:url");
  const { join } = await import("node:path");
  const presetsUrl = pathToFileURL(
    join(process.cwd(), "node_modules", "nitro", "dist", "_presets.mjs"),
  ).href;
  const { resolvePreset } = (await import(presetsUrl)) as {
    resolvePreset: (
      id: string,
      opts: Record<string, unknown>,
    ) => Promise<{ hooks?: Record<string, (nitro: unknown) => Promise<void> | void> | undefined }>;
  };
  const preset = await resolvePreset("vercel", { compatibilityDate: "latest" });
  const compiled = preset?.hooks?.compiled;
  if (typeof compiled === "function") await compiled(nitro);
}

export default defineConfig({
  // On Vercel (VERCEL=1 is set automatically), Nitro emits the Vercel Build
  // Output API (.vercel/output) — no vercel.json is needed or wanted there.
  ...(process.env["VERCEL"]
    ? {
        nitro: {
          preset: "vercel",
          hooks: { compiled: runVercelPresetCompiled },
        },
      }
    : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages: [{ path: "/" }, { path: "/invoice" }, { path: "/quotation" }],
    prerender: { enabled: true, autoStaticPathsDiscovery: false },
  },
});
