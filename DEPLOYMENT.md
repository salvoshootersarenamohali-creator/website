# 36th Salvo Cup Deployment

This app is a server-rendered Next.js site with API routes, Prisma, and PostgreSQL. It should be deployed to Vercel, not GitHub Pages.

## 1. Create The Database

Create an Aiven PostgreSQL service and copy its connection string.

The app expects:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require"
ADMIN_PIN="choose-a-private-pin"
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS="1"
```

## 2. Configure Vercel

Create a Vercel project from this GitHub repository.

Set these Vercel production environment variables:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require"
ADMIN_PIN="choose-a-private-pin"
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS="1"
```

If Vercel's Git integration is enabled, disable automatic production deployments so this GitHub Actions workflow is the single deployment path.

## 3. Configure GitHub Actions

Add these repository secrets in GitHub under `Settings > Secrets and variables > Actions`:

```env
VERCEL_TOKEN="token-from-vercel-account-settings"
VERCEL_ORG_ID="team-or-user-id-from-vercel"
VERCEL_PROJECT_ID="project-id-from-vercel"
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require"
```

The workflow in `.github/workflows/deploy.yml` runs on pushes to `main`. It installs dependencies, generates Prisma Client, applies database migrations, builds with Vercel, and deploys the prebuilt production artifact.

## Notes

- Coach admin is at `/admin/salvo-cup-36` and uses `ADMIN_PIN`.
- Payment screenshots currently write to `public/uploads/payments`. This is enough to test the form, but on Vercel those files should later move to object storage such as Cloudflare R2, S3, UploadThing, or Vercel Blob.
- Replace `public/upi-scanner.png` with the real UPI QR scanner before opening registrations.
