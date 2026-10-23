"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../redux/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../redux/hooks";

export function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [scrolled, setScrolled] = useState(false);
  // কোন পেজে menu খোলা হয়েছিল সেটা রাখছি; পেজ বদলালেই menu নিজে থেকে বন্ধ হয়ে যায়
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath !== null && openPath === pathname;

  // Scroll করলে navbar-এ shadow আসবে (শুধু event callback-এ setState)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setOpenPath(null);
    router.push("/signup");
  };

  const role = user?.role;
  const links =
    role === "STUDENT"
      ? [
          { href: "/student", label: "Dashboard" },
          { href: "/profile", label: "Profile" },
        ]
      : role === "MENTOR"
      ? [
          { href: "/mentor", label: "Dashboard" },
          { href: "/profile", label: "Profile" },
        ]
      : [];

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const roleStyle =
    role === "MENTOR"
      ? "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30"
      : "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30";

  const initial = (user?.name || user?.email || role || "U")
    .toString()
    .charAt(0)
    .toUpperCase();

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-slate-200/80 bg-white/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80"
          : "border-transparent bg-white dark:bg-slate-900"
      }`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className={`group flex items-center gap-2.5 rounded-lg ${focusRing}`}>
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
            Edu<span className="text-indigo-600 dark:text-indigo-400">Portal</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {isAuthenticated ? (
            <>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${focusRing} ${
                    isActive(l.href)
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}>
                  {l.label}
                  <span
                    className={`absolute inset-x-3.5 -bottom-[13px] h-0.5 rounded-full bg-indigo-600 transition-opacity dark:bg-indigo-400 ${
                      isActive(l.href) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              ))}

              <div className="ml-4 flex items-center gap-3 border-l border-slate-200 pl-5 dark:border-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {initial}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleStyle}`}>
                  {role}
                </span>
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${focusRing}`}>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`}>
                Log in
              </Link>
              <Link
                href="/signup"
                className={`rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/40 active:translate-y-0 ${focusRing}`}>
                Sign up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpenPath(open ? null : pathname ?? "")}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`}>
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6 6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`grid overflow-hidden transition-all duration-300 md:hidden ${
          open ? "grid-rows-[1fr] border-t border-slate-200 dark:border-slate-800" : "grid-rows-[0fr]"
        }`}>
        <div className="min-h-0">
          <nav
            className="container mx-auto flex flex-col gap-1 px-4 py-4"
            aria-label="Mobile">
            {isAuthenticated ? (
              <>
                <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white">
                    {initial}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleStyle}`}>
                    {role}
                  </span>
                </div>
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium ${focusRing} ${
                      isActive(l.href)
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}>
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className={`mt-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 ${focusRing}`}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`}>
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className={`mt-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-indigo-500/30 ${focusRing}`}>
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}