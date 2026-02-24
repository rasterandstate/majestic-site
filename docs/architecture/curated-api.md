# Majestic Curated API — Cloudflare Shared Data Layer

> **DEPRECATED.** The metadata/enrichment layer described here is superseded by [majestic-canon](../strategy/authoritative-data-distribution-dissection.md#15-canon-architecture--three-layers). Canon uses authoritative data distribution (signed patch packs) instead of live API. This document is retained for historical context and optional live-assist fallback design. **See majestic-canon for the canonical dataset source.**

---

**Purpose (historical):** Centralize movie, edition, person, and studio data for all paid Majestic server installs. Prior matched movies and editions become available to every paid instance, reducing TMDB/OMDb lookups and improving edition matching accuracy.

**Context:** TMDB models Movie as atomic. Multi-version (theatrical vs director's cut, etc.) has been in their backlog since 2019—it requires a parent/child ontology they don't have. Majestic designed Movie → Edition from day one. The Curated API was the interim design. **majestic-canon** is the target: patch-based distribution, not live API.

**Status:** Deprecated. Superseded by majestic-canon. Optional live-assist fallback only (under 5% of lookups).

**See also:** [Authoritative Data Distribution](../strategy/authoritative-data-distribution-dissection.md), [Data Contracts](data-contracts.md), [Data Lineage](../data-lineage.md). Canon source: **majestic-canon** repo.

---

## 1. Strategic Context

| Layer | Description |
|-------|-------------|
| **Layer 1 – Curated API** | Cloudflare-hosted. Movies, editions, people, studios. Prior matches from paid installs. |
| **Layer 2 – Local cache** | Each server stores: OMDb results, user overrides, confirmed matches. |
| **Layer 3 – External lookup** | TMDB, OMDb, UPCMDB when needed. No scraping. |

**Lookup order (identity matching):**

1. Majestic Curated API (when licensed + configured)
2. `.majestic.json` if present → instant match
3. Local cache (OMDb, overrides, confirmed matches)
4. Filename / folder parsing
5. External API (TMDB, OMDb) only when needed
6. Multiple matches → mark unresolved, user confirms

**Access:** Paid Majestic installs only (Cinema Core, lifetime, integrator). License token required.

**Authority direction:**

```
Identity (local, authoritative)
↑
Curated API (shared, read-only)
↑
External APIs (TMDB / OMDb fallback)
```

Curated API proposes. Local instance decides. User confirms. Override always wins.

---

## 2. Infrastructure

| Component | Choice |
|-----------|--------|
| **API** | Cloudflare Workers |
| **Storage** | Cloudflare D1 (SQLite at edge) or R2 for bulk JSON |
| **Auth** | Bearer token (license key). Rate limit per token. |
| **CDN** | Cloudflare edge. Responses cacheable. |
| **Logging** | Structured logs. No titles or file paths. |

**Rationale:** Cloudflare-only is viable at launch. Workers, R2, CDN, WAF, auto-scaling. No AWS empire. Aligns with [ROADMAP Infrastructure Target](../ROADMAP.md).

---

## 3. API Contract

### Base URL

```
https://api.majestic.film/v1
```

(Placeholder. Actual domain TBD.)

### Authentication

```
Authorization: Bearer <license_token>
```

- Token issued with paid license (Cinema Core, lifetime, integrator).
- Invalid or expired → 401.
- Rate limit: e.g. 1000 req/hour per token. 429 when exceeded.

### Response Headers

All successful responses include:

```
X-Majestic-Dataset-Version: 2026-02-21
```

Enables debugging "why did this edition disappear?" months later. Version = dataset publish date or semantic version.

**Client:** Include dataset version in scan logs (debug level only). Future debugging: server version + dataset version + identity hash algorithm version.

### Endpoints

#### 3.1 Movie lookup by title + year

```
GET /movies?title=Blade+Runner&year=1982
```

**Response:** Array of matching movies. Each includes `id`, `tmdb_id`, `title`, `year`, `editions[]` (minimal: id, identity_hash, upc, label).

**Use case:** Identity matcher calls this before local DB or TMDB when parsing filename/folder.

#### 3.2 Movie lookup by TMDB ID

```
GET /movies/tmdb/:tmdbId
```

**Response:** Single movie with editions, people (cast/crew), studio.

**Use case:** Enrichment after TMDB search. Avoid re-fetching edition metadata.

#### 3.3 Edition lookup by UPC

```
GET /editions/upc/:upc
```

**Response:** Edition with movie, identity_hash, region, publisher, release_year.

**Use case:** Barcode scan. Instant match when UPC exists in curated dataset.

#### 3.4 Edition lookup by identity hash

```
GET /editions/hash/:identityHash
```

**Response:** Edition with movie. For fingerprint-based matching.

#### 3.5 Person lookup (optional, later)

```
GET /people/:id
```

**Response:** Person with headshot overrides, rendering flags.

**Use case:** Backstage actor headshot overrides. Lower priority than movie/edition.

#### 3.6 Studio lookup (optional, later)

```
GET /studios/:id
```

**Response:** Studio with logo metadata.

---

## 4. Data Schema (API Response Shapes)

### Movie (minimal for lookup)

```json
{
  "id": "maj_abc123",
  "tmdb_id": 78,
  "title": "Blade Runner",
  "year": 1982,
  "editions": [
    {
      "id": "ed_xyz",
      "identity_hash": "sha256:...",
      "upc": "012569501234",
      "label": "Director's Cut",
      "region": "A",
      "format": "Blu-ray"
    }
  ]
}
```

### Edition (full)

```json
{
  "id": "ed_xyz",
  "movie_id": "maj_abc123",
  "identity_hash": "sha256:...",
  "upc": "012569501234",
  "label": "Director's Cut",
  "region": "A",
  "format": "Blu-ray",
  "publisher": "Warner Bros.",
  "release_year": 2007
}
```

**Identity domain:** Hash, UPC, region, publisher, release year. Immutable. Never overwritten by enrichment.

**Enrichment domain:** Overview, cast, artwork. Mutable. Can refresh from TMDB.

**Schema freeze discipline:** Do not casually add fields to Edition JSON. Version endpoint (e.g. `/v2/editions`) if structural changes required. You are publishing contracts.

---

## 5. Caching & Offline Behavior

| Rule | Behavior |
|------|----------|
| **Cache responses** | Servers cache API responses locally (SQLite or file). TTL configurable (e.g. 24h for movies, 7d for editions). |
| **Offline graceful** | If API unreachable, fall through to next layer (.majestic.json, local cache, TMDB). Never block scan. |
| **Stale-while-revalidate** | Serve cached data immediately. Refresh in background when API available. |
| **No cache for 401/429** | Do not cache auth or rate-limit errors. |

**Config:** `MAJESTIC_CURATED_API_URL`, `MAJESTIC_LICENSE_TOKEN`, `MAJESTIC_CURATED_CACHE_TTL_HOURS`. If URL or token unset, skip API layer entirely.

### Timeout Rule (Critical)

Curated API lookup must fail fast. **500ms max.** Then fall through to next layer. Scanner must never feel cloud-bound.

### Async Isolation

```ts
if (curatedClient?.enabled) {
  try { await curatedLookup(...) }
  catch { /* ignore and continue */ }
}
```

Never bubble API errors into scan job failure. Timeout, 5xx, network error → silent fallthrough. Scan proceeds.

---

## 6. Contribution Model (Future)

Paid installs can contribute confirmed matches back to the curated dataset.

| Rule | Description |
|------|-------------|
| **Opt-in** | User explicitly enables contribution. Default off. |
| **Confirmed only** | Only matches user has explicitly confirmed (not auto-resolved). |
| **No PII** | No file paths, no library structure. Only: movie_id, edition_id, identity_hash, UPC. |
| **Moderation** | Contributions queued for review. No automatic merge to production. |
| **Attribution** | Optional: "Match confirmed by N installs." |

**Phase 1:** Read-only API. Contribution deferred until governance and tooling exist.

---

## 7. Integration with Identity Matcher

Current flow (`identityMatcher.ts`):

1. `.majestic.json` → instant
2. Filename → `getMoviesByTitleAndYear` (local DB)
3. Folder → same
4. `multiple_matches` → unresolved

**New flow with Curated API:**

1. **Curated API** (if configured): `GET /movies?title=...&year=...` → if single match, return
2. `.majestic.json` → instant
3. Local DB (unchanged)
4. TMDB (scannerService, for `needTmdb`)

**Implementation:** Introduce `curatedApiClient` module. `matchFileToMovie` accepts optional client. Scanner injects client when `MAJESTIC_CURATED_API_URL` and token set. Client is async; matcher becomes async or uses sync fallback when client unavailable.

**Guardrail:** Curated API must never overwrite identity fields. It provides candidate matches; local DB and user confirmation remain authoritative for that install.

---

## 8. Edition Validation 100

Before scaling the dataset, prove correctness on 50–100 edition-heavy films. Be ruthless.

**Nightmare titles (must resolve deterministically):**

- Blade Runner (1982 vs 2007 Director's Cut vs Final Cut)
- Alien (theatrical vs director's cut)
- LOTR theatrical vs extended
- Star Wars original vs special edition
- Godfather, Criterion multi-region overlaps
- MCU multi-edition (4K vs Blu-ray, steelbook vs standard)

If these resolve deterministically, you're ready to scale. If they don't, don't scale.

---

## 9. Risks & Guardrails

| Risk | Guardrail |
|------|-----------|
| API overwrites identity | Curated API is read-only for installs. Identity columns never written by API responses. |
| Dependency on cloud | Offline graceful. Scan proceeds without API. |
| License token leakage | Token in env only. Redact in structured logs. Do not expose via `/health`. Do not include in debug dumps. One accidental `console.log` and you'll regret it. |
| Rate limit exhaustion | Cache aggressively. Batch requests where possible. |
| Stale curated data | TTL + background refresh. Override always wins locally. |

---

## 10. Operational Dashboards (Post-Launch)

Once paid installs exist, you will need:

| Dashboard | Metric |
|-----------|--------|
| **Match hit rate** | % of scans resolved via Curated API vs fallback to TMDB vs unresolved |
| **UPC hit rate** | Barcode lookups satisfied by curated layer |
| **Dataset drift detection** | Editions returned by API but not locally stored |

Not required at launch. Build when telemetry schema exists and installs are live.

---

## 11. Implementation Order

1. **Design doc** (this document) ✓
2. **Roadmap phase** — Add Phase 1.5 to ROADMAP
3. **curatedApiClient** — Minimal client: `lookupByTitleYear`, `lookupByUpc`. No-op when unconfigured.
4. **Scanner integration** — Call client before local DB when parsing filename/folder. Fallback unchanged.
5. **Cloudflare Workers** — Deploy read-only API. D1 or R2 backend. Auth middleware.
6. **Edition Validation 100** — Seed dataset. Verify matching correctness.
7. **Barcode integration** — Call `GET /editions/upc/:upc` in barcodeService before UPCMDB.

---

## 12. Architectural Integrity

| Principle | Status |
|-----------|--------|
| Local-first | ✓ |
| Identity over file location | ✓ |
| Playback reliability > features | ✓ |
| Cloud optional | ✓ |
| Never modify user files | ✓ |

Curated API does not compromise foundational principles. Keep it boring. Keep it deterministic. Keep it read-only until governance is absolutely sure.

---

## 13. Stress-Test Failures (Do Not Do)

| Failure mode | Guardrail |
|--------------|-----------|
| **Curated API auto-resolves ambiguous matches** | Never let cloud override local ambiguity rules. `multiple_matches` → user confirms. Always. |
| **Dataset corrections retroactively alter identity** | Never silently mutate identity_hash or UPC normalization. Dataset improvements must be additive, not destructive. Version-signal any logic change. |
| **Latency creep** | 500ms is hard. Not advisory. If lookup drifts to 900ms, 1.2s, 2s, scanner UX degrades. Enforce at client. |
| **Curated API becomes "better TMDB"** | Stay narrow. Store identity-critical edition data, canonical film linkage, deterministic match keys. Do not become a general-purpose metadata mirror, popularity engine, or review aggregation system. Let TMDB chase popularity. Majestic chases correctness. |
| **Identity vs engagement data mixing** | Alternate overviews, cut-specific runtime, cast differences—fine if identity-critical. Do not store user taste signals, popularity adjustments, ranking hints, or behavioral metadata. The moment you mix identity with engagement, you blur the contract. Curated layer = edition correctness. Nothing else. |
