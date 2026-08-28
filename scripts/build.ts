// Build driver — two-step Vite build:
//   (a) Svelte 5 SPA → one inlined index.html (vite-plugin-singlefile + assetsInlineLimit: Infinity)
//   (b) CLI TS → skills/grilling/grilling-cli.mjs with the HTML embedded as a raw string
import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const spaDir = join(__dirname, "grilling-ui");
const cliDir = join(__dirname, "grilling-cli");
const spaOutDir = join(spaDir, "dist");
const cliOutDir = join(repoRoot, "skills", "grilling");
const cliMjs = join(cliOutDir, "grilling-cli.mjs");

async function main(): Promise<void> {
  // --- Step (a): Svelte SPA → inlined index.html ---
  // Clean prior output so we emit exactly the files Vite produces.
  if (existsSync(spaOutDir)) {
    await rm(spaOutDir, { recursive: true, force: true });
  }

  await build({
    root: spaDir,
    plugins: [svelte(), viteSingleFile()],
    build: {
      outDir: "dist",
      assetsInlineLimit: Infinity,
      cssCodeSplit: false,
    },
    clearScreen: false,
    logLevel: "warn",
  });

  // --- Step (b): CLI TS → grilling-cli.mjs with embedded HTML ---
  if (existsSync(cliOutDir)) {
    // Remove only the old .mjs, keep the dir (it has SKILL.md etc.).
    if (existsSync(cliMjs)) {
      await rm(cliMjs, { force: true });
    }
  } else {
    await mkdir(cliOutDir, { recursive: true });
  }

  await build({
    root: cliDir,
    build: {
      outDir: cliOutDir,
      lib: {
        entry: join(cliDir, "src", "index.ts"),
        formats: ["es"],
        fileName: () => "grilling-cli.mjs",
      },
      // Inline everything into the single .mjs (no separate chunks).
      rollupOptions: {
        output: {
          entryFileNames: "grilling-cli.mjs",
        },
        // Allow ?raw import of the built SPA HTML.
        // Mark node: builtins as external — they resolve at runtime.
        external: (id: string) => id.startsWith("node:"),
      },
      assetsInlineLimit: Infinity,
      cssCodeSplit: false,
      minify: false,
    },
    clearScreen: false,
    logLevel: "warn",
  });
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
