# Concurrency Validation

Concurrency stress tests validate that database operations and build locks behave correctly under parallel load.

## DB Concurrency Stress

### Purpose

Rapid-fire parallel calls to hot paths. Asserts:
- Exactly 1 edition for canonical identity (`getOrCreateDiscEditionByUpc`)
- Variant increments deterministic (`createDiscEditionWithNextVariant`)
- No duplicate editions, no orphan rows (`updateMovieLocation` physical add)

### Scenarios

| Scenario | Configuration | Assertion |
|----------|---------------|-----------|
| Edition dedup | 20 runs × 30 parallel `getOrCreateDiscEditionByUpc` | Exactly 1 canonical edition per movie+UPC |
| Variant creates | 20 runs × 10 parallel variant creates | Correct variant count, no duplicates |
| Physical add | 20 runs × 10 parallel `updateMovieLocation` physical add | 1 edition, 10 copies, no orphans |

### Pass Criteria

- Exactly 1 edition per movie+UPC
- Deterministic variant increments
- No orphan physical_copies or disc_edition rows

---

## Build Concurrency Soak

### Purpose

Asserts no duplicate build under concurrent request. Lock serializes correctly.

### Scenarios

| Scenario | Configuration | Assertion |
|----------|---------------|-----------|
| Lock serialization | 5 runs × 20 parallel lock attempts | Exactly 1 acquires per run |
| Concurrent attempts | 20 concurrent attempts | Only first acquires; rest see lock held |
| Release semantics | After acquire, hold, release | Next attempt can acquire |

### Pass Criteria

- Exactly 1 lock acquisition per (media_file_id, kind) under parallel load
- `isBuildInProgress` returns false after release

---

## Invariants

| Invariant | Meaning |
|-----------|---------|
| **Edition uniqueness** | One canonical edition per movie+UPC. Parallel creates must deduplicate. |
| **Variant determinism** | Variant creation order is deterministic. No race-induced duplicates. |
| **Build lock exclusivity** | Only one build per (media_file_id, kind) at a time. |
| **No orphans** | No physical_copies or disc_edition rows without valid parent references. |
