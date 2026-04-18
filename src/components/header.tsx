"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ShoppingCart, LogOut, User, Crown, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchDialog } from "@/components/search-dialog";
import { AuthDialog } from "@/components/auth-dialog";

interface AuthUser {
  id: number;
  email: string;
  isPremium: boolean;
}

export function Header() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [user, setUser] = React.useState<AuthUser | null>(null);

  // Check auth on mount
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6" />
            <span className="font-bold text-xl">BasketWise</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="transition-colors hover:text-foreground/80 text-muted-foreground"
            >
              Browse
            </Link>
            <Link
              href="/specials"
              className="transition-colors hover:text-foreground/80 text-muted-foreground"
            >
              Specials
            </Link>
            <Link
              href="/basket"
              className="transition-colors hover:text-foreground/80 text-muted-foreground"
            >
              Basket
            </Link>
            <Link
              href="/favourites"
              className="transition-colors hover:text-foreground/80 text-muted-foreground"
            >
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                Favourites
              </span>
            </Link>
          </nav>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button
              variant="outline"
              className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline-flex">
                Search products...
              </span>
              <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
                <span className="text-xs">Cmd</span>K
              </kbd>
            </Button>

            {user ? (
              <div className="flex items-center gap-2">
                {user.isPremium && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                {!user.isPremium && (
                  <a href="/premium">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Premium
                    </Button>
                  </a>
                )}
                <span className="hidden text-sm text-muted-foreground md:inline">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1"
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
                className="gap-1"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:inline">Sign in</span>
              </Button>
            )}
          </div>
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
