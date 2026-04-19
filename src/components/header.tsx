"use client";

import * as React from "react";
import Link from "next/link";
import { Search, LogOut, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchDialog } from "@/components/search-dialog";
import { AuthDialog } from "@/components/auth-dialog";

interface AuthUser {
  id: number;
  email: string;
  isPremium: boolean;
}

function BasketMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M6 14h28l-3 18c0 1-1 2-2 2H11c-1 0-2-1-2-2z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M6 14h28l-3 18c0 1-1 2-2 2H11c-1 0-2-1-2-2z" />
      <path d="M13 8l4 6M27 8l-4 6" />
      <path d="M14 22l4 4 8-8" strokeWidth="2.25" />
    </svg>
  );
}

export function Header() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [user, setUser] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as AuthUser;
          setUser(data);
        }
      })
      .catch(() => {
        // Not authenticated
      });
  }, []);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch {
      // Silently fail
    }
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-cream-200 bg-cream-50/88 backdrop-blur-[10px] backdrop-saturate-[1.4]">
        <div className="container flex h-[60px] items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-leaf-500">
            <BasketMark size={30} />
            <span className="font-display text-[28px] leading-none text-ink-900">
              BasketWise
            </span>
          </Link>

          <div className="flex-1" />

          {/* Nav links */}
          <nav className="hidden items-center gap-5 text-[13px] font-medium text-ink-700 md:flex">
            <Link
              href="/search"
              className="bw-transition transition-colors hover:text-ink-900"
            >
              Browse
            </Link>
            <Link
              href="/specials"
              className="bw-transition transition-colors hover:text-ink-900"
            >
              Specials
            </Link>
            <Link
              href="/basket"
              className="bw-transition transition-colors hover:text-ink-900"
            >
              Basket
            </Link>
            <Link
              href="/favourites"
              className="bw-transition transition-colors hover:text-ink-900"
            >
              Favourites
            </Link>
          </nav>

          {/* Search button */}
          <Button
            variant="outline"
            className="relative h-9 w-9 border-cream-300 bg-white p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 text-ink-500 xl:mr-2" />
            <span className="hidden text-ink-500 xl:inline-flex">
              Search products...
            </span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border border-cream-200 bg-cream-100 px-1.5 font-mono text-[10px] font-medium text-ink-500 xl:flex">
              <span className="text-xs">Cmd</span>K
            </kbd>
          </Button>

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              {user.isPremium && (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
              {!user.isPremium && (
                <a href="/premium">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 border-cream-300"
                  >
                    <Crown className="h-3 w-3" />
                    Premium
                  </Button>
                </a>
              )}
              <span className="hidden text-sm text-ink-500 md:inline">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1 text-ink-700 hover:text-ink-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="gap-1 border-cream-300"
            >
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Sign in</span>
            </Button>
          )}
        </div>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setAuthOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
