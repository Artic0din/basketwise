export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </a>
          </nav>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center sm:text-right max-w-md">
            Prices updated every 12 hours. Not affiliated with Coles,
            Woolworths, or Aldi.
          </p>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          &copy; 2026 BasketWise
        </div>
      </div>
    </footer>
  );
}
