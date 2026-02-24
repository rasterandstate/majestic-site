# Majestic Server - Architectural Surface

> **Purpose:** System architecture for integrators. Describes components, responsibilities, data flow, and integration points.
>
> **Scope:** Server behavior, API surface, streaming contract, identity guarantees.
>
> **Non-responsibilities:** Implementation details, file paths, internal structure. See `docs/internal/` for developer context.

---

## Overview

**majestic-server** is the core media server for Majestic: a local-first, ownership-driven media system. It provides the identity layer, media registry, fingerprinting, scanning, and streaming. Identity integrity and playback reliability are the highest priorities.

**Non-responsibilities:** No cloud requirement for core playback; no silent metadata guessing; transcoding lives in build tools/artifact pipeline, not in the streaming response path; Web UI is secondary - clients are native apps.

---

## 1. Components & Responsibilities

### Identity Layer
- **Edition identity**: Content-based hashing (immutable); edition hash is deterministic and stable across scans.
- **Fingerprinting**: Deterministic, versioned algorithm; identity survives file moves and renames.
- **File matching**: Path-based + explicit TMDB ID; override support for manual resolution.
- **Region normalization**: Physical copy region handling.

### Media Registry
- **File tracking**: Disk-based file registry; associates files with movies and editions.
- **Availability**: Missing file detection.
- **Integrity**: Content integrity flagging when fingerprint changes.
- **Probe state**: Media analysis state management.

### Scanning Service
- **Library roots**: Configurable scan directories.
- **File discovery**: Video file detection in configured paths.
- **Staging system**: Two-phase scan (staging → commit); atomic updates.
- **Probe execution**: Media analysis for codec, resolution, duration.
- **Auto-matching**: Matches discovered files to movies via identity layer.

### Streaming Engine
- **HTTP Range support**: 206 Partial Content for seeking (mandatory).
- **Artifact selection**: Direct play vs. pre-built artifacts.
- **On-the-fly remux**: Container conversion when needed (no re-encode).
- **Device-specific handling**: Apple TV, web clients, etc.
- **Playback token verification**: Optional authentication.
- **Stream tracking**: Active stream monitoring for resource management.

### Artifact Management
- **Artifact types**: Remux, adaptive remux, transcode, subtitles.
- **Cache management**: Size limits, eviction, access tracking.
- **Build state**: building/ready/failed; fingerprint validation invalidates on source change.

### Capability Evaluation
- **Device profiles**: Versioned capability sets (e.g. `appletv_v1`, `generic_tv_v1`).
- **Playback prediction**: direct, remux, adaptive, transcode, not_supported.
- **Incompatibility detection**: Structured incompatibility reporting when client cannot play.

### Library Aggregation
- Groups media files by movie; builds editions array with capability info.
- Badge computation: playable, integrity_flagged, etc.
- Physical copy enrichment; progress tracking integration.

### Metadata Enrichment
- External integrations for movie metadata and artwork.
- Enrichment never blocks or gates playback.

---

## 2. Architectural Surface (APIs & Endpoints)

### Main Library Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/library` | Main library API; query params: `device`, `filter`, `media_type`; returns grouped items (movies with editions array) |

### Streaming (Critical Surface)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stream/media_file/[id]` | Stream media file; query: `device`, `token`; supports HTTP Range |
| GET | `/stream/hls/[mediaFileId]/[artifactKey]/[...asset]` | HLS manifest/segments |
| GET | `/stream/media_file/[id]/adaptive` | Adaptive streaming |
| GET | `/stream/media_file/[id]/subtitles` | Subtitle serving |

### Prewarm

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/media-file/[id]/prewarm-appletv` | Trigger artifact build before playback |
| DELETE | `/api/media-file/[id]/prewarm-appletv` | Cancel prewarm |
| GET | `/api/media-file/[id]/prewarm-appletv/watch` | Watch build progress |

### Playback

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/playback-token` | Get playback token |
| GET | `/api/playback/active` | Active streams |
| GET | `/api/playback-progress` | Playback progress |

### Library Management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/library-roots` | List library roots |
| POST | `/api/library-roots` | Create library root |
| GET | `/api/library-roots/[id]` | Get library root |
| POST | `/api/library-roots/[id]/scan` | Trigger scan |
| GET | `/api/library/unresolved` | Unresolved media files |
| GET | `/api/library/integrity-flagged` | Integrity-flagged items |
| GET | `/api/library/health` | Library health status |

### Media Files

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/media-file/[id]/resolve` | Resolve to movie |
| POST | `/api/media-file/[id]/rematch` | Re-match to movie |
| POST | `/api/media-file/[id]/ignore` | Ignore file |
| POST | `/api/media-file/[id]/analyze` | Trigger analysis |
| GET | `/api/media-file/[id]/integrity-history` | Integrity history |

### Movies

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/movies` | List movies |
| GET | `/api/movies/[id]` | Get movie |
| POST | `/api/movies/[id]/refresh` | Refresh metadata |
| GET | `/api/movies/[id]/copies` | Physical copies |

