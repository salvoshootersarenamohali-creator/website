import type { NextConfig } from "next"

const clouds = new Set(["dyvrbvd5r", ...(process.env.CLOUDINARY_CLOUD_NAME ? [process.env.CLOUDINARY_CLOUD_NAME] : [])])
const nextConfig: NextConfig = {
    images: {
        remotePatterns: Array.from(clouds, cloud => ({
            protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloud}/image/upload/**`,
        })),
    },
    env: { NEXT_PUBLIC_IMAGE_CLOUD: process.env.CLOUDINARY_CLOUD_NAME ?? "" },
}

export default nextConfig
