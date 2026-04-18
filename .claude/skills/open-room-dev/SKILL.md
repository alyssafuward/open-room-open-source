---
name: open-room-dev
description: Developer workflow for Open Room — create or edit a room, or work on a bug or feature
---

You are helping someone contribute to **Open Room**. Follow this flow exactly.

---

## On startup

Before anything else, silently get the repo into a clean state:

```bash
git checkout main && git pull
```

This ensures they're always starting from the latest version of the project, with any previously merged work included. Don't mention this unless something goes wrong.

---

## Step 1: What do you want to do?

Ask:

---

Welcome to Open Room! What would you like to work on?

1. **First-time setup** — design and build your reserved room in the building
2. **Work on an existing room** — update or improve a room you've already built
3. **Report a bug or new feature idea** — describe something that's broken or something you'd like to see added
4. **Work on a bug or feature** — pick up an existing issue and implement it

---

- Options 1 and 2 are **room work** — they're about contributing content to the building
- Options 3 and 4 are **product work** — they're about changing the app itself

---

## Step 2: GitHub username (room work only)

If they chose 1 or 2, ask:

---

What's your GitHub username? I'll use it to look up your reserved room.

---

If they don't know what GitHub is or don't remember signing in: explain that the reservation form required a GitHub login, so they do have an account. Ask if they remember the email they used — that can help them recover their username at github.com. Once they have it, continue.

Then run:

```bash
gh issue list --repo alyssafuward/open-room-open-source --label room --search "their-username"
```

Find the issue that matches their username — it will contain their room ID (e.g. `warm-harbor`). Share the direct link to the issue so they can confirm it's theirs, even if they don't remember the room ID. The issue title will show both the room ID and their username.

If no issue is found, they haven't reserved a room yet. Tell them to visit the live site, click **+ Add Room**, fill out the form, and come back — a GitHub issue will be created automatically with their room ID.

---

If they chose option 3 (report only), collect their description, create a GitHub issue, and let them know it's been filed. No branch needed — stop here.

---

## Step 3: Create an issue and branch

### Option 4 (work on a bug or feature)

Run the following to fetch open issues and present them as a numbered list:

```bash
gh issue list --state open --json number,title,labels,body --limit 20
```

Show the issues clearly — number, title, and a brief label or description if available. Ask:

---

Here are the open issues. Which one would you like to work on?

---

Once they pick one, note the issue number — do **not** create a new issue. Skip straight to creating the branch and checking it out.

### Options 1 and 2 (room work)

Ask for a description of what they plan to do:

---

Give me a quick description of what you're planning. A sentence or two is fine — just enough to capture the intent.

---

If they're vague (e.g. "make it look cool", "I don't know yet"), help them get specific with a follow-up: ask what image or theme they have in mind, or what they'd want someone to see or feel when they walk into their room. Use their answer to write the issue description yourself — don't make them write it.

Create a GitHub issue with their description as the body, note the issue number, then create the branch.

### All options (1, 2, and 4)

Create a feature branch: `feature/<issue-number>-<short-description>` — the issue number **must** be in the branch name or commits will be blocked.

```bash
gh issue create --title "..." --body "..."   # options 1 and 2 only
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

## Step 6: Safety check before submitting

Before opening a PR, walk them through a quick review. Keep it light and conversational — frame it as a final look, not an audit:

---

Before we submit, let's do a quick once-over:

1. **Links** — if you added any clickable links to your room, do they go where you expect? Anyone who visits your room will be able to click them.
2. **Background image** — are you comfortable sharing this image publicly? Make sure you have the right to use it (your own photo, AI-generated, or clearly licensed).
3. **Your name and details** — your GitHub username will appear as the room owner. Does everything look right?

---

If anything looks off, fix it before moving on. Once the PR is merged, the room goes live for everyone.

---

## Step 7: Open a PR

When they're happy with the changes, offer to open a pull request.

A **pull request (PR)** is a formal request to add your changes to the main project. It gives the maintainer a chance to review what you've built before it goes live. You'll get a link where you can see all your changes, leave comments, and track the review.

---

Ready to submit? I'll open a pull request to add your changes to the live project.

---

```bash
gh pr create --title "..." --body "..."
```

Return the full PR URL (e.g. `https://github.com/alyssafuward/open-room-open-source/pull/16`) as a clickable link — not just the issue reference. Then walk them through what happens next:

---

Your PR is open! Here's what happens next:

1. Vercel will automatically build a **preview** of your changes. You'll see a link appear in the PR — click it to see exactly how your changes will look on the live site.
2. The maintainer will review your PR. If it looks good, they'll merge it and your changes will go live automatically. If they want something adjusted, they'll request changes and you can keep working on the same branch — push again and the preview will update.

You're done for now! 🎉

---
