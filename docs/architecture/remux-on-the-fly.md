# Remux On-The-Fly - Design (v1)

**Context:** AVPlayer on tvOS does not open MKV, M2TS, or TS. Container is the boundary, not codecs.

**Goal:** Normalize container at stream time. No video transcode. No audio downgrade. Identity unchanged. Derived stream, not derived file.

---

## 1. Supported Containers (Apple TV Artifact Path)

| Container | Apple TV | Shield |
|-----------|----------|--------|
| MKV | Artifact (remux to MP4) | Direct play |
| M2TS | Artifact (remux to MP4) | Direct play |
| TS | Artifact (remux to MP4) | Direct play |
| WebM | Artifact (remux to MP4) | Direct play |
| AVI | Artifact (remux to MP4) | Direct play |
| MP4, MOV, M4V | Direct play | Direct play |

- **Container normalization.** Copy-compatible video/audio when possible. Adaptive or transcode when incompatible.
- **Shield remains direct-play native** for all containers (MKV, M2TS, TS, etc.).

---

## 2. v1 Decision: Cached Artifact

We chose **cached fragmented MP4 artifact** for full range support.

- **No stdout-only sequential streaming** in v1. AVPlayer expects range support for seeking.
- Artifact is written to a configurable cache directory, then served with full HTTP range support.
- Artifact is internal, evictable cache. No user-visible duplicates. Identity unchanged.

---

## 3. Principles

| Principle | Meaning |
|-----------|---------|
| Identity unchanged | `media_file` still points at source. No path mutation. |
| No duplicate assets | Artifact is internal cache only. Not visible in library. |
| Range support | Artifact file supports range requests (206, suffix, 416). |
| Shield future-proof | MKV stays in capability model for Shield. Remux is Apple TV–specific. |
| Cache evictable | Artifacts can be deleted by operator. Rebuild on next request. |

---

## 4. Flow

```
Client requests: GET /stream/media_file/{id}
Server:
  1. Resolve media_file → path, container, codecs
  2. If container in {mkv, m2ts, ts} AND client is Apple TV:
       a. Check audio compatibility (AAC, AC3, EAC3).
       b. If no compatible audio AND policy=strict → 400.
       c. Else determine artifact kind: compatible → remux_fmp4_appletv (copy);
          no compatible + adaptive → remux_fmp4_appletv_adaptive (audio transcode).
       d. If ready artifact exists (fingerprint match): stream artifact with range.
       e. If artifact building: 202 with Retry-After.
       f. Else: start build, wait, stream when ready.
  3. Else:
       → Direct stream (current behavior)
```

**Client detection:** `X-Majestic-Device: appletv`, `?device=appletv`, or User-Agent heuristic.

---

## 5. Audio Compatibility

| Codec | Apple TV compatible? |
|-------|----------------------|
| AAC | Yes (copy) |
| AC3 | Yes (copy) |
| EAC3 | Yes (copy) |
| TrueHD | No. MP4 cannot contain TrueHD. Transcode to EAC3/AAC when adaptive. |
| DTS / DTS-HD | No. Transcode to EAC3/AAC when adaptive. |
| FLAC | No. Transcode to EAC3/AAC when adaptive. |
| Opus | No. Transcode to EAC3/AAC when adaptive. |
| PCM | No. Transcode to EAC3/AAC when adaptive. |

**v1 behavior:** TrueHD/DTS/FLAC/Opus/PCM-only → 400 when strict. When adaptive policy enabled, transcode to EAC3 5.1 or AAC 5.1.

---

## 5.1. Global Playback Policy

A global policy controls whether Apple TV can play files with incompatible audio (TrueHD/DTS-only) by transcoding audio to EAC3.

| Policy | Value | Behavior |
|--------|-------|----------|
| **strict** (default) | `MAJESTIC_PLAYBACK_POLICY=strict` or unset | No audio conversion. TrueHD-only or DTS-only → 400. |
| **adaptive** | `MAJESTIC_PLAYBACK_POLICY=adaptive` | If no compatible audio (AAC/AC3/EAC3), transcode best primary audio to EAC3 5.1 or AAC 5.1. Supports TrueHD, DTS, FLAC, Opus, PCM. |

- **Identity untouched.** Policy does not change fingerprint logic or media_file identity.
- **Conversion explicitly surfaced.** Response headers `X-Majestic-Playback-Mode` and `X-Majestic-Audio-Adapted` allow the client to show a badge such as "Optimized for Apple TV".
- **Shield and non-Apple TV clients unaffected.** Policy applies only to the Apple TV artifact path.
- **Default remains strict.** Enabling adaptive is opt-in.
- **Adaptive builds are system-bound.** They survive client disconnect; the request triggers the build but does not own it. Strict remux builds stay request-bound (quick, cancel if client leaves).
- **Prewarm (Phase 1):** When detail screen opens and `playback_prediction == adaptive`, client calls `GET /api/media-file/{id}/prewarm-appletv`. Server kicks off build in background; returns 202. By the time user presses Play, artifact may already be ready. Triggers from: Apple TV detail screen, Svelte movie details page (Streaming collection).

---

## 6. ffmpeg Remux (No Transcode)

