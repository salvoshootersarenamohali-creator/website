"use client"

import { useCallback, useEffect, useRef } from "react"

// All automatic refreshes use one timer, scheduled after the request settles.
export function usePolling(load: (signal: AbortSignal) => Promise<boolean | void>, interval: number, enabled = true) {
    const action = useRef<() => Promise<void>>(async () => {})
    useEffect(() => {
        if (!enabled) return
        let stopped = false
        let controller: AbortController | undefined
        let timer: ReturnType<typeof setTimeout> | undefined
        let nextAt = 0
        let failures = 0
        async function run(force: boolean) {
            if (stopped || document.hidden || !navigator.onLine) return
            if (controller) {
                if (!force) return
                controller.abort()
            }
            if (!force && Date.now() < nextAt) return
            clearTimeout(timer)
            const request = new AbortController()
            controller = request
            try {
                const success = await load(request.signal)
                if (request.signal.aborted) return
                failures = success === false ? failures + 1 : 0
            } catch {
                if (!request.signal.aborted) failures++
            } finally {
                if (controller === request && !stopped) {
                    controller = undefined
                    const delay = Math.min(interval * 2 ** Math.min(failures, 3), 120_000)
                    nextAt = Date.now() + delay
                    timer = setTimeout(() => { void run(false) }, delay)
                }
            }
        }
        const manual = () => run(true)
        const wake = () => { void run(false) }
        const reconnect = () => { void run(true) }
        action.current = manual
        void Promise.resolve().then(wake)
        document.addEventListener("visibilitychange", wake)
        window.addEventListener("focus", wake)
        window.addEventListener("online", reconnect)
        return () => {
            stopped = true
            clearTimeout(timer)
            controller?.abort()
            if (action.current === manual) action.current = async () => {}
            document.removeEventListener("visibilitychange", wake)
            window.removeEventListener("focus", wake)
            window.removeEventListener("online", reconnect)
        }
    }, [load, interval, enabled])
    return useCallback(() => action.current(), [])
}
