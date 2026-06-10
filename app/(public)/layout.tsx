import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e2e7ff] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo / Brand */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0062ff]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="2" y="8" width="14" height="8" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="5" y="2" width="8" height="7" rx="1.5" fill="white" />
                  <rect x="7.5" y="4.5" width="3" height="3" rx="0.5" fill="#0062ff" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[#131b2e]">
                LogiCore
              </span>
            </Link>

            {/* Nav links + CTA */}
            <nav className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-sm font-medium text-[#424656] transition-colors hover:text-[#004cca]"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#0062ff] px-4 text-sm font-medium text-white transition-colors hover:bg-[#004cca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0062ff] focus-visible:ring-offset-2"
              >
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#e2e7ff] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0062ff]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="2" y="8" width="14" height="8" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="5" y="2" width="8" height="7" rx="1.5" fill="white" />
                  <rect x="7.5" y="4.5" width="3" height="3" rx="0.5" fill="#0062ff" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#131b2e]">LogiCore</span>
            </div>

            {/* Copyright */}
            <p className="text-sm text-[#737687]">
              &copy; {new Date().getFullYear()} LogiCore. All rights reserved.
            </p>

            {/* Footer links */}
            <nav className="flex items-center gap-5">
              <Link
                href="/privacy"
                className="text-sm text-[#737687] transition-colors hover:text-[#004cca]"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-[#737687] transition-colors hover:text-[#004cca]"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-sm text-[#737687] transition-colors hover:text-[#004cca]"
              >
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
