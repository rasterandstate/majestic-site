---
title: Contract Reference
description: Wire contract (version, hash, schemas, endpoint map)
---

# Contract Reference

**Version:** `1.0.2`  
**Hash:** `sha256-07239d0e1a46c781c78b3ae70db52acceeb8dc17e431cd64858e23ad0e61020d`  
**Generated:** -

Majestic uses a single, coordinated contract version across server and client. Hash enforcement prevents silent drift.

## Endpoint Map

| Endpoint | Schema |
|----------|--------|
| `GET /library` | libraryResponse |
| `GET /api/media-file/:id/prewarm-appletv` | prewarm |
| `DELETE /api/media-file/:id/prewarm-appletv` | prewarm |

## Schemas

| Schema | Description |
|--------|-------------|
| [apiError](/schemas/apiError.schema.json) | Structured error responses from API endpoints |
| [audioTrackInfo](/schemas/audioTrackInfo.schema.json) | Audio track for in-player switching. |
| [incompatibility](/schemas/incompatibility.schema.json) | Structured incompatibility payload when media cannot be direct-played |
| [libraryEdition](/schemas/libraryEdition.schema.json) | Single edition within a library movie item. |
| [libraryMovieItem](/schemas/libraryMovieItem.schema.json) | Movie item in library response with editions array. |
| [libraryResponse](/schemas/libraryResponse.schema.json) | GET /library response shape. |
| [physicalCopyInfo](/schemas/physicalCopyInfo.schema.json) | Physical copy binder/slot info when edition has a disc. |
| [playbackPrediction](/schemas/playbackPrediction.schema.json) | Predictive badge for edition: what will happen when user presses play. |
| [playbackStatusCode](/schemas/playbackStatusCode.schema.json) | Stable enum for edition playback status. Unknown values → treat as unknown. |
| [prewarm](/schemas/prewarm.schema.json) | Prewarm endpoint GET and DELETE response shapes |

## Download

[Download contract.bundle.json](/contract.bundle.json): deterministic, hash-verified aggregate of all schemas.
