import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="mt-4 text-xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to Home
      </Link>
    </div>
  );
}
