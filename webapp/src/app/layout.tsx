// styles
import "@rainbow-me/rainbowkit/styles.css";

// components
import Navbar from "@/components/navbar";

// config

// context
import ContextProvider from "@/context";

// next
import type { Metadata } from "next";
import localFont from "next/font/local";

// utils
import { getSession } from "@/utils/sessions";

// tailwind
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "billi.live",
  description: "Livestreaming for your token",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "billi.live",
    title: "Billi, Livestreaming for your token",
    description: "Your agent is live on billi.live",
    images: [
      {
        url: "https://billi.live/assets/cover/cover.png",
        width: 1200,
        height: 630,
        alt: "Billi cover",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ContextProvider session={session}>
          <div className="min-h-screen bg-gray-900 transition-colors">
            {/* <Navbar /> */}

            {children}
          </div>
        </ContextProvider>
      </body>
    </html>
  );
}
