# gettidevec.com — TideVec Website

React + Vite site for [gettidevec.com](https://gettidevec.com).

## Deploy to Vercel (3 steps)

### Option A — Vercel CLI (fastest)

```bash
cd tidevec-website
npm install
npx vercel --prod
```

Then in Vercel dashboard → Settings → Domains → add `gettidevec.com`

### Option B — GitHub integration

1. Push `tidevec-website/` to GitHub (or as a separate repo)
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo → Framework: **Vite** → Deploy
4. Settings → Domains → Add `gettidevec.com`

### Custom domain (gettidevec.com)

In your DNS provider (Namecheap/Cloudflare/GoDaddy), add:

```
Type  Name   Value
A     @      76.76.21.21        ← Vercel IP
CNAME www    cname.vercel-dns.com
```

Vercel auto-provisions SSL via Let's Encrypt within ~2 minutes.

## Local dev

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Stack

- React 18 + Vite 5
- Zero external UI libraries — custom design system in JS tokens
- JetBrains Mono + Inter from Google Fonts
- Animated terminal demo (re-runs every ~12s)
- Fully responsive

## File structure

```
tidevec-website/
├── index.html          ← entry, SEO meta tags
├── vercel.json         ← Vercel config + security headers
├── vite.config.js
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    └── App.jsx         ← entire site (single file)
```
