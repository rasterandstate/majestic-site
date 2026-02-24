# Data Lineage

Data flow from sources through transformations to consumption.

**See also:** [Identity Layer](identity-layer.md) (invariants and guardrails)

---

## 1. Overall Data Lineage

```mermaid
flowchart TB
    subgraph SOURCES["Data Sources"]
        SQLite[(SQLite DB)]
        TMDB[TMDB API]
        OMDb[OMDb API]
        UPC[UPCMDB / UPCitemdb]
        FS[Filesystem]
        CSV[CSV / JSON Import]
    end

    subgraph TRANSFORM["Transformation Layers"]
        direction TB
        ORCH[Orchestration]
        ENRICH[Movie Enrichment]
        SCAN[Scanner Service]
        BARCODE[Barcode Service]
        ARTWORK[Artwork Service]
        AGG[Library Aggregation]
        IDENTITY[Edition Identity]
    end

    subgraph STORAGE["Persistence"]
        movies[(movies)]
        editions[(disc_edition)]
        copies[(physical_copies)]
        media[(media_file)]
        artwork_dir[(artwork)]
    end

    subgraph CONSUME["API & Consumption"]
        API_MOVIES["/api/movies"]
        API_LIB["/library"]
        API_STREAM["/stream/media_file"]
        API_ART["/api/artwork/fetch"]
        API_IMPORT["/api/import"]
    end

    SQLite --> ORCH
    TMDB --> ENRICH
    OMDb --> ENRICH
    UPC --> BARCODE
    FS --> SCAN
    CSV --> ORCH

    BARCODE --> ORCH
    ORCH --> movies
    ORCH --> editions
    ORCH --> copies
    ENRICH --> movies
    SCAN --> media
    SCAN --> ORCH
    ARTWORK --> artwork_dir
    ARTWORK --> movies

    movies --> AGG
    media --> AGG
    copies --> AGG

    AGG --> API_LIB
    movies --> API_MOVIES
    media --> API_STREAM
    artwork_dir --> API_ART
    ORCH --> API_IMPORT
```

---

## 2. Physical Disc Flow (Barcode Scan)

```mermaid
flowchart LR
    subgraph INPUT
        SCAN[Barcode Scan]
    end

    subgraph LOOKUP
        API[GET /api/barcode/code]
        UPCMDB[UPCMDB / UPCitemdb]
        PARSE[parseEditionFromRawUpc]
    end

    subgraph CREATE
        POST[POST /api/movies]
        ORCH[createMovie]
        EDITION[getOrCreateDiscEditionByUpc]
        COPY[addPhysicalCopy]
    end

    subgraph ENRICH
        TMDB[enrichMovieFromTmdb]
    end

    SCAN --> API --> UPCMDB --> PARSE
    PARSE --> POST --> ORCH
    ORCH --> EDITION --> copies[(physical_copies)]
    ORCH --> COPY
    ORCH --> TMDB
```

---

## 3. Library Scan Flow (Digital Files)

```mermaid
flowchart TB
    subgraph TRIGGER
        SCAN_REQ[POST /api/library-roots/id/scan]
    end

    subgraph SCAN
        WALK[collectVideoFiles]
        FINGER[fingerprint]
        MATCH[matchFileToMovie]
        STAGING[insertStagingRow]
        COMMIT[commitStagingToLive]
    end

    subgraph DB
        staging[(staging_media_file)]
        media[(media_file)]
        movies[(movies)]
    end

    subgraph CREATE
        CREATE_MOVIE[createMovieFromMediaFile]
    end

    SCAN_REQ --> WALK --> FINGER --> MATCH
    MATCH --> STAGING --> staging
    staging --> COMMIT --> media
    COMMIT --> CREATE_MOVIE
    CREATE_MOVIE --> movies
```

---

## 4. Core Entity Relationships

```mermaid
erDiagram
    movies ||--o{ physical_copies : has
    movies ||--o{ media_file : has
    movies }o--|| binders : "in binder"
    disc_edition ||--o{ physical_copies : "edition of"
    movies }o--o{ person_movie : "cast/crew"
    person ||--o{ person_movie : "in"
    movies }o--o{ movie_studio : "produced by"
    studio ||--o{ movie_studio : "produces"
    movies ||--o| movie_artwork : "artwork state"
    library_root ||--o{ media_file : "contains"
    collection ||--o{ library_root : "has roots"
```

---

## 5. End-to-End Data Flow Summary

```mermaid
flowchart TB
    subgraph IN["Ingestion"]
        Barcode[Barcode Scan]
        Import[CSV/JSON Import]
        Scan[Library Scan]
    end

    subgraph EXTERNAL["External APIs"]
        TMDB[TMDB]
        OMDb[OMDb]
        UPC[UPC Lookup]
    end

    subgraph CORE["Core Tables"]
        movies[(movies)]
        editions[(disc_edition)]
        copies[(physical_copies)]
        media[(media_file)]
    end

    subgraph OUT["Output"]
        Pages[Pages: /movie, /library]
        Stream[Stream: /stream/media_file]
        Export[Export: /api/export]
    end

    Barcode --> UPC --> editions
    Import --> movies
    Scan --> media
    media --> movies
    editions --> copies
    copies --> movies

    TMDB --> movies
    OMDb --> movies

    movies --> Pages
    media --> Stream
    movies --> Export
```
