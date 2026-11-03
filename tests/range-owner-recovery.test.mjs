import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { recoverOwner } from '../scripts/range-owner-recover.mjs'

const phone = '+919000000001'
const expectedPhoneHash = createHash('sha256').update(phone).digest('hex')
const passwordHash = `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}`
const input = { ownerId: 'existing-owner', expectedPhoneHash, passwordHash }
const owner = { id: input.ownerId, phone, username: 'owner', role: 'owner', active: true, isMaster: true, passwordHash: 'previous' }

function database(user = owner, updated = 1) {
    const tx = {
        rangeUser: { findUnique: vi.fn().mockResolvedValue(user), updateMany: vi.fn().mockResolvedValue({ count: updated }) },
        rangeSession: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
        rangeLoginAttempt: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
        rangeAudit: { create: vi.fn().mockResolvedValue({}) },
    }
    return { tx, $transaction: vi.fn(callback => callback(tx)) }
}

describe('trusted owner recovery', () => {
    it.each([
        { ...input, ownerId: '' },
        { ...input, expectedPhoneHash: '' },
        { ...input, passwordHash: 'plaintext-is-not-accepted' },
    ])('rejects incomplete or plaintext recovery inputs before accessing accounts', async invalid => {
        const db = database()
        await expect(recoverOwner(db, invalid)).rejects.toThrow('salted temporary-password hash')
        expect(db.$transaction).not.toHaveBeenCalled()
    })

    it.each([null, { ...owner, role: 'coach' }, { ...owner, active: false }, { ...owner, phone: null }, { ...owner, phone: '+919000000002' }])('refuses a missing, ineligible, or mismatched account without any writes', async user => {
        const db = database(user)
        await expect(recoverOwner(db, input)).rejects.toThrow('existing active owner')
        expect(db.tx.rangeUser.updateMany).not.toHaveBeenCalled()
        expect(db.tx.rangeSession.deleteMany).not.toHaveBeenCalled()
        expect(db.tx.rangeAudit.create).not.toHaveBeenCalled()
    })

    it('aborts when the verified account changes concurrently', async () => {
        const db = database(owner, 0)
        await expect(recoverOwner(db, input)).rejects.toThrow('account changed')
        expect(db.tx.rangeSession.deleteMany).not.toHaveBeenCalled()
        expect(db.tx.rangeAudit.create).not.toHaveBeenCalled()
    })

    it('changes only the verified owner password, requires replacement, revokes sessions, and audits without credentials', async () => {
        const db = database()
        await expect(recoverOwner(db, input)).resolves.toEqual({ recovered: true, ownerId: owner.id, passwordChangeRequired: true, revokedSessions: 2 })
        expect(db.tx.rangeUser.updateMany).toHaveBeenCalledWith({
            where: { id: owner.id, role: 'owner', active: true, phone, passwordHash: owner.passwordHash },
            data: { passwordHash, mustChangePassword: true },
        })
        expect(db.tx.rangeSession.deleteMany).toHaveBeenCalledWith({ where: { userId: owner.id } })
        expect(db.tx.rangeLoginAttempt.deleteMany).toHaveBeenCalledWith({ where: { phoneHash: { in: [phone, owner.username].map(value => createHash('sha256').update(value).digest('hex')) } } })
        expect(db.tx.rangeAudit.create).toHaveBeenCalledWith({ data: { actorId: owner.id, action: 'owner.recovered', entityId: owner.id } })
        expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable', timeout: 30000, maxWait: 15000 })
    })
})
