import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contract Finder",
  description: "Find IT contract opportunities matched to your skills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Auto-recover from ChunkLoadErrors caused by stale browser cache after deployments */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (
                  e.message && (
                    e.message.includes('ChunkLoadError') ||
                    e.message.includes('Failed to load chunk') ||
                    e.message.includes('Loading chunk') ||
                    e.message.includes('Unexpected token')
                  )
                ) {
                  var key = 'chunkReloadAttempt';
                  var attempts = parseInt(sessionStorage.getItem(key) || '0');
                  if (attempts < 3) {
                    sessionStorage.setItem(key, attempts + 1);
                    window.location.reload();
                  }
                }
              });
              // Reset reload counter on successful full load
              window.addEventListener('load', function() {
                sessionStorage.removeItem('chunkReloadAttempt');
              });
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
