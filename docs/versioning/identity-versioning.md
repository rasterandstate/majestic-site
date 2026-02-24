# Identity Versioning

Identity rules are frozen. Any modification requires version bump, migration path, and updated test vectors.

## Versioning Policy

- **EDITION_HASH_VERSION**: Bump when edition hash inputs, separator, or normalization changes.
- **FINGERPRINT_VERSION**: Bump when media file fingerprint format changes.
- **Migration**: Old hashes remain valid for lookup. New scans use new algorithm. Backfill scripts must handle both versions.

## Determinism Guarantees

- **Edition hash**: `computeEditionHash(movieId, publisherKey, format, packaging, releaseDate, region)` produces identical output for identical inputs across runs, machines, and time (within the same movieId scope).
- **Region normalization**: "Region A", "A", "region a", "USA" all normalize to canonical "A".
- **Packaging normalization**: "Steel Book", "steelbook", "Steel-book" all normalize to "steelbook".
- **Region summary**: Multi-region discs produce sorted, stable order ("A + B", never "B + A").
- **Hash invariance to region order**: Regions sorted before joining; [A,B] and [B,A] produce the same hash.

## What Constitutes a Breaking Change

- Changing the edition hash algorithm (inputs, separator, hash function).
- Adding, removing, or modifying region synonyms.
- Adding, removing, or modifying packaging synonyms.
- Changing format normalization (e.g. "4K" → different canonical form).
- Changing release date extraction (e.g. year vs full date).
- Changing region summary ordering or separator.

## Migration Requirements if Hash Algorithm Changes

1. **Version bump**: Increment EDITION_HASH_VERSION and EDITION_HASH_ALGORITHM suffix.
2. **Dual support**: Server must support both old and new hash for lookup during transition.
3. **Backfill**: Script to recompute edition_identity_hash for existing disc_edition rows using new algorithm.
4. **Test vectors**: Add new vectors for new algorithm; retain old vectors for regression.
5. **Documentation**: Update with migration notes and timeline.

## Explicit Freeze Statement

As of version 1.0.0, the identity layer is complete and frozen.

- Edition hash algorithm: **identity_v1**. Do not modify.
- Region synonym map: **frozen**. Do not add/remove mappings.
- Packaging synonym map: **frozen**. Do not add/remove mappings.
- Format normalization: **frozen**. Do not change regex or output forms.

## Dependencies

- **majestic-identity-contract**: Defines and exports identity logic. Server consumes; does not redefine.
