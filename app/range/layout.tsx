import type { ReactNode } from "react"
import "./range.css"
export const metadata = { title: "Range workspace | Salvo", robots: { index: false, follow: false } }
export default function RangeLayout({ children }: { children: ReactNode }) { return <div className="range-app">{children}</div> }