### Artwork

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/artwork/poster/[movieId]` | Movie poster |
| GET | `/artwork/backdrop/[movieId]` | Movie backdrop |
| GET | `/artwork/edition/[editionId]` | Edition artwork |

### Reports & Health

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reports/health-summary` | Health summary |
| GET | `/api/reports/compatibility-matrix` | Compatibility matrix |
| GET | `/api/admin/health` | Admin health check |

---

## 3. Streaming Contract

### Primary Endpoint

**Path:** `GET /stream/media_file/{id}`

**Query parameters:**
- `device` - Required. Device profile (e.g. `appletv_v1`). Affects playback prediction and compatibility.
- `token` - Optional. Playback token when authentication is enabled.

**Request headers:**
- `Range: bytes=start-end` - Partial content. Supported for seeking.
- `Range: bytes=-N` - Suffix range. Last N bytes.
- `X-Majestic-Client-Contract` - Contract version. Server may return 426 when major version mismatches.

**Response:**
- **200** - Full content (no Range) or direct play
- **206** - Partial content. Includes `Content-Range`, `Accept-Ranges: bytes`
- **202** - Artifact building. Retry-After header. Client may poll prewarm watch.
- **400** - Incompatibility. Structured payload describes why client cannot play.
- **404** - Media file not found
- **416** - Range not satisfiable

**Response headers:**
- `X-Majestic-Contract` - Contract version on all responses

### HLS (When Enabled)

- **Route:** `GET /stream/hls/{mediaFileId}/{artifactKey}/media.m3u8` (and init.mp4, seg_*.m4s)
- **Copy-mode only:** No transcoding; video/audio stream-copied.
- **Token:** Rewritten into segment URLs when present.

---

## 4. Architectural Principles & Invariants

1. **Edition identity never changes**: Once identified, identity is immutable.
2. **Playback independence from enrichment**: Metadata enrichment never blocks or gates playback.
3. **HTTP Range support is mandatory**: All streaming responses support Range requests for seeking.
4. **File moves must not break identity**: Identity is content-based; path changes do not invalidate edition identity.
5. **Direct play first**: Prefer source files or pre-built artifacts; avoid runtime transcoding where possible.
6. **Contract versioning**: API contracts enforced via headers. Major mismatch → 426 Upgrade Required.
7. **Fail closed**: Identity operations fail safely; do not persist uncertain identity.
8. **Structured errors**: Incompatibility details in responses; no silent fallback to wrong file.

---

## 5. Prewarm Philosophy

- Clients may call `GET /api/media-file/{id}/prewarm-appletv` to trigger artifact build before playback.
- Prewarm is optional: playback proceeds without it when direct play or on-the-fly remux is available.
- Prewarm reduces time-to-first-byte for artifact-dependent clients.
- Build is cancellable via `DELETE` on prewarm.
- Prewarm watch endpoint provides build progress.

---

## 6. Data Flow (High Level)

### Streaming Request

1. Client: `GET /stream/media_file/[id]?device=appletv_v1&token=...` with optional Range.
2. Contract version check; startup/background init.
3. Token verification, media file lookup, device profile resolution.
4. Artifact selection: Check ready artifact, evaluate capabilities, choose direct/remux/adaptive/transcode.
5. Delivery: Direct play, pre-built artifact, or on-the-fly remux.
6. Response: 200/206, or 202 (building), 400 (incompatibility), 404.

### Scanning

1. Trigger: Manual or periodic.
2. Discovery: Walk library root, collect video files.
3. Staging: Insert into staging table, compute fingerprints, probe, match to movies.
4. Commit: Compare staging vs live, insert/update, mark missing, cleanup.
5. Post-scan: Capability evaluation, integrity flags.

### Library Aggregation

1. Request: `GET /library?device=appletv_v1&filter=all`.
2. Load media files (excluding missing/unresolved).
3. Group by movie, sort editions.
4. Evaluate capabilities per edition, compute badges.
5. Enrich with physical copies, progress.
6. Return JSON with items array, contract version, health summary.

---

## 7. Dependencies

### Contract Packages
- **majestic-api-contracts**: API types, playback prediction types, incompatibility contract, error model, contract versioning.
- **majestic-identity-contract**: Edition hash algorithm, fingerprint versioning, region normalization.

### Runtime Requirements
- **FFmpeg**: Media probing, remuxing, transcoding.
- **FFprobe**: Media analysis.
- **Fingerprinting binary**: Content-based identity computation.

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `MAJESTIC_DB_PATH` | Database path |
| `MAJESTIC_ARTIFACTS_PATH` | Artifact cache directory |
| `MAJESTIC_PLAYBACK_POLICY` | strict / adaptive |
| `MAJESTIC_APPLETV_HLS` | Enable HLS mode |
| `LIBRARY_SCAN_INTERVAL_HOURS` | Periodic scan interval |

---

## 8. Constraints

- No breaking changes to edition identity or fingerprint algorithm without migration.
- New clients must use API contracts; no ad-hoc response shapes.
- Transcoding logic stays in build tools; streaming path remains thin.
