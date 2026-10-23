"use client";

import { useState } from "react";
import ErrorPage from "@/src/components/ErrorPage/ErrorPage";
import { useGetMyProfileQuery } from "@/src/components/redux/features/authApi.";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  photo: string;
  isVerify: boolean;
  os: string;
  browser: string;
  device: string;
  createdAt: string;
};

/* ---------- helpers ---------- */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const initials = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/* ---------- icons (no extra package needed) ---------- */

type IconProps = { path: string; className?: string };

const Icon = ({ path, className = "h-4 w-4" }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden>
    <path d={path} />
  </svg>
);

const icons = {
  shield: "M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  check: "M5 13l4 4L19 7",
  calendar:
    "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  mail: "M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 1l8 6 8-6",
  key: "M15 7a4 4 0 11-3.9 4.9L4 19v-3H1v-3h3l5.1-5.1A4 4 0 0115 7z",
  monitor:
    "M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM9 21h6M12 17v4",
  globe:
    "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18",
  cpu: "M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  copy: "M9 9h10a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
};

/* ---------- building blocks ---------- */

const Card = ({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-2xl bg-[#0C1636] p-5 ring-1 ring-white/10 ${className}`}>
    <h2 className="text-sm font-semibold text-white">{title}</h2>
    <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
    <div className="mt-4">{children}</div>
  </section>
);

// A single labelled value inside a card
const Field = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="min-w-0 rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/5">
    <div className="flex items-center gap-1.5 text-slate-400">
      <Icon path={icon} className="h-3.5 w-3.5 text-blue-400" />
      <span className="text-[11px] font-medium">{label}</span>
    </div>
    <div className="mt-1.5 truncate text-[13px] font-medium text-slate-100">
      {value}
    </div>
  </div>
);

// A compact row for the account overview list
const OverviewRow = ({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
    <div className="flex items-center gap-2.5 text-slate-400">
      <Icon path={icon} className="h-4 w-4 text-blue-400" />
      <span className="text-xs">{label}</span>
    </div>
    <div className="text-[13px] font-medium text-slate-100">{children}</div>
  </div>
);

const Loading = () => (
  <div className="animate-pulse">
    <div className="h-28 bg-[#0C1636] sm:h-36" />
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="-mt-10 flex items-end gap-4">
        <div className="h-20 w-20 rounded-2xl bg-[#101C42] ring-4 ring-[#060B1F]" />
        <div className="mb-1 space-y-2">
          <div className="h-4 w-40 rounded bg-[#101C42]" />
          <div className="h-3 w-52 rounded bg-[#0C1636]" />
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="h-56 rounded-2xl bg-[#0C1636]" />
        <div className="h-56 rounded-2xl bg-[#0C1636] lg:col-span-2" />
      </div>
    </div>
  </div>
);

/* ---------- page ---------- */

const ProfilePage = () => {
  const { data, isLoading, error } = useGetMyProfileQuery({});
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  if (error) return <ErrorPage error={error} />;

  if (isLoading || !data?.data) {
    return (
      <main className="min-h-screen bg-[#060B1F]">
        <Loading />
      </main>
    );
  }

  const user: Profile = data.data;
  const active = user.status === "ACTIVE";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available, ignore */
    }
  };

  return (
    <main className="min-h-screen bg-[#060B1F] pb-6 text-slate-100">
      {/* Banner */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-r from-[#0F1E4D] via-[#132B72] to-[#0A1330] sm:h-36">
        <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-28 right-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#060B1F] to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Identity */}
        <div className="relative z-10 -mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
          <div className="shrink-0">
            {user.photo && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photo}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-[#060B1F] sm:h-24 sm:w-24"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white ring-4 ring-[#060B1F] sm:h-24 sm:w-24 sm:text-2xl">
                {initials(user.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {user.name}
              </h1>
              {user.isVerify && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30">
                  <Icon path={icons.check} className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
            <p className="mt-0.5 break-all text-xs text-slate-400">
              {user.email}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-300 ring-1 ring-inset ring-blue-500/30">
                {cap(user.role)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                  active
                    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                    : "bg-amber-500/10 text-amber-300 ring-amber-500/30"
                }`}>
                <span className="relative flex h-1.5 w-1.5">
                  {active && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  )}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                      active ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                </span>
                {cap(user.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Account overview */}
          <Card
            title="Account overview"
            subtitle="Status of your account"
            className="lg:col-span-1 [&>div]:divide-y [&>div]:divide-white/5">
            <OverviewRow icon={icons.shield} label="Role">
              {cap(user.role)}
            </OverviewRow>
            <OverviewRow icon={icons.pulse} label="Account status">
              <span
                className={active ? "text-emerald-300" : "text-amber-300"}>
                {cap(user.status)}
              </span>
            </OverviewRow>
            <OverviewRow icon={icons.check} label="Verification">
              <span className={user.isVerify ? "text-blue-300" : "text-rose-300"}>
                {user.isVerify ? "Verified" : "Not verified"}
              </span>
            </OverviewRow>
            <OverviewRow icon={icons.calendar} label="Member since">
              {formatDate(user.createdAt)}
            </OverviewRow>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            {/* Personal information */}
            <Card
              title="Personal information"
              subtitle="Your basic account details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field icon={icons.user} label="Full name" value={user.name} />
                <Field
                  icon={icons.mail}
                  label="Email address"
                  value={user.email}
                />
                <Field
                  icon={icons.key}
                  label="User ID"
                  value={
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">
                        {user.id.slice(30, 36)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyId()}
                        aria-label="Copy user ID"
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        <Icon path={icons.copy} className="h-3 w-3" />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </span>
                  }
                />
                <Field
                  icon={icons.calendar}
                  label="Joined on"
                  value={formatDate(user.createdAt)}
                />
              </div>
            </Card>

            {/* Device and browser */}
            <Card
              title="Device and browser"
              subtitle="Where you last signed in from">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field icon={icons.monitor} label="Device" value={user.device} />
                <Field icon={icons.globe} label="Browser" value={user.browser} />
                <Field
                  icon={icons.cpu}
                  label="Operating system"
                  value={user.os}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
