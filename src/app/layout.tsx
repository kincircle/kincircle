import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getAppBaseUrl } from "@/lib/env";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: "KinCircle — gather the people who matter",
  description: "Plan your family reunion together. Invites, dates, and a meeting spot that works for everyone.",
  openGraph: {
    title: "KinCircle — gather the people who matter",
    description:
      "Plan your family reunion together. Invites, dates, and a meeting spot that works for everyone.",
    siteName: "KinCircle",
    type: "website",
    images: [
      {
        url: "/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_8fd89a70be.jpeg",
        width: 1200,
        height: 630,
        alt: "A family gathering outdoors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KinCircle — gather the people who matter",
    description:
      "Plan your family reunion together. Invites, dates, and a meeting spot that works for everyone.",
    images: [
      "/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_8fd89a70be.jpeg",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
