# Majestic Server - Deployment Guide

This guide covers production deployment via Docker, Linux tarballs, and CI release artifacts.

## Prerequisites

- **Node.js 20** (for tarball/standalone)
- **ffmpeg** (required for artifact building)
- **Rust toolchain** (optional; for building stream engine from source)

## Docker Installation

### Build Context Requirement

Docker must be built from the **parent directory** with all sibling repos checked out. The server uses `file:` dependencies to sibling packages.

```
your-workspace/
  majestic-server/
  majestic-api-contracts/
  majestic-identity-contract/
  majestic-ui/
  majestic-canon/
  majestic-canon-tools/
  majestic-canon-updater/
  majestic-build-accelerator/  (optional)
```

### Build

```bash
# From parent directory containing all repos
docker build -f majestic-server/Dockerfile -t majestic/server:latest .
```

Or use the build script:

```bash
./majestic-server/scripts/docker-build.sh
```

### Run with Docker Compose

```bash
docker-compose -f majestic-server/docker-compose.yml up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAJESTIC_DB_PATH` | `./data/majestic.db` | SQLite database path |
| `MAJESTIC_ARTIFACTS_PATH` | `./data/artifacts` | Artifact cache directory |
| `MAJESTIC_OUTPUT_PATH` | `./output` | Generated legend MP4 output |
| `MAJESTIC_CANON_ROOT` | `./data/canon` | Canon metadata sync target |
| `MAJESTIC_STREAM_ENGINE_PATH` | (auto-detected) | Rust stream engine binary |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `production` | Environment mode |
| `TMDB_API_KEY` | (required) | TMDB API key for movie metadata |

### Required Directories

The container expects these paths (mounted as volumes):

- `/data` - Database, artifacts, canon metadata
- `/output` - Generated legend MP4s
- `/media` - Media library (mount your library path)

### Health Check

```
GET /api/health → { "status": "ok" }
```

Docker HEALTHCHECK runs every 30s.

---

## Linux Tarball Installation

Release tarballs are built for `linux-x64` and `linux-arm64` and published to GitHub Releases.

### Download and Install

```bash
curl -L -o majestic-server.tar.gz \
  https://github.com/OWNER/majestic-server/releases/download/vVERSION/majestic-server-linux-x64.tar.gz

mkdir -p /opt/majestic
tar xzf majestic-server.tar.gz -C /opt/majestic
cd /opt/majestic
mkdir -p data output
```

### Configure and Run

```bash
export MAJESTIC_DB_PATH=/opt/majestic/data/majestic.db
export MAJESTIC_ARTIFACTS_PATH=/opt/majestic/data/artifacts
export MAJESTIC_OUTPUT_PATH=/opt/majestic/output
export TMDB_API_KEY=your_key

NODE_ENV=production node build/server.js
```

---

## Rust Stream Engine

The Rust stream engine provides high-performance byte-range streaming. It is optional; the server falls back to Node.js streaming when the binary is unavailable.

### Build from Source

```bash
cd stream-engine
cargo build --release
```

Set `MAJESTIC_STREAM_ENGINE_PATH` to override the default path.

---

## Single-Node Constraint

Majestic Server assumes **single-node deployment** for artifact coordination. Build locks and artifact state are process-local. Do not scale horizontally without a distributed coordination layer.
