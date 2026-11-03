import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
const db = new PrismaClient()
try {
    if (process.env.RANGE_FINANCE_OPERATION === 'inspect') {
        const accounts = await db.rangeUser.findMany({ where: { OR: [{ role: 'owner' }, { username: process.env.RANGE_FINANCE_USERNAME || 'sachin' }] }, select: { id: true, name: true, username: true, phone: true, role: true, active: true }, orderBy: { name: 'asc' } })
        console.log(JSON.stringify({ accounts: accounts.map(({ phone, ...account }) => ({ ...account, ...(process.env.RANGE_EXPECTED_PHONE_HASH ? { matchesExpectedPhone: createHash('sha256').update(phone || '').digest('hex') === process.env.RANGE_EXPECTED_PHONE_HASH } : {}) })) }))
    } else {
        const masterId = process.env.RANGE_MASTER_ID
        const username = (process.env.RANGE_FINANCE_USERNAME || '').trim().toLowerCase()
        const name = (process.env.RANGE_FINANCE_NAME || '').trim()
        const hash = process.env.RANGE_FINANCE_PASSWORD_HASH
        if (!masterId || !/^[a-z][a-z0-9._-]{2,31}$/.test(username) || !name || name.length > 100 || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash || '')) throw new Error('Provide the verified master ID, finance username, display name, and salted temporary-password hash.')
        const result = await db.$transaction(async tx => {
            const master = await tx.rangeUser.findUnique({ where: { id: masterId } })
            if (!master || master.role !== 'owner' || !master.active) throw new Error('The selected master must be an existing active owner.')
            const currentMaster = await tx.rangeUser.findFirst({ where: { isMaster: true } })
            if (currentMaster && currentMaster.id !== masterId) throw new Error('Another master account is already configured. No access was changed.')
            const existing = await tx.rangeUser.findUnique({ where: { username } })
            if (existing && existing.role !== 'finance') throw new Error('That username belongs to another account. No access was changed.')
            const [{ since }] = await tx.$queryRawUnsafe('SELECT CURRENT_TIMESTAMP AS "since"')
            await tx.rangeUser.update({ where: { id: masterId }, data: { isMaster: true, ...(master.financeNotificationSince ? {} : { financeNotificationSince: since }) } })
            if (existing) return { created: false, username, master: master.name }
            const locations = await tx.rangeLocation.findMany({ where: { active: true }, select: { id: true } })
            if (!locations.length) throw new Error('Create an active range location first.')
            const user = await tx.rangeUser.create({ data: { name, username, role: 'finance', passwordHash: hash, mustChangePassword: true, memberships: { create: locations.map(location => ({ locationId: location.id })) } } })
            await tx.rangeAudit.create({ data: { actorId: masterId, action: 'finance.access.created', entityId: user.id, after: { id: user.id, name, username, role: 'finance', locationIds: locations.map(location => location.id) } } })
            return { created: true, username, master: master.name }
        }, { isolationLevel: 'Serializable', timeout: 30000, maxWait: 15000 })
        console.log(JSON.stringify({ ...result, passwordChangeRequired: true, existingCredentialsPreserved: !result.created }))
    }
} catch (error) { console.error(error.code ? `Provisioning failed (${error.code}).` : error.message); process.exitCode = 1 }
finally { await db.$disconnect() }
