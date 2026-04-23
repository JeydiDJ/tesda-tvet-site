import type { Metadata } from "next";
import { Manrope, Space_Grotesk, Space_Mono } from "next/font/google";
import { AppShell } from "@/components/navigation/AppShell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TESDA Geographic Intelligence Dashboard",
  description:
    "Interactive TESDA dashboard concept for exploring regional, provincial, and city-level training data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
