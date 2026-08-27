// CLI entry — minimal placeholder. Real subcommands arrive in slice 2.
// The HTML is embedded at build time via a Vite ?raw import so the
// committed .mjs is a self-contained single artifact.
import spaHtml from "../../grilling-ui/dist/index.html?raw";

const USAGE = `\
Usage: grilling-cli.mjs <subcommand> [flags]

Subcommands:
  start          Start a grilling session
  update <sub>   Mutate grilling state
  get            Read grilling state
  refresh        Signal the server to re-render
  wait <state>   Block until page-state matches
  finalize       Check coast-clear, stop server, emit summary

Options:
  --help         Show this help message
  --no-open      Do not auto-open the browser (used with start)

The inlined SPA HTML is embedded in this bundle (${spaHtml.length} bytes).
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  // Placeholder: real dispatch arrives in slice 2.
  process.stderr.write("No subcommand provided. Run with --help for usage.\n");
  process.exit(1);
}

main();
