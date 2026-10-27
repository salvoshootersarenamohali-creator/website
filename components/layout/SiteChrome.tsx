"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "./Header"
import { Footer } from "./Footer"

export function SiteChrome({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    if (pathname === "/range" || pathname.startsWith("/range/")) return <main className="flex-grow">{children}</main>
    return <><Header /><main className="flex-grow pt-20">{children}</main><Footer /></>
}
