# CheezyWednesday Programming (werk-board)

Phone view of the class workouts from the Google Sheet "WEEKLY OVERVIEW PROGRAMMING".

The app is fully static. The workouts live in `public/data.json`, which Claude refreshes from the sheet after each programming week and pushes to this repo. Vercel redeploys on every push, so no Google keys are needed.

## Files

- `public/index.html` the board (week bar, day strip, WOD A / WOD B / Notes)
- `public/warmups.json` 10-min warm-ups per day, app only (not in the sheet): `{ "Fall 2026": { "8": [Mon..Sun] } }`
- `public/data.json` `{ "updated": "...", "tabs": { "Fall 2026": [[...rows A–H...]] } }`, the raw cell values of each cycle tab
- `public/img/days.json` `{ "pool": ["/img/days/1.jpg", ...] }` pictures shown above each day, picked at random per day (same for everyone on a date, no repeats within a week)
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

## 1RMs

Tap **1RM** in the header to enter Pia's and Henning's 1RMs (kg). Any line with a lift and a percentage (e.g. `3 Front Squat 74%`, `Back Squat at 82`, `80-83-90%` under a lift) shows each person's load, rounded to 2.5 kg. Tap a load chip to jump to that lift's 1RM. Stored in the same Upstash store via `api/maxes.js`.
