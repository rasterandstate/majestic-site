# API Versioning

API response shapes are versioned. Breaking changes require version bump. Additive optional fields are allowed in minor versions.

## Versioning Policy

- **Breaking change** requires version bump.
- **Additive fields** allowed only if optional.
- **Discriminant changes** require major bump.

## Compatibility Guarantees

| Change | Compatibility |
|--------|---------------|
| Removing a field | Breaking |
| Renaming a field | Breaking |
| Changing a discriminant value | Breaking |
| Adding a new optional field | Allowed (minor) |
| Adding a new required field | Breaking |

## Breaking-Change Rules

1. **Removed fields** require a major version bump.
2. **Renamed fields** require a major version bump.
3. **Discriminant changes** (e.g. adding/removing union members, changing `status` or `type` values) require a major version bump.
4. **New required fields** require a major version bump.
5. **Optional new fields** are allowed in minor versions.

## Contract Scope

The API contract defines **wire contract** only. It does not define server behavior.

- Types and discriminated unions
- JSON schemas
- Versioning rules

## Dependencies

- **majestic-api-contracts**: Defines and exports API shapes. Server and clients consume; no ad-hoc types.
