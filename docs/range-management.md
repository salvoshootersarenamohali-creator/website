# Range management

Private staff workspace: `/range`, sign in: `/range/login`. Competition PINs never authorize this workspace. Accounts are owner-managed; there is no public sign-up.

## Owner setup / recovery

Apply migrations and generate Prisma Client first. In a trusted interactive terminal with the intended `DATABASE_URL` set, run `node scripts/range-owner.mjs`. The command asks for name, phone, and a hidden password, creates or resets an owner, and revokes previous sessions. It refuses to promote an existing coach phone. Do not pass passwords on the command line or commit them. Process-only `RANGE_OWNER_NAME`, `RANGE_OWNER_PHONE`, and `RANGE_OWNER_PASSWORD` also support secure provisioning. No owner password is seeded or built into the app.

Use Staff & locations to create coaches, assign locations, disable accounts, or issue temporary passwords. Coaches must change temporary passwords before accessing operational records. Password resets and deactivation revoke sessions. Sessions expire after seven days. Five login attempts per phone or thirty per IP within fifteen minutes trigger a cooldown. Passwords use salted scrypt (N=32768, r=8, p=3).

Only Zirakpur is seeded. Owners can add Mohali later and assign existing staff. All operational APIs must check both the authenticated actor and location assignment server-side. Audit records exclude credentials. New features are developed, tested, committed and pushed independently; confirm each deployment before starting the next feature.

## Coach attendance

Use Coach attendance to check in/out. Each punch requires a fresh in-page camera capture and a two-minute, single-use challenge. No file picker or gallery fallback exists. The authoritative timestamp is server receipt, not device time or EXIF. One open shift per coach is enforced across locations by a database unique key. Checkout closes that shift; subsequent check-in starts another. Earlier open shifts remain flagged until checkout/correction. Times display in India time. Camera streams stop on cancel, completion and unmount. Browser camera provenance/liveness cannot be guaranteed.

Cloudinary credentials must be configured. Attendance images are uploaded as authenticated JPEGs, stored as private asset IDs and delivered through owner/self-authorized endpoints with sixty-second download links. Upload failure never commits a punch. Conflicting uploads are cleaned up. Camera tests use mocked storage; actual Android Chrome/iPhone Safari camera permissions and image capture still need device acceptance testing over HTTPS.

Coaches request corrections, including entirely missed shifts. Owners review requests or add/correct times directly with a reason. Optimistic versions reject stale changes, overlaps are rejected, original camera times/photos remain available, and adjustments are labelled. Requests can be rejected with a recorded reason. Each change has an audit record.

## Future app / shooter compatibility

Student records will have stable shooter profile IDs independent of staff credentials, with location enrollment records separate from identity. A later mobile app can attach shooter accounts to those profiles and explicitly link competition registrations. Never auto-link by name or phone: siblings can share guardian contact details. Preserve existing competition registration/results behavior. Future work includes shooter accounts, history across competitions, coaching programs and app integration; none of those are part of this rollout. Reusable server services sit behind JSON APIs so future authentication can reuse the same rules.
