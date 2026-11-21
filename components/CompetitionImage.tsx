import Image, { type ImageProps } from "next/image"

// Historic competition records can contain external artwork or local receipt previews.
export default function CompetitionImage(props: ImageProps) {
    const src = props.src
    let direct = false
    if (typeof src === "string" && /^https?:/.test(src)) {
        const url = new URL(src)
        const [, cloud, resource, delivery] = url.pathname.split("/")
        direct = url.origin !== "https://res.cloudinary.com" || resource !== "image" || delivery !== "upload"
            || !["dyvrbvd5r", process.env.NEXT_PUBLIC_IMAGE_CLOUD].includes(cloud)
    }
    return <Image {...props} unoptimized={props.unoptimized || direct} />
}
