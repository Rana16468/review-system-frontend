"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import ErrorPage from "@/src/components/ErrorPage/ErrorPage";
import {
  useDeleteSubmissionMutation,
  useGetAnalysisQuery,
  useGetSubmissionAssigmentQuery,
  useMarkSubmissionMutation,
} from "@/src/components/redux/features/submissionApi";

/* ================= types ================= */

type SubmissionStatus = "PENDING" | "SUBMITTED" | "REVIEWED" | "REJECTED";

type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  description: string;
  notes: string | null;
  feedback: string | null;
  marks: number | null;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  assignment: { id: string; title: string; batch: string; deadline: string };
  student: { id: string; name: string; email: string; photo: string | null };
};

type Meta = { page: number; limit: number; total: number; totalPage: number };
type MarkValues = { feedback: string; marks: number; status: SubmissionStatus };
type ChartPoint = { month: string; reviews: number };
type MentorAnalytics = {
  totalReceived: number;
  totalReviewed: number;
  totalPending: number;
  chartData: ChartPoint[];
};
type ToastState = { type: "success" | "error"; message: string } | null;

/* ================= constants & helpers ================= */

const LIMIT = 6;

const STATUS_STYLES: Record<
  SubmissionStatus,
  { label: string; badge: string; dot: string; bar: string }
> = {
  PENDING: {
    label: "Pending",
    badge: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
  },
  SUBMITTED: {
    label: "Submitted",
    badge: "bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/30",
    dot: "bg-sky-400",
    bar: "bg-sky-400",
  },
  REVIEWED: {
    label: "Reviewed",
    badge:
      "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    dot: "bg-emerald-400",
    bar: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/30",
    dot: "bg-rose-400",
    bar: "bg-rose-500",
  },
};

const STATUS_OPTIONS = Object.keys(STATUS_STYLES) as SubmissionStatus[];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const initials = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const getErrorMessage = (err: unknown, fallback: string) =>
  (err as { data?: { message?: string } })?.data?.message || fallback;

/** Tiny allow-list sanitizer (no scripts, no attributes, no event handlers). */
const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "BR",
  "DIV",
  "P",
  "UL",
  "OL",
  "LI",
  "SPAN",
]);
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"]);

const sanitizeHtml = (html: string) => {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");

  const clean = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      const el = child as Element;
      if (DROP_TAGS.has(el.tagName)) {
        el.remove();
        return;
      }
      if (!ALLOWED_TAGS.has(el.tagName)) {
        clean(el);
        el.replaceWith(...Array.from(el.childNodes));
        return;
      }
      Array.from(el.attributes).forEach((a) => el.removeAttribute(a.name));
      clean(el);
    });
  };

  clean(doc.body);
  return doc.body.innerHTML.replace(/&nbsp;/g, " ");
};

const htmlToText = (html: string) => {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
};

/** Defensive parse: never trust the shape of API data blindly. */
const parseAnalytics = (raw: unknown): MentorAnalytics | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<MentorAnalytics>;
  const chartData = Array.isArray(r.chartData)
    ? r.chartData
        .filter((p) => p && typeof p.month === "string")
        .map((p) => ({ month: p.month, reviews: Number(p.reviews) || 0 }))
    : [];
  return {
    totalReceived: Number(r.totalReceived) || 0,
    totalReviewed: Number(r.totalReviewed) || 0,
    totalPending: Number(r.totalPending) || 0,
    chartData,
  };
};

const useDebounce = <T,>(value: T, delay = 500) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

/* ================= small UI pieces ================= */

const Icon = ({
  path,
  className = "h-4 w-4",
}: {
  path: string;
  className?: string;
}) => (
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

const ICONS = {
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z",
  trash:
    "M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12M9 7V4h6v3",
  calendar:
    "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  close: "M6 6l12 12M18 6L6 18",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  inbox:
    "M3 13l3-8h12l3 8M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6M3 13h5l1 2h6l1-2h5",
};

const StatusBadge = ({ status }: { status: SubmissionStatus }) => {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const Avatar = ({
  name,
  photo,
  size = "h-11 w-11",
}: {
  name: string;
  photo?: string | null;
  size?: string;
}) =>
  photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={name}
      referrerPolicy="no-referrer"
      className={`${size} shrink-0 rounded-full object-cover ring-1 ring-slate-700`}
    />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30`}>
      {initials(name)}
    </div>
  );

const Toast = ({ toast }: { toast: ToastState }) =>
  toast ? (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-2xl shadow-black/50 ${
        toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
      }`}>
      {toast.message}
    </div>
  ) : null;

