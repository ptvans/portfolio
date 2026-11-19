# Deployment: GitHub Pages → Vercel at www.getthom.com

Status (Nov 16, 2026): **prepared, not switched.** The site is live on GitHub
Pages at https://ptvans.github.io/portfolio/. The repo is ready for Vercel and
the Vercel project settings are fixed (step 1); pushing, the domain and DNS
still need the steps below.

## How the site builds

- Create React App at the repo root. `npm run build` → `build/`.
- The prototypes are a separate Vite app in `protos/`. Their **built output is
  committed** in `public/protos/` (run `npm run build:protos` after changing
  them), so neither host builds `protos/` — it just ships as static files at
  `/protos/`.
- ColorBrewer lives in its own repo, [ptvans/huebrew](https://github.com/ptvans/huebrew)
  (plain static files, no build tool). Its deployable files are **committed**
  in `public/huebrew/` and ship at `/huebrew/`. To update it: change and commit
  in `../huebrew`, then here run `npm run build:huebrew`
  (`scripts/build-huebrew.sh`, which calls huebrew's `scripts/build.sh`; set
  `HUEBREW_DIR` if the repo is elsewhere) and commit `public/huebrew/`.
- Routing is hash-based (`/#/case-study/...`, `/protos/#/...`), so no server
  rewrites are needed.
- `package.json` keeps `"homepage": "."` (relative asset paths), so the same
  build works at the domain root on Vercel and under `/portfolio/` on GitHub
  Pages during the transition.

## What's in the repo for Vercel

- `vercel.json` — framework `create-react-app`, `npm ci`, `npm run build`,
  output `build`; 308 redirects `/protos` → `/protos/` and `/huebrew` →
  `/huebrew/` (both apps use relative asset paths, which need the trailing slash); one-year immutable caching for
  the hashed files under `/static/` and `/protos/assets/`.
- `package.json` → `"engines": { "node": "22.x" }` (overrides the project's
  Node 26 setting).
- `.gitignore` → `.vercel` (local CLI link folder).
- `public/index.html` → canonical URL and Open Graph tags for
  `https://www.getthom.com/`.

Verified locally: a fresh copy of the repo builds with `npm ci` +
`CI=1 npm run build`, and `vercel build` with the corrected settings completes
and emits the redirect and headers.

## Vercel project: `thomsite` (pauls-projects-5f557fd4)

Connected to `ptvans/portfolio`, production branch `main`.

The original settings caused the `STATIC_BUILD_NO_OUT_DIR … "dist"` error:
Root Directory `protos`, Framework Vite, Node 26.x, so Vercel was building the
prototype folder, not the site. **Fixed on Nov 16, 2026** (via the Vercel API):

| Setting | Was | Now |
|---|---|---|
| Root Directory | `protos` | *(empty — repo root)* |
| Framework Preset | Vite | Create React App |
| Build / Output / Install | defaults | leave default (`vercel.json` sets them) |
| Node.js Version | 26.x | 22.x (`engines` also forces this) |

Root Directory can only be set in the dashboard (or API), not in `vercel.json`.

## Cutover steps

1. ~~**Fix the Vercel project settings** (table above).~~ Done.
2. **Push the repo changes to `main`.** This triggers both deploys: GitHub
   Pages (unchanged) and Vercel. Check the Vercel deployment at
   `https://thomsite-pauls-projects-5f557fd4.vercel.app`:
   - `/` loads, fonts and images load, theme toggle works
   - `/#/case-study/uber-freight` loads
   - `/protos/#/internal-ops/sops/sop-coco-dispatch` and `/protos/#/brick-ops` load
   - `/protos` redirects to `/protos/`
   - "Back to site home" / "Back to portfolio" links return to `/`
3. **Add the domains in Vercel** (Project → Settings → Domains):
   - `www.getthom.com` — primary
   - `getthom.com` — redirect (308) to `www.getthom.com`
   Vercel then shows the exact DNS records to create. Use those values.
4. **Lower the TTL first** (optional, a day ahead): set the current `@` and
   `www` records' TTL to 5 minutes at DreamHost so the switch propagates fast.
5. **Change DNS at DreamHost.** getthom.com uses DreamHost nameservers and is
   currently a fully hosted DreamHost site (Apache serves a page at
   `69.163.180.209`). In the DreamHost panel, switch the domain to **DNS only**
   (or remove the web hosting) so its A records can be replaced, then add:
   - `www` → **CNAME** to the target Vercel shows (e.g. `cname.vercel-dns.com`)
   - `@` → **A** to the IP Vercel shows (e.g. `76.76.21.21`)
   No MX, TXT or CAA records exist today, so no email or verification records
   need preserving. If DreamHost's panel won't allow these records, the
   alternative is to point the domain's nameservers at Vercel
   (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
6. **Wait for Vercel to verify the domain and issue certificates**, then check
   `https://www.getthom.com`, `https://getthom.com` (→ www) and
   `http://www.getthom.com` (→ https).
7. **Retire GitHub Pages** once getthom.com is serving:
   - disable `.github/workflows/deploy.yml` (or delete it), and turn off Pages
     in the repo settings — or replace the Pages site with a small page that
     redirects to `https://www.getthom.com/` so old links keep working.
   - update `README.md` and `DEPLOYMENT_TROUBLESHOOTING.md`, which describe the
     GitHub Pages setup.

## Rollback

- Before DNS changes: nothing to roll back; GitHub Pages keeps serving.
- After DNS changes: restore DreamHost hosting / the previous A records
  (`69.163.180.209`) for `@` and `www`. GitHub Pages is untouched until step 7,
  so https://ptvans.github.io/portfolio/ stays up throughout.

## Notes

- Both hosts deploy on every push to `main` until step 7.
- The `thomsite` project already has several failed/odd deployments from the
  `protos` root; they can be ignored or deleted.
- The old existing DreamHost site at getthom.com (last modified Apr 30, 2026)
  stops being served at step 5. Save anything you want from it first.
