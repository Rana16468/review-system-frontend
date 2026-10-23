"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  FormEvent,
  ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import DOMPurify from "isomorphic-dompurify";
import ErrorPage from "@/src/components/ErrorPage/ErrorPage";
import { useGetSpecificAssigmentQuery } from "@/src/components/redux/features/assigmentApi";
import {
  useSpecificSubmissionAssigemtQuery,
  useSubmitAssigmentMutation,
} from "@/src/components/redux/features/submissionApi";

/* ----------------------------- Types & helpers ----------------------------- */

type Assignment = {
  id: string;
  batch: string;
  title: string;
  description: string; // HTML string from the server
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

type SubmissionStatus = "PENDING" | "SUBMITTED" | "REVIEWED" | "REJECTED";

type Submission = {
  status: SubmissionStatus;
  marks?: number | null;
  feedback?: string | null;
};

/** Matches the backend DTO. */
type SubmissionPayload = {
  assignmentId: string;
  /** HTML string produced by the rich text editor */
  description: string;
  /** Optional note for the mentor */
  notes?: string;
};

const STATUS_META: Record<SubmissionStatus, { label: string; tone: string }> = {
  PENDING: {
    label: "Pending",
    tone: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  },
  SUBMITTED: {
    label: "Submitted",
    tone: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  },
  REVIEWED: {
    label: "Reviewed",
    tone: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    tone: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

type DeadlineState = {
  expired: boolean;
  label: string;
  hint: string;
  tone: string;
};

const getDeadlineState = (iso: string): DeadlineState => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) {
    return {
      expired: true,
      label: "Closed",
      hint: "The submission deadline has passed.",
      tone: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
    };
  }
  const days = Math.ceil(diff / 86_400_000);
  const label = `${days} day${days === 1 ? "" : "s"} left`;
  return days <= 3
    ? {
        expired: false,
        label,
        hint: "Deadline is close. Submit soon.",
        tone: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
      }
    : {
        expired: false,
        label,
        hint: "You have enough time.",
        tone: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
      };
};

/** Converts a server submission (or null) into the UI shape. */
const toSubmission = (
  raw: Partial<Submission> | null | undefined,
): Submission | null => {
  if (!raw) return null;
  const status =
    raw.status && raw.status in STATUS_META ? raw.status : "SUBMITTED";
  return { status, marks: raw.marks ?? null, feedback: raw.feedback ?? null };
};

/** Turns any RTK Query / thrown error into a readable message. */
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
        return "You don't have permission to do this.";
      case 409:
        return "You have already submitted this assignment.";
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

/* ------------------------- Feedback (HTML) rendering ------------------------- */

const FEEDBACK_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "p",
  "br",
  "div",
  "span",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "pre",
  "code",
];

// Links in feedback always open in a new tab safely
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const sanitizeFeedback = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: FEEDBACK_TAGS,
    ALLOWED_ATTR: ["href"],
  });

const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

