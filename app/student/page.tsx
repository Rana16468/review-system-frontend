"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import ErrorPage from "@/src/components/ErrorPage/ErrorPage";
import {
  useGetAnalysisQuery,
  useGetMySubmissionAsssigmentQuery,
} from "@/src/components/redux/features/submissionApi";



type SubmissionStatus = "PENDING" | "SUBMITTED" | "REVIEWED" | "REJECTED";

type MySubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  description: string; 
  notes: string | null;
  feedback: string | null;
  marks: number | null;
  status: SubmissionStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  assignment: { id: string; title: string; batch: string; deadline: string };
};

type Meta = { page: number; limit: number; total: number; totalPage: number };
type ChartPoint = { month: string; submissions: number };
type Analytics = {
  role: string;
  totalSubmissions: number;
  approvedCount: number;
  chartData: ChartPoint[];
};

const STATUS_META: Record<
  SubmissionStatus,
  { label: string; pill: string; bar: string }
> = {
  PENDING: {
    label: "Pending",
    pill: "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-500/30",
    bar: "bg-slate-500",
  },
  SUBMITTED: {
    label: "Submitted",
    pill: "bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/30",
    bar: "bg-sky-400",
  },
  REVIEWED: {
    label: "Reviewed",
    pill: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    bar: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    pill: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/30",
    bar: "bg-rose-500",
  },
};

const LIMITS = [10, 20, 50];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getErrorMessage = (err: unknown): string => {
  const fallback = "Something went wrong. Please try again.";
  if (!err || typeof err !== "object") return fallback;
  const e = err as FetchBaseQueryError | SerializedError;
  if ("status" in e) {
    switch (e.status) {
      case "FETCH_ERROR":
        return "Cannot reach the server. Check your connection and try again.";
      case "TIMEOUT_ERROR":
        return "The request timed out. Please try again.";
      case "PARSING_ERROR":
        return "The server sent an unexpected response.";
      case 401:
        return "Your session has expired. Please log in again.";
      case 403:
        return "You don't have permission to view this.";
      case 404:
        return "The requested data was not found.";
    }
    const data = e.data as { message?: string | string[] } | string | undefined;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object" && data.message) {
      return Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;
    }
    return `Request failed (${String(e.status)}). Please try again.`;
  }
  return e.message ?? fallback;
};

const parseAnalytics = (raw: unknown): Analytics | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Analytics>;
  const chartData = Array.isArray(r.chartData)
    ? r.chartData
        .filter((p) => p && typeof p.month === "string")
        .map((p) => ({
          month: p.month,
          submissions: Number(p.submissions) || 0,
        }))
    : [];
  return {
    role: typeof r.role === "string" ? r.role : "",
    totalSubmissions: Number(r.totalSubmissions) || 0,
    approvedCount: Number(r.approvedCount) || 0,
    chartData,
  };
};

const getPageList = (cur: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = [...new Set([1, total, cur - 1, cur, cur + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
};

const useDebounced = (value: string, delay = 400) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

/* --------------------- HTML sanitizer (rich text → safe HTML) --------------------- */

/** Allow-list sanitizer: no scripts, no event handlers, only safe links and text-align. */
const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "BR",
  "DIV",
  "P",
  "SPAN",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "A",
]);
const DROP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "LINK",
  "META",
  "SVG",
  "MATH",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
]);
const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);

const sanitizeHtml = (html: string | null | undefined): string => {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const unwrap = (el: Element) => el.replaceWith(...Array.from(el.childNodes));

  const clean = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      const el = child as HTMLElement;

      if (DROP_TAGS.has(el.tagName)) {
        el.remove();
        return;
      }
      if (!ALLOWED_TAGS.has(el.tagName)) {
        clean(el);
        unwrap(el);
        return;
      }

      // remember the few things we allow, then strip every attribute
      const href = el.tagName === "A" ? el.getAttribute("href") : null;
      const align = el.style?.textAlign;
      Array.from(el.attributes).forEach((a) => el.removeAttribute(a.name));

      if (el.tagName === "A") {
        if (href && /^(https?:|mailto:)/i.test(href.trim())) {
          el.setAttribute("href", href.trim());
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer nofollow");
        } else {
          clean(el);
          unwrap(el); // unsafe link: keep the text only
          return;
        }
      }
      if (align && ALIGNMENTS.has(align)) el.style.textAlign = align;

      clean(el);
    });
  };

  clean(doc.body);
  return doc.body.innerHTML.replace(/&nbsp;/g, " ");
};

