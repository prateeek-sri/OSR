import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "IDR — Intelligent Developer Roadmap",
  description:
    "AI-powered GitHub profile analyzer that maps your skills, identifies gaps, and matches you with open-source issues to accelerate your career.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
