"use client"

import { useCallback, useState } from "react"
import { flushSync } from "react-dom"
import { usePolling } from "./use-polling"

export function useCompetitorCard(slug: string, keys: string[]) {
    const cardKeys = keys.join(",")
    const [serviceById, setServiceById] = useState<Record<string, boolean>>({})
    const [printing, setPrinting] = useState(false)
    const [printError, setPrintError] = useState("")
    const readStatus = useCallback(async (signal?: AbortSignal) => {
        const response = await fetch(`/api/competitions/${encodeURIComponent(slug)}/card-status`, {
            method: "POST", headers: { "Content-Type": "application/json" }, signal,
            body: JSON.stringify({ cardKeys: cardKeys.split(",") }),
        })
        if (!response.ok) throw new Error("Unable to refresh the card. Please try printing again.")
        const { cards }: { cards: { id: string; isService: boolean }[] } = await response.json()
        if (cards.length !== cardKeys.split(",").length) throw new Error("This registration is no longer available to print.")
        return Object.fromEntries(cards.map(card => [card.id, card.isService]))
    }, [slug, cardKeys])
    const refresh = useCallback(async (signal: AbortSignal) => {
        try {
            const status = await readStatus(signal)
            if (!signal.aborted) setServiceById(status)
            return true
        } catch { return false }
    }, [readStatus])
    usePolling(refresh, 60_000, Boolean(cardKeys) && !printing)

    async function printCard() {
        setPrinting(true)
        setPrintError("")
        try {
            const status = await readStatus()
            flushSync(() => setServiceById(status))
            window.print()
        } catch (error) {
            setPrintError(error instanceof Error ? error.message : "Unable to refresh the card.")
        } finally {
            setPrinting(false)
        }
    }
    return { serviceById, printing, printError, printCard }
}