/** Plain text of an HTML string (used to know whether feedback is really empty). */
const htmlToText = (html: string | null | undefined): string => {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
};

/** Tailwind classes that style rendered rich text on the dark background. */
const RICH =
  "text-slate-300 " +
  "[&_h1]:my-2 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white " +
  "[&_h2]:my-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white " +
  "[&_h3]:my-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white " +
  "[&_h4]:my-1.5 [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:text-white " +
  "[&_p]:my-1 [&_strong]:font-semibold [&_strong]:text-white [&_b]:font-semibold [&_b]:text-white " +
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li::marker]:text-indigo-400 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/60 [&_blockquote]:bg-indigo-500/10 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_blockquote]:text-slate-300 " +
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-slate-100 " +
  "[&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_code]:text-indigo-200 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100 " +
  "[&_a]:font-medium [&_a]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-200";

/* ------------------------------- Small pieces ------------------------------- */

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

const controlClass =
  "h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 [color-scheme:dark] outline-none transition focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/20";

const StatusPill = ({ status }: { status: SubmissionStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[status].pill}`}>
    {STATUS_META[status].label}
  </span>
);

const SkeletonList = ({ count }: { count: number }) => (
  <div className="animate-pulse space-y-3" aria-busy="true">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="h-28 rounded-2xl bg-slate-900 ring-1 ring-slate-800"
      />
    ))}
  </div>
);

const Meta = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="mt-0.5 text-xs font-medium text-slate-100">{children}</dd>
  </div>
);

/** Clamps rendered HTML to ~2 lines; shows the toggle only when it is really cut off. */
const ClampedHtml = ({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html, expanded]);

  return (
    <>
      <div
        ref={ref}
        style={expanded ? undefined : { maxHeight: "3rem" }}
        className={`overflow-hidden text-sm leading-6 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`mt-0.5 rounded text-xs font-semibold text-indigo-300 hover:text-indigo-200 ${focusRing}`}>
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </>
  );
};

/* ------------------------------- Overview (left) ------------------------------- */

const MiniStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: string;
}) => (
  <div className="px-2 text-center first:pl-0 last:pr-0">
    <p className={`text-xl font-semibold leading-none ${tone}`}>{value}</p>
    <p className="mt-1.5 text-[10px] uppercase tracking-wide text-slate-400">
      {label}
    </p>
  </div>
);

