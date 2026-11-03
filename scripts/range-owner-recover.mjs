import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const digest = value => createHash('sha256').update(value).digest('hex')

export async function recoverOwner(db, { ownerId, expectedPhoneHash, passwordHash }) {
    if (!ownerId || !/^[a-f0-9]{64}$/.test(expectedPhoneHash || '') || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash || '')) {
        throw new Error('Provide an existing owner ID, its verified phone fingerprint, and a salted temporary-password hash.')
    }
    return db.$transaction(async tx => {
        const user = await tx.rangeUser.findUnique({ where: { id: ownerId } })
        if (!user || user.role !== 'owner' || !user.active || !user.phone || digest(user.phone) !== expectedPhoneHash) {
            throw new Error('The account must be an existing active owner matching the verified phone fingerprint. No access was changed.')
        }
        const updated = await tx.rangeUser.updateMany({
            where: { id: user.id, role: 'owner', active: true, phone: user.phone, passwordHash: user.passwordHash },
            data: { passwordHash, mustChangePassword: true },
        })
        if (updated.count !== 1) throw new Error('The account changed during recovery. Try again after verifying its identity.')
        const revoked = await tx.rangeSession.deleteMany({ where: { userId: user.id } })
        await tx.rangeLoginAttempt.deleteMany({ where: { phoneHash: { in: [user.phone, user.username].filter(Boolean).map(digest) } } })
        await tx.rangeAudit.create({ data: { actorId: user.id, action: 'owner.recovered', entityId: user.id } })
        return { recovered: true, ownerId: user.id, passwordChangeRequired: true, revokedSessions: revoked.count }
    }, { isolationLevel: 'Serializable', timeout: 30000, maxWait: 15000 })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const db = new PrismaClient()
    try {
        console.log(JSON.stringify(await recoverOwner(db, {
            ownerId: process.env.RANGE_RECOVERY_OWNER_ID,
            expectedPhoneHash: process.env.RANGE_RECOVERY_PHONE_HASH,
            passwordHash: process.env.RANGE_RECOVERY_PASSWORD_HASH,
        })))
    } catch (error) {
        console.error(error.code ? `Recovery failed (${error.code}).` : error.message)
        process.exitCode = 1
    } finally {
        await db.$disconnect()
    }
}
