# Edition Grouping — Design

**Principle:** Server owns truth. Client renders it.

Edition grouping is the first feature that makes someone say: "Wait… this actually understands editions."

---

## What It Must Do

1. **Group by `movie_id`** — Multiple media files for the same movie become one row with multiple editions.

2. **Editions listed with:**
   - Edition label (override > computed > canonical)
   - Resolution
   - HDR
   - Audio channels
   - Device compatibility status

3. **Default selection = canonical edition** (deterministic). No silent auto-picking.

4. **Explicit selection required when multiple exist.** Majestic does not guess.

---

## API Contract

**Grouping logic belongs at the API aggregation layer. Not in the Apple TV client.**

The client receives pre-aggregated data:

```json
{
  "items": [
    {
      "movie_id": 42,
      "title": "Blade Runner",
      "year": 1982,
      "poster_url": "...",
      "backdrop_url": "...",
      "overview": "...",
      "editions": [
        {
          "media_file_id": 101,
          "label": "Theatrical",
          "resolution": "3840x2160",
          "hdr_format": "hdr10",
          "audio_channels": 6,
          "stream_url": "/stream/media_file/101",
          "integrity_flagged": false,
          "capabilities": { ... },
          "compatibility": { "playable": true, "reason": null }
        },
        {
          "media_file_id": 102,
          "label": "Director's Cut",
          "resolution": "1920x1080",
          "hdr_format": "sdr",
          "audio_channels": 2,
          "stream_url": "/stream/media_file/102",
          "integrity_flagged": false,
          "capabilities": { ... },
          "compatibility": { "playable": true, "reason": null }
        }
      ],
      "default_edition_index": 0
    }
  ]
}
```

**Single-edition case:** `editions` has one element. No selection UI. Behavior unchanged.

**Multi-edition case:** `editions` has 2+. Detail page shows "Editions" section. User must select explicitly. Default = `default_edition_index` (canonical first).

---

## Edition Label Resolution

Priority: override > computed > canonical (when variants exist) > format.

Reuse `resolveEditionLabelForPoster` logic where applicable.

**Critical:** Edition labels must be **deterministic, cached, and not re-derived on every scan** from heuristics. If filename/folder parsing is used, it must produce a **normalized, stored label** — not a live guess. You're building a library, not a regex experiment.

**Label survival:** Labels must survive file deletion and re-add. If a file is removed and later re-imported with the same fingerprint → same edition → same label. Label storage must be anchored to **media_file identity** (fingerprint or media_file_id), not to path. If labels depend on current folder path and get regenerated on re-import, you introduce drift.

For media files without disc_edition linkage:

- Store derived label (e.g. in media_file or a join table) at scan/match time
- Anchor to fingerprint or media_file_id — not path
- Fallback: "Edition 1", "Edition 2" (deterministic by media_file_id)

---

## Canonical Ordering

When multiple editions exist, canonical first. Deterministic. Same order every time.

Criteria (in order):

1. disc_edition.edition_variant === 0 (canonical)
2. Resolution descending (4K before 1080p)
3. media_file_id ascending (tie-breaker)

**What we avoid:** Bitrate comparisons, "best HDR wins," audio heuristics, device-dependent reordering. If ordering depends on device, the UI feels unstable — the same movie reorders when device changes. Canonical first. Always.

---

## Grid Behavior

**Grid still renders movie-level rows.** One poster per movie. Not one row per media file.

- Poster = movie poster (first edition's poster or movie-level poster_url)
- Badge = **worst status across editions** (see priority below)
- Tap → detail page with edition list

**No client-side deduplication.** Server returns aggregated items. Client renders.

### Badge Priority (Worst Wins)

The grid reflects risk, not optimism. One integrity-flagged edition must not hide behind a "Playable" badge.

Priority (1 = worst, show first):

1. Integrity flagged
2. Missing
3. Analysis failed
4. Not supported on device
5. Not analyzed
6. Playable

You do not want a movie to show "Playable" while one edition is flagged as corrupted.

---

## Detail Page

```
Editions
• Theatrical — 4K HDR10 · Direct Play Ready
• Director's Cut — 1080p SDR · Direct Play Ready
• Steelbook — DV P7 · Not Supported on Apple TV
```

Each selectable. Each with capability summary + compatibility status.

Default selection = first (canonical). User can change. Play uses selected edition's stream_url.

**Explicit selection is non-negotiable.** Even if canonical is default-highlighted, the user must _see_ the list when multiple editions exist. The difference between "default highlighted + visible list" and "silent auto-play of first edition" is the difference between "edition-aware" and "just fancy sorting."

---

## What Not to Do

- **No silent auto-picking** when multiple editions exist
- **No client-side grouping** — server aggregates
- **No grid performance degradation** — aggregation is a server concern
- **No guessing** — explicit selection required
- **No "best available" collapse** — never auto-play or auto-select "best edition on this device." That is how you become Plex again. Majestic does not optimize away choice. It exposes it.

---

## Implementation Notes

**Watch for:** When grouping media_files → movie_id, ensure integrity_flagged and availability states are respected at the edition level before aggregation. Do not accidentally "hide" a flagged edition inside a grouped movie. Worst status must bubble up to the movie row. Enforce in code.

---

## Implementation Order

1. **Schema (if needed):** Edition label storage — ensure derived labels are cached, not recomputed per request
2. **API:** New `/library` response shape with `editions` array, `default_edition_index`
3. **API:** Aggregation logic — group media_files by movie_id, build editions array
4. **API:** Edition label resolution (from stored/cached source), canonical ordering
5. **API:** Badge priority — worst status across editions
6. **Apple TV:** Update model for new response shape
7. **Apple TV:** Grid uses movie-level items (one poster per movie)
8. **Apple TV:** Detail page shows Editions section when count > 1
9. **Apple TV:** Edition selection state, Play uses selected edition

---

## Strategic Position

Edition grouping makes Majestic _visually_ superior, not just intellectually superior.

> "Oh. This is different."

That's when Majestic becomes opinionated software.
