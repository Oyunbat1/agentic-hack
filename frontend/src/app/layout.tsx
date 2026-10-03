import type { Metadata } from "next";
import { JetBrains_Mono, Onest } from "next/font/google";
import "./globals.css";

const sans = Onest({ variable: "--font-sans", subsets: ["latin", "cyrillic"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Сагс — худалдан авалтын агент",
  description: "Таны талд ажилладаг, санадаг хүнсний худалдан авалтын AI агент",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
