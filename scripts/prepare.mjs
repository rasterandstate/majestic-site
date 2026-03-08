#!/usr/bin/env node
/**
 * Prepare majestic-site for build.
 *
 * Contract-critical. Treat as infrastructure. Fail hard on errors.
 *
 * 1. Copy docs from majestic-docs (sibling repo or env MAJESTIC_DOCS_PATH)
 * 2. Copy contract artifacts from majestic-api-contracts (sibling or env MAJESTIC_CONTRACTS_PATH)
 * 3. Run pnpm generate in contracts repo
 * 4. Generate contracts/index.md from contract.json
 * 5. Embed version/hash/buildTime for footer
 *
 * Fails hard if: contracts path missing, contract.json missing, contract.bundle.json missing,
 * or contract version/hash invalid. Idempotent.
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
    if (process.env.MAJESTIC_DOCS_PATH) {
      throw new Error(
        `majestic-docs not found at ${DOCS_REPO}. ` +
          'CI must clone majestic-docs before prepare.'
      );
    }
    console.warn(`majestic-docs not found at ${DOCS_REPO}. Skipping docs copy.`);
    return;
  }
  const noEmDash = (s) => s.replace(/\s*—\s*/g, ' - ');

  const archSrc = join(DOCS_REPO, 'architecture');
  const archDest = join(docsDir, 'architecture');
  if (existsSync(archSrc)) {
    mkdirSync(archDest, { recursive: true });
    for (const name of readdirSync(archSrc)) {
      if (name.endsWith('.md')) {
        const content = noEmDash(readFileSync(join(archSrc, name), 'utf-8'));
        writeFileSync(join(archDest, name), content, 'utf-8');
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
        const content = noEmDash(readFileSync(join(govSrc, name), 'utf-8'));
        writeFileSync(join(invDest, name), content, 'utf-8');
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
        const content = noEmDash(readFileSync(join(verSrc, name), 'utf-8'));
        writeFileSync(join(verDest, name), content, 'utf-8');
      }
    }
    console.log('Copied versioning docs');
  }

  // compatibility/ (e.g. apple-tv-format-support)
  const compatSrc = join(DOCS_REPO, 'compatibility');
  const compatDest = join(docsDir, 'compatibility');
  if (existsSync(compatSrc)) {
    mkdirSync(compatDest, { recursive: true });
    for (const name of readdirSync(compatSrc)) {
      if (name.endsWith('.md')) {
        const content = noEmDash(readFileSync(join(compatSrc, name), 'utf-8'));
        writeFileSync(join(compatDest, name), content, 'utf-8');
      }
    }
    console.log('Copied compatibility docs');
  }

  // integration/ (roku-contract-alignment, streaming-platforms - index stays from site)
  const intSrc = join(DOCS_REPO, 'integration');
  const intDest = join(docsDir, 'integration');
  if (existsSync(intSrc)) {
    mkdirSync(intDest, { recursive: true });
    for (const name of readdirSync(intSrc)) {
      if (name.endsWith('.md')) {
        const content = noEmDash(readFileSync(join(intSrc, name), 'utf-8'));
        writeFileSync(join(intDest, name), content, 'utf-8');
      }
    }
    console.log('Copied integration docs');
  }

  // reference/ (TERMINOLOGY)
  const refSrc = join(DOCS_REPO, 'reference');
  const refDest = join(docsDir, 'reference');
  if (existsSync(refSrc)) {
    mkdirSync(refDest, { recursive: true });
    for (const name of readdirSync(refSrc)) {
      if (name.endsWith('.md')) {
        const content = noEmDash(readFileSync(join(refSrc, name), 'utf-8'));
        writeFileSync(join(refDest, name), content, 'utf-8');
      }
    }
    console.log('Copied reference docs');
  }

  // validation/ (soak-testing, concurrency, crash-recovery)
  const valSrc = join(DOCS_REPO, 'validation');
  const valDest = join(docsDir, 'validation');
  if (existsSync(valSrc)) {
    mkdirSync(valDest, { recursive: true });
    for (const name of readdirSync(valSrc)) {
      if (name.endsWith('.md')) {
        const content = noEmDash(readFileSync(join(valSrc, name), 'utf-8'));
        writeFileSync(join(valDest, name), content, 'utf-8');
      }
    }
    console.log('Copied validation docs');
  }

  // operations/ (deployment)
  const opsSrc = join(DOCS_REPO, 'operations');
  const opsDest = join(docsDir, 'operations');
  if (existsSync(opsSrc)) {
    mkdirSync(opsDest, { recursive: true });
    for (const name of readdirSync(opsSrc)) {
      if (name.endsWith('.md')) {
        const content = noEmDash(readFileSync(join(opsSrc, name), 'utf-8'));
        writeFileSync(join(opsDest, name), content, 'utf-8');
      }
    }
    console.log('Copied operations docs');
  }
}

