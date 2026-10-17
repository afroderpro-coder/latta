import Link from "next/link";
import { Home, ShoppingBag, Mail, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "404 — Page Not Found | AFRODER",
  description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-16 text-center">
      {/* Decorative background glow */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{
            background:
              "radial-gradient(circle, #0f172a 0%, transparent 70%)",
          }}
        />
      </div>

      {/* 404 number */}
      <div className="relative mb-2">
        <h1
          className="text-[10rem] sm:text-[14rem] font-bold leading-none tracking-tighter select-none"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #334155 40%, #94a3b8 60%, #cbd5e1 80%, #e2e8f0 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter:
              "drop-shadow(0 4px 6px rgba(15, 23, 42, 0.08))",
          }}
        >
          404
        </h1>
      </div>

      {/* Message */}
      <div className="relative space-y-3 mb-10 max-w-md">
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
          Page not found
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
      </div>

      {/* Primary CTA */}
      <Link
        href="/"
        className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 mb-12"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Home
      </Link>

      {/* Quick links */}
      <div className="relative">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
          Quick Links
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground hover:shadow-sm"
          >
            <ShoppingBag className="h-4 w-4" />
            Shop
          </Link>
          <Link
            href="/about"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground hover:shadow-sm"
          >
            <Home className="h-4 w-4" />
            About Us
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground hover:shadow-sm"
          >
            <Mail className="h-4 w-4" />
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
