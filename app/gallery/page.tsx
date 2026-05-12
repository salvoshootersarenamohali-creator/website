import Image from "next/image"
import { Play, Sparkles } from "lucide-react"
import galleryManifest from "@/public/gallery/manifest.json"

type GalleryItem = {
    type: "image" | "video"
    src: string
    title: string
    width?: number
    height?: number
}

const galleryItems = galleryManifest as GalleryItem[]

const labels = [
    "Range Practice",
    "Competition",
    "Training",
    "Achievements",
    "Community",
    "Coaching",
]

export default function GalleryPage() {
    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_15%_8%,rgba(24,91,78,0.26),transparent_30rem),radial-gradient(circle_at_85%_18%,rgba(212,175,55,0.18),transparent_28rem),#030303] text-white pt-24">
            <section className="container mx-auto px-4 py-16">
                <div className="mx-auto mb-14 max-w-4xl text-center">
                    <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                        <Sparkles className="h-4 w-4" />
                        Salvo Moments
                    </span>
                    <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
                        GALLERY
                    </h1>
                    <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                        A living wall of training sessions, competitions, medals, coaching moments, and the Salvo Shooters Arena community.
                    </p>
                </div>

                <div className="mb-10 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-primary">
                        {galleryItems.filter((item) => item.type === "image").length} Photos
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                        {galleryItems.filter((item) => item.type === "video").length} Video
                    </span>
                </div>

                <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 2xl:columns-4">
                    {galleryItems.map((item, index) => {
                        const label = labels[index % labels.length]

                        return (
                            <article
                                key={`${item.src}-${index}`}
                                className="group mb-5 break-inside-avoid overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-primary/45"
                            >
                                <a href={item.src} target="_blank" rel="noreferrer" className="block">
                                    <div className="relative overflow-hidden bg-black">
                                        {item.type === "image" ? (
                                            <Image
                                                src={item.src}
                                                alt={`${label} at Salvo Shooters Arena`}
                                                width={item.width ?? 1200}
                                                height={item.height ?? 900}
                                                sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                                className="h-auto w-full object-cover transition duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <video
                                                src={item.src}
                                                className="h-auto w-full"
                                                controls
                                                muted
                                                playsInline
                                                preload="metadata"
                                            />
                                        )}
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent opacity-80" />
                                        {item.type === "video" && (
                                            <div className="pointer-events-none absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black shadow-lg shadow-primary/25">
                                                <Play className="h-4 w-4 fill-current" />
                                            </div>
                                        )}
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                                                {label}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            </article>
                        )
                    })}
                </div>
            </section>
        </main>
    )
}
