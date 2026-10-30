# Student training portal

Students sign in at `/range/login` and open `/range/student`. Owners and coaches use **Training & progress** in `/range`. Dates use India Standard Time. Training identity and access follow a stable shooter profile across locations; range attendance and fee enrollment remain separate.

## Setup and daily use

1. Add existing or new students through **Students & attendance**. Siblings may share contact phone numbers.
2. As owner, open **Training & progress → Student access**, select a student, create a unique username and temporary password, and select their coaches. Passwords require at least 12 characters. Share initial credentials privately; students must change them before accessing training records.
3. As coach, choose a training date, tick students or select the entire assigned roster, and write instructions or attach documents. Preview existing plans, select replacements explicitly, and customize individual instructions or documents. “Edit this existing plan” loads its current content into the editor. There is one shared daily plan for each student; every assigned coach can edit it.
4. Students record any number of sessions per day, with or without a plan. Notes, duration, shot count, score/maximum, and target images build their history. A score always requires a positive maximum. Zero is a recorded score; blank metrics remain missing. Historical entries can be edited; future diary dates are rejected.
5. Coaches browse sessions, add their own remarks, and mark the current version reviewed. Review filters apply to the viewing coach's reviews. Student changes retain prior versions and remarks and show **Changed since review**. Each coach can review the new version independently.
6. Progress shows session score trends by discipline, raw scores with matching maxima, daily session frequency, minutes, and shot counts. Period percentages use total score divided by total possible score, rather than averaging session percentages. Only latest session revisions contribute. “View values” provides the numbers behind each graph.

The owner can reset or disable student accounts. Resets and deactivation revoke sessions. Removing a coach's assignment removes access to all of that student's training, including old plans, target files and diary revisions. Existing remarks remain attributed to the original coach. Students retain history while their account remains active, even after range enrollment ends.

## Private files

Use the existing `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` configuration. Enable PDF delivery in the Cloudinary product environment if it is restricted by the account. Verify actual PDF and image delivery before launch.

Plans allow five PDF/JPG/PNG/WEBP attachments; sessions allow ten JPG/PNG/WEBP target images. Each file is uploaded separately and must be at most 3,000,000 bytes. The server checks file signatures; Cloudinary decodes accepted image formats. Photos have their metadata stripped. Students may choose camera or gallery images; no camera permission is required merely to use the diary.

Files use authenticated storage, with asset metadata in PostgreSQL. Every view request checks current access before issuing a 60-second URL; a link already issued may remain usable for its remaining lifetime. Short-lived URLs and storage credentials are never stored in plan/session records or audit snapshots. Images linked to historical revisions are retained.

Unattached uploads expire after 24 hours. Each later upload cleans up to 20 expired, unattached assets. Interrupted uploads and database failures trigger compensating storage cleanup; cleanup failures are logged without credentials and retried on subsequent uploads. This opportunistic cleanup requires subsequent upload traffic; no background scheduler is introduced.

## API and persistence

All paths below start with `/api/range/training/`. They use the existing session cookie, same-origin mutation checks, mandatory-password gate, and `private, no-store` responses.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `roster` | GET | Minimal accessible student roster, account status and assigned coaches |
| `accounts` | POST | Owner creates, resets or disables a linked student account |
| `assignments` | GET, POST | Owner lists active coaches and updates a student's assigned coaches |
| `plans/preview` | POST | Check selected students and existing plans before bulk assignment |
| `plans` | GET, POST | Paginated daily plans and atomic bulk create/replace |
| `plans/history` | GET | All revisions of an authorized plan |
| `sessions` | GET, POST | Filtered/paginated history and student-only diary writes |
| `sessions/history` | GET | Session revisions, linked plans and remark revisions |
| `reviews` | POST | Staff saves its own remarks and review state |
| `media` | GET, POST | Authorized delivery and individual staged uploads |
| `analytics` | GET | Latest-revision records, daily series and weighted period summaries |

Owner/student access is checked per profile; coach access requires a current explicit assignment. Supplied profile IDs cannot change a student's identity. Student accounts are rejected before staff attendance, finance, fees, reports or administration handlers run.

JSON mutations require `submissionKey`; repeat identical requests with the same key after uncertain network outcomes. Changed content needs a new key. Edits require the current `version` (zero for new records), and reviews also require `sessionVersion`. Existing plans additionally require `replace: true`. Conflicts return 409 and require refreshing. Bulk assignment commits all selected changes or none. Lists use 50-record pages; the lightweight roster includes all accessible student IDs so selection persists across UI pages.

Apply the additive migration and regenerate Prisma Client before running the feature. The database enforces unique account/profile links, coach/profile pairs, student/date plans and record revision numbers. Operational changes retain audit attribution; passwords and password hashes are excluded from audits.

## Verification and rollout

Run migrations and integration tests on disposable local PostgreSQL with matching `DATABASE_URL` and `TEST_DATABASE_URL`, then run `npm run lint` and `npm run build`. The existing deployment workflow performs migration and test checks on disposable PostgreSQL before production migration/build/deploy. No real students, accounts, coaches, passwords or training records are seeded by this feature.

Before enabling production use, verify shared sign-in, first-password change, roster selection across pages, bulk replacements, plan PDFs, target photos, remarks and progress on Android Chrome and iPhone Safari over HTTPS. Cloudinary calls are mocked in automated integration tests; actual storage credentials, browser camera/gallery handling and link expiry need live acceptance checks.

Notifications, recurring schedules, reusable template libraries, shot-by-shot records, automatic target scoring and competition-result imports are not included.
