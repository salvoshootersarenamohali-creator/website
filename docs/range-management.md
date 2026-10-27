# Range management

Private staff workspace: `/range`, sign in: `/range/login`. Competition PINs never authorize this workspace. Accounts are owner-managed; there is no public sign-up.

## Using the workspace

The staff and owner panels use a dedicated light workspace with grouped navigation. On phones, open the menu at the top left. Navigation links keep their section in the URL so refresh and browser back/forward work. The location selector applies to the current section; all dates and operational times use India Standard Time.

Overview separates today’s attendance from the selected financial period. Start with the quick actions for common daily work. Entry forms open on demand; reviewing a record brings its correction form into view. Owners see management, salaries and reports; coaches see their assigned daily work. Accounts requiring a password change show only account security until that step is complete.

Students & attendance has Daily attendance, Student roster and Corrections views. Status totals include eligible students for the selected date; search and status filters narrow the visible roll. Bulk marking only changes visible, eligible students that are still unmarked, preserving individual choices already made. Save attendance commits all pending changes. Use Student roster for profile edits and contact information.

Owner handovers open on Pending; select All to see history. Reports show the common filters first, with staff, student and account filters under More filters. Apply filters before downloading Excel; the displayed applied dates describe the records being exported.

## Owner setup / recovery

Apply migrations and generate Prisma Client first. In a trusted interactive terminal with the intended `DATABASE_URL` set, run `node scripts/range-owner.mjs`. The command asks for name, phone, and a hidden password, creates or resets an owner, and revokes previous sessions. It refuses to promote an existing coach phone. Do not pass passwords on the command line or commit them. Process-only `RANGE_OWNER_NAME`, `RANGE_OWNER_PHONE`, and `RANGE_OWNER_PASSWORD` also support secure provisioning. No owner password is seeded or built into the app.

Use Staff & locations to create coaches, assign locations, disable accounts, or issue temporary passwords. Coaches must change temporary passwords before accessing operational records. Password resets and deactivation revoke sessions. Sessions expire after seven days. Five login attempts per phone or thirty per IP within fifteen minutes trigger a cooldown. Passwords use salted scrypt (N=32768, r=8, p=3).

Only Zirakpur is seeded. Owners can add Mohali later and assign existing staff. All operational APIs must check both the authenticated actor and location assignment server-side. Audit records exclude credentials. New features are developed, tested, committed and pushed independently; confirm each deployment before starting the next feature.

## Coach attendance

Use Coach attendance to check in/out. Each punch requires a fresh in-page camera capture and a two-minute, single-use challenge. No file picker or gallery fallback exists. The authoritative timestamp is server receipt, not device time or EXIF. One open shift per coach is enforced across locations by a database unique key. Checkout closes that shift; subsequent check-in starts another. Earlier open shifts remain flagged until checkout/correction. Times display in India time. Camera streams stop on cancel, completion and unmount. Browser camera provenance/liveness cannot be guaranteed.

Cloudinary credentials must be configured. Attendance images are uploaded as authenticated JPEGs, stored as private asset IDs and delivered through owner/self-authorized endpoints with sixty-second download links. Upload failure never commits a punch. Conflicting uploads are cleaned up. Camera tests use mocked storage; actual Android Chrome/iPhone Safari camera permissions and image capture still need device acceptance testing over HTTPS.

Coaches request corrections, including entirely missed shifts. Owners review requests or add/correct times directly with a reason. Optimistic versions reject stale changes, overlaps are rejected, original camera times/photos remain available, and adjustments are labelled. Requests can be rejected with a recorded reason. Each change has an audit record.

## Students and daily roll

Owners and assigned coaches can add student profiles and location enrollments. Student/guardian phones are contacts, never unique identities; siblings can share them. Student creation is retry-safe. Owner edits require a reason and optimistic version. Enrollment periods and active status control attendance eligibility. The owner can explicitly enroll a known profile at another location using `profileId` through the API; no automatic matching occurs.

The roll supports present, absent, leave and unmarked. Bulk marking applies only to visible, eligible, unmarked students. Coaches mark today's unmarked records; existing marks and older dates require owner correction. Bulk submissions are atomic and versioned: conflicting changes cause a refresh instead of overwriting another coach's work. No attendance row means unmarked, not absent. History records the marking coach. Owners can resolve student correction requests with a reason.

## Income, expenses and balances

Owners can delete an unused holding account created by mistake from Accounts, products & categories. Deletion requires the exact account name and a reason, removes its opening balance from tracked funds, and keeps an audit snapshot. Any financial movement (including voided records) or handover (including pending, rejected, or reversed requests) blocks deletion; deactivate such accounts with Edit instead. Stale versions and concurrent activity cannot erase financial history.

The owner sets up real accounts, opening range-fund balances and their effective dates; no financial account or starting money is assumed. An account has a fixed holder (coach, Kartik or Salvo) and cash/online channel. Coaches may use their own or designated Kartik/Salvo accounts; shared balances are never included in coach responses. Products are an operational catalog separate from the public shop; sales do not affect inventory. Categories can be managed by the owner.

Every entry records integer paise, actual activity date, recorder, category snapshot and one or more account/payment parts that must sum to the total. Product sales require quantity times actual unit price to match the total. Owner-only historical backfill is visible in historical reports, but movements before an account's dated opening balance are excluded from its current balance. Negative tracked balances are shown for review rather than blocking entry of legitimate expenses.

