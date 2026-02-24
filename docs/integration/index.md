# Client Integration

Integration patterns for Majestic clients (Apple TV, Roku, Tizen, etc.).

## Contract Consumption

- Use `majestic-api-contracts` package for type-safe API handling.
- Clients must consume from this package; no ad-hoc types.
- All clients and server share the same contract version.

## Capability Negotiation

See [Architecture](/architecture/api-layer) and [Streaming Model](/architecture/streaming-model) for playback prediction and device capability handling.
