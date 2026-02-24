# Artifact Versioning

Playback artifacts (remux, transcode) are produced with a format version. Same input + same target + same version → identical output.

## Artifact Format Version

- Artifacts are built under a current ARTIFACT_FORMAT_VERSION.
- Fingerprint mismatch between source and cached artifact invalidates the cache. Rebuild required.
- Format version changes require cache invalidation and rebuild.

## Determinism

Same input + same target → identical artifact (byte-for-byte). Soak tests validate this under current format version.

## Invalidation

- **Source fingerprint change**: If media_file fingerprint changes (e.g. after replacement accepted), cached artifact is stale. Rebuild.
- **Format version bump**: All artifacts of that kind invalidated. Rebuild on next request.

## Build Lock

Exactly one build per (media_file_id, kind) at a time. Lock serializes; no duplicate build under parallel request.

## Dependencies

- **majestic-build-tools**: Implements artifact building. Server invokes; does not implement transcoding logic.
