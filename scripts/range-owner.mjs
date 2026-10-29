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
    const username = process.env.RANGE_OWNER_USERNAME?.trim().toLowerCase() || null
    if (username && !/^[a-z][a-z0-9._-]{2,31}$/.test(username)) throw new Error('Username must contain 3–32 letters, numbers, dots, underscores or hyphens, starting with a letter.')
    const raw = username ? null : process.env.RANGE_OWNER_PHONE || await rl.question('Phone (Indian 10 digits, or +country code): ')
    const normalized = raw?.replace(/[\s()-]/g, '') || null
    const phone = normalized && /^\d{10}$/.test(normalized) ? `+91${normalized}` : normalized
    if ((!username && !/^\+[1-9]\d{7,14}$/.test(phone || '')) || !name.trim() || name.trim().length > 100) throw new Error('Valid name and username or phone required.')
    const temporary = process.env.RANGE_OWNER_TEMPORARY === 'true'
    const createOnly = process.env.RANGE_OWNER_CREATE_ONLY === 'true'
    let passwordHash = process.env.RANGE_OWNER_PASSWORD_HASH
    if (passwordHash) {
        if (!temporary || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash)) throw new Error('A valid scrypt hash and a mandatory password change are required.')
    } else {
        const password = process.env.RANGE_OWNER_PASSWORD || await hiddenPassword()
        if (password.length < (temporary ? 1 : 12) || password.length > 128) throw new Error(temporary ? 'Temporary password must contain 1–128 characters.' : 'Password must contain 12–128 characters.')
        const salt = randomBytes(16).toString('hex')
        const hash = await promisify(callbackScrypt)(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 })
        passwordHash = `scrypt$${salt}$${hash.toString('hex')}`
    }
    const where = username ? { username } : { phone }
    const created = await prisma.$transaction(async tx => {
        const existing = await tx.rangeUser.findUnique({ where })
        if (existing && existing.role !== 'owner') throw new Error('That sign-in belongs to a coach. Use a different owner sign-in.')
        if (existing && createOnly) return false
        const data = { name: name.trim(), phone, username, passwordHash, role: 'owner', mustChangePassword: temporary }
        const user = createOnly ? await tx.rangeUser.create({ data }) : await tx.rangeUser.upsert({ where, create: data, update: { name: name.trim(), passwordHash, active: true, mustChangePassword: temporary } })
        await tx.rangeSession.deleteMany({ where: { userId: user.id } })
        await tx.rangeAudit.create({ data: { actorId: user.id, action: existing ? 'owner.recovered' : 'owner.created', entityId: user.id } })
        return true
    })
    console.log(created ? `Owner account ready. Sign in at /range/login.${temporary ? ' A password change is required before workspace access.' : ''} Previous sessions have been revoked.` : 'Owner already exists. Its password and sessions have been preserved.')
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { rl.close(); await prisma.$disconnect() }
