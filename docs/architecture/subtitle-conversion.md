# Subtitle Conversion — Design

Converts PGS/VOBSUB/ASS to SRT when the device only supports SRT/WebVTT. Addresses Plex pain point: "subtitles broke playback." See `docs/PLEX-PAIN-POINTS-LESSONS.md`.

---

## Policy

| Value | Behavior |
|-------|----------|
| **disabled** (default) | Files with only PGS/VOBSUB/ASS remain not_playable. |
| **adaptive** | Auto-build SRT artifact when prewarm detects subtitle-only incompatibility. |
| **opt_in** | Build only when user explicitly requests (POST /api/media-file/{id}/create-compatible-subtitles). |

**Env:** `MAJESTIC_SUBTITLE_CONVERSION_POLICY`

---

## Conversion Paths

| Source format | Method | Tool |
|---------------|--------|-----|
| **ASS/SSA** | Text-based, direct conversion | ffmpeg `-map 0:s:0 -c:s srt` |
| **PGS/VOBSUB** | Image-based, requires OCR | External tool via `MAJESTIC_PGS_CONVERTER_PATH` |

**PGS/VOBSUB:** Set `MAJESTIC_PGS_CONVERTER_PATH` to a CLI that accepts `input.mkv output.srt`. Use the bundled `scripts/pgsrip-wrapper.sh` with pgsrip—see `docs/PGS-SUBTITLE-SETUP.md`.

---

## Artifact Storage

- **Kind:** `subtitle_srt`
- **Path:** `{artifacts_dir}/{media_file_id}__{fingerprint_short}__subtitles.srt`
- **Table:** `playback_artifact` (same as video artifacts)
- **Eviction:** Subtitle artifacts are small; included in cache size limit but rarely evicted first.

---

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /stream/media_file/{id}/subtitles` | Serve converted SRT. Requires playback token if configured. |
| `POST /api/media-file/{id}/create-compatible-subtitles` | Trigger build (opt_in). Returns 202 if building. |
| Prewarm | When policy=adaptive and file has only incompatible subs, starts subtitle build. |

---

## Evaluator

When `subtitle_artifact_ready` is true (ready artifact exists for media_file), evaluator treats subtitle incompatibility as resolved. File becomes playable.

---

## Apple TV Client

- `LibraryEdition.subtitle_url` — when artifact exists, e.g. `/stream/media_file/123/subtitles`
- `PlayerView` loads SRT, parses with minimal parser, displays overlay at bottom
- Playback time observed every 250ms; current cue shown

---

## Flow

1. User opens detail for edition with only PGS subtitles.
2. Prewarm (policy=adaptive): starts subtitle build in background.
3. Build: ffmpeg or external tool produces SRT.
4. Artifact marked ready; `subtitle_url` appears in library response.
5. User presses Play. Video streams; client fetches SRT, displays overlay.
