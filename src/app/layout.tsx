import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { logout } from "@/actions/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Utilities Tracker",
  description: "Personal home utilities tracker",
};

// viewportFit: "cover" enables env(safe-area-inset-bottom) for iOS safe area
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Logout button — top-right corner, accessible from every authenticated page */}
        {/* Phase 4 will style this properly; here it is functional and minimal */}
        <div className="fixed top-2 right-3 z-50">
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors active:opacity-70"
            >
              Log out
            </button>
          </form>
        </div>
        {/* pb-20 = 80px bottom padding clears the 64px fixed bottom nav */}
        <main className="min-h-screen pb-20">{children}</main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