Account cards show the current cumulative balance through today in India time, independently of the financial-record date filters. Balances never reset daily. Owners see each account's opening amount and tracking start; payment forms and posted records explain when an earlier payment is excluded. For example, a ₹650 payment on 26 October does not enter a balance starting on 27 October. If tracking should include that first receipt, the owner can correct the opening date to 26 October with a reason and the appropriate start-of-day funds; the existing payment then counts once. Refresh balances and records retries loading, and a record-list failure no longer discards a successfully refreshed balance.

Optional receipt images are authenticated Cloudinary assets with permission-checked, expiring links. Gallery uploads are permitted for receipts; only attendance requires live capture. Owners void and replace mistakes, preserving originals and coach attribution. Actual refunds are separate opposite-direction entries linked to the original, capped to its remaining unrefunded amount. Resolve associated refunds before voiding/correcting the original. Salary/fee records will be managed by their own features, keeping their metadata consistent. Financial POSTs are keyed to prevent duplicated submissions; all movements and audit records commit atomically.

## Admissions and renewals

Add a student in the roster before recording an admission or renewal. Record the amount actually received, number of months, explicit inclusive coverage dates and account/payment parts. The suggested end date advances calendar months, subtracts one day and clamps at short month ends; it is always editable. Coverage and income commit together and retries do not duplicate payments. This records payments and their coverage, not agreed fees, receivables or installment schedules.

Coaches see fee payments they recorded and can request corrections. Owners see all fee histories and use Admissions & fees to void or replace a payment and its coverage together. Generic financial corrections cannot modify fee records. Voided coverage stays in history; owner replacements retain the original coach's attribution. Actual money returned is recorded separately as a refund and does not silently alter agreed coverage dates.

## Handovers and transfers

Coaches submit transfers out of their own holding accounts to available own/Kartik/Salvo accounts within the same location. Owners may transfer between any accounts in a location, and can record a verified transfer immediately or confirm a pending one. Confirmation atomically posts one debit and one equal credit with finance kind `transfer`; these records never enter income/expense totals. Pending/rejected requests have no ledger effect. Repeated submissions and stale confirmations cannot move funds twice.

Transfer history records source, recipient, amount, date, reference, requester and owner verification. Coaches can request corrections. Owners reject incorrect pending requests or reverse a mistaken confirmed ledger entry with a reason, then record a corrected transfer if needed. A reversal is bookkeeping correction, not a bank operation. If money actually moves back, record a new transfer. The system never initiates real payments.

## Salary payments

Only owners may list, record, correct or void salaries. Each record identifies the coach, location, salary month/year, amount actually paid, payment date, source account parts, notes and optional private image proof. Multiple payments against one coach/month are allowed and summarized in the monthly view. Inactive/former coach accounts can be selected for historical payments. No salary entitlement, attendance-based deduction or payroll calculation is performed.

Each salary and its expense commit in the same transaction, with retry keys preventing duplicate expense entries. Dedicated salary corrections void the original and replace both the salary metadata and expense together; reasons and history are retained. Generic financial corrections cannot alter salaries. Coach financial queries and receipt endpoints exclude owner-recorded salary entries, and every salary API rejects coaches independently of the navigation.

## Overview, reports and Excel exports

Overview shows today's complete student-roll counts, open shifts (flagging older missing departures), pending handovers/corrections, income/expenses for the selected activity dates and tracked account funds as of the end date. Coaches see only their own shift/financial entries and holding accounts. Owners can combine active locations, then jump into the corresponding operational panels. Transfers are excluded from income and expense totals.

Owner-only Reports & history provides the finance ledger, overlapping coach shifts, recorded student attendance history, a complete single-day student roll including unmarked students, fees, handovers, salaries and change history. Filters cover dates, location(s), staff, student, category, account, payment method, status, salary month and search where applicable. Reports reject unsupported filters. Coach hours are clipped at India midnight boundaries; no hours or departure are invented for open shifts. All locations also includes global staff administration in change history.

Tables are paginated at 50 rows. Matching counts and financial summaries cover the entire filtered result. Account/payment-method summaries use only matching movement parts; the full transaction amount remains a separate column. Voided records may be reviewed but have zero current movement. Excel downloads use the exact applied filters across all pages in one consistent database snapshot, with Records and Summary worksheets. Exports larger than 5,000 records or 4 MB are rejected with a request to narrow filters, never silently truncated. Text remains text in Excel, including values beginning with an equals sign. Authenticated media URLs and credentials are not embedded in exports.

## Launch and acceptance

Every operational release has its own commit/push and successful CI/deployment gate. CI applies all migrations and runs tests against disposable PostgreSQL before production migrations, then builds and deploys. Initial setup is manual: provision the owner securely, add real coaches and students, define actual products/accounts/opening balances and verify attendance capture on the real Android Chrome/iPhone Safari devices over HTTPS. No real financial starting amounts, coach passwords or student roster are seeded. Local preview screenshots use disposable sample data. Cloudinary must be configured in production for camera evidence and optional receipts.

## Future app / shooter compatibility

Students have stable shooter profile IDs independent of staff credentials, with location enrollment records separate from identity. A later mobile app can attach shooter accounts to those profiles and explicitly link competition registrations. Never auto-link by name or phone: siblings can share guardian contact details. Preserve existing competition registration/results behavior. Future work includes shooter accounts, history across competitions, coaching programs and app integration; none of those are part of this rollout. Reusable server services sit behind JSON APIs so future authentication can reuse the same rules.
