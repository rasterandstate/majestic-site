# majestic-site

Static documentation site for Majestic. Serves architecture docs, API contracts, invariants, and downloadable bundle.

**Domain:** majesticcore.dev  
**Deploy:** GitHub Pages (from this repo only)

## Architecture

```
majestic-api-contracts  → source (schemas, contract.json, bundle)
majestic-docs           → source (architecture, governance, versioning)
majestic-site           → presentation layer (this repo)
```

Build pulls from both source repos. No runtime logic. Everything generated at build time.

## Local Development

Prerequisites: `majestic-docs` and `majestic-api-contracts` as sibling directories.

```bash
pnpm install
pnpm run prepare   # copies docs + contracts, generates contracts page
pnpm run docs:dev  # dev server
```

## Build

```bash
pnpm run prepare
pnpm run docs:build
```

Output: `docs/.vitepress/dist/`

## CI

On push to `main`:

1. Clone majestic-docs, majestic-api-contracts
2. Run `pnpm run prepare` (env vars point to cloned repos)
3. Build VitePress
4. Deploy to GitHub Pages

**Repo names:** Workflow assumes `majestic-docs` and `majestic-api-contracts` under the same org as `majestic-site`. Adjust `.github/workflows/deploy.yml` if different.

## Custom Domain

`docs/public/CNAME` contains `majesticcore.dev`. Configure GitHub Pages to use this domain.
