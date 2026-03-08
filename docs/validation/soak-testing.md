# Soak Testing

Long-run and stress validation suite for Majestic server. Documents current coverage, execution methods, and pass criteria.

Soak tests validate stability under sustained and adversarial conditions. They complement unit and integration tests but do not replace real-world usage validation.

## Existing Soak Tools

| Tool | Command / How to Run | What It Validates |
|------|----------------------|-------------------|
| **Streaming soak (standard)** | `SOAK_MEDIA_FILE_ID=<id> pnpm soak` | Range chaos, full drain, abort abuse (2k iters, 100 aborts) |
| **Streaming soak (3-hour 4K)** | `SOAK_MEDIA_FILE_ID=<id> SOAK_ITERATIONS=10000 SOAK_ABORT_COUNT=500 pnpm soak` | Same tool as standard; parameterized run. Heavier load on long 4K file |
| **Phase 4 - Overnight Apple TV** | Manual: start 3hr 4K file on Apple TV, leave overnight | Real device playback; no automated pass/fail |
| **DB concurrency stress** | `pnpm test concurrencyStress` | Edition dedup, variant creates, physical add under parallel load |
| **Crash / restart integrity** | `pnpm test crashIntegrity` | Transaction rollback, abrupt close, reopen; no residue |
| **Build concurrency soak** | `pnpm test buildConcurrencySoak` | Lock serializes; no duplicate build under parallel request |
| **Artifact determinism soak** | `pnpm test artifactDeterminismSoak` | Same input → identical artifact (byte-for-byte); requires ffmpeg |
| **Build abort soak** | `pnpm test buildAbortSoak` | Cancel releases lock; artifact marked failed; no orphan state |

---

## Overview

| Soak Class | Implementation | Status |
|------------|----------------|--------|
| **Streaming** | soak-stream script | Implemented, validated |
| **DB Concurrency** | concurrencyStress.test.ts | Implemented, CI |
| **Crash/Restart** | crashIntegrity.test.ts | Implemented, CI |
| **Build Concurrency** | buildConcurrencySoak.test.ts | Implemented, CI |
| **Artifact Determinism** | artifactDeterminismSoak.test.ts | Implemented, CI (requires ffmpeg) |
| **Build Abort & Recovery** | buildAbortSoak.test.ts | Implemented, CI |

---

## 1. Streaming Soak

**Run:** `SOAK_MEDIA_FILE_ID=<id> pnpm soak` (dev server must be running)

### Phases

- **Phase 1:** Random range fetches - 4MB chunks at random offsets (default 2000 iterations)
- **Phase 2:** Full linear drain - 5 complete streams
- **Phase 3:** Abort abuse - start streams, abort after 0.5–5s (default 100 aborts), verify cleanup after 5s

### Pass Criteria

- RSS and FD growth remain within defined tolerances
- No orphan ffmpeg processes
- No unexpected 500/416 in Phase 1
- No non-abort errors in Phase 3
- Phase 2: no RSS growth trend across runs (within tolerance)

### Environment

| Variable | Default | Description |
|----------|---------|--------------|
| `SOAK_BASE_URL` | `http://localhost:5173` | Server URL |
| `SOAK_MEDIA_FILE_ID` | required | Media file to stream |
| `SOAK_TOKEN` | - | Playback token (fetched if required) |
| `SOAK_SERVER_PID` | - | Server PID for FD/child monitoring |
| `SOAK_PHASE` | `all` | `1` \| `2` \| `3` \| `all` |
| `SOAK_ITERATIONS` | `2000` | Phase 1 iterations |
| `SOAK_ABORT_COUNT` | `100` | Phase 3 abort count |
| `SOAK_VERBOSE_METRICS` | - | `true` for per-interval metrics |

### 3+ Hour Validation

For Launch Hardening, use a media file with duration ≥3 hours (e.g. Lawrence of Arabia):

```bash
SOAK_MEDIA_FILE_ID=<3+ hour file id> \
SOAK_SERVER_PID=$(lsof -i :5173 -t | head -1) \
SOAK_ITERATIONS=10000 \
SOAK_ABORT_COUNT=500 \
pnpm soak
```

### Phase 4 - Overnight Apple TV (Manual)

Manual soak: start a 3hr 4K file on Apple TV, leave overnight. Validates real device playback over sustained duration. No automated pass/fail; pass = playback completes without crash or stall.

### Validation History

| Date | Tool | Configuration | Result |
|------|------|---------------|--------|
| 2025-02-22 | Streaming soak (3-hour 4K) | 3-hour 4K file, 10k iterations, 500 aborts | **PASS** |

---

## 2. DB Concurrency Stress

**Run:** `pnpm test concurrencyStress`

### Scenarios

- 20 runs × 30 parallel `getOrCreateDiscEditionByUpc` → exactly 1 canonical edition
- 20 runs × 10 parallel variant creates → correct variant count, no duplicates
- 20 runs × 10 parallel `updateMovieLocation` physical add → 1 edition, 10 copies, no orphans

### Pass Criteria

- Exactly 1 edition per movie+UPC
- Deterministic variant increments
- No orphan physical_copies or disc_edition rows

---

## 3. Crash / Restart Integrity

**Run:** `pnpm test crashIntegrity`

### Scenarios

- Abort mid-transaction → rollback, close, reopen → no residue
- Commit + abrupt close + reopen → data intact, FK check passes

### Pass Criteria

- No orphan rows
- `integrity_check` = ok
- Identity hashes present

---

## 4. Build Concurrency Soak

**Run:** `pnpm test buildConcurrencySoak`

### Scenarios

- 5 runs × 20 parallel lock attempts → exactly 1 acquires per run
- 20 concurrent attempts → only first acquires; rest see lock held
- Lock released after hold; next attempt can acquire

### Pass Criteria

- Exactly 1 lock acquisition per (media_file_id, kind) under parallel load
- `isBuildInProgress` returns false after release

---

## 5. Artifact Determinism Soak

**Run:** `pnpm test artifactDeterminismSoak`

### Scenarios

- Build same source twice; compare SHA256 of outputs
- Skips if ffmpeg not available

### Pass Criteria

- Same input + same target → identical artifact (byte-for-byte)
- Validates artifact determinism under current ARTIFACT_FORMAT_VERSION

### Requirements

- ffmpeg in PATH (with libx265 for HEVC)
- Test generates minimal 2s HEVC+AAC MKV, then remuxes to fMP4

---

## 6. Build Abort Soak

**Run:** `pnpm test buildAbortSoak`

### Scenarios

- cancelBuild aborts controller; simulated finally releases lock
- Abort during simulated build: artifact marked failed, lock released

### Pass Criteria

- cancelBuild returns true when controller registered
- Lock released after abort
- Artifact status = failed, error contains "cancelled"

---

## 7. Related Unit Tests

- **Stream:** range requests, seeking, mid-stream cancellation
- **Artifact cache:** eviction, startup cleanup, fingerprint mismatch, cache hit

These are unit tests, not soak; they validate behavior under controlled conditions.

---

## 8. Not Yet Implemented

| Soak Class | Description |
|------------|-------------|
| **Build Concurrency (HTTP)** | 10 simultaneous prewarm HTTP requests; edition switching mid-build |
| **Artifact Stability (real discs)** | 20 real discs (DTS-HD, TrueHD, multi-audio); repeated builds; verify identical output |
| **Build Kill & Restart** | Kill server process during artifact creation, restart; verify locks cleaned, cache consistent |

---

## Traceability

- Run all soak tests: `pnpm test:soak`
- Pass criteria defined in test files and soak script constants
