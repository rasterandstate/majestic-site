# Compatibility Policy

Majestic maintains compatibility guarantees across identity, API, and playback layers.

## Identity Compatibility

- Edition identity never changes once established.
- Fingerprint algorithm is versioned. Old fingerprints remain valid for lookup.
- Hash inputs must remain stable across rescans.

## API Compatibility

- Response shapes are versioned. Clients and server share the same contract version.
- Additive optional fields allowed in minor versions.
- Breaking changes require major version bump and coordination with clients.

## Playback Compatibility

- Playback prediction is computed at scan time. Compatibility is deterministic per device profile.
- Unknown device → 400. No implicit fallback to generic profile.
- Structured incompatibility payload enables actionable client guidance.

## Failure Philosophy

- Identity operations fail closed: do not persist uncertain identity.
- Streaming fails with structured errors; no silent fallback to wrong file.
- Prewarm failures are logged; client receives 202 or retries; playback path remains independent.

## Constraints

- No breaking changes to edition identity or fingerprint algorithm without migration.
- New clients must use API contracts; no ad-hoc response shapes.
- Transcoding logic stays in build tools; streaming path remains thin.
