import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"
import { deleteMoneyAccount } from "@/lib/range/accounts"
import type { RangeActor } from "@/lib/range/shared"

const db = vi.hoisted(() => ({ transaction: vi.fn(), account: vi.fn(), remove: vi.fn(), location: vi.fn(), audit: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: db.transaction } }))

const owner: RangeActor = { id: "owner", role: "owner", name: "Owner", phone: "+919000000001", mustChangePassword: false }
const account = { id: "mistake", locationId: "range", name: "Duplicate cash account", custodian: "salvo", coachId: null, channel: "cash", openingPaise: 75000, openingDate: "2026-10-01", active: true, version: 3 }
const input = { id: account.id, locationId: account.locationId, version: account.version, confirmName: account.name, reason: "Duplicate account created by mistake" }
const tx = { rangeMoneyAccount: { findUnique: db.account, deleteMany: db.remove }, rangeLocation: { findUnique: db.location }, rangeAudit: { create: db.audit } }
function request(patch: Record<string, unknown> = {}) { return new NextRequest("http://localhost/api/range/finance/accounts/delete", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify({ ...input, ...patch }) }) }

beforeEach(() => {
    vi.resetAllMocks()
    db.transaction.mockImplementation(async work => work(tx))
    db.account.mockResolvedValue({ ...account, _count: { movements: 0, transfersFrom: 0, transfersTo: 0 } })
    db.location.mockResolvedValue({ id: "range", active: true })
    db.remove.mockResolvedValue({ count: 1 })
    db.audit.mockResolvedValue({ id: "audit" })
})

describe("mistaken financial account deletion", () => {
    it("lets an owner delete an unused account and audits the opening balance atomically", async () => {
        const response = await deleteMoneyAccount(request(), owner)
        expect(await response.json()).toEqual({ ok: true })
        expect(db.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable", timeout: 15000 })
        expect(db.remove).toHaveBeenCalledWith({ where: { id: "mistake", locationId: "range", version: 3 } })
        expect(db.audit).toHaveBeenCalledWith({ data: { actorId: owner.id, action: "finance.account.deleted", entityId: account.id, locationId: account.locationId, before: account, after: undefined, reason: input.reason } })
    })
    it("rejects coaches before accessing any account", async () => {
        await expect(deleteMoneyAccount(request(), { ...owner, role: "coach" })).rejects.toMatchObject({ status: 403 })
        expect(db.transaction).not.toHaveBeenCalled()
        expect(db.remove).not.toHaveBeenCalled()
    })
    it.each([0, undefined, 1.5, "3"])("requires a valid version (%s)", async version => {
        await expect(deleteMoneyAccount(request({ version }), owner)).rejects.toMatchObject({ status: 409 })
        expect(db.remove).not.toHaveBeenCalled()
    })
    it("rejects stale account versions", async () => {
        await expect(deleteMoneyAccount(request({ version: 2 }), owner)).rejects.toMatchObject({ status: 409 })
        expect(db.remove).not.toHaveBeenCalled()
    })
    it.each([{ reason: "" }, { confirmName: "" }, { confirmName: "Another account" }, { id: "" }])("requires a reason and exact name confirmation: %j", async patch => {
        await expect(deleteMoneyAccount(request(patch), owner)).rejects.toMatchObject({ status: 400 })
        expect(db.remove).not.toHaveBeenCalled()
    })
    it("rejects missing accounts", async () => {
        db.account.mockResolvedValue(null)
        await expect(deleteMoneyAccount(request(), owner)).rejects.toMatchObject({ status: 404 })
        expect(db.remove).not.toHaveBeenCalled()
    })
    it("cannot delete an account at a different location", async () => {
        db.account.mockResolvedValue({ ...account, locationId: "another-range", _count: { movements: 0, transfersFrom: 0, transfersTo: 0 } })
        await expect(deleteMoneyAccount(request(), owner)).rejects.toMatchObject({ status: 404 })
        expect(db.remove).not.toHaveBeenCalled()
    })
    it("rejects inactive or missing locations", async () => {
        db.location.mockResolvedValue({ id: "range", active: false })
        await expect(deleteMoneyAccount(request(), owner)).rejects.toMatchObject({ status: 404 })
        expect(db.account).not.toHaveBeenCalled()
    })
    it.each(["movements", "transfersFrom", "transfersTo"])("preserves history when %s exist, regardless of record status", async relation => {
        db.account.mockResolvedValue({ ...account, _count: { movements: 0, transfersFrom: 0, transfersTo: 0, [relation]: 1 } })
        await expect(deleteMoneyAccount(request(), owner)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("deactivate") })
        expect(db.remove).not.toHaveBeenCalled()
        expect(db.audit).not.toHaveBeenCalled()
    })
    it("rejects concurrent account changes without writing a deletion audit", async () => {
        db.remove.mockResolvedValue({ count: 0 })
        await expect(deleteMoneyAccount(request(), owner)).rejects.toMatchObject({ status: 409 })
        expect(db.audit).not.toHaveBeenCalled()
    })
    it("reports a concurrent financial reference as protected history", async () => {
        db.remove.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Foreign key constraint", { code: "P2003", clientVersion: "6.19.3" }))
        await expect(deleteMoneyAccount(request(), owner)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("deactivate") })
        expect(db.audit).not.toHaveBeenCalled()
    })
    it("retries serializable conflicts and records one successful deletion", async () => {
        db.remove.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Write conflict", { code: "P2034", clientVersion: "6.19.3" }))
        expect((await deleteMoneyAccount(request(), owner)).status).toBe(200)
        expect(db.transaction).toHaveBeenCalledTimes(2)
        expect(db.audit).toHaveBeenCalledTimes(1)
    })
})
