# muno · статистика — the statistics page

**https://jorkai.github.io/muno-legal/stats/** — muno's anonymous usage statistics, for the
owner, on a phone or a laptop. A static page served by this repository's GitHub Pages; it
shares the site with the privacy policy and nothing else — the policy pages do not link
here and this folder touches nothing outside itself.

**This README is the only place the page is described.** The app's repository
(`cards-learning`) holds the other half — the database function it reads and the rules of
what is recorded — in `docs/ANALYTICS.md`.

## How it works

- **Signing in** is the app's own: an email code (`signInWithOtp` with
  `shouldCreateUser: false`, so it never makes an account), on the PRODUCTION project
  (`config.js`). The session stays in this browser; **Выйти** signs out THIS browser only
  (`scope: 'local'`), never the phone.
- **One read:** `analytics_report(p_from, p_to, p_dev)` — migration 033 in the app's
  repository. The sums are made in the database; the page only draws them. A window is
  1 to 400 UTC days; the page offers today, 7, 30 and 90.
- **The lock is in the database, not here.** The page holds only the publishable key the
  app itself ships. The function answers an account whose CONFIRMED email is on
  `public.analytics_readers` (the owner's two addresses), and refuses everyone else
  (`42501`). Anyone who finds the address sees a sign-in form; GitHub Pages cannot hide a
  page behind a password, which is exactly why the check lives where it cannot be skipped.
- **What it shows:** the headline numbers, visits and the onboarding by day (two line
  charts, each with a table view), the onboarding step by step (reached, left, skipped,
  time), signing in and the reminder question, visits, practice, adding words and
  translation times, the library, limits and the paywall's doors, and failures.
- **The states:** sign-in → code → the report; «Статистики в проде пока нет» when the
  database has no `analytics_report` (`PGRST202` — a project without migration 033);
  «Нет доступа» (`42501`); a failure with a retry; and a period with no events, which says
  the events come from the app's 1.2.0 on and offers the example — what production shows
  between 2026-10-15 (031 and 033 applied there) and the first people on 1.2.0. A refetch
  keeps the last report on screen, dimmed.
- **`?demo`** draws the page from `demo.json`: a made-up month (36 311 events, every event
  kind) summed by the real function and shifted to end today. A yellow banner says so.

## Files

| file | what |
|---|---|
| `index.html` | the shell: header, `main`, footer |
| `style.css` | muno's own tokens — the sheet grey and white cards in light, the night ramp in dark; the two chart series (indigo, green) validated as a pair against both card surfaces |
| `app.js` | everything else: sign-in, the read, the views, the Russian names of every code, the charts. DOM calls only, never `innerHTML` — codes come from the data |
| `config.js` | the project the page reads (production) and its publishable key |
| `demo.json` | the example's four reports (1, 7, 30, 90 days) |
| `lib/supabase-2.110.0.js` | the browser build of `@supabase/supabase-js` 2.110.0 — the app's version, copied from its `node_modules` so the page loads nothing from a CDN (MIT, `lib/LICENSE-supabase-js`) |

## Changing it

- **A new code** (an event's prop value, a step, a door): give it a Russian name in
  `app.js` AND in `cards-learning/scripts/analytics-markdown.ts`. An unnamed code shows as
  itself — visible, never broken.
- **A new key in the report**: add it to the function first (a migration in the app's
  repository), then to `EMPTY_REPORT` in `app.js`, which is what keeps an older function or
  an older `demo.json` from breaking the page. Never rename a key.
- **The example**: `npx tsx scripts/analytics-demo.ts` in `cards-learning` (TEST project,
  Docker) rewrites `demo.json` here.
- **Looking at it locally**: any static server over this folder. Pointing it at the TEST
  project means serving a `config.js` with the TEST URL and publishable key from
  `cards-learning/seed/.env` — never commit that one.
