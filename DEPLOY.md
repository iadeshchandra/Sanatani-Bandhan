# Sanatani Bandhan — Free Deployment Guide

## Live demo (100% free, $0)

The app deploys automatically to **GitHub Pages** on every push to `main`:

**https://iadeshchandra.github.io/Sanatani-Bandhan/**

No accounts, no credit cards, no secrets. The pipeline
(`.github/workflows/deploy-pages.yml`) type-checks, builds with the
`/Sanatani-Bandhan/` base path, adds an SPA fallback (`404.html`), and
publishes. First deploy takes ~3 minutes.

### One-time setup (2 clicks)

1. Open the repo → **Settings → Pages**
2. Under "Build and deployment", set **Source → GitHub Actions**

That's it. Every future push redeploys automatically.

## What works on the free deploy

Everything in the demo: landing page, all 49 desks, treasury, Bhoomi, Vahan,
Recurring Seva, command palette, PWA install, offline-first IndexedDB data.
The app is offline-first by design — it never needs a server for the demo.

## What the free deploy does NOT include (by design)

- **Server-verified admin PIN** (`POST /api/auth/verify-pin`): the Express
  backend in `server/` is not hosted on Pages. The app fails closed and the
  demo login flows continue to work. To enable it, host `server/` anywhere
  Node runs (Render/Railway/Fly free tiers, or a VPS) and point the client
  at it — see `server/index.ts`.
- **Firebase Firestore sync**: works as soon as you add your own Firebase
  project config to `.env` (see `.env.example`). The local build runs fully
  on IndexedDB without it.

## Disabled: Firebase Hosting workflow

`.github/workflows/main.yml.disabled` is the original Firebase Hosting +
APK pipeline. It needs a paid/secret-backed setup
(`FIREBASE_SERVICE_ACCOUNT`), so it is disabled to keep pushes green.
To re-enable: rename it back to `main.yml` and add the
`FIREBASE_SERVICE_ACCOUNT` secret under repo Settings → Secrets.
