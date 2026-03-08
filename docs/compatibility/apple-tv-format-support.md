# Apple TV Format Support - Gaps and Action Items

**Purpose:** Document which formats are supported on Apple TV (native + transcoding) and what remains unsupported. Identify actionable improvements.

**Reference:** Device profile `appletv_v1`, evaluator `src/lib/server/capability/evaluator.ts`, artifact builder `src/lib/server/artifactBuilder.ts`.

---

## 1. Current Support Matrix

### Video

| Format | Native | Transcode | Notes |
|--------|--------|-----------|-------|
| H.264 | ✓ | - | Full support |
| HEVC (incl. Main10) | ✓ | - | Full support |
| VP9 | - | ✓ → H.264 | `MAJESTIC_VIDEO_TRANSCODE_POLICY=opt_in` |
| AV1 | - | ✓ → H.264 | Same policy |
| Dolby Vision P7 (HEVC) | - | ✓ → HEVC HDR10 | Same policy |
| MPEG-2 | - | ✓ → H.264 | `MAJESTIC_VIDEO_TRANSCODE_POLICY=opt_in` |
| MPEG-4 Part 2 | - | ✓ → H.264 | Same |
| VC-1 | - | ✓ → H.264 | Same |
| ProRes | - | ✓ → H.264 | `MAJESTIC_VIDEO_TRANSCODE_POLICY=opt_in` |

### HDR

| Format | Native | Transcode | Notes |
|--------|--------|-----------|-------|
| SDR | ✓ | - | Full support |
| HDR10 | ✓ | - | Full support |
| HLG | ✓ | - | Full support |
| Dolby Vision P5 | ✓ | - | Full support |
| Dolby Vision P7 | - | ✓ → HDR10 | Via video transcode |
| HDR10+ | ✓ | - | Apple TV 4K 3rd gen (2022+); older models may fall back to HDR10 |

### Audio

| Format | Native | Transcode | Notes |
|--------|--------|-----------|-------|
| AAC | ✓ | - | Full support |
| AC3 | ✓ | - | Full support |
| EAC3 | ✓ | - | Full support |
| TrueHD / TrueHD Atmos | - | ✓ → EAC3/AAC | `MAJESTIC_PLAYBACK_POLICY=adaptive`, MKV/M2TS/TS only |
| DTS / DTS-HD MA | - | ✓ → EAC3/AAC | Same |
| FLAC | - | ✓ → EAC3/AAC | Same (adaptive), MKV/M2TS/TS only |
| Opus | - | ✓ → EAC3/AAC | Same (adaptive), MKV/M2TS/TS only |
| PCM | - | ✓ → EAC3/AAC | Same (adaptive), MKV/M2TS/TS/WebM only |

### Containers

| Container | Native | Artifact / Transcode | Notes |
|-----------|--------|---------------------|-------|
| MP4, MOV, M4V | ✓ | - | Direct play |
| MKV | - | ✓ remux / adaptive | Copy or transcode audio |
| M2TS, TS | - | ✓ remux / adaptive | Same |
| WebM | - | ✓ remux / adaptive / transcode | Remux when H.264+compatible audio; transcode when VP9/AV1 |
| AVI | - | ✓ remux / adaptive / transcode | Same as MKV; DivX/Xvid → transcode |

---

## 2. Gaps Summary

| Category | Missing Formats | Impact |
|----------|-----------------|--------|
| **Video** | - | (ProRes now supported via transcode) |
| **HDR** | - | (HDR10+ now in profile) |
| **Audio** | - | (PCM now supported via adaptive) |
| **Container** | - | (AVI now supported via artifact path) |

---

## 3. Actionable Items

### High impact, moderate effort

| # | Action | Scope | Notes |
|---|--------|-------|-------|
| 1 | **FLAC / Opus audio transcode** | Extend adaptive path | ✓ Done. FLAC and Opus use same adaptive flow as TrueHD/DTS. MKV/M2TS/TS only. |
| 2 | **WebM container remux** | Add WebM to artifact containers | ✓ Done. WebM + H.264 + AAC → remux to MP4. WebM + VP9/AV1 → transcode path. |
| 3 | **HDR10+ support** | Device profile | ✓ Done. Added `hdr10+` to device profile. Apple TV 4K 3rd gen supports it. Probe detects via side_data. |

### Medium impact, higher effort

| # | Action | Scope | Notes |
|---|--------|-------|-------|
| 4 | **MPEG-2 / VC-1 video transcode** | Extend transcode path | ✓ Done. MPEG-2, VC-1, MPEG-4 Part 2 → H.264 when opt_in. |
| 5 | **MPEG-4 Part 2 transcode** | Same as above | ✓ Done (in #4). |
| 6 | **PCM audio handling** | Adaptive path | ✓ Done. PCM uses same adaptive flow as FLAC/Opus. Probe normalizes pcm_s16le, pcm_s24le, etc. |

### Lower priority

| # | Action | Scope | Notes |
|---|--------|-------|-------|
| 7 | **ProRes transcode** | Video transcode path | ✓ Done. ProRes → H.264 when opt_in. |
| 8 | **AVI container** | Remux or transcode | ✓ Done. AVI added to artifact path. DivX/Xvid (MPEG-4) uses transcode. |
| 9 | **WebM + H.264 remux** | Container support | Depends on #2; add WebM to containers and remux when video/audio compatible. |

---

## 4. Implementation Order (Recommended)

1. **FLAC / Opus audio** - Extend `hasAppleTVCompatibleAudio` and adaptive path. Low risk, high value for music/documentary content.
2. **WebM container** - Add to profile and remux path. Enables WebM + H.264 direct remux.
3. **MPEG-2 / VC-1 video** - Add to transcode path. Covers DVD/Blu-ray legacy.
4. **HDR10+** - Verify Apple TV support; add to profile or transcode if needed.
5. **PCM** - Document behavior and optionally add transcode.

---

## 5. Non-Goals (Explicitly Deferred)

- Real-time transcoding (all transcoding is pre-built artifacts)
- ProRes as first-class target (encode to ProRes)
- Dolby Atmos metadata preservation (we output EAC3 5.1, not Atmos)
- Subtitle extraction (PGS → SRT) in artifact path

---

## 6. Hardware Video Encoding

When transcoding (VP9/AV1/DV P7/MPEG-2/VC-1/ProRes → H.264 or HEVC HDR10), the server prefers hardware encoders when available:

| Platform | H.264 | HEVC (DV P7) |
|----------|-------|--------------|
| macOS | VideoToolbox (`h264_videotoolbox`) | VideoToolbox (`hevc_videotoolbox`) |
| NVIDIA | NVENC (`h264_nvenc`) | NVENC (`hevc_nvenc`) |
| Linux (Intel/AMD) | VAAPI (`h264_vaapi`) | VAAPI (`hevc_vaapi`) |
| Fallback | libx264 | libx265 |

- **`MAJESTIC_USE_HARDWARE_VIDEO`** (default: `true`) - Set to `0` or `false` to force software encoding. Use if hardware fails (e.g. macOS sandbox error `-12908`).
- **`MAJESTIC_VAAPI_DEVICE`** (Linux) - DRI render node for VAAPI. Default: `/dev/dri/renderD128`. Override for multi-GPU systems.

---

## 7. References

- `docs/REMUX-ON-THE-FLY-DESIGN.md` - Artifact flow, audio policy
- `docs/PLAYBACK.md` - Philosophy, no silent transcode
- `src/lib/server/capability/deviceProfile.ts` - Apple TV profile
- `src/lib/server/capability/evaluator.ts` - Compatibility logic