const FeedbackContent = ({ value }: { value: string }) => {
  const clean = useMemo(
    () => (looksLikeHtml(value) ? sanitizeFeedback(value) : ""),
    [value],
  );

  const box =
    "rounded-lg bg-slate-800/60 px-3 py-2 leading-6 text-slate-200 ring-1 ring-slate-700";

  // Old feedback saved as plain text keeps working
  if (!clean) {
    return <p className={`whitespace-pre-line ${box}`}>{value}</p>;
  }

  return (
    <div
      className={`${box} break-words
        [&_p]:my-1
        [&_strong]:font-semibold [&_strong]:text-white
        [&_b]:font-semibold [&_b]:text-white
        [&_h2]:my-1 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white
        [&_h3]:my-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-white
        [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5
        [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5
        [&_blockquote]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/60 [&_blockquote]:pl-3 [&_blockquote]:text-slate-300
        [&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-2 [&_pre]:text-xs
        [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_code]:text-indigo-200
        [&_a]:font-medium [&_a]:text-indigo-300 [&_a]:underline`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};

/* ------------------------------- UI pieces ------------------------------- */

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

const Pill = ({ tone, children }: { tone: string; children: ReactNode }) => (
  <span
    suppressHydrationWarning
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
    {children}
  </span>
);

const EmptyState = () => (
  <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-dashed border-slate-700 bg-slate-900 px-6 py-12 text-center">
    <h2 className="text-base font-semibold text-white">
      No assignment selected
    </h2>
    <p className="mt-1 text-sm text-slate-400">
      Pick an assignment from the list to view it here.
    </p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex h-full animate-pulse flex-col gap-4 p-4" aria-busy="true">
    <div className="h-14 rounded-xl bg-slate-900 ring-1 ring-slate-800" />
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-2xl bg-slate-900 ring-1 ring-slate-800" />
      <div className="hidden rounded-2xl bg-slate-900 ring-1 ring-slate-800 lg:block" />
    </div>
  </div>
);

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 py-2 text-sm">
    <dt className="text-slate-400">{label}</dt>
    <dd className="text-right font-medium text-slate-100">{children}</dd>
  </div>
);

const primaryBtn = `rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none ${focusRing}`;

/* ---------------------------- Rich text editor ---------------------------- */

type Tool =
  | "sep"
  | { label: string; title: string; cmd: string; arg?: string; cls?: string };

const TOOLS: Tool[] = [
  { label: "B", title: "Bold (Ctrl+B)", cmd: "bold", cls: "font-bold" },
  { label: "I", title: "Italic (Ctrl+I)", cmd: "italic", cls: "italic" },
  {
    label: "U",
    title: "Underline (Ctrl+U)",
    cmd: "underline",
    cls: "underline",
  },
  {
    label: "S",
    title: "Strikethrough",
    cmd: "strikeThrough",
    cls: "line-through",
  },
  "sep",
  {
    label: "H2",
    title: "Heading",
    cmd: "formatBlock",
    arg: "h2",
    cls: "font-bold",
  },
  {
    label: "H3",
    title: "Subheading",
    cmd: "formatBlock",
    arg: "h3",
    cls: "font-bold",
  },
  { label: "P", title: "Normal text", cmd: "formatBlock", arg: "p" },
  "sep",
  { label: "• List", title: "Bulleted list", cmd: "insertUnorderedList" },
  { label: "1. List", title: "Numbered list", cmd: "insertOrderedList" },
  { label: "Quote", title: "Quote", cmd: "formatBlock", arg: "blockquote" },
  { label: "Code block", title: "Code block", cmd: "formatBlock", arg: "pre" },
  "sep",
  { label: "Left", title: "Align left", cmd: "justifyLeft" },
  { label: "Center", title: "Align center", cmd: "justifyCenter" },
  { label: "Right", title: "Align right", cmd: "justifyRight" },
  "sep",
  { label: "Undo", title: "Undo (Ctrl+Z)", cmd: "undo" },
  { label: "Redo", title: "Redo (Ctrl+Y)", cmd: "redo" },
];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normalizeUrl = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProtocol);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
};

type RichTextEditorProps = {
  disabled?: boolean;
  onChange: (html: string, isEmpty: boolean) => void;
};

