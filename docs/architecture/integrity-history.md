# Integrity History — Design

**Principle:** A system that remembers when reality changed.

This is not a log dump. It is a library.

---

## Philosophy

Majestic models identity and integrity explicitly. When content at a path changes (same-path mutation), we flag it. When the user accepts the replacement, we update the fingerprint and clear the flag.

Until now, we had no memory of that transition.

With integrity history:

- We record **what** changed (old → new fingerprint)
- We record **when** it was detected and **when** it was accepted
- We optionally record **capability at time of change** (probe snapshot)

Physical collectors care about:

- "Did I replace that rip?"
- "When did this change?"
- "Was this file modified accidentally?"

Plex can't answer that. Majestic can.

---

## Table: `media_file_integrity_history`

| Column                 | Type    | Nullable | Description                                       |
| ---------------------- | ------- | -------- | ------------------------------------------------- |
| `id`                   | INTEGER | NO       | Primary key                                       |
| `media_file_id`        | INTEGER | NO       | FK → media_file.id                                |
| `old_fingerprint_size` | INTEGER | NO       | Size at detection                                 |
| `old_head_hash`        | TEXT    | NO       | Head hash before change                           |
| `old_tail_hash`        | TEXT    | NO       | Tail hash before change                           |
| `new_fingerprint_size` | INTEGER | NO       | Size of new content                               |
| `new_head_hash`        | TEXT    | NO       | Head hash of new content                          |
| `new_tail_hash`        | TEXT    | NO       | Tail hash of new content                          |
| `detected_at`          | TEXT    | NO       | ISO8601 when mutation detected                    |
| `accepted_at`          | TEXT    | YES      | ISO8601 when user accepted (null until accepted)  |
| `delta_type`           | TEXT    | NO       | `replacement` \| `corruption` \| `unknown`        |
| `notes`                | TEXT    | YES      | Future use (e.g. "Upgraded to remux")             |
| `probe_snapshot`       | TEXT    | YES      | JSON of capability at accept (optional, v1: omit) |

### Indexes

- `media_file_id` — for "history for this file" queries
- `detected_at` — for chronological listing

### Constraints

- `delta_type` IN ('replacement', 'corruption', 'unknown') — default `replacement`
- FK `media_file_id` REFERENCES `media_file(id)` ON DELETE CASCADE (history goes with the file)
- **One open row per media_file:** partial unique index enforces the lifecycle invariant at DB level:

  ```sql
  CREATE UNIQUE INDEX idx_integrity_open_row
  ON media_file_integrity_history(media_file_id)
  WHERE accepted_at IS NULL;
  ```

  The DB defends the library. Programmer error cannot create two open rows.

---

## When To Insert

**Only when fingerprint actually changed.**

Insert a row when:

1. Same-path mutation is detected (scanner)
2. `integrityChanged === true` (fingerprint differs: size, head_hash, or tail_hash)
3. Immediately before or in the same transaction as `flagMediaFileIntegrity(id)`

**Do NOT insert for:**

- mtime-only change (file touched, content identical)
- metadata-only change (e.g. probe re-run)
- probe-only change (no fingerprint delta)

History must be meaningful. Noise defeats the purpose.

---

## Insert Flow (Scanner)

Current flow in `scannerService.ts`:

```
needIntegrityCheck → computeFingerprint → integrityChanged = (fingerprint differs)
→ if integrityChanged: flagMediaFileIntegrity(id)
```

New flow:

```
needIntegrityCheck → computeFingerprint → integrityChanged = (fingerprint differs)
→ if integrityChanged:
    If no open history row for this media_file:
        1. insertIntegrityHistory(media_file_id, old, new, delta_type='replacement')
        2. flagMediaFileIntegrity(id)
    Else (already flagged, open row exists):
        Update open row's new_* fields; do not insert
```

**Transaction boundary:** Both actions must run inside the **same transaction** as the scanner's DB transaction. Otherwise insert could succeed and flag fail (or vice versa) — inconsistent state. Atomic.

**Data available at that point:**

- `existing` (from DB): old fingerprint (size, head_hash, tail_hash)
- `fingerprint` (from computeFingerprint): new fingerprint

**probe_snapshot:** Omit on insert. The old content is gone; we cannot capture "old capability." If we add it later, the only clean place is on accept (after reprobe). Optional for v1.

---

## Accept Flow

Current flow in `accept-replacement` endpoint:

