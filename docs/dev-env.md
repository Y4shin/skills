# Development environment

This repository uses [devenv](https://devenv.sh/) for a reproducible Node.js
shell. Enter it with:

```bash
devenv shell
```

The shell provides Node.js 22 and Git. On first entry, or when the Vitest or
TypeScript binaries are missing, it runs `npm ci` from the locked
`package-lock.json`.

Run the checks inside the shell:

```bash
devenv shell -- npm test
devenv shell -- npm run typecheck
```
