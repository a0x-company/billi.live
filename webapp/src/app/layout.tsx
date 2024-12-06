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
