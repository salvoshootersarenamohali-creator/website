# Nehra Memorial booking upgrade

## Rollout

The two migrations dated `20261012` add the booking/batch tables and publish
`/competitions/nehra-memorial-2026`. Apply them to the deployment database before
starting the upgraded application:

```sh
npm run prisma:migrate
npm run build
```

Local verification used an isolated PostgreSQL database; it did not modify the
production database or deploy the website. Uploaded posters and the payment QR
are included in `public/nehra-2026-*.png`.

## Competition rules

- Competition dates: 1–6 November 2026. Bookable qualifying days: 1–5 November.
  The 6th is finals-only, regardless of conflicting dates in the original art.
- Nine daily relays. Odd relays are ISSF; even relays are NR. Relay 9 ends at
  21:35. Other times reproduce the supplied relay schedule.
- Each relay has independent pools: 13 standard lanes and 3 shared special lanes.
  Little Champ categories and Open Sight Rifle use the special pool.
- A registration with any ISSF standard entry uses one ISSF relay, including its
  NR entries. NR-only registrations use an NR relay. Special-only registrations
  may use any relay. Standard and special entries cannot be combined.
- One reservation per shooter, with the lowest free lane assigned automatically.
  Serializable transactions and a database unique index prevent double-booking.
  Deletion releases the lane; unrelated admin edits preserve its assigned number.
- ISSF costs Rs. 1,200 per category; NR, Little Champ and Open Sight cost Rs. 1,000.
  UPI payments use the supplied QR. Existing Salvo para-entry rules are unchanged.

## Administration

In **Admin → Competitions → Edit**, configure lane capacities, bookable dates,
relay timings/rules, special events, coach batches, and certificate branding.
Booked relays cannot be removed or changed in a way that invalidates reservations.

Custom certificates support an issuer name, PNG/JPG logo and zero to three
signers, each with name, designation and uploaded PNG/JPG signature. Save the
competition after uploading. Nehra starts with the club issuer name and no logo
or signers. Legacy competitions retain the original Salvo certificate until
customization is enabled.

The **Details** tab produces lane-based snapshots for a chosen qualifying day,
including vacant lanes, all shooter category codes, payment status and capacity
totals. Refresh for a fresh browser preview, or download Excel/PDF snapshots.
Browser printing uses landscape pages. No automatic overnight task is installed.

## Coach batches

The registration page has a coach mode for 1–20 students. Academy, coach/contact
and payment reference/receipt are shared; student identity, categories, files and
relay choice remain separate. The payable amount is the sum of all categories.
Every student and reservation commits together or the entire batch rolls back.
Submission keys deduplicate retries after a lost response. Availability refreshes
every 15 seconds, on selection/focus, and after submission; only a successful
submission reserves a lane.

## Verification

`npm test` runs unit/export/certificate tests. Database integration tests run only
with matching `DATABASE_URL` and `TEST_DATABASE_URL` pointing at an isolated
localhost PostgreSQL instance with the migrations already applied. They create
and clean up only their own randomly named competition. Use at least 10 database
connections to exercise concurrent submissions:

```powershell
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:PORT/ISOLATED_DATABASE?connection_limit=10'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm test
```

Coverage includes concurrent standard and special exhaustion, stale availability,
database uniqueness, lane release, atomic/retried batches, shared payments,
NR/ISSF eligibility, invalid configuration, guarded admin edits, complete prize
schedules, Excel/PDF details and certificates with zero through three signers.
