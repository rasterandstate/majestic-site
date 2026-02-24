# Multi-Track Audio Selection — Design

**Purpose:** When a file has multiple audio tracks (e.g. TrueHD 7.1 + AC3 5.1), Majestic picks the best track for the playback device to avoid transcoding when possible.

---

## Behavior

1. **Probe** captures all audio tracks: `{ index, codec, channels, language }` stored in `media_file.audio_tracks`.
2. **Selection** (`pickBestAudioTrack`) chooses the best track for the playback context:
   - **Web (Chrome/Firefox):** AAC only → prefer AAC, else transcode
   - **Web (Safari):** AAC, AC3, EAC3 → prefer compatible copy
   - **Apple TV:** AAC, AC3, EAC3 → prefer compatible copy
   - **Shield:** TrueHD, DTS, AC3, etc. → prefer any compatible
3. **Artifact build** uses `-map 0:a:${index}` for the selected track.
4. **Fingerprint** includes track index when using non-primary track so artifacts are cached correctly.

---

## Example: Blade Runner 4K

| Track | Codec | Channels |
|-------|-------|----------|
| 0 | TrueHD | 7.1 |
| 1 | DTS-HD MA | 7.1 |
| 2 | AC3 | 5.1 |

- **Web (Chrome):** Picks track 2 (AC3) → no, Chrome needs AAC. Picks track 0 → transcode to AAC.
- **Web (Safari):** Picks track 2 (AC3) → copy, no transcode.
- **Apple TV:** Picks track 2 (AC3) → copy, no transcode.
- **Shield:** Picks track 0 (TrueHD) → direct play.

---

## Future: Manual Override

A future enhancement could allow the user to override: "Use TrueHD (will transcode)" for quality preference. Not implemented yet.
