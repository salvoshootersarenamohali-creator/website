import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Salvo Shooters Arena - Premium Shooting Academy",
  description: "Forging champions through precision, discipline, and advanced technique training in Mohali.",
  icons: {
    // Refresh icons cached while the site used competition branding.
    icon: [
      { url: "/favicon.ico?v=salvo-s-20261027", sizes: "any" },
      { url: "/favicon-16x16.png?v=salvo-s-20261027", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=salvo-s-20261027", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=salvo-s-20261027",
    apple: [{ url: "/apple-touch-icon.png?v=salvo-s-20261027", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${outfit.variable} antialiased bg-black text-foreground min-h-screen flex flex-col font-sans selection:bg-primary selection:text-black`}
      >
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
