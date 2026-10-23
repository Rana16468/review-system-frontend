"use client";

import { useEffect, useRef, useState } from "react";
import {
  GoogleOAuthProvider,
  GoogleLogin,
  type CredentialResponse,
} from "@react-oauth/google";
import Bowser from "bowser";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { useCreateAccountMutation } from "@/src/components/redux/features/authApi.";
import { TOKEN_NAME, tokenRecorded, tokenVarified } from "@/src/utility/authToken";
import { setCredentials } from "@/src/components/redux/slices/authSlice";
type Role = "STUDENT" | "MENTOR";

export type GoogleAuthProfile = {
  name: string;
  email: string;
  role?: Role; // only sent for new users
  os: string;
  photo?: string;
  browser: string;
  device: string;
  isVerify: boolean;
};

type GoogleClaims = {
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

type AuthResponse = {
  data?: {
    accessToken?: string;
  };
};

type TokenRole = { role?: Role; id: string; name: string; email: string };

type ApiError = {
  data?: {
    message?: string;
    errorSources?: { message?: string }[];
  };
  message?: string;
};

const ROLE_ROUTES: Record<Role, string> = {
  STUDENT: "/student",
  MENTOR: "/mentor",
};

// Redirect by role using a full page navigation, so guards/middleware
// always see the freshly saved token.
function redirectByRole(role?: Role) {
  const target = role ? ROLE_ROUTES[role] : undefined;
  window.location.replace(target ?? "/student");
}

// Safely converts an unknown error into the ApiError shape (no `any`)
function toApiError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null) {
    return error as ApiError;
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return {};
}

function getErrorMessage(error: unknown, fallback: string): string {
  const err = toApiError(error);
  return (
    err.data?.errorSources?.[0]?.message ||
    err.data?.message ||
    err.message ||
    fallback
  );
}

// Backend returns this message when a new user has no role yet
function isRoleRequiredError(error: unknown): boolean {
  return getErrorMessage(error, "").includes("Role is required");
}

// Decodes the Google credential and builds the profile (without role)
function buildProfile(credential: string): GoogleAuthProfile {
  const encodedPayload = credential.split(".")[1];
  if (!encodedPayload) throw new Error("Invalid Google credential.");

  const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const claims = JSON.parse(
    new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))),
  ) as GoogleClaims;

  const deviceInfo = Bowser.getParser(
    typeof window !== "undefined" ? navigator.userAgent : "",
  ).getResult();

  return {
    name: claims.name || "Unknown",
    email: claims.email || "",
    photo: claims.picture,
    os: `${deviceInfo.os.name || "Unknown"} ${deviceInfo.os.version || ""}`.trim(),
    browser: deviceInfo.browser.name || "Unknown",
    device: deviceInfo.platform.type
      ? deviceInfo.platform.type.charAt(0).toUpperCase() +
        deviceInfo.platform.type.slice(1)
      : "Desktop",
    isVerify: claims.email_verified ?? false,
  };
}

/* ───────────────────────── Design-only pieces ───────────────────────── */

const ROLE_OPTIONS: { role: Role; title: string; text: string }[] = [
  {
    role: "STUDENT",
    title: "Student",
    text: "Get assignments from your class and upload your work before the deadline.",
  },
  {
    role: "MENTOR",
    title: "Mentor / Teacher",
    text: "Create assignments, share them with your class, and review submissions.",
  },
];

function RoleIcon({ role }: { role: Role }) {
  return role === "STUDENT" ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 4h10l4 4v12H5V4Z" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight text-white">
        EduPortal
      </span>
    </div>
  );
}

