export function Footer() {
  return (
    <footer className="border-t border-cream-200">
      <div className="container mx-auto flex items-center gap-3 px-6 py-6 text-xs text-ink-500">
        <span className="font-mono">BasketWise</span>
        <div className="flex-1" />
        <nav className="flex items-center gap-6">
          <a
            href="/privacy"
            className="bw-transition transition-colors hover:text-ink-900"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="bw-transition transition-colors hover:text-ink-900"
          >
            Terms
          </a>
        </nav>
        <span className="hidden sm:inline">
          Prices updated every 12 hours. Not affiliated with Coles, Woolworths,
          or Aldi.
        </span>
      </div>
    </footer>
  );
}
