# Identity Layer

The identity layer defines how Majestic models ownership and edition truth. Edition identity is derived from content-derived inputs—never from paths, filenames, or mutable metadata.

## Principles

1. **Edition identity never changes**: Once an edition is identified, its identity is immutable.
2. **Determinism**: Same inputs → same identity. Always.
3. **Identity over file location**: Identity is content-based; physical path changes do not invalidate edition identity.
4. **File moves must not break identity**: Fingerprinting enables continuity across moves and renames.

## Core Concepts

| Term | Definition |
|------|------------|
| **Movie** | A work (e.g. a film). May have multiple editions. |
| **Edition** | A specific release of a movie (theatrical, director's cut, steelbook, etc.). |
| **Physical Copy** | A disc or physical item linked to an edition. |
| **Media File** | A digital file on disk, linked to a movie and optionally an edition. |
| **Identity Hash** | Deterministic hash identifying an edition. Immutable. |

## Edition Identity

- **Identity domain**: disc_edition identity hash, UPC, region, packaging, publisher, release year.
- **Rules**: Never derived from media_file. Never mutated by enrichment. Hash inputs must remain stable across rescans.
- **Authority**: Identity logic lives in identity modules. Enrichment logic lives in enrichment modules. Streaming logic never depends on orchestration.

## File Fingerprinting

File identity continuity is guaranteed by deterministic fingerprinting, not by path.

**Invariants:**

| Mutable | Immutable |
|---------|-----------|
| File path | Fingerprint |
| File name | |
| Library root | |

Fingerprint is authoritative. Fingerprint algorithm is versioned. `media_file` stores `fingerprint_version` to support future algorithm changes without breaking continuity. Changes require migration path. Never weaken fingerprint determinism for speed.

## Dependencies

- **majestic-identity-contract**: Edition hash algorithm, fingerprint versioning, region normalization.

## Versioning

See [Identity Versioning](../versioning/identity-versioning.md).
