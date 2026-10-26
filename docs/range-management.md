# Range management

Private staff workspace: `/range`, sign in: `/range/login`. Competition PINs never authorize this workspace. Accounts are owner-managed; there is no public sign-up.

## Owner setup / recovery

Apply migrations and generate Prisma Client first. In a trusted interactive terminal with the intended `DATABASE_URL` set, run `node scripts/range-owner.mjs`. The command asks for name, phone, and a hidden password, creates or resets an owner, and revokes previous sessions. It refuses to promote an existing coach phone. Do not pass passwords on the command line or commit them. Process-only `RANGE_OWNER_NAME`, `RANGE_OWNER_PHONE`, and `RANGE_OWNER_PASSWORD` also support secure provisioning. No owner password is seeded or built into the app.

Use Staff & locations to create coaches, assign locations, disable accounts, or issue temporary passwords. Coaches must change temporary passwords before accessing operational records. Password resets and deactivation revoke sessions. Sessions expire after seven days. Five login attempts per phone or thirty per IP within fifteen minutes trigger a cooldown. Passwords use salted scrypt (N=32768, r=8, p=3).

Only Zirakpur is seeded. Owners can add Mohali later and assign existing staff. All operational APIs must check both the authenticated actor and location assignment server-side. Audit records exclude credentials. New features are developed, tested, committed and pushed independently; confirm each deployment before starting the next feature.

## Future app / shooter compatibility

Student records will have stable shooter profile IDs independent of staff credentials, with location enrollment records separate from identity. A later mobile app can attach shooter accounts to those profiles and explicitly link competition registrations. Never auto-link by name or phone: siblings can share guardian contact details. Preserve existing competition registration/results behavior. Future work includes shooter accounts, history across competitions, coaching programs and app integration; none of those are part of this rollout. Reusable server services sit behind JSON APIs so future authentication can reuse the same rules.
