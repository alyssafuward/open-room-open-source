# Building Your Room

## Setup

1. Copy this folder to `public/registry/your-room-id/` — use the room ID you got from the reservation form on the site.
2. Add your background image as `background.jpeg` or `background.webp` (max 200KB). Landscape images work best.
3. Edit `config.json` with your room details and hotspots.
4. Open a Pull Request from your fork to the main repo. Include a screenshot of your room.

---

## config.json fields

| Field | Description |
|---|---|
| `room_display_name` | The name shown inside your room |
| `owner` | Your GitHub username |
| `background_image` | Path to your image — replace `your-room-id` with your actual ID |
| `hide_back_button` | Set to `true` if you have a custom door hotspot and want to hide the default back button |
| `links` | Optional array of persistent link buttons shown in the top-right corner |
| `hotspots` | Array of clickable zones |

### links example
```json
"links": [
  { "label": "My Website", "url": "https://yoursite.com" }
]
```

---

## Hotspot fields

| Field | Description |
|---|---|
| `id` | A unique string, no spaces |
| `label` | Tooltip text shown on hover |
| `x` | Left edge of the hotspot, as a % of image width (0–100) |
| `y` | Top edge of the hotspot, as a % of image height (0–100) |
| `width` | Width as a % of image width |
| `height` | Height as a % of image height |
| `action` | What happens on click — see below |

---

## Actions

**`navigate_floor`** — returns the visitor to the floor plan. Every room needs at least one of these.
```json
{ "action": "navigate_floor" }
```

**`open_url`** — opens an external link in a new tab.
```json
{ "action": "open_url", "url": "https://yoursite.com" }
```

**`open_image`** — renders an image directly on the wall and opens it full-screen when clicked.
```json
{ "action": "open_image", "image_url": "/registry/your-room-id/assets/photo.jpeg" }
```

**`open_modal`** — opens a built-in modal. Available modals: `welcome_guide`, `registry`, `diagram`.
```json
{ "action": "open_modal", "modal": "welcome_guide" }
```

---

## Tips

- Ask your AI to look at your background image and estimate x/y/width/height percentages for each hotspot.
- Put extra assets (artwork, photos) in an `assets/` subfolder inside your room folder.
- The default "← Floor Plan" button appears on every room. If you have a custom door hotspot, set `hide_back_button: true` to remove it.

## Building codes

- Background image: JPEG or WebP, **max 200KB**
- Total room folder: **max 5MB**
- One room per builder
