# Overview

Majestic is a local-first media server built on immutable edition identity.

## Principles

- **Wire contract**: API response shapes defined in majestic-api-contracts. No drift.
- **Identity-driven**: Edition identity from content, not paths.
- **Deterministic builds**: Hash enforcement, version-bound artifacts.
- **Static documentation**: This site is generated at build time. No runtime logic.

## Sections

| Section | Contents |
|---------|----------|
| [Architecture](/architecture/) | Identity, API, build, streaming, data lineage |
| [Contracts](/contracts/) | Schemas, versioning, canonical bundle |
| [Integration](/integration/) | Client integration, Roku, streaming platforms |
| [Invariants](/invariants/) | Breaking-change rules, compatibility policy |
| [Compatibility](/compatibility/) | Device format support |
| [Validation](/validation/) | Soak testing, concurrency, crash recovery |
| [Operations](/operations/deployment) | Deployment guide |
| [Reference](/reference/TERMINOLOGY) | Canonical terminology |
