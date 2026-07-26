# Stansaq F.Z.C. — website + admin dashboard

Node/Express app, **Supabase** (Postgres + Storage) for data, static frontend.
Principal Partners and Products are stored in Supabase and editable from
`/admin`; the rest of the site (Home, About, Solutions, Industries, Insights,
Contact) is static HTML in `public/`.

## How the pieces connect

| Piece | Role |
|---|---|
| Your domain | What visitors type into their browser (e.g. `stansaq.com`) |
| Render | Runs the Node.js application around the clock, and handles HTTPS automatically |
| Supabase | Hosted database (Partners, Products, admin login) and image storage |

A self-hosted VPS is also documented, as Appendix B, for anyone who later
wants full server control instead — Render is the path this guide builds
toward.

For a full walkthrough of every step below with screenshots-equivalent detail,
see `Stansaq-Website-Setup-Guide.pdf` — this README is the quick-reference
version of the same document.

## Quick Reference: Complete Setup Procedure

Every phase, start to finish, for the Render deployment path. Commands only
— the sections further down explain the reasoning. Deploying to your own
VPS instead? Use this same Phase 1 for Supabase, then switch to Appendix B
for the rest.

**Phase 0 — Before you start**
The domain (already have it), a GitHub account with this project pushed to
a repository, and a terminal (built into Windows/Mac/Linux).

**Phase 1 — Set up Supabase**
Create a project at supabase.com/dashboard/new → copy the Project URL and
`service_role` key from Project Settings → API → run `db/supabase-schema.sql`
in the SQL Editor → create a public `uploads` Storage bucket.

**Phase 2 — Create the Render service**
Sign up at render.com → **New → Web Service** → connect your GitHub repo.
Build command `npm install`, start command `node server.js`, plan
**Starter** (not Free — the free tier spins down on inactivity).

**Phase 3 — Environment variables**
In the service's Environment tab, add every value from `.env.example`
except `PORT` (Render sets it automatically). Set `TRUST_PROXY_HTTPS=true`
from the start — Render terminates HTTPS immediately, no waiting step.

**Phase 4 — Deploy, seed, and verify**
Once Render finishes the first deploy, run these from your own machine,
not the server:
```
npm run seed
npm test
```
Must end with `SMOKE TEST COMPLETE`.

**Phase 5 — Add your custom domain**
In Render's **Settings → Custom Domains**, add your domain. Render shows
you the exact DNS record to create — paste it into your registrar's DNS
panel.

**Phase 6 — TLS**
Nothing to do — Render provisions and renews the certificate automatically
once DNS resolves.

**Phase 7 — Confirm it's actually live**
Visit `https://yourdomain.com` (check for the padlock), then
`https://yourdomain.com/admin/login.html`.

**Phase 8 — Ongoing**
Adding/editing partners & products through `/admin`, live immediately.
Push to your connected branch — Render redeploys automatically. Password
reset and backups: see "Changing the admin password later" and "Backups"
below.

## What's in here

```
server.js                Express app entry point
render.yaml               Render deploy config as code (env var keys, no secrets)
db/supabase-schema.sql    Paste into the Supabase SQL Editor once, to create tables
db/supabaseClient.js       Server-side Supabase client (uses the service_role key)
db/seed.js                 One-time setup: creates the admin login, seeds the 6 partners
routes/api.js              Public, read-only endpoints the site's JS fetches from
routes/admin.js            Login/logout + partner & product CRUD (auth-gated)
middleware/auth.js          Session guard for admin routes
admin/                    Admin login + dashboard pages
public/                   The public site (HTML/CSS/JS)
scripts/smoke-test.js       Full flow test against your REAL Supabase project
scripts/run-mock-test.js    Logic-only test against an in-memory mock — no
                             Supabase project needed, useful for quick sanity
                             checks after code changes
```

## First-time setup

### 1. Create the Supabase project (in your browser)

1. Go to supabase.com/dashboard/new, sign in, create a project — pick a name,
   a strong database password (save it), and a region.
2. Once it's provisioned, go to **Project Settings → API** and copy:
   - **Project URL**
   - **`service_role` key** (not the `anon` key — this one bypasses Row Level
     Security and must never reach a browser)
3. Go to **SQL Editor → New query**, paste the contents of
   `db/supabase-schema.sql`, and run it. This creates the `admin_users`,
   `partners`, and `products` tables with Row Level Security enabled and
   **no policies** — meaning only the service_role key (used by this server)
   can touch them at all, even if the public `anon` key ever leaked.
