# Commander Dashboard

Commander Dashboard is a private Magic: The Gathering Commander tracker built with Next.js. It helps a playgroup manage players, decks, and games while surfacing commander-focused stats on a simple dashboard.

## What the app does

- tracks players and their display colors
- tracks decks, including partner commanders and special commander color selection cases
- logs multiplayer Commander games with seat assignments, winner selection, date, and optional notes
- shows a dashboard with:
  - wins over time
  - per-player win/loss/draw totals
  - deck usage
  - matchup stats by opponent
  - most played commander
  - best commander win rate
  - most played color
- resolves commander metadata from Scryfall, including names, colors, mana costs, and card images

## App structure

- **Dashboard**: charts and player-specific performance summaries
- **Games**: log new games and review recorded matches
- **Decks**: create, edit, and delete decks tied to players
- **Players**: create, edit, and delete players

Users who are not signed in can browse the app in read-only mode. Signed-in editors can manage players, decks, and games.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Chart.js with `react-chartjs-2`
- Resend for email login codes
- Scryfall for commander card data

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000.

Other useful commands:

```bash
npm run lint
npm run build
```

## Authentication

The app supports two modes:

### Local development bypass

In non-production environments, local auth bypass is enabled by default. This makes the app behave as if you are signed in as an editor.

Optional variables:

- `NEXT_PUBLIC_LOCAL_AUTH_BYPASS` — explicitly enable or disable the bypass
- `NEXT_PUBLIC_LOCAL_AUTH_EMAIL` — email shown for the local editor session

### Email code sign-in

To use real sign-in, configure:

- `ALLOWED_EMAILS` — comma-separated editor allowlist
- `SESSION_SECRET` — secret used to sign OTP and session tokens
- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — sender address for login codes

Users request a 6-digit code by email, then exchange it for a session cookie.

## Data storage

The app stores its core records as JSON:

- players
- decks
- games
- cached commander index data

When GitHub content API variables are configured, the app reads and writes those JSON files through GitHub:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` (optional, defaults to `main`)
- `GITHUB_TOKEN`

Without that configuration, it falls back to local JSON files inside the repository.

## Notes

- Commander data is refreshed from Scryfall and cached for faster lookup.
- Deck records are hydrated with commander names, colors, and images when possible.
- This app is designed for a single playgroup rather than multi-tenant use.
