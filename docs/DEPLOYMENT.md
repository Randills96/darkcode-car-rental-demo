# RedKnot Rent-a-Car — Deployment Guide

## Prerequisites

- **Node.js >= 20.9.0**
- **MySQL 8.0+** (or MariaDB via XAMPP)
- A server with outbound internet for npm install (build time only)

## Environment Variables

Create `.env` in the project root:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/redknot_rentacar"
AUTH_SECRET="generate-a-long-random-secret"
NEXTAUTH_URL="https://your-domain.com"
```

Generate a secure `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### XAMPP (local Windows)

XAMPP MariaDB typically uses an **empty root password**:

```env
DATABASE_URL="mysql://root@localhost:3306/redknot_rentacar"
```

Start MySQL from the XAMPP Control Panel before running the app.

## Database Setup

```bash
npm install
npm run db:push
npm run db:seed
```

Default admin after seeding:

| Email | Password |
|-------|----------|
| admin@redknot.lk | Admin@123 |

**Change default passwords immediately in production.**

## Deploying to Vercel

Vercel **cannot** use `localhost` for MySQL. You need a **hosted MySQL database** (Railway, Aiven, PlanetScale, Amazon RDS, etc.).

### 1. Create a hosted MySQL database

Example providers:

- [Railway](https://railway.app) — MySQL template
- [Aiven](https://aiven.io) — MySQL
- Any VPS with MySQL 8+

Copy the **public connection string** (not `localhost`).

### 2. Set Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `mysql://user:pass@host.region.provider.com:3306/dbname` | Yes |
| `AUTH_SECRET` | long random string | Yes |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Yes |

Apply to **Production**, **Preview**, and **Development**.

> `NEXTAUTH_URL` must match your live domain (including `https://`).

### 3. Initialize the remote database (run locally once)

Point your local `.env` at the hosted database, then:

```bash
npm run db:push
npm run db:seed
```

Or run these against production `DATABASE_URL` from your machine — do **not** use `localhost` on Vercel.

### 4. Deploy

Push to GitHub and let Vercel build. The app uses **dynamic rendering** (no DB access during `next build`).

Build settings (defaults are fine):

- **Build command:** `npm run build`
- **Install command:** `npm install` (runs `prisma generate` via postinstall)

### Vercel limitations to know

- **File uploads** (customer documents, damage photos) are stored on disk — Vercel's filesystem is ephemeral. For production on Vercel, plan to move uploads to S3/R2/Blob storage later.
- **Serverless + MySQL:** use a provider that allows external connections; consider connection pooling if you see "too many connections" errors.

### Common Vercel build error

```
Can't reach database server at `localhost:3306`
```

**Cause:** `DATABASE_URL` still points to localhost, or pages tried to query the DB at build time.

**Fix:** Use a hosted `DATABASE_URL` in Vercel env vars (this project skips DB calls during build).

## Production Build

```bash
npm run build
npm run start
```

The app listens on port **3000** by default. Use a reverse proxy (nginx, IIS, Caddy) for HTTPS.

## Recommended Production Checklist

- [ ] Set strong `AUTH_SECRET` and unique database credentials
- [ ] Use HTTPS via reverse proxy
- [ ] Restrict database access to the application server
- [ ] Change all seeded user passwords
- [ ] Review RBAC roles under **Users** (Super Admin only)
- [ ] Configure business rules under **Settings**
- [ ] Set up automated MySQL backups
- [ ] Run `npm run build` in CI before deploy

## Process Manager (PM2 example)

```bash
npm run build
pm2 start npm --name redknot -- start
pm2 save
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid login | Ensure MySQL is running and `npm run db:seed` completed |
| Can't reach database | Check `DATABASE_URL` and MySQL service |
| Port 3000 in use | Stop other Node processes or set `PORT=3001` |
| Tailwind build errors | Use Tailwind v3 setup included in this project |

## Security Notes

- All mutations require authenticated sessions with RBAC checks
- Passwords are hashed with bcrypt (cost factor 12)
- Financial records are immutable; audit log tracks changes
- Session strategy: JWT via Auth.js v5
