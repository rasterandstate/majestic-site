# Capability Modeling - Design Blueprint

**Principle:** Store facts. Compute opinions.

---

## Layer 1 - Media Capability Profile (Database)

Store normalized fields only. Do NOT store `direct_play_compatible` or `compatibility_reason` - those are computed.

### Video
- `video_codec` (h264, hevc, vp9, av1)
- `video_profile` (high, main10, etc.)
- `video_level`
- `bit_depth` (8, 10, 12)
- `hdr_format` (sdr, hdr10, dolby_vision_p5, dolby_vision_p7, etc.)
- `resolution_width`, `resolution_height`
- `frame_rate`

### Audio
- `audio_codec` (aac, ac3, eac3, truehd, dts, dts_hd_ma)
- `audio_channels`
- `audio_bit_depth`
- `audio_sample_rate`

### Container
- `container` (mp4, mkv, mov)

### Probe state
- `probe_state` (`ok` | `failed` | `unknown`)
- `probe_error` (short string when failed)
- `probe_version` (optional, for invalidation)
- `probe_last_run_at` (when probe last ran - observability for "why is this unknown?")

---

## Step 1 - Probe Module

**Location:** `src/lib/server/probe/ffprobe.ts`

### API
- `probeMedia(path: string): Promise<MediaProbeResult>`

### Behavior
- Runs ffprobe with JSON output
- Timeout: 15s
- Never throws raw stdout
- Returns normalized fields only (not raw ffprobe dump)

### ffprobe invocation
- `-v error`
- `-print_format json`
- `-show_format`
- `-show_streams`
- Consider `-select_streams v:0` and `-select_streams a:0` to avoid commentary tracks

### Normalization from ffprobe
- Container: `format.format_name` → map to `mp4|mkv|mov|webm|avi`
- Video: `streams[].codec_name`, `profile`, `level`, `width`, `height`, `pix_fmt` (→ bit depth), `r_frame_rate`
- HDR: `color_transfer`, `color_primaries`, `color_space`, `side_data_list` (DV)
- Audio: `codec_name`, `channels`, `sample_rate`

### HDR detection (conservative)
- Dolby Vision metadata → `dolby_vision_p5|p7|unknown_dv`
- `color_transfer = smpte2084` → `hdr10`
- `color_transfer = arib-std-b67` → `hlg`
- Else → `sdr`
- DV profile messy in practice: start with `dolby_vision_unknown` if needed

---

## Step 2 - When to Probe

On scan:
- **New file** → probe
- **Fingerprint changed** (after replacement accepted) → probe
- **No probe data present** → probe
- Skip if `mtime_ms` changed but fingerprint same (content didn't change)

If probe fails:
- Store `probe_state = failed`
- Leave capabilities null
- Compatibility = unknown → block play (trust-first)

---

## Step 3 - Device Profile (Apple TV)

Static object, versioned:

```ts
type DeviceProfile = {
  id: 'appletv_v1'
  containers: Set<string>
  videoCodecs: Set<string>
  hevc: { allowMain10: boolean }
  hdr: { allow: Set<HDRFormat>, dolbyVision: { allowProfiles: Set<string> } }
  audioCodecs: Set<string>
}
```

### Apple TV (modern 4K) rules
- H.264 High 4.2 → yes
- HEVC Main / Main10 → yes
- AV1 → depends on generation
- VP9 → partial
- Dolby Vision P5 (MP4) → yes
- Dolby Vision P7 (MKV dual-layer) → no
- AAC, AC3, EAC3 → yes
- TrueHD → no direct
- DTS → no native
- MP4 → safest
- MKV → usually fine for HEVC; DV P7 fails

---

## Step 4 - Evaluate Function

Pure function:
```ts
evaluate(media: MediaCapabilities, device: DeviceProfile)
  → { playable: boolean, reason: string | null }
```

Rules order:
1. Missing probe data → not playable ("Unknown media capabilities")
2. Container unsupported → not playable
3. Video codec unsupported → not playable
4. HDR format unsupported → not playable
5. Audio codec unsupported → not playable

Return first hard failure as reason. Examples:
- "Dolby Vision Profile 7 not supported on Apple TV direct play"
- "TrueHD requires transcoding"
- "AV1 not supported on this device"

---

## API + UI Contract

### API
Library returns:
- `capabilities` (facts)
- `compatibility: { playable, reason }` computed for `device=appletv_v1`

### UI
- Badge: Playable / Not playable / Unknown
- Reason visible if not playable or unknown
- No "Play" button if not playable (initially)

---

## Product Decision: Unknown Handling

If ffprobe fails:
- **Trust-first (recommended):** Block playback until capabilities known
- **Convenience-first:** Allow play but warn

Majestic posture: block by default. Can add "Attempt playback anyway" (advanced) later if ffprobe breaks on weird streams.

---

## Operational: Probe Concurrency

Do not run ffprobe synchronously in a tight scan loop. Media probing is IO-heavy.

- Throttle: max 2–4 concurrent probes
- Avoid probing 500 files at once (disk IO melt)
