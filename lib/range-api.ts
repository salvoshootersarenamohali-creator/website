const pendingReads = new Map<string, Promise<unknown>>()

async function request(path: string, body?: unknown) {
    const response = await fetch(`/api/range/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        cache: "no-store",
    })
    const data = await response.json()
    if (!response.ok) {
        if (response.status === 401 && !path.startsWith("login") && typeof window !== "undefined") window.location.assign("/range/login")
        throw new Error(data.error || "Unable to complete request.")
    }
    return data
}

export function rangeApi<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
    if (body !== undefined) {
        // A read started before or during a write must not satisfy its refresh.
        pendingReads.clear()
        return request(path, body).finally(() => pendingReads.clear())
    }
    const pending = pendingReads.get(path)
    if (pending) return pending as Promise<T>
    const promise = request(path).finally(() => {
        if (pendingReads.get(path) === promise) pendingReads.delete(path)
    })
    pendingReads.set(path, promise)
    return promise
}
