# 36th Salvo Cup Deployment

This app is a server-rendered Next.js site with API routes, Prisma, and PostgreSQL. It should be deployed to Vercel, not GitHub Pages.

## Runtime and dependency security

Use Node.js 24.22.1 or newer in the 24.x line. `.nvmrc` records the minimum tested version; GitHub Actions installs the latest Node 24 release. The `engines.node` range in `package.json` selects Node 24 for Vercel builds and functions. Vercel manages minor and patch versions, so verify the deployed runtime in the build logs after redeploying. Updating dependencies locally does not update an existing deployment or the Node installation on a developer's computer.

The October 27, 2026 dependency refresh includes Next.js 16.4.3, React/React DOM 19.2.9, Nodemailer 10.2.1, and SheetJS 0.20.3. SheetJS is pinned to the [maintainer's official tarball](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) because the npm registry's `xlsx` package stops at the vulnerable 0.18.5 release. The lockfile records the tarball's integrity hash.

The scoped `@prisma/config` override installs `deepmerge-ts` 8.0.2 to fix [recursive merge stack exhaustion](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx) while retaining Prisma 6. Prisma's configuration loader uses `deepmerge` on configuration records; version 8's changes to Map merging and `deepmergeInto` are not used by this path. Recheck and remove this override when upgrading Prisma to a release that includes a fixed dependency.

CI runs `npm audit --audit-level=high` before building or accessing production. Review new advisories and refresh the lockfile before deploying if this check fails.

The updated Next.js lint preset introduces React Compiler readiness diagnostics for state updates in effects, manual memoization, and render purity. These remain warnings while React Compiler is disabled; existing lint errors still block deployment.

Validation on Node 24.22.1: `npm audit` reported zero known vulnerabilities; all 155 tests passed against a fresh local PostgreSQL database with all 30 migrations applied; Prisma's configuration loader and generation passed; `npm run build` passed; `npm run lint` passed with 36 warnings and no errors. A Nodemailer stream-transport check verified message construction without delivering email, and `npm ci --dry-run --ignore-scripts --no-audit` verified lockfile consistency. These checks do not verify the runtime or dependency versions of an existing production deployment.

## 1. Create The Database

Create an Aiven PostgreSQL service and copy its connection string.

The app expects:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require"
ADMIN_PIN="choose-a-private-pin"
COMPETITION_PIN_SECRET="use-a-long-random-secret-and-do-not-rotate-it"
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS="1"
```

## 2. Configure Vercel

Create a Vercel project from this GitHub repository.

Set these Vercel production environment variables:

```env
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require"
ADMIN_PIN="choose-a-private-pin"
COMPETITION_PIN_SECRET="use-a-long-random-secret-and-do-not-rotate-it"
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS="1"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
SMTP_FROM_EMAIL="Salvo Shooters Arena <no-reply@example.com>"
CONTACT_TO_EMAIL="salvoshootersarenamohali@gmail.com"
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

The workflow in `.github/workflows/deploy.yml` runs on pushes to `main`. It installs dependencies, generates Prisma Client, applies every migration to disposable PostgreSQL and runs tests/lint. Production migrations run when `prisma/schema.prisma` or `prisma/migrations` differs from the last successful deployment, then Vercel builds and deploys the artifact. Comparing against the last successful deployment ensures migrations from a failed release are retried; missing history, fetch failures and comparison errors all default to running migrations. A UI-only release with an unchanged database can deploy even when the live database is temporarily short of connection slots.

Vercel runtime PostgreSQL clients default to `connection_limit=1` to limit each function's pool on small Aiven plans. Explicit URL pool settings are respected, and local environments are unchanged. SSL options and credentials are preserved. High concurrent function counts can still require Aiven connection pooling or a larger database plan; do not raise connection limits without checking the service capacity. See [Prisma's serverless connection guide](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections#serverless-environments-faas).

## Notes

- Coach admin is at `/admin/salvo-cup-36` and uses `ADMIN_PIN`.
- `ADMIN_PIN` is the master credential for the competition manager and all competition dashboards. Each competition can also use its own 4-8 digit PIN for its scoped dashboard.
- `COMPETITION_PIN_SECRET` protects competition PIN digests. Generate a long random value, configure the same value in every environment that shares the database, and do not rotate it unless all competition PINs will be reassigned.
- Contact form submissions are sent through SMTP from `/api/contact`. Configure the SMTP variables above before testing email delivery in production.
- Payment screenshots currently write to `public/uploads/payments`. This is enough to test the form, but on Vercel those files should later move to object storage such as Cloudflare R2, S3, UploadThing, or Vercel Blob.
- Replace `public/upi-scanner.png` with the real UPI QR scanner before opening registrations.
