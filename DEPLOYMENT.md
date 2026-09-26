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
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
SMTP_FROM_EMAIL="Salvo Shooters Arena <no-reply@example.com>"
CONTACT_TO_EMAIL="salvoshootersarenamohali@gmail.com"
PUBLIC_SITE_URL="https://salvoshootersarena.com"
WHATSAPP_ACCESS_TOKEN="permanent-system-user-access-token"
WHATSAPP_PHONE_NUMBER_ID="whatsapp-phone-number-id"
WHATSAPP_GRAPH_API_VERSION="a-current-supported-version-from-meta"
WHATSAPP_RESULTS_TEMPLATE_NAME="competition_result_certificate"
WHATSAPP_RESULTS_TEMPLATE_LANGUAGE="en"
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
- Contact form submissions are sent through SMTP from `/api/contact`. Configure the SMTP variables above before testing email delivery in production.
- Payment screenshots currently write to `public/uploads/payments`. This is enough to test the form, but on Vercel those files should later move to object storage such as Cloudflare R2, S3, UploadThing, or Vercel Blob.
- Replace `public/upi-scanner.png` with the real UPI QR scanner before opening registrations.

## WhatsApp result and certificate messages

The competition admin Results tab can send one personalized WhatsApp message to every participant with a complete score and a valid phone number. Sending remains locked until the competition is published, results are published, and the competition has ended so certificate links work.

Set up a WhatsApp Business Account and Cloud API sender in Meta, then create and obtain approval for a utility template named `competition_result_certificate` (or change `WHATSAPP_RESULTS_TEMPLATE_NAME`). The template language must match `WHATSAPP_RESULTS_TEMPLATE_LANGUAGE` and the body variables must be in this order:

```text
Hi {{1}},

Your results for {{2}} are ready:
{{3}}

Download your certificate:
{{4}}

Regards,
Salvo Shooters Arena
```

The variables are participant name, competition title, formatted score/rank lines, and the participant's certificate URL. Set `WHATSAPP_GRAPH_API_VERSION` to a currently supported Graph API version shown in the Meta app dashboard. Store the access token only in Vercel environment variables; never commit it. After changing these variables, redeploy before using the broadcast control.
