# Contract Alignment

This client consumes `majestic-api-contracts` wire shapes. BrightScript has no TypeScript; models are documented here and maintained to match schemas.

## LibraryResponse (GET /library)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| items | Array | ✓ | LibraryMovieItem[] |
| contract_version | String | ✓ | SemVer from server |
| system_warning | String? | | |
| device | String | | Device id used |
| health_summary | String? | | e.g. "125 playable · 3 need review · 12 not playable" |

**Query params:** `device`, `filter` (playable | all | integrity-flagged), `media_type` (digital | physical | all)

## LibraryMovieItem

| Field | Type | Notes |
|-------|------|-------|
| movie_id | Integer? | |
| title | String | |
| year | Integer? | |
| poster_url | String? | Server-relative URL |
| backdrop_url | String? | |
| overview | String? | |
| editions | Array | LibraryEdition[] |
| default_edition_index | Integer | Server-computed |
| badge | String | integrity_flagged, missing, etc. |
| physical_copies | Array? | |
| has_digital_apple_tv | Boolean? | |
| has_digital_fandango | Boolean? | |

## LibraryEdition

| Field | Type | Notes |
|-------|------|-------|
| media_file_id | Integer | |
| label | String | |
| stream_url | String | Playback URL |
| is_playable | Boolean | **Authoritative** - use for UI |
| has_adaptive_fallback | Boolean | Create Compatible Audio |
| playback_status_primary_text | String | Server precomputed |
| display_label | String | Server precomputed |
| ... | | See libraryEdition.schema.json |

**No client logic for:** playback_prediction mapping, display formatting, compatibility evaluation. Server provides all.

## ApiError (4xx/5xx error bodies)

Structured error responses. Parse JSON body when status is 400, 403, 503.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| error | String | ✓ | Machine-readable code: unresolved, video_incompatible, no_compatible_audio, artifact_build_failed, media_unavailable |
| message | String? | | Human-readable |
| match_reason | String? | | For unresolved |
| hint | String? | | User guidance |
| adaptiveAvailable | Boolean? | | Create Compatible Audio available |
| videoTranscodeAvailable | Boolean? | | Transcode available |
| editionAudio | String? | | |
| required | String? | | |
| policy | String? | | |

Schema: `majestic-api-contracts schemas/apiError.schema.json`
