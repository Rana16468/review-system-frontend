"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { tokenVarified } from "./authToken";

const TOKEN_KEY = "accessToken";

const LOGIN_PATH = "/signup";

type Role = "MENTOR" | "STUDENT";

const PROTECTED_ROUTES: Record<string, Role[]> = {
  "/profile": ["MENTOR", "STUDENT"],
  "/mentor": ["MENTOR"],
  "/submitted_assigment": ["MENTOR"],
  "/student": ["STUDENT"],
  "/assigment": ["STUDENT"],
};

const AUTH_PAGES = ["/signup"];

const ROLE_HOME: Record<Role, string> = {
  MENTOR: "/mentor",
  STUDENT: "/student",
};

type Decision =
  | { type: "allow" }
  | { type: "redirect"; to: string; keepDestination?: boolean };

const ALLOW: Decision = { type: "allow" };

const matches = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

const findRule = (pathname: string) =>
  Object.entries(PROTECTED_ROUTES).find(([base]) => matches(pathname, base));

const isAuthPage = (pathname: string) =>
  AUTH_PAGES.some((p) => matches(pathname, p));

const isRole = (role: string | null): role is Role =>
  role === "MENTOR" || role === "STUDENT";

const decide = (pathname: string, role: string | null): Decision => {
  const rule = findRule(pathname);

  if (rule) {
    if (!role) {
      return { type: "redirect", to: LOGIN_PATH, keepDestination: true };
    }
    const allowedRoles = rule[1];
    if (!isRole(role) || !allowedRoles.includes(role)) {
      return {
        type: "redirect",
        to: isRole(role) ? ROLE_HOME[role] : LOGIN_PATH,
      };
    }
    return ALLOW;
  }

  if (isAuthPage(pathname) && isRole(role)) {
    return { type: "redirect", to: ROLE_HOME[role] };
  }

  return ALLOW;
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange); // other tabs login/logout
  return () => window.removeEventListener("storage", onChange);
};

const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const getServerToken = (): undefined => undefined;

const FullPageLoader = () => (
  <div
    role="status"
    aria-label="Checking your session"
    className="flex min-h-dvh items-center justify-center bg-slate-950">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
  </div>
);

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const rawToken = useSyncExternalStore<string | null | undefined>(
    subscribe,
    getToken,
    getServerToken,
  );
  const checked = rawToken !== undefined;

  const decision = useMemo<Decision | null>(() => {
    if (!findRule(pathname) && !isAuthPage(pathname)) return ALLOW;
    if (!checked) return null;

    const session = tokenVarified(TOKEN_KEY);
    return decide(pathname, session?.role ?? null);
  }, [pathname, checked, rawToken]);

  useEffect(() => {
    if (decision?.type !== "redirect") return;

    let target = decision.to;
    if (decision.keepDestination) {
      const here = window.location.pathname + window.location.search;
      target = `${decision.to}?redirect=${encodeURIComponent(here)}`;
    }
    router.replace(target);
  }, [decision, router]);

  if (decision?.type === "allow") return <>{children}</>;

  return <FullPageLoader />;
}
