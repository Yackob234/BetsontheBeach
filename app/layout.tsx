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
import { Home, Dices, Trophy, User } from "lucide-react";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Betting on the Beach",
  description: "The fastest way to lose money",
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
            <div className="flex-1 w-full flex flex-col gap-8 items-center">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                  <div className="flex gap-3 md:gap-5 items-center font-semibold">
                    <nav className="flex items-center gap-2 md:gap-3">
                      <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity p-2 md:p-0">
                        <Home size={20} className="md:hidden flex-shrink-0" />
                        <span className="hidden md:inline text-sm">My Bets</span>
                      </Link>
                      <Link href="/betting" className="flex items-center gap-2 hover:opacity-70 transition-opacity p-2 md:p-0">
                        <Dices size={20} className="md:hidden flex-shrink-0" />
                        <span className="hidden md:inline text-sm">Betting</span>
                      </Link>
                      <Link href="/leaderboard" className="flex items-center gap-2 hover:opacity-70 transition-opacity p-2 md:p-0">
                        <Trophy size={20} className="md:hidden flex-shrink-0" />
                        <span className="hidden md:inline text-sm">Leaderboard</span>
                      </Link>
                      <Link href="/profile" className="flex items-center gap-2 hover:opacity-70 transition-opacity p-2 md:p-0">
                        <User size={20} className="md:hidden flex-shrink-0" />
                        <span className="hidden md:inline text-sm">Profile</span>
                      </Link>
                      <div className="ml-2 md:ml-0">
                        <ThemeSwitcher />
                      </div>
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