```bash
ffmpeg -i input.mkv   # or input.m2ts, input.ts
  -map 0:v:0 -map 0:a:0 \
  -c:v copy -tag:v hvc1 -c:a copy \
  -movflags +frag_keyframe+delay_moov+default_base_moof \
  -f mp4 /path/to/artifact.mp4
```

- **Input:** MKV, M2TS, or TS.
- Output: **file** (not stdout) so it becomes range-seekable.
- `-c:v copy` / `-c:a copy` - no transcoding.
- `-tag:v hvc1` for HEVC Apple compatibility.
- `delay_moov` (not `empty_moov`) for EAC3 compatibility.
- Temp file first, then atomic rename on success.

---

## 7. Artifact Storage

- **Config:** `MAJESTIC_ARTIFACTS_PATH` (default: `./data/artifacts`).
- **Naming:** `<media_file_id>__<fingerprint_short>__remux_fmp4.mp4`
- **Invalidation:** `source_fingerprint` in DB matches media file fingerprint. Mismatch → treat as stale.

---

## 8. What Stays Pure

- `media_file.path` = source path. Never overwritten.
- `getMediaFileById` unchanged.
- Library API unchanged.
- Capability model: MKV marked not-direct-play for Apple TV; remux is transparent to client.

---

## 9. What Changes

- **New table:** `playback_artifact` (id, media_file_id, kind, path, status, source_fingerprint, size_bytes, created_at, updated_at, error).
- **Stream endpoint:** conditional artifact path for MKV/M2TS/TS + Apple TV.
- **Response:** `video/mp4` instead of `video/x-matroska` or `video/mp2t` when artifact streamed.
- **Response:** 202 when artifact building; client retries until ready.

---

## 10. Edge Cases

| Case | Strict | Adaptive |
|------|--------|----------|
| MKV/M2TS/TS + TrueHD only | 400. Not playable. | Transcode audio to EAC3 5.1. Build adaptive artifact. Stream. |
| MKV/M2TS/TS + DTS only | 400. Not playable. | Transcode audio to EAC3 5.1. Build adaptive artifact. Stream. |
| MKV/M2TS/TS + EAC3 | Copy both. Build artifact. Stream. | Same (copy). No unnecessary transcode. |
| MKV/M2TS/TS + AAC | Copy both. Build artifact. Stream. | Same (copy). |
| Client disconnect during build | Abort ffmpeg. Mark failed. Release lock. | Same. |
| ffmpeg missing | 503 or 500 with "Artifact build failed" | Same. |
| Adaptive build fails | N/A | 503 `{ "error": "artifact_build_failed", "message": "Adaptive audio conversion failed." }` |

---

## 11. Video Transcoding (Opt-In)

When `MAJESTIC_VIDEO_TRANSCODE_POLICY=opt_in`, files with incompatible video (VP9, AV1, Dolby Vision P7) can be transcoded for Apple TV.

| Policy | Value | Behavior |
|--------|-------|----------|
| **disabled** (default) | `MAJESTIC_VIDEO_TRANSCODE_POLICY=disabled` or unset | VP9/AV1/DV P7 → 400. Not playable. |
| **opt_in** | `MAJESTIC_VIDEO_TRANSCODE_POLICY=opt_in` | Build transcoded artifact: VP9/AV1 → H.264 High; DV P7 (HEVC) → HEVC HDR10. |

- **Output:** VP9/AV1 → H.264 High (yuv420p, CRF 18). DV P7 → HEVC HDR10 (yuv420p10le, CRF 20). Audio: copy if compatible, else EAC3/AAC per adaptive policy.
- **Artifact kind:** `transcode_fmp4_appletv`. Cached, evictable.
- **Prewarm:** Detail screen prewarm supports transcode when `playback_prediction == transcode`.
- **Headers:** `X-Majestic-Playback-Mode: transcode`, `X-Majestic-Video-Transcoded: true`.

---

## 12. Non-Goals

- No real-time transcoding. (All transcoding produces cached artifacts.)
- No permanent derived files in library.
- No demux engine in Swift.

---

## 13. Operator Note

**ffmpeg is required for Apple TV MKV/M2TS/TS playback.** When an Apple TV client requests an MKV, M2TS, or TS stream, the server must remux to fragmented MP4. Ensure `ffmpeg` is installed and on PATH.

---

## 14. Format Gaps and Action Items

See `docs/APPLE-TV-FORMAT-GAPS.md` for a full matrix of supported vs. unsupported formats and prioritized action items (FLAC/Opus, WebM, MPEG-2/VC-1, etc.).

---

## 15. Future Watchpoints

| Watchpoint | Notes |
|------------|-------|
| **MPEG-TS timestamp weirdness** | Some `.ts` files have non-zero start PTS, discontinuities, or PCR jitter. If AV desync or weird playback timestamps appear, consider `-fflags +genpts -avoid_negative_ts make_zero`. |
| **Subtitles** | Artifact path does not copy subs. TS/M2TS often contain PGS; MP4 cannot carry PGS. Subs are silently dropped. Future: extract text subs, or surface "Subtitles not supported in Apple TV artifact." |
