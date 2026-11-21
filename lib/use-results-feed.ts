"use client"

import { useCallback, useRef, useState } from "react"
import { usePolling } from "./use-polling"

export function useResultsFeed<T>(url: string, interval: number, enabled = true) {
    const [payload, setPayload] = useState<T | null>(null)
    const [error, setError] = useState("")
    const [isLoading, setLoading] = useState(true)
    const [isRefreshing, setRefreshing] = useState(false)
    const etag = useRef("")
    const load = useCallback(async (signal: AbortSignal) => {
        setRefreshing(true)
        try {
            const response = await fetch(url, { cache: "no-store", signal,
                headers: etag.current ? { "If-None-Match": etag.current } : {},
            })
            if (response.status !== 304) {
                if (!response.ok) {
                    if (response.status === 404) { etag.current = ""; setPayload(null) }
                    throw new Error((await response.json()).error || "Results unavailable.")
                }
                const data: T = await response.json()
                if (signal.aborted) return
                etag.current = response.headers.get("etag") ?? ""
                setPayload(data)
            }
            setError("")
            return true
        } catch (e) {
            if (!signal.aborted) setError(e instanceof Error ? e.message : "Unable to load results.")
            return false
        } finally {
            if (!signal.aborted) { setLoading(false); setRefreshing(false) }
        }
    }, [url])
    const refresh = usePolling(load, interval, enabled)
    return { payload, error, isLoading, isRefreshing, refresh }
}