const RichTextEditor = ({ disabled, onChange }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [empty, setEmpty] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const sync = () => {
    const el = editorRef.current;
    if (!el) return;
    const isEmpty = (el.textContent ?? "").trim() === "";
    setEmpty(isEmpty);
    onChange(isEmpty ? "" : el.innerHTML, isEmpty);
  };

  const run = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    sync();
  };

  const runInlineCode = () => {
    editorRef.current?.focus();
    const text = window.getSelection()?.toString();
    if (!text) return;
    document.execCommand(
      "insertHTML",
      false,
      `<code>${escapeHtml(text)}</code>`,
    );
    sync();
  };

  const openLink = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    setLinkUrl("");
    setLinkError("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = normalizeUrl(linkUrl);
    if (!href) {
      setLinkError("Enter a valid link, e.g. https://github.com/you/project");
      return;
    }
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (sel && sel.toString()) {
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>&nbsp;`,
      );
    }
    setLinkOpen(false);
    sync();
  };

  // Paste as plain text (no foreign styles); a pasted URL becomes a link.
  const handlePaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const single = text.trim();
    if (
      !/\s/.test(single) &&
      /^https?:\/\//i.test(single) &&
      normalizeUrl(single)
    ) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeHtml(single)}">${escapeHtml(single)}</a>&nbsp;`,
      );
    } else {
      document.execCommand("insertText", false, text);
    }
    sync();
  };

  const btn =
    "rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
      {/* Toolbar: onMouseDown preventDefault keeps the text selection */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-slate-700 bg-slate-800/60 px-2 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
        }}>
        {TOOLS.map((t, i) =>
          t === "sep" ? (
            <span
              key={i}
              className="mx-1 h-4 w-px bg-slate-600"
              aria-hidden="true"
            />
          ) : (
            <button
              key={t.title}
              type="button"
              title={t.title}
              disabled={disabled}
              onClick={() => run(t.cmd, t.arg)}
              className={`${btn} ${t.cls ?? ""}`}>
              {t.label}
            </button>
          ),
        )}
        <button
          type="button"
          title="Inline code"
          disabled={disabled}
          onClick={runInlineCode}
          className={`${btn} font-mono`}>
          {"</>"}
        </button>
        <span className="mx-1 h-4 w-px bg-slate-600" aria-hidden="true" />
        <button
          type="button"
          title="Insert link"
          disabled={disabled}
          onClick={openLink}
          className={btn}>
          Link
        </button>
        <button
          type="button"
          title="Remove link"
          disabled={disabled}
          onClick={() => run("unlink")}
          className={btn}>
          Unlink
        </button>
        <button
          type="button"
          title="Clear formatting"
          disabled={disabled}
          onClick={() => run("removeFormat")}
          className={btn}>
          Clear
        </button>
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-indigo-500/10 px-3 py-2">
          <input
            autoFocus
            type="url"
            inputMode="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                setLinkOpen(false);
              }
            }}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 [color-scheme:dark] placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            Add link
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          {linkError && (
            <p className="w-full text-xs font-medium text-rose-400">
              {linkError}
            </p>
          )}
        </div>
      )}

      <div className="relative">
        {empty && (
          <p className="pointer-events-none absolute left-4 top-3 text-sm text-slate-500">
            Write your answer, paste your project link, or both…
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Submission content"
          onInput={sync}
          onPaste={handlePaste}
          className="
            h-56 max-h-[40vh] overflow-y-auto px-4 py-3 text-sm leading-7 text-slate-100 caret-slate-100 outline-none
            [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white
            [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-white
            [&_p]:my-1
            [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5
            [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5
            [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/60 [&_blockquote]:bg-indigo-500/10 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_blockquote]:text-slate-300
            [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:text-slate-100
            [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_code]:text-indigo-200
            [&_a]:font-medium [&_a]:text-indigo-300 [&_a]:underline
          "
        />
      </div>
    </div>
  );
};

/* ------------------------------ Submit modal ------------------------------ */

type SubmitModalProps = {
  assignment: Assignment;
  /** Calls the API. Throws on failure so the error is shown inside the modal. */
  onSubmit: (payload: SubmissionPayload) => Promise<Submission>;
  onClose: () => void;
  onSubmitted: (submission: Submission) => void;
};

const SubmitModal = ({
  assignment,
  onSubmit,
  onClose,
  onSubmitted,
}: SubmitModalProps) => {
  const [content, setContent] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading, onClose]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (isEmpty) return setError("Write your submission or add a link.");
    if (!confirmed) return setError("Please confirm before submitting.");

    setError("");
    setIsLoading(true);
    try {
      const trimmedNotes = notes.trim();
      const result = await onSubmit({
        assignmentId: assignment.id,
        description: content,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
      onSubmitted(result);
    } catch (err) {
      setError(getErrorMessage(err)); // modal stays open, content preserved
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-heading"
        className="w-full max-w-2xl overflow-hidden rounded-t-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 sm:rounded-2xl">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="submit-heading" className="text-base font-semibold text-white">
            Submit assignment
          </h2>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-400">
            {assignment.title}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5" noValidate>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-200">
              Your submission <span className="text-rose-400">*</span>
            </p>
            <RichTextEditor
              disabled={isLoading}
              onChange={(html, empty) => {
                setContent(html);
                setIsEmpty(empty);
              }}
            />
            <p className="mt-1 text-xs text-slate-400">
              Add your answer, description and links (GitHub, Google Drive, live
              site). Make sure links are public.
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="note"
                className="text-sm font-medium text-slate-200">
                Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <span className="text-xs text-slate-500">{notes.length}/1000</span>
            </div>
            <textarea
              id="note"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="Anything you'd like your mentor to know…"
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 [color-scheme:dark] placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:opacity-50"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={isLoading}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-600 accent-indigo-500"
            />
            <span>This is my own work and the content is correct.</span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 ${focusRing}`}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className={primaryBtn}>
              {isLoading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* --------------------------------- Page --------------------------------- */

const AssigmentPage = () => {
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assigementId");

  const [modalOpen, setModalOpen] = useState(false);
  // Set right after a successful submit; the server copy below covers page reloads.
  const [localSubmission, setLocalSubmission] = useState<Submission | null>(
    null,
  );
  const [toast, setToast] = useState("");

  const { data, isLoading, error } = useGetSpecificAssigmentQuery(
    assignmentId as string,
    {
      skip: !assignmentId,
    },
  );

  // Loading/error state is handled inside the modal via try/catch + unwrap()
  const [submitAssignment] = useSubmitAssigmentMutation();

  // The student's existing submission (if any) for this assignment
  const {
    data: result,
    isLoading: resultLoading,
    error: resultError,
    refetch: refetchSubmission,
  } = useSpecificSubmissionAssigemtQuery(assignmentId as string, {
    skip: !assignmentId,
  });

  // 404 means "nothing submitted yet", which is a normal state, not an error.
  const submissionNotFound =
    !!resultError && "status" in resultError && resultError.status === 404;
  const submissionLoadError =
    resultError && !submissionNotFound ? getErrorMessage(resultError) : "";
  const submission = localSubmission ?? toSubmission(result?.data);

  const assignment: Assignment | undefined = data?.data;
  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // .unwrap() throws on any non-2xx response or network failure,
  // so SubmitModal's catch block shows the message and keeps the user's content.
  const handleCreateSubmission = async (
    payload: SubmissionPayload,
  ): Promise<Submission> => {
    const res = await submitAssignment(payload).unwrap();
    const saved = res?.data ?? res;
    return {
      status: saved?.status ?? "SUBMITTED",
      marks: saved?.marks ?? null,
      feedback: saved?.feedback ?? null,
    };
  };

  if (assignmentId && error) return <ErrorPage error={error} />;

  const deadline = assignment ? getDeadlineState(assignment.deadline) : null;
  const status = submission ? STATUS_META[submission.status] : null;
  const canSubmit =
    !!assignment && !deadline?.expired && !submission && !resultLoading;
  const submitLabel = submission
    ? "Submitted ✓"
    : deadline?.expired
      ? "Closed"
      : "Submit assignment";

  const submitButton = (className = "") => (
    <button
      type="button"
      onClick={() => setModalOpen(true)}
      disabled={!canSubmit}
      className={`${primaryBtn} ${className}`}>
      {submitLabel}
    </button>
  );

  // The page itself never scrolls; only the description panel does.
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100">
      {!assignmentId ? (
        <EmptyState />
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : assignment ? (
        <>
          {/* Top bar */}
          <header className="shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-semibold capitalize text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                    {assignment.batch}
                  </span>
                  <span suppressHydrationWarning className="truncate">
                    Due {formatDate(assignment.deadline)}
                  </span>
                </div>
                <h1 className="mt-1 truncate text-lg font-bold text-white sm:text-xl">
                  {assignment.title}
                </h1>
              </div>
              {deadline && <Pill tone={deadline.tone}>{deadline.label}</Pill>}
              {submitButton("hidden lg:block")}
            </div>
          </header>

          {toast && (
            <p
              role="status"
              className="mx-auto mt-3 w-full max-w-6xl shrink-0 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              {toast}
            </p>
          )}

          {/* Body */}
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 p-3 sm:p-4 lg:grid lg:grid-cols-[1fr_280px] lg:gap-4">
            {/* Description: the only scrolling area */}
            <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-800">
              <h2 className="shrink-0 border-b border-slate-800 px-5 py-3 text-sm font-semibold text-white">
                Description
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
                <div
                  className="
                    max-w-none text-sm leading-7 text-slate-300
                    [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:border-l-4 [&_h2]:border-indigo-500 [&_h2]:pl-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white
                    [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:border-l-4 [&_h3]:border-indigo-500 [&_h3]:pl-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-white
                    [&_h4]:mb-1 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-white
                    [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0
                    [&_p]:my-2
                    [&_strong]:font-semibold [&_strong]:text-white
                    [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5
                    [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5
                    [&_ul_ul]:list-[circle]
                    [&_li::marker]:text-indigo-400
                    [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500/60 [&_blockquote]:bg-indigo-500/10 [&_blockquote]:px-3 [&_blockquote]:py-1.5 [&_blockquote]:text-slate-300
                    [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-slate-100
                    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100
                    [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-indigo-200
                    [&_a]:font-medium [&_a]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-200
                    [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg
                  "
                  // Sanitize with DOMPurify if this HTML can come from untrusted sources
                  dangerouslySetInnerHTML={{ __html: assignment.description }}
                />
              </div>
              <footer
                suppressHydrationWarning
                className="shrink-0 border-t border-slate-800 bg-slate-950/60 px-5 py-2 text-xs text-slate-400">
                Last updated {formatDate(assignment.updatedAt)}
              </footer>
            </article>

            {/* Sidebar */}
            <aside className="max-h-[38%] shrink-0 space-y-3 overflow-y-auto lg:max-h-none">
              <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
                <h2 className="text-sm font-semibold text-white">Submission</h2>
                <dl className="mt-1 divide-y divide-slate-800">
                  <InfoRow label="Status">
                    {resultLoading && !submission ? (
                      <Pill tone="bg-slate-500/15 text-slate-400 ring-slate-500/30">
                        Checking…
                      </Pill>
                    ) : status ? (
                      <Pill tone={status.tone}>{status.label}</Pill>
                    ) : (
                      <Pill tone="bg-slate-500/15 text-slate-300 ring-slate-500/30">
                        Not submitted
                      </Pill>
                    )}
                  </InfoRow>
                  <InfoRow label="Deadline">
                    <span suppressHydrationWarning>
                      {formatDate(assignment.deadline)}
                    </span>
                  </InfoRow>
                </dl>
                {submissionLoadError && !submission && (
                  <div
                    role="alert"
                    className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 ring-1 ring-rose-500/30">
                    <p>Could not load your submission status. {submissionLoadError}</p>
                    <button
                      type="button"
                      onClick={() => refetchSubmission()}
                      className="mt-1 font-semibold underline underline-offset-2 hover:text-rose-200">
                      Try again
                    </button>
                  </div>
                )}
                {deadline && !submission && (
                  <p
                    suppressHydrationWarning
                    className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ring-1 ring-inset ${deadline.tone}`}>
                    {deadline.hint}
                  </p>
                )}
              </section>

              {submission && (
                <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
                  <h2 className="text-sm font-semibold text-white">
                    Mentor review
                  </h2>
                  {submission.status === "REVIEWED" ||
                  submission.status === "REJECTED" ? (
                    <div className="mt-2 space-y-2 text-sm">
                      {typeof submission.marks === "number" && (
                        <div className="flex items-center justify-between rounded-lg bg-indigo-500/10 px-3 py-2 ring-1 ring-inset ring-indigo-500/25">
                          <span className="text-slate-300">Marks</span>
                          <span className="text-lg font-bold text-indigo-300">
                            {submission.marks}
                          </span>
                        </div>
                      )}
                      {submission.feedback && (
                        <FeedbackContent value={submission.feedback} />
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      Waiting for your mentor to review. Marks and feedback will
                      appear here.
                    </p>
                  )}
                </section>
              )}
            </aside>
          </div>

          {/* Mobile submit bar */}
          <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-2.5 lg:hidden">
            {submitButton("w-full")}
          </div>

          {modalOpen && (
            <SubmitModal
              assignment={assignment}
              onSubmit={handleCreateSubmission}
              onClose={closeModal}
              onSubmitted={(s) => {
                setLocalSubmission(s);
                setModalOpen(false);
                setToast("Your assignment was submitted successfully.");
              }}
            />
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </main>
  );
};

export default AssigmentPage;