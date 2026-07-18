# sportsperps — frontend conventions

React + Vite. Entries: `index.html` (app) and `worldcup.html` (same bundle, WC OG meta;
Vercel rewrites `/worldcup`). Internal admin dashboard: `src/dash/DashboardPage.jsx`
(parabolic.gg/dash, admin-gated).

## Dashboard (/dash)

- `<Stat>`'s color prop is **`valueColor`** — passing `color` is silently ignored (this hid
  the conservation-drift red alarm for weeks; don't reintroduce it).
- All prices from the backend are home-probability scale (0–1) unless a field is explicitly
  side-scale (vault fills, ledger entry/exit prices). Convert with `side === 'home' ? px : 1 − px`
  before displaying a side's own price. Cents formatting multiplies by 100 exactly once.
- Numbers that reconcile (vault balance vs seed, house realized vs net) must render every term
  of the identity: balance − seed = realized PnL + funding − bad debt.
- WC tabs (🏆 Vault / 🏆 Econ) read the EVENT ledger endpoints (`/admin/event/*`) — never mix
  them with main-ledger endpoints in the same panel.
- The WC shadow-hedge panel reads the durable log via `/admin/event/shadow?recent=N`; the
  `current` array is in-memory-live only and empties after settlement/redeploys.

## Profiles

- Leaderboard rows always open the profile page; the BACKEND is the privacy authority
  (403 → "This profile is private."). Never gate clicks client-side on `profilePublic` or on
  avatar presence — a legacy write path stamped old accounts private and made them unclickable.

## Deploys

- Backend deploys on push (Railway); frontend on Vercel. `/push-live` skill automates
  version-bump + commit + push.