const BarChart = ({ points }: { points: ChartPoint[] }) => {
  const max = Math.max(1, ...points.map((p) => p.submissions));
  const summary = points.map((p) => `${p.month}: ${p.submissions}`).join(", ");
  const minWidth = points.length * 34;
  return (
    <div
      className="overflow-x-auto"
      role="img"
      aria-label={`Submissions by month. ${summary}`}>
      <div
        className="flex h-24 items-end gap-1.5 border-b border-slate-800"
        style={{ minWidth }}>
        {points.map((p) => (
          <div
            key={p.month}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-medium text-slate-300">
              {p.submissions}
            </span>
            <div
              title={`${p.month}: ${p.submissions}`}
              className="w-full max-w-6 rounded-t bg-gradient-to-t from-indigo-600 to-blue-400 transition-all duration-500"
              style={{
                height: `${(p.submissions / max) * 70}%`,
                minHeight: p.submissions > 0 ? 4 : 2,
                opacity: p.submissions > 0 ? 1 : 0.25,
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-1 flex gap-1.5"
        style={{ minWidth }}
        aria-hidden="true">
        {points.map((p) => (
          <span
            key={p.month}
            className="flex-1 truncate text-center text-[10px] text-slate-400">
            {p.month}
          </span>
        ))}
      </div>
    </div>
  );
};

type OverviewProps = {
  analytics: Analytics | null;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
};

const Overview = ({
  analytics,
  isLoading,
  isFetching,
  error,
  onRetry,
}: OverviewProps) => {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3" aria-busy="true">
        <div className="h-28 rounded-2xl bg-slate-900 ring-1 ring-slate-800" />
        <div className="h-40 rounded-2xl bg-slate-900 ring-1 ring-slate-800" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-rose-500/10 p-3 ring-1 ring-rose-500/30">
        <p className="text-xs font-semibold text-rose-200">
          Couldn&apos;t load your overview
        </p>
        <p className="mt-0.5 text-[11px] text-rose-300">
          {error ? getErrorMessage(error) : "No analytics data was returned."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isFetching}
          className={`mt-2 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 disabled:opacity-60 ${focusRing}`}>
          {isFetching ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  const { totalSubmissions, approvedCount, chartData } = analytics;
  const rate =
    totalSubmissions > 0
      ? Math.round((approvedCount / totalSubmissions) * 100)
      : null;

  return (
    <div className="space-y-3">
      <section
        aria-label="Overview"
        className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Overview
          </h2>
          {isFetching && (
            <span className="text-[10px] text-slate-500">Updating…</span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 divide-x divide-slate-800">
          <MiniStat label="Total" value={totalSubmissions} tone="text-white" />
          <MiniStat
            label="Approved"
            value={approvedCount}
            tone="text-emerald-400"
          />
          <MiniStat
            label="Rate"
            value={rate === null ? "—" : `${rate}%`}
            tone="text-indigo-400"
          />
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-label="Approval rate"
          aria-valuenow={rate ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${rate ?? 0}%` }}
          />
        </div>
        {rate !== null && (
          <p className="mt-1.5 text-[11px] text-slate-400">
            {approvedCount} of {totalSubmissions} approved
          </p>
        )}
      </section>

      <section
        aria-label="Submissions by month"
        className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Submissions by month
        </h2>
        {chartData.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No activity yet.
          </p>
        ) : (
          <BarChart points={chartData} />
        )}
      </section>
    </div>
  );
};

/* ------------------------------- Submission card ------------------------------- */

const SubmissionCard = ({ item }: { item: MySubmission }) => {
  const [open, setOpen] = useState(false);

  // Feedback arrives as HTML from the mentor's editor: sanitize it, never print raw tags
  const feedbackHtml = useMemo(() => sanitizeHtml(item.feedback), [item.feedback]);
  const hasFeedback = htmlToText(item.feedback) !== "";
  const descriptionHtml = useMemo(
    () => sanitizeHtml(item.description),
    [item.description],
  );

  const isLate =
    new Date(item.createdAt).getTime() >
    new Date(item.assignment.deadline).getTime();

  return (
    <article
      className={`relative overflow-hidden rounded-2xl bg-slate-900 shadow-lg shadow-black/30 ring-1 ring-slate-800 transition-colors hover:ring-slate-700 ${
        item.isDeleted ? "opacity-70" : ""
      }`}>
      <span
        className={`absolute inset-y-0 left-0 w-1 ${STATUS_META[item.status].bar}`}
        aria-hidden="true"
      />

      {/* Summary row */}
      <div className="flex flex-col gap-3 py-3.5 pl-5 pr-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-white">
              {item.assignment.title}
            </h2>
            <StatusPill status={item.status} />
            {isLate ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">
                Late
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                On time
              </span>
            )}
            {item.isDeleted && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30">
                Deleted
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs capitalize text-slate-400">
            {item.assignment.batch}
          </p>
        </div>

        <dl
          suppressHydrationWarning
          className="flex shrink-0 items-start gap-5">
          <Meta label="Marks">
            <span className="text-base font-semibold text-indigo-400">
              {typeof item.marks === "number" ? item.marks : "—"}
            </span>
          </Meta>
          <Meta label="Deadline">{formatDate(item.assignment.deadline)}</Meta>
          <Meta label="Submitted">{formatDate(item.createdAt)}</Meta>
        </dl>
      </div>

      {/* Mentor feedback (rendered with its formatting, not as raw HTML) */}
      {hasFeedback && (
        <div className="mx-4 mb-3 ml-5 rounded-lg bg-emerald-500/10 px-3 py-2 ring-1 ring-inset ring-emerald-500/20">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            Mentor feedback
          </p>
          <ClampedHtml html={feedbackHtml} className={RICH} />
        </div>
      )}

      {/* Details */}
      {open && (
        <div className="space-y-3 border-t border-slate-800 py-3.5 pl-5 pr-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your submission
            </h3>
            <div
              className={`mt-1 text-sm leading-6 ${RICH}`}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>

          <div className="rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-inset ring-slate-700/60">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your notes
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-300">
              {item.notes || "—"}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
            <div>Updated {formatDateTime(item.updatedAt)}</div>
            <div className="font-mono">Submission {item.id.slice(24, 36)}</div>
            <div className="font-mono">
              Assignment {item.assignmentId.slice(24, 36)}
            </div>
          </dl>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-center border-t border-slate-800 py-1.5 pl-2 text-xs font-medium text-indigo-300 transition hover:bg-slate-800/60 ${focusRing}`}>
        {open ? "Hide details" : "View details"}
      </button>
    </article>
  );
};

/* --------------------------------- Page --------------------------------- */

const StudentPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") ?? "";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | SubmissionStatus>("ALL");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounced(search);

  const queryArgs = useMemo(() => {
    const args: Record<string, string | number | boolean> = {
      page,
      limit,
      isDeleted: showDeleted,
    };
    if (debouncedSearch.trim()) args.searchTerm = debouncedSearch.trim();
    if (status !== "ALL") args.status = status;
    if (assignmentId) args.assignmentId = assignmentId;
    return args;
  }, [page, limit, showDeleted, debouncedSearch, status, assignmentId]);

  const { data, isLoading, isFetching, error } =
    useGetMySubmissionAsssigmentQuery(queryArgs);

  const {
    data: analyticsRes,
    isLoading: analyticsLoading,
    isFetching: analyticsFetching,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useGetAnalysisQuery({});

  const analytics = useMemo(
    () => parseAnalytics(analyticsRes?.data),
    [analyticsRes],
  );

  const items: MySubmission[] = data?.data?.data ?? [];
  const meta: Meta = data?.data?.meta ?? {
    page: 1,
    limit,
    total: 0,
    totalPage: 1,
  };

  const hasFilters =
    !!search || status !== "ALL" || showDeleted || !!assignmentId;

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setShowDeleted(false);
    setPage(1);
    if (assignmentId) router.replace(pathname);
  };

  if (error) return <ErrorPage error={error} />;

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  const pageBtn = `rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Two columns: small stats on the left, details take the rest */}
        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* Left: overview + chart (stays in view while the list scrolls) */}
          <aside className="lg:sticky lg:top-20">
            <Overview
              analytics={analytics}
              isLoading={analyticsLoading}
              isFetching={analyticsFetching}
              error={analyticsError}
              onRetry={refetchAnalytics}
            />
          </aside>

          {/* Right: submissions */}
          <section className="min-w-0 space-y-3">
            <header className="flex items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  My submissions
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  Track your work, marks and mentor feedback in one place.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                {meta.total} submission{meta.total === 1 ? "" : "s"}
                {assignmentId && " · 1 assignment"}
              </span>
            </header>

            {/* Filters (sticky, just below the navbar) */}
            <div className="sticky top-16 z-10 -mx-1 bg-slate-950/90 px-1 py-2 backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search notes or description"
                  aria-label="Search submissions"
                  className={`${controlClass} sm:flex-1`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as "ALL" | SubmissionStatus);
                      setPage(1);
                    }}
                    aria-label="Filter by status"
                    className={controlClass}>
                    <option value="ALL">All statuses</option>
                    {(Object.keys(STATUS_META) as SubmissionStatus[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ),
                    )}
                  </select>

                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={showDeleted}
                      onChange={(e) => {
                        setShowDeleted(e.target.checked);
                        setPage(1);
                      }}
                      className="h-4 w-4 rounded accent-indigo-500"
                    />
                    Show deleted
                  </label>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={`h-9 rounded-lg px-3 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 ${focusRing}`}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div
              className={`transition-opacity ${
                isFetching && !isLoading ? "opacity-60" : ""
              }`}>
              {isLoading ? (
                <SkeletonList count={4} />
              ) : items.length === 0 ? (
                <div className="rounded-2xl bg-slate-900 px-6 py-14 text-center ring-1 ring-slate-800">
                  <h2 className="text-sm font-semibold text-white">
                    No submissions found
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {hasFilters
                      ? "Try changing or clearing your filters."
                      : "Your submitted assignments will appear here."}
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={`mt-3 rounded text-xs font-medium text-indigo-300 hover:underline ${focusRing}`}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <SubmissionCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && meta.total > 0 && (
              <footer className="flex flex-col items-center gap-3 border-t border-slate-800 pt-3 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>
                    {from}–{to} of {meta.total}
                  </span>
                  <label className="flex items-center gap-1.5">
                    Rows
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className={`rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 [color-scheme:dark] ${focusRing}`}>
                      {LIMITS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <nav
                  aria-label="Pagination"
                  className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className={pageBtn}>
                    Prev
                  </button>
                  {getPageList(meta.page, meta.totalPage).map((p, i) =>
                    p === "…" ? (
                      <span
                        key={`gap-${i}`}
                        className="px-1 text-sm text-slate-500">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === meta.page ? "page" : undefined}
                        className={`min-w-9 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${focusRing} ${
                          p === meta.page
                            ? "bg-indigo-600 text-white"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}>
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(meta.page + 1)}
                    disabled={meta.page >= meta.totalPage}
                    className={pageBtn}>
                    Next
                  </button>
                </nav>
              </footer>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default StudentPage;