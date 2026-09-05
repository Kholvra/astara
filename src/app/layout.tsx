import "~/styles/globals.css";

import { Plus_Jakarta_Sans } from "next/font/google";
import { type Metadata } from "next";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Astara - Explainable TransJakarta Transit Companion",
  description: "Navigasi TransJakarta yang tenang, pasti, dan jelas langkah fisiknya.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased text-slate-800 bg-[#070b14]">
        {children}
      </body>
    </html>
  );
}