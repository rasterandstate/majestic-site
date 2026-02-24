# Breaking Changes

Breaking changes require coordination, version bump, and migration path. This document defines governance for identity, API, and artifact layers.

## Identity Layer

See [Identity Versioning](../versioning/identity-versioning.md).

Breaking: edition hash algorithm, region/packaging synonyms, format normalization, release date extraction, region summary ordering.

## API Layer

See [API Versioning](../versioning/api-versioning.md).

Breaking: removed fields, renamed fields, discriminant changes, new required fields.

## Artifact Layer

See [Artifact Versioning](../versioning/artifact-versioning.md).

Breaking: format version change invalidates cached artifacts. Rebuild required.

## General Principles

1. **Version bump before change**: Do not change behavior without version signal.
2. **Migration path required**: Old data/requests must remain valid during transition.
3. **Test vectors**: Retain old vectors for regression; add new for new behavior.
4. **Documentation**: Update docs with migration notes and timeline.
