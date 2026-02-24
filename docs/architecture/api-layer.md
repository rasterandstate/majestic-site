# API Layer

The API layer exposes library, streaming, and metadata endpoints. Response shapes are defined in majestic-api-contracts. All clients and server share the same contract version.

## Streaming Endpoint Contract

- **Path**: `GET /stream/media_file/{id}`
- **Query**: `device` (e.g. `appletv`), `token` (playback token when required)
- **Range**: `Range: bytes=start-end` supported; `bytes=-N` (suffix) supported
- **Response**: 200 (full) or 206 (partial) with `Content-Range`, `Accept-Ranges: bytes`
- **Incompatibility**: 400 with structured incompatibility payload when client cannot play

## HTTP Range Support

Range requests are mandatory. All streaming responses must support `Range` requests for seeking. Responses return 206 with correct `Content-Range` and `Content-Length`.

## Playback Prediction

Every media file + device combination resolves to exactly one state. No "maybe" state.

| State | Definition |
|-------|------------|
| **direct** | File can be streamed as-is. No server-side transformation. |
| **adaptive** | File requires transformation (remux and/or audio conversion) but will play. Transformation is explicit and declared. |
| **not_playable** | File cannot be played on this device. Server returns 400 with clear reason. |

## Incompatibility

Structured incompatibility payload enables clients to show actionable guidance (e.g. "Enable Adaptive Mode"). Opaque failures are prohibited.

## Prewarm API

- Clients may call `POST /api/media-file/{id}/prewarm-appletv` to trigger artifact build before playback.
- Prewarm is optional: playback proceeds without it when direct play or on-the-fly remux is available.
- Prewarm reduces time-to-first-byte for artifact-dependent clients.
- Build is cancellable via `DELETE` on prewarm.

## Dependencies

- **majestic-api-contracts**: Playback prediction types, incompatibility contract, error model.

## Versioning

See [API Versioning](../versioning/api-versioning.md).