1. Compute fingerprint from current file
2. `acceptMediaFileReplacement(id, fingerprint)` — updates media_file, clears integrity_flagged
3. Probe file, `updateMediaFileProbe(id, result)`

New flow:

1. Compute fingerprint from current file
2. **Update the most recent open history row:** set `accepted_at = now`
3. `acceptMediaFileReplacement(id, fingerprint)`
4. Probe file, `updateMediaFileProbe(id, result)`

**Which row to update?** The single open row for this `media_file_id` where `accepted_at IS NULL`. The unique index guarantees exactly one.

---

## Multiple Mutations Before Accept

Edge case: file changes, we detect, insert row A, flag. Before user accepts, the file changes again. Next scan detects again.

**Behavior (Option A — recommended):**

If `integrity_flagged` is already true for this media_file:

- **Do not insert another row.** (Would violate one-open-row invariant.)
- **Update the existing open row:** set `new_fingerprint_size`, `new_head_hash`, `new_tail_hash` to current on-disk fingerprint. Keep `old_*` intact.
- Optionally refresh `detected_at` (or leave as first detection — both defensible).

We track the delta from **last accepted fingerprint** to **current on-disk fingerprint**. Not every intermediate change. Correct for a library tied to identity, not filesystem noise.

This constraint must be explicit in the implementation: before insert, check for existing open row; if present, update instead of insert.

---

## delta_type

| Value         | Meaning                                                                              |
| ------------- | ------------------------------------------------------------------------------------ |
| `replacement` | User intentionally replaced the file (e.g. upgraded rip). Default.                   |
| `corruption`  | Suspected corruption (future: partial read error, size mismatch mid-stream, bitrot). |
| `unknown`     | We don't know why it changed.                                                        |

For now, always use `replacement`. Schema must not assume `replacement` forever — leave delta_type flexible for future detection modes.

---

## Command Center View (Web)

Per media file, show:

```
Integrity History
-----------------
2026-02-19 08:41
Detected change.
Old: 4.2 GB · sha256(16MB head/tail) abc…def / xyz…789
New: 4.2 GB · sha256(16MB head/tail) 123…456 / 789…abc
Accepted: Yes (2026-02-19 08:45)
```

Optional (when probe_snapshot present):

```
Capability at acceptance: HEVC HDR10, AAC 5.1
```

---

## API

### `GET /api/media-file/[id]/integrity-history`

Returns array of history rows for this media file. **Order: `detected_at DESC`** (newest first). Encode explicitly in the API layer — command center users expect recency-first.

```json
[
  {
    "id": 1,
    "media_file_id": 42,
    "old_fingerprint_size": 4500000000,
    "old_head_hash": "abc...",
    "old_tail_hash": "xyz...",
    "new_fingerprint_size": 4500000000,
    "new_head_hash": "123...",
    "new_tail_hash": "789...",
    "detected_at": "2026-02-19T08:41:00.000Z",
    "accepted_at": "2026-02-19T08:45:00.000Z",
    "delta_type": "replacement",
    "notes": null,
    "probe_snapshot": null
  }
]
```

---

## What We Are Not Doing

- **Diff visualizations** — overkill
- **Full file hashing** — fingerprint is sufficient
- **Version branching** — this is history, not version control
- **Rollback** — would require storing previous file, restoring content, version graphing. Not in scope. History is observational, not operational.

Majestic is not Git.

---

## Implementation Order

1. **Migration** — create `media_file_integrity_history` table + partial unique index
2. **Insert/update on detect** — scanner: when `integrityChanged`, inside same transaction:
   - If no open row: insert history, then flag
   - If open row exists (already flagged): update `new_*` on that row; do not insert
   - Extend `fileDataMap` to store `fingerprint` (new) when integrity check runs
3. **Update on accept** — accept-replacement: set `accepted_at` on open row
4. **API** — `GET /api/media-file/[id]/integrity-history`
5. **UI** — Command center view (Settings or Library detail)

---

## Summary

| Event                                | Action                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Fingerprint differs, not yet flagged | Insert history row, flag integrity (same transaction)      |
| Fingerprint differs, already flagged | Update existing open row's `new_*` fields; do not insert   |
| User accepts replacement             | Set accepted_at on open row, update media_file, clear flag |
| mtime/metadata/probe only            | No history row                                             |

**Invariant:** At most one row per media_file with `accepted_at IS NULL`. Enforced by partial unique index.

Two layers. Same truth engine. The appliance stays calm. The command center gains memory.