// Left panel: deep navy showcase
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-white/10 bg-[#0A1330] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      {/* soft blue glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl"
      />

      <div className="relative">
        <BrandMark />
      </div>

      <div className="relative max-w-lg">
        <p className="mb-4 text-sm font-medium text-blue-300">
          টিচার ও স্টুডেন্টদের জন্য সহজ প্ল্যাটফর্ম
        </p>
        <h2 className="text-4xl font-bold leading-[1.3] xl:text-5xl xl:leading-[1.3]">
          অ্যাসাইনমেন্ট দেওয়া আর জমা নেওয়া, হোক{" "}
          <span className="text-amber-300">ঝামেলাহীন</span>
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
          টিচাররা অ্যাসাইনমেন্ট তৈরি করে ক্লাসে শেয়ার করেন, আর স্টুডেন্টরা নিজেদের
          কাজ সরাসরি আপলোড করে। কাগজ, মেসেজ বা ইমেইলের ভিড় ছাড়াই সবকিছু এক জায়গায়।
        </p>
      </div>

      {/* Sample assignment card */}
      <div className="relative max-w-sm rounded-xl border border-white/10 bg-[#101C42]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Physics · Class 10</p>
            <p className="mt-0.5 font-semibold text-white">
              Chapter 4 – Motion problems
            </p>
          </div>
          <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
            Due Sunday
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Submitted</span>
          <span className="font-semibold text-slate-100">24 of 30</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[80%] rounded-full bg-blue-500" />
        </div>
      </div>
    </aside>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

export default function SignupPage() {
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const dispatch = useDispatch();

  // Google's button needs a pixel width, so fit it to the available space
  const googleWrapRef = useRef<HTMLDivElement>(null);
  const [googleWidth, setGoogleWidth] = useState(320);

  const [pendingProfile, setPendingProfile] =
    useState<GoogleAuthProfile | null>(null);

  const [createAccount, { isLoading }] = useCreateAccountMutation();

  // Already logged in? Skip the login page and go straight to the role page.
  useEffect(() => {
    const decoded = tokenVarified(TOKEN_NAME);
    if (decoded) redirectByRole(decoded.role as Role);
  }, []);

  useEffect(() => {
    const el = googleWrapRef.current;
    if (!el) return;
    const update = () =>
      setGoogleWidth(Math.max(200, Math.min(360, Math.floor(el.clientWidth))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pendingProfile]);

  // Save the token, read the role from it, and redirect
  const onAuthSuccess = (res: AuthResponse) => {
    const accessToken = res.data?.accessToken;
    if (!accessToken) {
      throw new Error("Server did not return an access token.");
    }

    tokenRecorded(accessToken, TOKEN_NAME);

    const { role, id, name, email } = jwtDecode<TokenRole>(accessToken);
    dispatch(
      setCredentials({
        user: {
          id,
          name,
          email,
          role: role === "MENTOR" ? "MENTOR" : "STUDENT",
        },
        token: accessToken,
      }),
    );
    redirectByRole(role);
  };

  // STEP 1: Google click -> try without role (existing users log in instantly)
  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setErrorMsg("Google sign-in failed.");
      return;
    }
    setErrorMsg("");

    try {
      const profile = buildProfile(response.credential);
      try {
        const res = await createAccount(profile).unwrap();
        onAuthSuccess(res);
      } catch (error: unknown) {
        if (!isRoleRequiredError(error)) throw error;
        setPendingProfile(profile); // new user -> role step
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      setErrorMsg(
        getErrorMessage(error, "Something went wrong during authentication."),
      );
    }
  };

  // STEP 2: New user picks a role and the account gets created
  const handleCompleteSetup = async () => {
    if (!pendingProfile) return;
    setErrorMsg("");

    try {
      const res = await createAccount({
        ...pendingProfile,
        role: selectedRole,
      }).unwrap();
      onAuthSuccess(res);
    } catch (error: unknown) {
      console.error("Create account error:", error);
      setErrorMsg(
        getErrorMessage(
          error,
          "Could not create your account. Please try again.",
        ),
      );
    }
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <main className="grid min-h-[100dvh] bg-[#060B1F] text-slate-100 lg:grid-cols-2">
        <BrandPanel />

        <section className="relative flex min-h-[100dvh] items-stretch justify-center overflow-hidden sm:items-center sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl"
          />
          <div className="relative flex w-full max-w-md flex-col justify-center bg-[#0C1636] sm:block sm:bg-transparent">
            {/* Mobile brand (the left panel is hidden below lg) */}
            <div className="flex justify-center px-5 pt-8 pb-2 sm:px-0 sm:pt-0 sm:pb-0 sm:mb-6 lg:hidden">
              <BrandMark />
            </div>

            <div className="flex flex-1 flex-col justify-center bg-[#0C1636] px-5 pb-8 pt-4 sm:flex-none sm:rounded-2xl sm:border sm:border-white/10 sm:p-9 sm:shadow-2xl sm:shadow-black/40">
              {pendingProfile ? (
                /* ========== New user: role selection ========== */
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Almost done
                    {pendingProfile.name !== "Unknown"
                      ? `, ${pendingProfile.name.split(" ")[0]}`
                      : ""}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-400">
                    Choose how you will use EduPortal.
                  </p>

                  <div
                    role="radiogroup"
                    aria-label="Account type"
                    className="mt-6 space-y-3">
                    {ROLE_OPTIONS.map(({ role, title, text }) => {
                      const active = selectedRole === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={isLoading}
                          onClick={() => setSelectedRole(role)}
                          className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1636] disabled:opacity-60 ${
                            active
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-white/10 hover:border-white/25"
                          }`}>
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-blue-500 text-white"
                                : "bg-white/5 text-slate-400"
                            }`}>
                            <RoleIcon role={role} />
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-white">
                              {title}
                            </span>
                            <span className="mt-0.5 block text-sm leading-snug text-slate-400">
                              {text}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              active
                                ? "border-blue-500 bg-blue-500"
                                : "border-slate-600"
                            }`}>
                            {active && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {errorMsg && (
                    <p
                      role="alert"
                      className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void handleCompleteSetup()}
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1636] disabled:opacity-60">
                    {isLoading && <Spinner />}
                    {isLoading ? "Creating your account..." : "Create account"}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setPendingProfile(null);
                      setErrorMsg("");
                    }}
                    className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white disabled:opacity-60">
                    Use a different Google account
                  </button>
                </div>
              ) : (
                /* ========== Google sign in / sign up (one click) ========== */
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Welcome to EduPortal
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-400">
                    Sign in or create an account with Google. It takes one
                    click.
                  </p>

                  {errorMsg && (
                    <p
                      role="alert"
                      className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                      {errorMsg}
                    </p>
                  )}
                  {isLoading && (
                    <p
                      role="status"
                      className="mt-5 flex items-center gap-2 text-sm text-blue-300">
                      <span
                        aria-hidden="true"
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-300/30 border-t-blue-300"
                      />
                      Checking your account...
                    </p>
                  )}

                  <div
                    ref={googleWrapRef}
                    className={`mt-7 flex w-full justify-center overflow-hidden ${
                      isLoading ? "pointer-events-none opacity-50" : ""
                    }`}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() =>
                        setErrorMsg(
                          "Google authentication failed. Please try again.",
                        )
                      }
                      shape="pill"
                      theme="filled_black"
                      size="large"
                      width={String(googleWidth)}
                      text="continue_with"
                    />
                  </div>

                  <ul className="mt-8 space-y-2.5 border-t border-white/10 pt-6 text-sm text-slate-400">
                    <li className="flex items-center gap-2.5">
                      <Tick /> Teachers share assignments with a whole class
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Tick /> Students upload their work directly
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Tick /> No password to remember
                    </li>
                  </ul>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>
    </GoogleOAuthProvider>
  );
}