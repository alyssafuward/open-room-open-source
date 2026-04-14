# Sync Architecture

How room data flows between the registry files, Supabase dev, and Supabase prod.

## Overview

Room data lives in two places:
- **Registry files** (`public/registry/<room-id>/`) — the source of truth for room content (background image, hotspots, config)
- **Supabase** — stores grid position (`grid_x`, `grid_y`), display name, and status for each room

The GitHub Action `sync-rooms.yml` keeps them in sync.

## Flow

| Event | What happens |
|---|---|
| Builder reserves a room | A row is inserted into Supabase with `status: reserved` and the room's grid coordinates |
| PR opened or updated | Registry changes are applied to **Supabase dev** so the Vercel preview reflects them |
| PR merged to main | Registry changes are applied to **Supabase prod** — the room goes live |

## What the sync action handles

| Change type | Dev (on PR) | Prod (on merge) |
|---|---|---|
| Name change (`room_display_name` in config.json) | ✓ updated | ✓ updated |
| Room deleted (folder removed) | ✓ row deleted from DB | ✓ row deleted from DB |
| Room added (new config.json) | ✓ status → `active` | ✓ status → `active` |
| Coordinate change (`grid_x`, `grid_y`) | ✗ not handled | ✗ not handled |

## Supabase environments

- **Prod** — live site, updated only on merge to main
- **Dev** — preview environment, reset to match prod on every PR open/sync, then PR changes applied on top

## Known limitation: multiple PRs

The dev environment is shared. When multiple PRs are open simultaneously, each PR's sync overwrites dev state. Previews can interfere with each other.

This is acceptable for now. See [known-limitations.md](./known-limitations.md) for the planned fix.
