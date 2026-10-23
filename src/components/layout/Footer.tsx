import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Sign up", href: "/signup" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "For Everyone",
    links: [
      { label: "For Teachers", href: "/signup" },
      { label: "For Students", href: "/signup" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "#" },
      { label: "FAQ", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

const socials = [
  {
    label: "GitHub",
    href: "#",
    path: (
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.8 12.8 0 0 0-6.8 0C6.7 2.7 5.6 3 5.6 3a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 4.1 10.2c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V23" />
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/amsohel.rana.90",
    path: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
  {
    label: "Email",
    href: "amsr215019@gmail.com",
    path: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
];

export function Footer() {
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";

  return (
    <footer className="relative mt-auto border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent"
      />

      <div className="container mx-auto px-4 pt-14 pb-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className={`group inline-flex items-center gap-2.5 rounded-lg ${focusRing}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/30 transition-transform duration-300 group-hover:rotate-6">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                  <path d="M6 12v5c3 2 9 2 12 0v-5" />
                </svg>
              </span>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Edu
                <span className="text-indigo-600 dark:text-indigo-400">
                  Portal
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              A simple place for teachers to create and share assignments, and
              for students to submit their work, all in one spot.
            </p>

            <div className="mt-6 flex items-center gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400 ${focusRing}`}>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    {s.path}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8 lg:pl-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className={`rounded text-sm text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 ${focusRing}`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row dark:border-slate-800 dark:text-slate-400">
          <p>© {2026} EduPortal. All rights reserved.</p>

          <div className="flex items-center gap-5">
            <Link
              href="#"
              className={`rounded transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${focusRing}`}>
              Privacy Policy
            </Link>
            <Link
              href="#"
              className={`rounded transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${focusRing}`}>
              Terms of Service
            </Link>
            <Link
              href="#"
              className={`rounded transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${focusRing}`}>
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}