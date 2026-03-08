# Streaming Platform API Availability

Majestic tracks where you own movies across physical media and digital platforms. This document summarizes which major streaming platforms offer APIs that could be used to automate syncing ownership status (similar to Plex sync).

## Platforms with usable APIs

### Plex (implemented)

- **API**: Plex Media Server API
- **Access**: Full library metadata via server token
- **Use case**: List movies in your library, match by TMDB ID, sync `has_digital_plex`
- **Auth**: `PLEX_URL` + `PLEX_TOKEN` in `.env`
- **Status**: ✅ Used by Majestic for Plex sync

### Google Play Movies (theoretical)

- **API**: Google Data Portability API
- **Access**: Export user's Play library (movies, music, apps)
- **Use case**: One-time or periodic export of owned movies
- **Auth**: OAuth; requires Google app approval
- **Limitations**: Export/archive model, not real-time; may be one-time or time-limited (30/180 days)
- **Status**: ⚠️ Possible but complex; not implemented

## Platforms without consumer APIs

### Amazon Prime Video

- APIs exist for content partners (rights, delivery, analytics)
- No public API for a user's purchase library

### Vudu / Fandango at Home

- No documented public API for user libraries
- Some forum references to an API, but not publicly available

### Apple TV / iTunes

- iTunes Search API provides catalog/search only
- No public API for a user's purchase library

### Microsoft Movies & TV

- Microsoft no longer sells new movies (existing purchases still playable)
- No public API for user libraries

### Movies Anywhere

- OEM Title API provides catalog metadata (what titles exist)
- Not for user libraries; intended for studios/OEMs
- Access requires contacting Movies Anywhere

## Summary

| Platform              | API for user library? | Automation viable? |
|-----------------------|------------------------|--------------------|
| Plex                  | Yes                    | ✅ Yes (implemented) |
| Google Play           | Export only            | ⚠️ Possible, complex |
| Amazon                | No                     | ❌ No              |
| Vudu / Fandango       | No                     | ❌ No              |
| Apple TV              | No                     | ❌ No              |
| Microsoft             | No                     | ❌ No              |
| Movies Anywhere       | No (catalog only)      | ❌ No              |

**Bottom line:** Plex is the only platform with a straightforward, automatable API for your own library. Google's Data Portability API could theoretically work for periodic exports but requires app approval and uses an export model rather than real-time sync. All others would require manual tracking.
