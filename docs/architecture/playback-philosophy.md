# Playback Philosophy — Foundational Constraints

**Purpose:** These rules are frozen in writing. They define Majestic's playback identity. If they drift, Majestic becomes Plex-with-a-different-logo.

**Audience:** Architects, implementers, future maintainers. Not marketing copy.

**Relationship:** Complements the identity layer (ROADMAP.md). Identity answers "what am I playing?" Playback answers "how does it play?"

---

## 1. Playback Model (Hard Constraint)

Majestic prioritizes **deterministic playback** over opportunistic transcoding.

| Rule | Meaning |
|------|---------|
| **Deterministic over opportunistic** | Playback outcome is predictable. No "maybe it will work" paths. |
| **No real-time CPU transcoding for core functionality** | Majestic does not rely on live transcoding to function. Direct play, remux, or pre-built artifacts. Never "transcode on demand or fail." |
| **Prediction at scan time, not discovery at play time** | Capability is known before the user presses Play. Compatibility is computed during scan, not discovered when the stream fails. |
| **No silent codec fallback** | Users are never surprised by degraded quality. If something is adapted, it is declared. |

**Direction lock:** This is the boundary. Features that violate these rules are out of scope.

---

## 2. Device Capability Modeling

### Device Profiles

Each client device has a **declared capability profile**. Capabilities are explicit, versioned, and immutable.

**Schema (conceptual):**

```json
{
  "device": "Apple TV 4K",
  "profile_id": "appletv_v1",
  "supports_video": ["h264", "hevc_main10"],
  "supports_hdr": ["hdr10", "dolby_vision_p5"],
  "supports_audio": ["aac", "ac3", "eac3"],
  "supports_subtitles": ["srt", "webvtt"],
  "supports_container": ["mp4", "mov", "m4v"]
}
```

**Rules:**
- Profiles are versioned (`appletv_v1`, `mac_v1`). New capabilities = new profile version.
- Capabilities are stored as facts. Compatibility is **computed** at request time, never persisted as client-side truth.
- Unknown device → 400. No implicit fallback to a generic profile.

**Reference:** Implementation details in `docs/CAPABILITY-MODELING-DESIGN.md`.

---

### Playback Prediction States

Every media file + device combination resolves to exactly one of these states. **No "maybe" state.**

| State | Definition |
|-------|------------|
| **direct** | File can be streamed as-is. Container, video, and audio are natively supported. No server-side transformation. |
| **adaptive** | File requires transformation (remux and/or audio conversion) but will play. User may see "Optimized for Apple TV" or equivalent. Transformation is explicit and declared. |
| **not_playable** | File cannot be played on this device. Incompatible codec, container, or format. Server returns 400 with clear reason. |

**Prohibited:** A fourth state such as "maybe," "unknown_playable," or "try_and_see." Such states hide CPU abuse and surprise users. If probe fails → treat as `not_playable` until capabilities are known (trust-first).

---

## 3. Optimization Policy

Document what Majestic is **allowed** to modify. Everything else is forbidden.

### Allowed

| Operation | Condition |
|-----------|-----------|
| Remux container | MKV/M2TS/TS → fragmented MP4 for Apple TV. Video and audio copied. No re-encode. |
| Convert TrueHD → E-AC3 | Only when user has opted into adaptive policy. Explicit. |
| Convert DTS → E-AC3 | Same. Adaptive policy, explicit. |
| Extract PGS → SRT | Future. Text extraction, not re-encode. |
| Strip unused tracks | When producing artifact. Reduces size. No quality impact on played stream. |

### Not Allowed

| Operation | Reason |
|-----------|--------|
| Silent bitrate downscaling | Degrades quality without user knowledge. Violates trust. |
| Automatic lossy video transcode without user action | Video transcode is never automatic. User must explicitly opt in. |
| Background format mutation without explicit user permission | No "we optimized your library" without consent. |

**Trust principle:** Collectors own their files. Majestic serves them. Mutation without declaration is betrayal.

**Reference:** Remux and adaptive audio flow in `docs/REMUX-ON-THE-FLY-DESIGN.md`.

---

## 4. Low-End Hardware Guarantee

**Majestic must function reliably on hardware incapable of real-time 4K transcoding.**

| Implication | Meaning |
|-------------|---------|
| No transcoding dependency | Core playback cannot assume GPU or powerful CPU. Direct play and remux are the primary paths. |
| No feature creep for GPU | Features that require real-time transcode are out of scope for core functionality. |
| Architectural discipline | Design for NAS, Raspberry Pi, old Mac Mini. Not "works on my M2." |

This forces the right architecture. It prevents "we'll add transcoding later" from becoming "transcoding is required."

---

## 5. UX Promise

**Playback will either succeed immediately, indicate preparation in progress, or clearly state incompatibility. Playback will never fail silently.**

| Outcome | User Experience |
|---------|-----------------|
| **Succeed immediately** | Stream starts. No spinner, no mystery. |
| **Preparation in progress** | 202 + Retry-After. "Preparing…" or equivalent. User knows something is building. |
| **Incompatibility** | Clear message. "Not playable on this device." Reason visible. No Play button, or disabled with explanation. |

**Never:** Black screen. Spinner that never resolves. "Playback failed" with no reason. Silent fallback to lower quality.

**Reference:** Badge and overlay design in `docs/PLAYBACK-BADGES-DESIGN.md`.

---

## 6. Summary — The Lock

| Area | Lock |
|------|------|
| **Philosophy** | Deterministic, scan-time prediction, no silent fallback. |
| **Devices** | Declared profiles. Computed compatibility. No implicit defaults. |
| **States** | direct, adaptive, not_playable. No "maybe." |
| **Optimization** | Remux, explicit audio conversion. No silent video/bitrate degradation. |
| **Hardware** | Works without real-time 4K transcode capability. |
| **UX** | Succeed, prepare, or state incompatibility. Never fail silently. |

---

## Why This Exists

Right now it feels like implementation detail.

In two years it becomes:
- The reason Majestic feels premium.
- The reason playback never "mysteriously degrades."
- The reason collectors trust it.

If this is not written down, it will erode.

And erosion is how serious systems die.

Majestic is built to outlive Plex installs and NAS upgrades. That requires written rules. Not vibes.
