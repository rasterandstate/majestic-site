# Crash Recovery Validation

Crash / restart integrity tests simulate abrupt termination and restart. They prove that the database survives transaction rollback and abrupt close without orphan state or corruption.

## Purpose

- Rollback + close + reopen → no residue
- Commit + abrupt close + reopen → data intact, integrity holds

Deterministic simulation: close the DB without graceful shutdown, then reopen the same file. No process kill required.

## Scenarios

| Scenario | Action | Assertion |
|----------|--------|-----------|
| Abort mid-transaction | Rollback, close, reopen | No residue |
| Commit + abrupt close | Commit, then abrupt close + reopen | Data intact, FK check passes |

## Pass Criteria

- No orphan rows
- `integrity_check` = ok
- Identity hashes present

## Verification

Verification includes:
- Foreign key check on open
- No orphan physical_copies (disc_edition_id references valid disc_edition)
- No orphan disc_editions (movie_id references valid movie)
- All disc_edition rows have non-empty edition_identity_hash

## Invariants

| Invariant | Meaning |
|-----------|---------|
| **Transaction atomicity** | Aborted transactions leave no residue. |
| **Integrity on reopen** | After abrupt close, reopen succeeds and integrity_check passes. |
| **Identity preservation** | Identity hashes remain present after crash recovery. |
