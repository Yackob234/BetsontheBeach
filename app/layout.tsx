import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col gap-10 items-center">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                  <div className="flex gap-5 items-center font-semibold">
                    <nav className="flex items-center gap-3">
                      <Link href="/" className="text-sm hover:underline">
                        My Bets
                      </Link>
                      <Link href="/betting" className="text-sm hover:underline">
                        Betting
                      </Link>
                      <Link href="/leaderboard" className="text-sm hover:underline">
                        Leaderboard
                      </Link>
                      <Link href="/profile" className="text-sm hover:underline">
                        Profile
                      </Link>
                      <ThemeSwitcher />
                    </nav>
                  </div>
                  {!hasEnvVars ? (
                    <EnvVarWarning />
                  ) : (
                    <Suspense>
                      <AuthButton />
                    </Suspense>
                  )}
                </div>
              </nav>
              <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
                <Suspense
                  fallback={
                    <div className="rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">
                      Loading content...
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </div>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
