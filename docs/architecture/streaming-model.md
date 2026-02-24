# Streaming Model

Majestic prioritizes deterministic playback over opportunistic transcoding. Playback outcome is predictable. No "maybe it will work" paths.

## Playback Philosophy

| Rule | Meaning |
|------|---------|
| **Deterministic over opportunistic** | Playback outcome is predictable. |
| **No real-time CPU transcoding for core functionality** | Direct play, remux, or pre-built artifacts. Never "transcode on demand or fail." |
| **Prediction at scan time, not discovery at play time** | Capability is known before the user presses Play. Compatibility is computed during scan. |
| **No silent codec fallback** | Users are never surprised by degraded quality. If something is adapted, it is declared. |

## Device Capability Modeling

Each client device has a declared capability profile. Capabilities are explicit, versioned, and immutable.

- Profiles are versioned (e.g. `appletv_v1`, `mac_v1`). New capabilities = new profile version.
- Capabilities are stored as facts. Compatibility is computed at request time, never persisted as client-side truth.
- Unknown device → 400. No implicit fallback to a generic profile.

## Optimization Policy

### Allowed

| Operation | Condition |
|-----------|-----------|
| Remux container | MKV/M2TS/TS → fragmented MP4. Video and audio copied. No re-encode. |
| Convert TrueHD → E-AC3 | Only when user has opted into adaptive policy. Explicit. |
| Convert DTS → E-AC3 | Same. Adaptive policy, explicit. |
| Extract PGS → SRT | Text extraction, not re-encode. |
| Strip unused tracks | When producing artifact. Reduces size. No quality impact. |

### Not Allowed

| Operation | Reason |
|----------|--------|
| Silent bitrate downscaling | Degrades quality without user knowledge. |
| Automatic lossy video transcode without user action | Video transcode is never automatic. User must explicitly opt in. |
| Background format mutation without explicit permission | No "we optimized your library" without consent. |

## Low-End Hardware Guarantee

Majestic must function reliably on hardware incapable of real-time 4K transcoding.

- No transcoding dependency for core playback.
- Direct play and remux are the primary paths.
- Design for NAS, Raspberry Pi, older hardware.

## UX Promise

| Outcome | User Experience |
|---------|-----------------|
| **Succeed immediately** | Stream starts. No spinner, no mystery. |
| **Preparation in progress** | 202 + Retry-After. User knows something is building. |
| **Incompatibility** | Clear message. Reason visible. No Play button, or disabled with explanation. |

Playback will never fail silently. No black screen. No spinner that never resolves. No silent fallback to lower quality.
