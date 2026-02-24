# Identity Matching and `.majestic.json`

Majestic matches media files to movies using a deterministic priority order. The database is the source of truth; `.majestic.json` files reinforce that on disk for future scans.

## Resolution Order

1. **Per-file `.majestic.json`** - `{filename}.majestic.json` in the same directory (e.g. `A New Standard.mkv.majestic.json`). Overrides directory-level for this file only. Use when a shared extras folder contains files from different movies.

2. **Directory-level `.majestic.json`** - `.majestic.json` in the file's directory. Applies to all files in that folder. Written automatically when you resolve or re-match in the UI.

3. **Filename parsing** - `Title (Year).mkv`, `Title (Year) [Steelbook].mkv`, etc.

4. **Folder name parsing** - Parent directory name.

5. **User confirmation** - Unresolved or ambiguous matches appear in Settings → Unresolved.

## What `.majestic.json` Contains

```json
{
  "movie_id": 123,
  "edition_id": 456
}
```

- `movie_id` (required): ID of the movie in your database.
- `edition_id` (optional): Edition ID if applicable.

## When It Is Written

- When you **resolve** an unresolved file in Settings → Unresolved.
- When you **re-match** a file to a different movie in Edit → File tab.

The database is always updated first. If writing succeeds, the file is written next to the media. If the directory is read-only (e.g. NFS mount), the match still persists in the database; you'll see a calm message: *"Directory is read-only. Match persisted in database only."*

## DB-Only Mode

If you prefer not to write identity files (e.g. read-only NAS, or you want DB-only persistence):

```bash
MAJESTIC_IDENTITY_FILES=disabled
```

Or: `db_only`, `0`, `false`.

The matcher still **reads** `.majestic.json` if present; it just **skips writing** when resolving or re-matching.

## Why This Design

- **DB is source of truth** - Survives rescans, renames, restarts. Scanner respects existing `media_file.movie_id`.
- **Per-file override** - Shared extras folders (e.g. `Extras/` with files from multiple movies) can use per-file `.majestic.json` to avoid directory-level overreach.
- **No file mutation** - We never modify the media file itself. Only metadata.
- **Transparent** - A visible JSON file in the folder. Users who organize by folder can inspect or edit it.

## Target Audience

This design is for disc rippers, NAS owners, folder-organizers, and edition collectors. A `.majestic.json` file signals "this is a serious local system." It aligns with the philosophy: *identity is independent of file location*.
