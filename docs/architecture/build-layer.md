# Build Layer

The build layer produces playback artifacts (remux, transcode) for clients that cannot direct-play source containers or codecs. The server invokes build tools; it does not implement transcoding logic.

## Principles

| Principle | Meaning |
|-----------|---------|
| Identity unchanged | `media_file` still points at source. No path mutation. |
| No duplicate assets | Artifact is internal cache only. Not visible in library. |
| Range support | Artifact file supports range requests (206, suffix, 416). |
| Cache evictable | Artifacts can be deleted by operator. Rebuild on next request. |

## Artifact Kinds

- **remux_fmp4_appletv**: Container remux (MKV/M2TS/TS → fragmented MP4). Video and audio copied.
- **remux_fmp4_appletv_adaptive**: Remux with audio conversion when source has no compatible audio.
- **transcode_fmp4_appletv**: Video transcode (opt-in policy). VP9/AV1 → H.264; DV P7 → HEVC HDR10.

## Build Concurrency

Exactly one lock acquisition per (media_file_id, kind) under parallel load. Lock serializes builds. No duplicate build under concurrent request.

## Artifact Determinism

Same input + same target → identical artifact (byte-for-byte). Validates under current artifact format version.

## Dependencies

- **majestic-build-tools**: Artifact building (remux, transcode).

## Versioning

See [Artifact Versioning](../versioning/artifact-versioning.md).
