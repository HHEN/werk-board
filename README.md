# CheezyWednesday Programming (werk-board)

Phone view of the class workouts from the Google Sheet "WEEKLY OVERVIEW PROGRAMMING".

The app is fully static. The workouts live in `public/data.json`, which Claude refreshes from the sheet after each programming week and pushes to this repo. Vercel redeploys on every push, so no Google keys are needed.

## Files

- `public/index.html` the board (week bar, day strip, WOD A / WOD B / Notes)
- `public/data.json` `{ "updated": "...", "tabs": { "Fall 2026": [[...rows A–H...]] } }`, the raw cell values of each cycle tab
- `public/sw.js` keeps the last loaded copy for when the gym has no signal
- `vercel.json` serves `public/` as is, no build step

## Weekly update

After the week is written to the sheet, ask Claude to update the Werk Board. Claude reads the current cycle tab, rewrites `public/data.json` and pushes. Vercel is live about a minute later.

## On the phone

Open the Vercel URL in Safari → Share → **Add to Home Screen**.

The URL is public. To lock it, turn on Vercel → Settings → Deployment Protection.

## Scores (Pia and Henning)

Each day has a score field for Pia and one for Henning. To share them between phones, add a store once:
Vercel → Project → Storage → Create → **Upstash for Redis** (free) → connect it to this project → redeploy.
`api/scores.js` picks up the injected `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`). Without a store, scores are kept on each phone only.
