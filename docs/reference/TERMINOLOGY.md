# Majestic Terminology

> **Purpose:** Canonical definitions for Majestic documentation. Use these terms consistently. Do not introduce ad-hoc synonyms.

---

## Core Domain

| Term | Definition |
|------|------------|
| **Movie** | A work (e.g. a film). May have multiple editions. |
| **Edition** | A specific release of a movie (theatrical, director's cut, steelbook, etc.). |
| **Physical Copy** | A disc or physical item linked to an edition. |
| **Media File** | A digital file on disk, linked to a movie and optionally an edition. |
| **Artifact** | Pre-built playback file (remux, transcode) for incompatible clients. |
| **Build Backend** | Component that produces artifacts (majestic-build-tools). |

---

## Playback

| Term | Definition |
|------|------------|
| **Playback Prediction** | Computed state: direct, remux, adaptive, transcode, or not_playable. Determined at scan time. |
| **Incompatibility** | Structured payload when client cannot play (type, detail, hint). |
| **Direct Play** | Client plays source file natively. No server transformation. |
| **Remux** | Container conversion only. Video and audio stream-copied. No re-encode. |
| **Adaptive** | Audio conversion (e.g. TrueHD → EAC3). Video unchanged. |
| **Transcode** | Full re-encode. Requires explicit user opt-in. |

---

## Identity

| Term | Definition |
|------|------------|
| **Identity Hash** | Deterministic hash identifying an edition. Immutable. |
| **Fingerprint** | Content-based identity for a media file. Survives path changes. |
| **Fingerprint Version** | Version of fingerprint algorithm. Stored per media file for migration. |

---

## Contracts & Versioning

| Term | Definition |
|------|------------|
| **Artifact Format Version** | Version of artifact output format. Same version → identical output. |
| **Contract Version** | API contract version. Enforced via headers. Major mismatch → 426 Upgrade Required. |
| **Wire Contract** | API response shapes. Defined in majestic-api-contracts. |

---

## Device & Capability

| Term | Definition |
|------|------------|
| **Device Profile** | Versioned capability set (e.g. `appletv_v1`, `generic_tv_v1`). Server-owned. |
| **Unknown Device** | Device param missing or unrecognized. Server returns 400. |

---

## Scope

This terminology applies to public documentation. Repo-local docs may extend with implementation-specific terms; those must not conflict with canonical definitions here.
