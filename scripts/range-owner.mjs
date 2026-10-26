import { PrismaClient } from '@prisma/client'
import { randomBytes, scrypt as callbackScrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline/promises'
const prisma = new PrismaClient()
const rl = createInterface({ input: process.stdin, output: process.stdout })
async function hiddenPassword() {
    if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal, or set RANGE_OWNER_PASSWORD securely in the process environment.')
    process.stdout.write('Password (12–128 characters, hidden): ')
    rl.close()
    process.stdin.setRawMode(true); process.stdin.resume()
    return new Promise((resolve, reject) => {
        let value = ''
        function read(chunk) { for (const char of chunk.toString()) { if (char === '\u0003') { cleanup(); reject(new Error('Cancelled')); return } if (char === '\r' || char === '\n') { cleanup(); resolve(value); return } if (char === '\u007f' || char === '\b') value = value.slice(0, -1); else value += char } }
        function cleanup() { process.stdin.off('data', read); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n') }
        process.stdin.on('data', read)
    })
}
try {
    const name = process.env.RANGE_OWNER_NAME || await rl.question('Owner name: ')
    const raw = process.env.RANGE_OWNER_PHONE || await rl.question('Phone (Indian 10 digits, or +country code): ')
    const normalized = raw.replace(/[\s()-]/g, '')
    const phone = /^\d{10}$/.test(normalized) ? `+91${normalized}` : normalized
    if (!/^\+[1-9]\d{7,14}$/.test(phone) || !name.trim()) throw new Error('Valid name and phone required.')
    const password = process.env.RANGE_OWNER_PASSWORD || await hiddenPassword()
    if (password.length < 12 || password.length > 128) throw new Error('Password must contain 12–128 characters.')
    const salt = randomBytes(16).toString('hex')
    const hash = await promisify(callbackScrypt)(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 })
    await prisma.$transaction(async tx => {
        const existing = await tx.rangeUser.findUnique({ where: { phone } })
        if (existing && existing.role !== 'owner') throw new Error('That phone belongs to a coach. Use a different owner number.')
        const user = await tx.rangeUser.upsert({ where: { phone }, create: { name: name.trim(), phone, passwordHash: `scrypt$${salt}$${hash.toString('hex')}`, role: 'owner', mustChangePassword: false }, update: { name: name.trim(), passwordHash: `scrypt$${salt}$${hash.toString('hex')}`, active: true, mustChangePassword: false } })
        await tx.rangeSession.deleteMany({ where: { userId: user.id } })
        await tx.rangeAudit.create({ data: { actorId: user.id, action: existing ? 'owner.recovered' : 'owner.created', entityId: user.id } })
    })
    console.log('Owner account ready. Sign in at /range/login. Previous sessions have been revoked.')
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { rl.close(); await prisma.$disconnect() }
