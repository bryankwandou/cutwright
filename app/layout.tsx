import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cutwright — a video editor that runs in your browser",
  description:
    "Cut, grade, title and export video without uploading a single byte. No watermark, no account, no subscription. Everything happens on your own machine.",
  applicationName: "Cutwright",
  keywords: [
    "video editor",
    "browser video editor",
    "no watermark",
    "offline video editing",
    "WebCodecs",
    "free video editor",
  ],
  authors: [{ name: "Cutwright" }],
  openGraph: {
    title: "Cutwright — a video editor that runs in your browser",
    description:
      "Cut, grade, title and export video without uploading a single byte. No watermark, no account.",
    type: "website",
    siteName: "Cutwright",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cutwright",
    description: "A video editor that runs entirely in your browser. Nothing uploaded, nothing watermarked.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#08090B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
