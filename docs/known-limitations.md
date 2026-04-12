# Known Limitations & Future Work

Things we know need addressing but aren't tackling yet.

---

## Multiple PRs interfering in dev

**Problem:** The dev Supabase environment is shared across all open PRs. Each PR starts by mirroring prod → dev, then applying its own changes. If two PRs are open at the same time, whichever sync runs last wins — the other PR's dev state gets overwritten and its preview may be inaccurate.

**When it matters:** Any time more than one PR is open simultaneously, especially if both touch room data.

**Planned fix:** Supabase branching — each PR gets an isolated database branch, tied to its Vercel preview deployment. No interference between PRs.

---

## Room coordinate changes not synced

**Problem:** Grid position (`grid_x`, `grid_y`) is stored in Supabase and is not currently managed by the sync action. If a room's coordinates need to change, it has to be done manually in the Supabase dashboard.

**When it matters:** Any time a room needs to be moved on the floor plan.

**Planned fix:** Add coordinate fields to `config.json` and extend the sync action to write them to Supabase on merge.

---
