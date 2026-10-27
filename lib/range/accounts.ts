import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"
import { RangeActor, RangeError, textField } from "./shared"
import { audit, jsonBody, locationAccess, ownerOnly, transaction } from "./server"

const historyMessage = "This account has financial records or handovers and cannot be deleted. Use Edit to deactivate it instead."

export async function deleteMoneyAccount(request: NextRequest, actor: RangeActor) {
    ownerOnly(actor)
    const body = await jsonBody(request)
    const id = textField(body.id, "Account"), locationId = textField(body.locationId, "Location")
    const reason = textField(body.reason, "Reason for deletion", 1000), confirmName = textField(body.confirmName, "Account name confirmation", 100)
    if (!Number.isSafeInteger(body.version) || Number(body.version) < 1) throw new RangeError("Refresh the accounts before deleting.", 409)

    try {
        return Response.json(await transaction(async tx => {
            await locationAccess(actor, locationId, tx)
            const account = await tx.rangeMoneyAccount.findUnique({ where: { id }, include: { _count: { select: { movements: true, transfersFrom: true, transfersTo: true } } } })
            if (!account || account.locationId !== locationId) throw new RangeError("Account not found.", 404)
            if (account.version !== body.version) throw new RangeError("This account changed. Refresh before deleting it.", 409)
            if (confirmName !== account.name) throw new RangeError("Type the account name exactly to confirm deletion.")
            const { _count, ...before } = account
            // Include voided movements and every transfer status: their history must survive.
            if (_count.movements || _count.transfersFrom || _count.transfersTo) throw new RangeError(historyMessage, 409)
            const deleted = await tx.rangeMoneyAccount.deleteMany({ where: { id, locationId, version: account.version } })
            if (deleted.count !== 1) throw new RangeError("This account changed. Refresh before deleting it.", 409)
            await audit(tx, actor, "finance.account.deleted", id, before, undefined, locationId, reason)
            return { ok: true }
        }))
    } catch (error) {
        // A concurrently posted payment/transfer is also protected by restrictive foreign keys.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new RangeError(historyMessage, 409)
        throw error
    }
}