4. Go to **Storage → New bucket**, name it `uploads`, toggle **Public
   bucket** ON, create it. This is where partner logos and product images
   are stored; "public" just means visitors can view the images via their
   URL — writing still requires the service_role key.

### 2. Deploy to Render

Render runs your app as a long-lived container and handles HTTPS, process
supervision, and restarts for you — no SSH, no `ufw`, no nginx config, no
certbot needed.

1. **Push the code to GitHub.** Render deploys from a Git repo, not a zip
   upload or `scp`.

2. **Create the service.** On render.com: **New → Web Service** → connect
   your repo.
   - Build command: `npm install`
   - Start command: `node server.js`
   - Plan: **Starter, not Free** — Render's free tier spins down after 15
     minutes of inactivity, with ~30–60 second cold starts on the next
     request. Unacceptable for a client-facing site; budget the ~$7/month.
   - A `render.yaml` is included in this repo documenting this configuration
     as code, if you'd rather use Render's Blueprint feature than click
     through the dashboard.

3. **Environment variables.** In the service's **Environment** tab, add
   every value from `.env.example`, with two things to note:
   - Don't set `PORT` — Render provides it automatically.
   - Set `TRUST_PROXY_HTTPS=true` **from the first deploy**. Render
     terminates HTTPS at the edge immediately — no certificate-issuing wait,
     unlike self-hosting (Appendix B).

4. **Deploy, then seed and verify from your own machine — not the server:**
   ```
   npm run seed
   npm test
   ```
   These only talk to Supabase over the internet; they don't need to run on
   whatever machine is hosting the app. Render gives you a `*.onrender.com`
   URL immediately — confirm the app itself responds there before touching
   your domain.

5. **Add your custom domain.** In **Settings → Custom Domains**, add your
   domain. Render shows you the exact DNS record to create (a CNAME for
   `www`, and an apex-domain record — copy the value Render gives you, don't
   guess it). Paste that into your registrar's DNS panel.

6. **TLS.** Nothing to do — Render provisions and renews the certificate
   automatically once DNS resolves.

**Ongoing:** push to your connected branch, Render redeploys automatically.
No `pm2 restart`, no manual anything.

## Day-to-day use

- Go to `yourdomain.com/admin/login.html`, sign in.
- Add a company: name, tagline, description, one application per line,
  optional logo (JPG/PNG/WEBP/SVG, 5MB max).
- Add a product: name, description, optional image, optional linked company.
- Changes appear on the public Principal Partners page (and the home page
  ticker/grid/partner count) the next time that page is loaded — no rebuild,
  no redeploy.
- Deleting a company does **not** delete its products; they become
  unlinked and show up under "Other products" on the Partners page.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Favicon doesn't show, or shows an old one | Browsers cache favicons aggressively — hard refresh (Ctrl/Cmd+Shift+R) or try an incognito window before assuming it's broken |
| Custom domain stuck showing "not verified" in Render | DNS hasn't finished propagating yet — wait and recheck; Render re-verifies automatically once it resolves |
| First request after idle takes 30–60 seconds | You're on Render's Free plan, which spins down on inactivity — move to Starter |
| Locked out of `/admin/login.html` | Rate limit hit (10 attempts / 15 min per IP) — wait 15 minutes |
| Stuck on the login page despite correct credentials | `TRUST_PROXY_HTTPS` is not `true` in the Environment tab — set it and let Render redeploy |

Running the VPS path from Appendix B instead? See that appendix's own
troubleshooting notes (certbot/DNS timing, PM2 after a reboot) — they don't
apply to Render.

## Backups

Your data lives in Supabase, not wherever the app itself is hosted, so
backup responsibility is mostly on their side — but check what your plan
actually includes:

- Supabase's free tier and paid tiers have different backup/retention
  policies (e.g. point-in-time recovery is generally a paid-tier feature).
  Check **Project Settings → Backups** in your dashboard for what your
  specific project has, since this varies by plan and can change — don't take
  this README's word for current specifics.
- You can also take your own backups any time: **Database → Backups** in the
  dashboard lets you trigger a manual one, or use `pg_dump` against the
  connection string in **Project Settings → Database** for a local copy.
- Storage (the `uploads` bucket with your logos/product images) is separate
  from the database — back it up separately if you want a full copy outside
  Supabase.