const Modal = ({
  onClose,
  children,
  maxWidth = "max-w-xl",
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/60 sm:p-8`}>
        {children}
      </div>
    </div>
  );
};

/* ================= rich text editor (no dependency) ================= */

const ToolbarButton = ({
  label,
  title,
  onClick,
  className = "",
}: {
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white ${className}`}>
    {label}
  </button>
);

const RichTextEditor = ({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (html: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeHtml(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML === "<br>") el.innerHTML = "";
    onChange(el.innerHTML);
  };

  const exec = (command: string) => {
    ref.current?.focus();
    document.execCommand(command, false);
    emit();
  };

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-700 focus-within:ring-2 focus-within:ring-indigo-500">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-700 bg-slate-800/60 p-2">
        <ToolbarButton
          label="B"
          title="Bold"
          onClick={() => exec("bold")}
          className="font-bold"
        />
        <ToolbarButton
          label="I"
          title="Italic"
          onClick={() => exec("italic")}
          className="italic"
        />
        <ToolbarButton
          label="U"
          title="Underline"
          onClick={() => exec("underline")}
          className="underline"
        />
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <ToolbarButton
          label="• List"
          title="Bullet list"
          onClick={() => exec("insertUnorderedList")}
        />
        <ToolbarButton
          label="1. List"
          title="Numbered list"
          onClick={() => exec("insertOrderedList")}
        />
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <ToolbarButton label="Undo" title="Undo" onClick={() => exec("undo")} />
        <ToolbarButton label="Redo" title="Redo" onClick={() => exec("redo")} />
        <ToolbarButton
          label="Clear"
          title="Clear formatting"
          onClick={() => exec("removeFormat")}
        />
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder="Write your feedback for the student..."
        onInput={emit}
        onBlur={emit}
        className="max-h-[260px] min-h-[140px] overflow-y-auto bg-slate-950 p-4 text-sm leading-relaxed text-slate-100 caret-slate-100 outline-none before:text-slate-500 empty:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
};

/* ================= marks modal ================= */

const fieldClass =
  "w-full rounded-xl border-0 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 [color-scheme:dark] ring-1 ring-slate-700 outline-none transition focus:ring-2 focus:ring-indigo-500";

const MarkModal = ({
  submission,
  isSaving,
  onClose,
  onSubmit,
}: {
  submission: Submission;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: MarkValues) => void;
}) => {
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [marks, setMarks] = useState(
    submission.marks !== null ? String(submission.marks) : "",
  );
  const [status, setStatus] = useState<SubmissionStatus>(
    submission.status === "SUBMITTED" || submission.status === "PENDING"
      ? "REVIEWED"
      : submission.status,
  );
  const [errors, setErrors] = useState<{ feedback?: string; marks?: string }>(
    {},
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const num = Number(marks);

    if (!htmlToText(feedback)) next.feedback = "Feedback is required.";
    if (marks.trim() === "" || Number.isNaN(num))
      next.marks = "Enter a valid number.";
    else if (num < 0 || num > 100)
      next.marks = "Marks must be between 0 and 100.";

    setErrors(next);
    if (Object.keys(next).length) return;

    onSubmit({ feedback: sanitizeHtml(feedback), marks: num, status });
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Review submission
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Give marks and feedback to the student.
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className={`rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white ${focusRing}`}>
          <Icon path={ICONS.close} className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-800/60 p-4 ring-1 ring-inset ring-slate-700/60">
        <Avatar
          name={submission.student.name}
          photo={submission.student.photo}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">
            {submission.student.name}
          </p>
          <p className="truncate text-xs text-slate-400">
            {submission.assignment.title}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="marks"
              className="mb-1.5 block text-sm font-medium text-slate-200">
              Marks
            </label>
            <div className="relative">
              <input
                id="marks"
                type="number"
                min={0}
                max={100}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                placeholder="e.g. 60"
                className={`${fieldClass} pr-14`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                / 100
              </span>
            </div>
            {errors.marks && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.marks}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-slate-200">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
              className={fieldClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_STYLES[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-200">Feedback</p>
          <RichTextEditor
            initialValue={submission.feedback ?? ""}
            onChange={setFeedback}
          />
          {errors.feedback && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.feedback}</p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-800 ${focusRing}`}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
            {isSaving ? "Saving..." : "Save review"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ================= See more / See less ================= */

/** Clamps HTML to 2 lines and only shows the toggle when text is really cut off. */
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
        className={`overflow-hidden text-sm leading-6 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`mt-1 rounded text-xs font-semibold text-indigo-300 hover:text-indigo-200 ${focusRing}`}>
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </>
  );
};

/* ================= analytics sidebar ================= */

const BarChart = ({ points }: { points: ChartPoint[] }) => {
  const max = Math.max(1, ...points.map((p) => p.reviews));
  const summary = points.map((p) => `${p.month}: ${p.reviews}`).join(", ");
  const minWidth = points.length * 44;

  return (
    <div
      className="overflow-x-auto"
      role="img"
      aria-label={`Reviews by month. ${summary}`}>
      <div
        className="flex h-28 items-end gap-2 border-b border-slate-700"
        style={{ minWidth }}>
        {points.map((p) => (
          <div
            key={p.month}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-semibold text-slate-300">
              {p.reviews}
            </span>
            <div
              title={`${p.month}: ${p.reviews} review${p.reviews === 1 ? "" : "s"}`}
              className="w-full max-w-9 rounded-t-md bg-gradient-to-t from-indigo-600 to-blue-400 transition-all duration-500 hover:from-indigo-500 hover:to-blue-300"
              style={{
                height: `${(p.reviews / max) * 72}%`,
                minHeight: p.reviews > 0 ? 5 : 2,
                opacity: p.reviews > 0 ? 1 : 0.25,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2" style={{ minWidth }} aria-hidden="true">
        {points.map((p) => (
          <span
            key={p.month}
            className="flex-1 truncate text-center text-[11px] text-slate-400">
            {p.month}
          </span>
        ))}
      </div>
    </div>
  );
};

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) => (
  <div className="px-2 text-center first:pl-0 last:pr-0">
    <p className={`text-2xl font-semibold leading-none ${tone}`}>{value}</p>
    <p className="mt-1.5 text-xs text-slate-400">{label}</p>
  </div>
);

const Overview = ({
  analytics,
  isLoading,
  isFetching,
  error,
  onRetry,
}: {
  analytics: MentorAnalytics | null;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true">
        <div className="h-36 rounded-2xl bg-slate-900 ring-1 ring-slate-800" />
        <div className="h-48 rounded-2xl bg-slate-900 ring-1 ring-slate-800" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/30">
        <p className="text-sm font-semibold text-rose-200">
          Couldn&apos;t load analytics
        </p>
        <p className="mt-0.5 text-xs text-rose-300">
          {getErrorMessage(error, "No analytics data was returned.")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isFetching}
          className={`mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60 ${focusRing}`}>
          {isFetching ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  const { totalReceived, totalReviewed, totalPending, chartData } = analytics;
  const rate =
    totalReceived > 0 ? Math.round((totalReviewed / totalReceived) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section
        aria-label="Summary"
        className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Overview</h2>
          {isFetching && (
            <span className="text-xs text-slate-500">Updating…</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-800">
          <Stat label="Received" value={totalReceived} tone="text-white" />
          <Stat
            label="Reviewed"
            value={totalReviewed}
            tone="text-emerald-400"
          />
          <Stat label="Pending" value={totalPending} tone="text-amber-400" />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Review progress</span>
            <span className="font-semibold text-slate-200">{rate}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuenow={rate}
            aria-valuemin={0}
            aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      </section>

      {/* Chart */}
      <section
        aria-label="Reviews by month"
        className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <h2 className="mb-3 text-sm font-semibold text-white">
          Reviews by month
        </h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No review activity yet.
          </p>
        ) : (
          <BarChart points={chartData} />
        )}
      </section>
    </div>
  );
};

/* ================= submission card ================= */

const SubmissionCard = ({
  submission,
  onMark,
  onDelete,
}: {
  submission: Submission;
  onMark: () => void;
  onDelete: () => void;
}) => {
  const { student, assignment } = submission;

  const html = sanitizeHtml(submission.description);
  const isLate = new Date(submission.createdAt) > new Date(assignment.deadline);
  const hasReview = submission.marks !== null || !!submission.feedback;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-lg shadow-black/30 ring-1 ring-slate-800 transition hover:ring-slate-700">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${STATUS_STYLES[submission.status].bar}`}
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-3 py-4 pl-5 pr-4">
        {/* Student */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={student.name} photo={student.photo} size="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {student.name}
              </p>
              <p className="truncate text-xs text-slate-400">{student.email}</p>
            </div>
          </div>
          <StatusBadge status={submission.status} />
        </header>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
          <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 font-medium capitalize text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
            {assignment.batch}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon path={ICONS.calendar} className="h-3.5 w-3.5" />
            Due {formatDateTime(assignment.deadline)}
          </span>
          <span>· Sent {formatDateTime(submission.createdAt)}</span>
          {isLate && (
            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30">
              Late
            </span>
          )}
        </div>

        {/* Answer */}
        <div className="rounded-xl bg-slate-800/50 px-3 py-2.5 ring-1 ring-inset ring-slate-700/60">
          <p className="text-xs font-medium text-slate-400">Student answer</p>
          <ClampedHtml html={html} className="text-slate-200" />
        </div>

        {submission.notes && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-inset ring-amber-500/25">
            <span className="font-semibold text-amber-300">Note: </span>
            {submission.notes}
          </p>
        )}

        {/* Review */}
        {hasReview && (
          <div className="rounded-xl bg-emerald-500/10 px-3 py-2.5 ring-1 ring-inset ring-emerald-500/25">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-300">
                Your review
              </p>
              {submission.marks !== null && (
                <p className="text-sm font-semibold text-emerald-300">
                  {submission.marks}
                  <span className="text-xs font-medium text-emerald-400/80">
                    {" "}
                    / 100
                  </span>
                </p>
              )}
            </div>
            {submission.feedback && (
              <ClampedHtml
                html={sanitizeHtml(submission.feedback)}
                className="text-slate-200"
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex justify-end gap-2 pt-1">
          <button
            onClick={onMark}
            className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-indigo-500/40 ${focusRing}`}>
            <Icon path={ICONS.star} />
            {submission.marks !== null ? "Edit marks" : "Give marks"}
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete submission"
            className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-rose-300 ring-1 ring-rose-500/40 transition hover:bg-rose-500/10 ${focusRing}`}>
            <Icon path={ICONS.trash} />
          </button>
        </div>
      </div>
    </article>
  );
};

/* ================= pagination ================= */

const getPages = (current: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
};

const Pagination = ({
  meta,
  onChange,
}: {
  meta: Meta;
  onChange: (page: number) => void;
}) => {
  if (meta.totalPage <= 1) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const btn = `flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${focusRing}`;
  const idle =
    "bg-slate-900 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-800";

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="text-sm text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-200">
          {from}–{to}
        </span>{" "}
        of <span className="font-semibold text-slate-200">{meta.total}</span>{" "}
        submissions
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(meta.page - 1)}
          disabled={meta.page <= 1}
          aria-label="Previous page"
          className={`${btn} ${idle} disabled:cursor-not-allowed disabled:opacity-40`}>
          <Icon path={ICONS.left} />
        </button>
        {getPages(meta.page, meta.totalPage).map((p, i) =>
          p === "…" ? (
            <span key={`dots-${i}`} className="px-1 text-slate-500">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === meta.page ? "page" : undefined}
              className={`${btn} ${
                p === meta.page ? "bg-indigo-600 text-white" : idle
              }`}>
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPage}
          aria-label="Next page"
          className={`${btn} ${idle} disabled:cursor-not-allowed disabled:opacity-40`}>
          <Icon path={ICONS.right} />
        </button>
      </div>
    </nav>
  );
};

/* ================= loading / empty ================= */

const GridSkeleton = () => (
  <div className="grid animate-pulse gap-4 xl:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="h-60 rounded-2xl bg-slate-900 ring-1 ring-slate-800"
      />
    ))}
  </div>
);

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="flex flex-col items-center rounded-2xl bg-slate-900 px-6 py-16 text-center ring-1 ring-slate-800">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
      <Icon path={ICONS.inbox} className="h-7 w-7" />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-white">
      {filtered ? "No matching submissions" : "No submissions yet"}
    </h3>
    <p className="mt-1 max-w-sm text-sm text-slate-400">
      {filtered
        ? "Try a different keyword or change the status filter."
        : "When students submit this assignment, they will show up here."}
    </p>
  </div>
);

/* ================= main content ================= */

const SubmittedAssignmentContent = () => {
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assigmentId");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | SubmissionStatus>("ALL");
  const [markTarget, setMarkTarget] = useState<Submission | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const debouncedSearch = useDebounce(search.trim(), 500);

  const { data, isLoading, isFetching, error } = useGetSubmissionAssigmentQuery(
    {
      assignmentId: assignmentId as string,
      page,
      limit: LIMIT,
      searchTerm: debouncedSearch || undefined,
      status: status === "ALL" ? undefined : status,
    },
    { skip: !assignmentId },
  );

  const [markSubmission, { isLoading: isMarking }] =
    useMarkSubmissionMutation();
  const [deleteSubmission] = useDeleteSubmissionMutation();
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

  const submissions: Submission[] = data?.data?.data ?? [];
  const meta: Meta | undefined = data?.data?.meta;
  const isFiltered = !!debouncedSearch || status !== "ALL";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleMark = async (values: MarkValues) => {
    if (!markTarget) return;
    try {
      await markSubmission({ id: markTarget.id, body: values }).unwrap();
      setMarkTarget(null);
      refetchAnalytics();
      setToast({ type: "success", message: "Review saved successfully." });
    } catch (err) {
      setToast({
        type: "error",
        message: getErrorMessage(err, "Could not save the review."),
      });
    }
  };

  /** SweetAlert2 confirm: Confirm deletes, Cancel keeps the submission. */
  const handleDelete = async (submission: Submission) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete this submission?",
      text: `${submission.student.name}'s submission for "${submission.assignment.title}" will be removed. This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#475569",
      // dark popup to match the page
      background: "#0f172a",
      color: "#e2e8f0",
      reverseButtons: true,
      focusCancel: true,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      customClass: { popup: "rounded-3xl border border-slate-800" },
      preConfirm: async () => {
        try {
          await deleteSubmission(submission.id).unwrap();
          return true;
        } catch (err) {
          Swal.showValidationMessage(
            getErrorMessage(err, "Could not delete the submission."),
          );
          return false;
        }
      },
    });

    if (result.isConfirmed) {
      if (submissions.length === 1 && page > 1) setPage((p) => p - 1);
      refetchAnalytics();
      setToast({ type: "success", message: "Submission deleted." });
    }
  };

  if (!assignmentId) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <EmptyState filtered={false} />
          <p className="mt-4 text-center text-sm text-slate-400">
            No assignment ID found in the URL.
          </p>
        </div>
      </main>
    );
  }

  if (error) return <ErrorPage error={error} />;

  const assignmentTitle = submissions[0]?.assignment.title;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left: analytics (stays in view while the list scrolls) */}
        <aside className="lg:sticky lg:top-6">
          <Overview
            analytics={analytics}
            isLoading={analyticsLoading}
            isFetching={analyticsFetching}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </aside>

        {/* Right: submissions */}
        <div className="min-w-0 space-y-4">
          <header className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Submitted assignments</p>
                <h1 className="truncate text-xl font-semibold tracking-tight text-white">
                  {assignmentTitle || "Student submissions"}
                </h1>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                {meta?.total ?? 0} total
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative xl:w-64">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Icon path={ICONS.search} className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search answer or notes"
                  className="w-full rounded-lg border-0 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none ring-1 ring-slate-700 transition [color-scheme:dark] placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-slate-950 p-1 ring-1 ring-slate-800 xl:mx-0">
                {(["ALL", ...STATUS_OPTIONS] as const).map((s) => {
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setStatus(s);
                        setPage(1);
                      }}
                      aria-pressed={active}
                      className={`shrink-0 rounded-md px-3 py-1 text-sm font-medium transition ${focusRing} ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}>
                      {s === "ALL" ? "All" : STATUS_STYLES[s].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <section aria-busy={isFetching}>
            {isLoading ? (
              <GridSkeleton />
            ) : submissions.length === 0 ? (
              <EmptyState filtered={isFiltered} />
            ) : (
              <div
                className={`grid gap-4 transition-opacity xl:grid-cols-2 ${isFetching ? "opacity-60" : "opacity-100"}`}>
                {submissions.map((s) => (
                  <SubmissionCard
                    key={s.id}
                    submission={s}
                    onMark={() => setMarkTarget(s)}
                    onDelete={() => handleDelete(s)}
                  />
                ))}
              </div>
            )}

            {meta && submissions.length > 0 && (
              <Pagination meta={meta} onChange={setPage} />
            )}
          </section>
        </div>
      </div>

      {markTarget && (
        <MarkModal
          key={markTarget.id}
          submission={markTarget}
          isSaving={isMarking}
          onClose={() => setMarkTarget(null)}
          onSubmit={handleMark}
        />
      )}

      <Toast toast={toast} />
    </main>
  );
};

/* ================= page ================= */

const Page = () => (
  <Suspense
    fallback={
      <main className="min-h-screen bg-slate-950 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <GridSkeleton />
        </div>
      </main>
    }>
    <SubmittedAssignmentContent />
  </Suspense>
);

export default Page;