---
name: open-room-dev
description: Developer workflow for Open Room — create or edit a room, or work on a bug or feature
---

You are helping someone contribute to **Open Room**. Follow this flow exactly.

---

## Step 1: What do you want to do?

Ask:

---

Welcome to Open Room! What would you like to work on?

1. **Create a new room** — design and build your own room in the building
2. **Work on an existing room** — update or improve a room you've already built
3. **Report a bug or new feature idea** — describe something that's broken or something you'd like to see added
4. **Work on a bug or feature** — pick up an existing issue and implement it

---

- Options 1 and 2 are **room work** — they're about contributing content to the building
- Options 3 and 4 are **product work** — they're about changing the app itself

---

## Step 2: Room ID (room work only)

If they chose 1 or 2, ask:

---

What's your room registry ID? It looks something like `warm-harbor` or `soft-grove`. You would have gotten it when you reserved your spot on the floor plan.

If you haven't reserved a room yet, visit the live site, click **+ Add Room**, and come back with your ID.

---

If they chose option 3 (report only), collect their description, create a GitHub issue, and let them know it's been filed. No branch needed — stop here.

---

## Step 3: Create an issue and branch

For options 1, 2, and 4 — ask for a description of what they plan to do:

---

Give me a quick description of what you're planning. A sentence or two is fine — just enough to capture the intent.

---

Then:

1. Create a GitHub issue with their description as the body
2. Note the issue number
3. Create a feature branch: `feature/<issue-number>-<short-description>` — the issue number **must** be in the branch name or commits will be blocked
4. Check it out

```bash
gh issue create --title "..." --body "..."
git checkout main && git pull
git checkout -b feature/<issue-number>-<short-description>
```

For example, if the issue is #15: `feature/15-calm-den-room`. Confirm the branch is checked out before moving on.

---

## Step 4: Do the work

### Room work (options 1 and 2)

Follow the room setup flow:

1. If creating a new room, ask: **What do you want to name your room?** This becomes `room_display_name` in the config — it's the human-readable name shown in the UI (e.g. "The Calm Den", "Alyssa's Corner"). It doesn't have to match the registry ID.
2. Copy the template if creating a new room: `cp -r public/registry/_template/ public/registry/<room-id>/`
3. Help them add a background image (JPEG or WebP, max 200KB)
4. Edit `config.json` — fill in `room_display_name`, `owner`, `background_image`, and `hotspots`
4. Every room needs at least one `navigate_floor` hotspot (the door back to the floor plan)
5. Offer to launch the app so they can preview their room:

```bash
npm run dev
```

Then open `http://localhost:3000`, navigate to their room on the floor plan.

### Product work (option 4)

Read the relevant files before touching anything. Key files:

- Floor plan / room grid: `app/page.tsx`
- Individual room view: `app/components/RoomView.tsx`
- Reservation modal: `app/components/ReservationModal.tsx`
- Database schema: `supabase/migrations/`
- Room sync GitHub Action: `.github/workflows/sync-rooms.yml`

Work through the change with them. Offer to launch locally when there's something visual to check:

```bash
npm run dev
# open http://localhost:3000
```

---

## Step 5: Save as you go

Offer to commit at natural stopping points — after a meaningful chunk of work, not after every file.

A **commit** is a saved snapshot of your changes. Think of it like hitting Save on a document, except it's permanent and tracked — you can always go back to any commit. Each commit has a short message describing what changed.

---

Want me to save your progress? I'll take a snapshot of your changes with a short description of what you did.

---

```bash
git add <specific files>
git commit -m "Short description

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Also offer to push so their work is backed up on GitHub:

```bash
git push -u origin <branch-name>
```

---

## Step 6: Open a PR

When they're happy with the changes, offer to open a pull request.

A **pull request (PR)** is a formal request to add your changes to the main project. It gives the maintainer a chance to review what you've built before it goes live. You'll get a link where you can see all your changes, leave comments, and track the review.

---

Ready to submit? I'll open a pull request to add your changes to the live project.

---

```bash
gh pr create --title "..." --body "..."
```

Return the full PR URL (e.g. `https://github.com/alyssafuward/open-room-open-source/pull/16`) as a clickable link — not just the issue reference. Then walk them through the Vercel approval:

---

Your PR is open! Here's what happens next:

1. Vercel will automatically build a **preview** of your changes. You'll see a link appear in the PR — click it to see exactly how your changes will look on the live site.
2. Once you're happy with the preview, the maintainer will review and merge the PR.
3. When it's merged, **Vercel will automatically deploy** your changes to the live site within a minute or two.

If you want to make more changes before it's merged, just keep working on the same branch — push again and the preview will update automatically.

---
