# Contract Versioning

> **Source of truth:** `majestic-api-contracts` README and `src/version.ts`  
> This document summarizes versioning for multi-client consumption.

---

## Overview

Majestic uses **SemVer** for API contracts. The contract version is enforced via hash; schema changes require an explicit version bump. No silent drift.

**Consumers:** majestic-server, majestic-appletv, majestic-roku, majestic-tizen (and future clients).

---

## Version Bump Rules

| Change | Bump | Impact |
|--------|------|--------|
| Field removed | **Major** | Breaking - all clients must update |
| Field renamed | **Major** | Breaking |
| Type changed incompatibly | **Major** | Breaking |
| Enum value removed | **Major** | Breaking |
| New optional field added | **Minor** | Additive - clients can ignore |
| New enum value added | **Minor** | Additive - forward-compat |
| Description/docs only | **Patch** | No wire change |

---

## Multi-Client Implications

When you bump the contract version:

1. **Server** - Must return responses that conform. Update implementation.
2. **Apple TV** - Update models if shape changed. Sync with `majestic-api-contracts/swift/` when applicable.
3. **Roku** - Update `CONTRACT_ALIGNMENT.md` and parsing. BrightScript has no types; doc parity matters.
4. **Tizen** - Same as Roku when implemented.

**Header:** Clients send `X-Majestic-Client-Contract`; server may enforce minimum version.

---

## Hash Enforcement

`majestic-api-contracts` CI:

- `pnpm run generate` → canonical bundle
- `pnpm run check:hash` → fails if schema changed without version bump
- `contract-hashes.json` → SHA-256 per `CONTRACT_VERSION`

**No exceptions.** Schema change = version bump = hash update.

---

## When Adding a New Field

1. Add to schema (optional for minor, required for major).
2. Bump `CONTRACT_VERSION` in `src/version.ts`.
3. Run `pnpm run generate`.
4. Run `pnpm run check:hash` - copy printed hash.
5. Add `"X.Y.Z": "sha256-..."` to `contract-hashes.json`.
6. Update server to return the field.
7. Update clients when they need it (optional fields can be ignored).

---

## Design Principle

> Clients render. Servers decide. Contracts define.

Versioning protects the wire. It does not protect against clients that ignore new fields or fail to handle new enum values. Forward-compat rule: unknown values → treat as `unknown` or neutral; no crash.

---

## Runtime Visibility

### Server

- **Startup:** Logs contract version at boot.
- **Request handling:** When client sends `X-Majestic-Client-Contract`, server compares major. Mismatch → **426 Upgrade Required** with `X-Majestic-Contract` header.
- **Response:** All responses include `X-Majestic-Contract` header.

### Client

- **Request:** Sends `X-Majestic-Client-Contract: X.Y.Z` on all API requests.
- **426 handling:** Shows upgrade-required message.
- **Version sync:** Client contract version must match `majestic-api-contracts` CONTRACT_VERSION.
