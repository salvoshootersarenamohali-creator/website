"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Crosshair, Facebook, Instagram, Twitter, Mail, MapPin, Phone } from "lucide-react"

export function Footer() {
    const pathname = usePathname()

    if (pathname === "/results/tv") return null

    return (
        <footer className="bg-black border-t border-white/10 pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Crosshair className="h-6 w-6 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tighter text-white leading-none">
                                    SALVO
                                </span>
                            </div>
                        </Link>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                            Premier shooting academy in Mohali. Dedicated to forging champions through precision, discipline, and advanced technique training.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary transition-colors">
                                <Instagram className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary transition-colors">
                                <Facebook className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary transition-colors">
                                <Twitter className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Academy</h3>
                        <ul className="space-y-3">
                            <li><Link href="/courses" className="text-muted-foreground hover:text-primary transition-colors text-sm">Courses</Link></li>
                            <li><Link href="/coaching" className="text-muted-foreground hover:text-primary transition-colors text-sm">Coaching</Link></li>
                            <li><Link href="/facilities" className="text-muted-foreground hover:text-primary transition-colors text-sm">Facilities</Link></li>
                            <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</Link></li>
                        </ul>
                    </div>

                    {/* Technique */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Technique</h3>
                        <ul className="space-y-3">
                            <li><Link href="/technique/10m-air-pistol" className="text-muted-foreground hover:text-primary transition-colors text-sm">10m Air Pistol</Link></li>
                            <li><Link href="/technique/10m-air-rifle" className="text-muted-foreground hover:text-primary transition-colors text-sm">10m Air Rifle</Link></li>
                            <li><Link href="/technique" className="text-muted-foreground hover:text-primary transition-colors text-sm">Resource Library</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Contact</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                <MapPin className="h-5 w-5 text-primary shrink-0" />
                                <span>SCO 15, Preet City, opp. water tank,<br />Sector 86, Sahibzada Ajit Singh Nagar,<br />Punjab 140308</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4 text-primary shrink-0" />
                                <span>+91 97003 30076</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4 text-primary shrink-0" />
                                <span>info@salvoarena.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Salvo Shooters Arena. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="text-xs text-muted-foreground hover:text-white">Privacy Policy</Link>
                        <Link href="/terms" className="text-xs text-muted-foreground hover:text-white">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
