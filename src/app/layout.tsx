import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dark Code Car Rental | Fleet & Back Office ERP",
  description: "Dark Code Solutions vehicle rental, fleet management and back office demo",
  icons: {
    icon: "/darkcode-logo.jpg",
    apple: "/darkcode-logo.jpg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full overflow-x-hidden antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
