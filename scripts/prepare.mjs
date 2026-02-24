#!/usr/bin/env node
/**
 * Prepare majestic-site for build.
 *
 * 1. Copy docs from majestic-docs (sibling repo or env MAJESTIC_DOCS_PATH)
 * 2. Copy contract artifacts from majestic-api-contracts (sibling or env MAJESTIC_CONTRACTS_PATH)
 * 3. Run pnpm generate in contracts repo if needed
 * 4. Generate contracts/index.md from contract.json
 * 5. Embed version/hash/buildTime for footer
 *
 * For CI: clone both repos first, then run this with paths.
 */
import { execSync } from 'child_process';
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');
const publicDir = join(docsDir, 'public');

const DOCS_REPO = process.env.MAJESTIC_DOCS_PATH || join(root, '..', 'majestic-docs');
const CONTRACTS_REPO =
  process.env.MAJESTIC_CONTRACTS_PATH || join(root, '..', 'majestic-api-contracts');

function copyRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const srcPath = join(src, name);
    const destPath = join(dest, name);
    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function prepareDocs() {
  if (!existsSync(DOCS_REPO)) {
    console.warn(`majestic-docs not found at ${DOCS_REPO}. Skipping docs copy.`);
    return;
  }
  const archSrc = join(DOCS_REPO, 'architecture');
  const archDest = join(docsDir, 'architecture');
  if (existsSync(archSrc)) {
    mkdirSync(archDest, { recursive: true });
    for (const name of readdirSync(archSrc)) {
      if (name.endsWith('.md')) {
        copyFileSync(join(archSrc, name), join(archDest, name));
      }
    }
    console.log('Copied architecture docs');
  }

  const govSrc = join(DOCS_REPO, 'governance');
  const invDest = join(docsDir, 'invariants');
  if (existsSync(govSrc)) {
    mkdirSync(invDest, { recursive: true });
    for (const name of readdirSync(govSrc)) {
      if (name.endsWith('.md')) {
        copyFileSync(join(govSrc, name), join(invDest, name));
      }
    }
    console.log('Copied governance docs to invariants');
  }

  const verSrc = join(DOCS_REPO, 'versioning');
  const verDest = join(docsDir, 'versioning');
  if (existsSync(verSrc)) {
    mkdirSync(verDest, { recursive: true });
    for (const name of readdirSync(verSrc)) {
      if (name.endsWith('.md')) {
        copyFileSync(join(verSrc, name), join(verDest, name));
      }
    }
    console.log('Copied versioning docs');
  }
}

function prepareContracts() {
  if (!existsSync(CONTRACTS_REPO)) {
    console.warn(`majestic-api-contracts not found at ${CONTRACTS_REPO}. Skipping contracts.`);
    return null;
  }

  // Run generate in contracts repo
  execSync('pnpm run generate', { cwd: CONTRACTS_REPO, stdio: 'inherit' });

  const contractPath = join(CONTRACTS_REPO, 'contract.json');
  const bundlePath = join(CONTRACTS_REPO, 'contract.bundle.json');
  const schemasPath = join(CONTRACTS_REPO, 'schemas');

  if (!existsSync(contractPath)) {
    throw new Error('contract.json not found after generate');
  }

  mkdirSync(publicDir, { recursive: true });
  copyFileSync(contractPath, join(publicDir, 'contract.json'));
  if (existsSync(bundlePath)) {
    copyFileSync(bundlePath, join(publicDir, 'contract.bundle.json'));
  }

  const schemasDest = join(publicDir, 'schemas');
  mkdirSync(schemasDest, { recursive: true });
  if (existsSync(schemasPath)) {
    for (const name of readdirSync(schemasPath)) {
      if (name.endsWith('.json')) {
        copyFileSync(join(schemasPath, name), join(schemasDest, name));
      }
    }
  }

  console.log('Copied contract artifacts to public/');

  const contract = JSON.parse(readFileSync(contractPath, 'utf-8'));
  return contract;
}

function generateContractsPage(contract) {
  if (!contract) return;

  const buildTime = new Date().toISOString();
  const { contractVersion, schemaHash, schemas, endpointMap } = contract;

  const schemaRows = Object.entries(schemas || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, meta]) =>
        `| [${name}](/schemas/${meta.path.split('/').pop()}) | ${(meta.description || '—').replace(/\|/g, '\\|')} |`
    )
    .join('\n');

  const endpointRows =
    endpointMap && Object.keys(endpointMap).length > 0
      ? Object.entries(endpointMap)
          .map(([ep, schema]) => `| \`${ep}\` | ${schema} |`)
          .join('\n')
      : '| — | — |';

  const md = `---
title: Contract Reference
description: Wire contract — version, hash, schemas, endpoint map
---

# Contract Reference

**Version:** \`${contractVersion}\`  
**Hash:** \`${schemaHash}\`  
**Generated:** ${contract.generatedAt || '—'}

Majestic uses a single, coordinated contract version across server and client. Hash enforcement prevents silent drift.

## Endpoint Map

| Endpoint | Schema |
|----------|--------|
${endpointRows}

## Schemas

| Schema | Description |
|--------|-------------|
${schemaRows}

## Download

[Download contract.bundle.json](/contract.bundle.json) — deterministic, hash-verified aggregate of all schemas.
`;

  mkdirSync(join(docsDir, 'contracts'), { recursive: true });
  writeFileSync(join(docsDir, 'contracts', 'index.md'), md, 'utf-8');
  console.log('Generated contracts/index.md');

  // Write build meta for theme footer
  const meta = {
    contractVersion,
    schemaHash,
    buildTime,
  };
  const vitepressDir = join(docsDir, '.vitepress');
  mkdirSync(vitepressDir, { recursive: true });
  writeFileSync(join(vitepressDir, 'build-meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
}

function main() {
  console.log('Preparing majestic-site...');
  prepareDocs();
  const contract = prepareContracts();
  generateContractsPage(contract);
  console.log('Done.');
}

main();