## Changing the admin password later

There's no "forgot password" flow yet. To reset it, run this wherever your
real `.env` lives (locally, or Render's shell if you have it):
```
node -e "
require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./db/supabaseClient');
(async () => {
  const hash = bcrypt.hashSync('YOUR-NEW-PASSWORD', 12);
  const { error } = await supabase.from('admin_users').update({ password_hash: hash }).eq('username', 'admin');
  console.log(error ? 'Failed: ' + error.message : 'Password updated.');
})();
"
```

## Known limitations (read before relying on this in production)

- Single admin account, no roles/permissions — fine for one or two trusted
  people, not for a larger team.
- No password-reset email flow — see above for a manual reset.
- The login endpoint is rate-limited (10 attempts per 15 minutes per IP) to
  blunt brute-force attempts.
- The `service_role` key in `.env` bypasses Row Level Security entirely.
  Treat it like a root password: never commit it, never log it, never send
  it to a browser. If it ever leaks, rotate it from **Project Settings →
  API** immediately.
- `npm run test:mock` proves the route logic is internally consistent; it
  does **not** prove your real Supabase project, RLS policies, or Storage
  bucket are configured correctly. Only `npm test` (against your real
  project) proves that — run it after any setup change.

## Appendix B: Self-Hosting on a VPS (Alternative)

Render (above) is the path this guide builds toward. This appendix is for
later, if you ever want full server control instead — Supabase setup is
identical either way; everything below replaces "Deploy to Render" entirely.

Before any of this: pick a provider (any Ubuntu-capable VPS works — no UAE
region from the big generalists like DigitalOcean/Hetzner/Linode, but that
~80–150ms difference doesn't matter for a B2B catalog site), provision an
Ubuntu 22.04/24.04 LTS server (1 vCPU, 1–2GB RAM, ~20GB SSD is enough), and
lock down SSH access:
```
ssh root@your-vps-ip
adduser deploy
usermod -aG sudo deploy
# copy your SSH key to the "deploy" user, then:
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```
Edit `/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`.
Restart `sshd`. Connect as `deploy` from now on.

### B.1 Install Node.js and get the app onto the server

Node.js 18+ must be installed on the server first:
```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Upload the project (via `scp`, `rsync`, or a Git repo you pull from on the server), then:

```
cd stansaq-app
npm install
cp .env.example .env
```

Edit `.env`:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from step 1.
- `SESSION_SECRET` — generate with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the `/admin` login. Only read once,
  by the seed step below.
- `NODE_ENV=production`
- `TRUST_PROXY_HTTPS=true` — only once the site is actually served over
  HTTPS (see nginx/certbot below). Leave `false` until then.

```
npm run seed
```
Creates the admin login and the 6 initial partners in Supabase. Safe to run
only once — it skips seeding if an admin or any partners already exist.

```
npm test
```
This runs against your **real** Supabase project: logs in, creates a
throwaway partner and product, confirms they appear in the public API
immediately, deletes them, confirms the admin session gate blocks logged-out
access. Should end with `SMOKE TEST COMPLETE`.

If you just want to sanity-check the route logic without touching Supabase
at all (e.g. right after editing `routes/admin.js`), run `npm run test:mock`
instead — it runs the same flow against an in-memory mock. That's a logic
check, not proof your real Supabase project is wired correctly; `npm test`
is the one that actually proves that.

```
npm start
```
Visit `http://your-server-ip:3000`.

### B.2 Keep it running (PM2)

Don't leave `npm start` running in a terminal — it dies when you disconnect.
Use a process manager:

```
npm install -g pm2
pm2 start server.js --name stansaq
pm2 save
pm2 startup     # prints a command to run once, so PM2 restarts on reboot
```

Useful commands: `pm2 logs stansaq`, `pm2 restart stansaq`, `pm2 status`.

### B.3 Point your domain at the server (nginx + HTTPS)

The Node app listens on `PORT` (default 3000) on localhost only in spirit —
put nginx in front of it so visitors hit port 443 (HTTPS) and nginx forwards
to Node internally.

Example `/etc/nginx/sites-available/stansaq`:
```
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then:
```
sudo ln -s /etc/nginx/sites-available/stansaq /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot rewrites the nginx config to redirect HTTP → HTTPS and handles
renewal. Once HTTPS is live, set `TRUST_PROXY_HTTPS=true` in `.env` and
`pm2 restart stansaq`.