function prepareContracts() {
  if (!existsSync(CONTRACTS_REPO)) {
    throw new Error(
      `majestic-api-contracts not found at ${CONTRACTS_REPO}. ` +
        'Set MAJESTIC_CONTRACTS_PATH or ensure sibling repo exists.'
    );
  }

  // Ensure deps installed before generate (self-contained; CI layout can vary)
  execSync('pnpm install --frozen-lockfile', { cwd: CONTRACTS_REPO, stdio: 'inherit' });
  execSync('pnpm run generate', { cwd: CONTRACTS_REPO, stdio: 'inherit' });

  const contractPath = join(CONTRACTS_REPO, 'contract.json');
  const bundlePath = join(CONTRACTS_REPO, 'contract.bundle.json');
  const schemasPath = join(CONTRACTS_REPO, 'schemas');

  if (!existsSync(contractPath)) {
    throw new Error('contract.json not found after generate. Run pnpm run generate in majestic-api-contracts.');
  }

  if (!existsSync(bundlePath)) {
    throw new Error(
      'contract.bundle.json not found after generate. Run pnpm run generate in majestic-api-contracts.'
    );
  }

  const contract = JSON.parse(readFileSync(contractPath, 'utf-8'));
  if (!contract.contractVersion || typeof contract.contractVersion !== 'string') {
    throw new Error('contract.json missing or invalid contractVersion.');
  }
  if (!contract.schemaHash || typeof contract.schemaHash !== 'string') {
    throw new Error('contract.json missing or invalid schemaHash.');
  }

  mkdirSync(publicDir, { recursive: true });
  copyFileSync(contractPath, join(publicDir, 'contract.json'));
  copyFileSync(bundlePath, join(publicDir, 'contract.bundle.json'));

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
  return contract;
}

function generateContractsPage(contract) {
  if (!contract) throw new Error('generateContractsPage requires contract from prepareContracts.');

  const buildTime = new Date().toISOString();
  const { contractVersion, schemaHash, schemas, endpointMap } = contract;

  const schemaRows = Object.entries(schemas || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, meta]) =>
        `| [${name}](/schemas/${meta.path.split('/').pop()}) | ${(meta.description || '-').replace(/\|/g, '\\|')} |`
    )
    .join('\n');

  const endpointRows =
    endpointMap && Object.keys(endpointMap).length > 0
      ? Object.entries(endpointMap)
          .map(([ep, schema]) => `| \`${ep}\` | ${schema} |`)
          .join('\n')
      : '| - | - |';

  const md = `---
title: Contract Reference
description: Wire contract (version, hash, schemas, endpoint map)
---

# Contract Reference

**Version:** \`${contractVersion}\`  
**Hash:** \`${schemaHash}\`  
**Generated:** ${contract.generatedAt || '-'}

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

[Download contract.bundle.json](/contract.bundle.json): deterministic, hash-verified aggregate of all schemas.
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
  try {
    prepareDocs();
    const contract = prepareContracts();
    generateContractsPage(contract);
    console.log('Done.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
