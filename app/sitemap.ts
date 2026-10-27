import type { MetadataRoute } from "next"
import { courses } from "@/data/courses"
import { techniques } from "@/data/techniques"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site"

// Read publication settings at request time, without requiring a database at build time.
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const paths = [
        "",
        "/about",
        "/coaching",
        "/competitions",
        "/contact",
        "/corporate",
        "/courses",
        "/facilities",
        "/gallery",
        "/shop",
        "/technique",
        ...courses.map((course) => `/courses/${course.slug}`),
        ...techniques.map((technique) => `/technique/${technique.slug}`),
    ]
    const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${SITE_URL}${path}` }))
    const competitions = await prisma.competition.findMany({
        where: { isPublished: true },
        select: {
            slug: true,
            updatedAt: true,
            registrationOpen: true,
            resultsPublished: true,
        },
        orderBy: { slug: "asc" },
    })

    // Use competition-specific URLs instead of the changing /register and /results aliases.
    for (const competition of competitions) {
        const url = `${SITE_URL}/competitions/${competition.slug}`
        entries.push({ url, lastModified: competition.updatedAt })

        if (competition.registrationOpen) {
            entries.push({ url: `${url}/register`, lastModified: competition.updatedAt })
        }
        if (competition.resultsPublished) {
            // Scores can change independently of the competition's updatedAt timestamp.
            entries.push({ url: `${url}/results` })
        }
    }

    return entries
}
