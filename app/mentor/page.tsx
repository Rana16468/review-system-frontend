"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import {
  useCreateAssigmentMutation,
  useDeleteAssigmentMutation,
  useGetAssigmentsQuery,
  useUpdateAssigmentMutation,
} from "@/src/components/redux/features/assigmentApi";
import Link from "next/link";

/* ----------------------------- Types & helpers ----------------------------- */

type Assignment = {
  id: string;
  batch: string;
  title: string;
  description: string; // HTML from the rich text editor
  deadline: string; // ISO string from the API
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

// Shape of GET response: { success, message, data: { meta, data: Assignment[] } }
type AssignmentsResponse = {
  success: boolean;
  message: string;
  data: {
    meta: Meta;
    data: Assignment[];
  };
};

const PAGE_SIZES = [5, 10, 20, 50];

const todayISO = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/** ISO datetime -> yyyy-mm-dd in the user's local time (for <input type="date">) */
const toDateInput = (iso: string) => {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Calendar days until the deadline; negative once the deadline has passed. */
const daysLeft = (deadline: string) => {
  const end = new Date(deadline);
  if (end.getTime() < Date.now()) return -1;
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round(
    (startOf(end) - startOf(new Date())) / (1000 * 60 * 60 * 24),
  );
};

/** Turns any RTK Query error into a readable message for the user. */
const getErrorMessage = (err: unknown): string => {
  const e = err as FetchBaseQueryError | SerializedError | undefined;
  if (!e) return "Something went wrong. Please try again.";

  if ("status" in e) {
    switch (e.status) {
      case "FETCH_ERROR":
        return "Can't reach the server. Check your connection and try again.";
      case "TIMEOUT_ERROR":
        return "The request timed out. Please try again.";
      case "PARSING_ERROR":
        return "The server sent an unexpected response.";
      case 401:
        return "Your session has expired. Please log in again.";
      case 403:
        return "You don't have permission to do this.";
      case 404:
        return "This assignment no longer exists. It may have been deleted.";
    }
    const data = e.data as { message?: string | string[] } | string | undefined;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object" && data.message)
      return Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;
    return `Request failed (${e.status}). Please try again.`;
  }
  return e.message ?? "Something went wrong. Please try again.";
};

/** Builds [1, "…", 4, 5, 6, "…", 10] style page lists. */
const getPageItems = (page: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
};

/* ------------------------------ Shared styles ------------------------------ */

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

const ghostBtn = `rounded-md border border-slate-700 bg-slate-800/40 px-3 py-1 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/* ---------------------------- Rich text editor ---------------------------- */

const ToolbarButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded px-2.5 py-1 text-sm transition-colors ${focusRing} ${
      active
        ? "bg-indigo-600 text-white"
        : "text-slate-300 hover:bg-slate-700 hover:text-white"
    }`}>
    {label}
  </button>
);

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-700 bg-slate-800/60 p-1.5">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Bullets"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Numbered"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="Code"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
    </div>
  );
};

/* ------------------------------- Share menu ------------------------------- */

const ShareMenu = ({ id, title }: { id: string; title: string }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close when clicking outside / pressing Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // only computed after a click, so window is always available here
  const url = open
    ? `${window.location.origin}/assigment?assigementId=${id}`
    : "";
  const text = `New assignment: ${title}`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);

  const targets = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    { name: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    {
      name: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
    { name: "Email", href: `mailto:?subject=${t}&body=${u}` },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
      setOpen(false);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`rounded-md border border-indigo-500/50 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 ${focusRing}`}>
        Share
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-2 w-52 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl shadow-black/60">
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              role="menuitem"
              onClick={nativeShare}
              className="block w-full rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">
              Share via device…
            </button>
          )}
          {targets.map((s) => (
            <a
              key={s.name}
              role="menuitem"
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
              {s.name}
            </a>
          ))}
          <button
            role="menuitem"
            onClick={copyLink}
            className="block w-full rounded px-3 py-2 text-left text-sm font-medium text-indigo-300 hover:bg-slate-800">
            {copied ? "Link copied ✓" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
};

/* --------------------------------- Page --------------------------------- */

const Page = () => {
  // list controls (server-side search + pagination)
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // debounced value sent to API
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // debounce search, and go back to page 1 whenever the term changes
  // (setState runs inside the timeout callback, not synchronously in the effect)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [createAssigment, { isLoading: createLoading }] =
    useCreateAssigmentMutation();
  const [updateAssigment, { isLoading: updateLoading }] =
    useUpdateAssigmentMutation();
  const [deleteAssigment] = useDeleteAssigmentMutation();

  const isSaving = createLoading || updateLoading; // form request in flight
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: response,
    isLoading: assigmentLoading, // true only on the very first load
    isFetching, // true on every refetch (page / search change)
    error: assigmentError,
    refetch,
  } = useGetAssigmentsQuery({
    page,
    limit,
    searchTerm: searchTerm || undefined,
  }) as {
    data?: AssignmentsResponse;
    isLoading: boolean;
    isFetching: boolean;
    error?: unknown;
    refetch: () => void;
  };

  const assignments: Assignment[] = response?.data?.data ?? [];
  const meta: Meta = response?.data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPage: 1,
  };

  // If the current page no longer exists (e.g. after deleting), step back.
  // Done during render (React-approved pattern) instead of inside an effect,
  // which avoids the "setState synchronously within an effect" error.
  if (response && !isFetching && meta.totalPage >= 1 && page > meta.totalPage) {
    setPage(meta.totalPage);
  }

  const pageItems = useMemo(
    () => getPageItems(meta.page, meta.totalPage),
    [meta.page, meta.totalPage],
  );
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  // modal + form state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalDeadline, setOriginalDeadline] = useState(""); // ISO of the item being edited
  const [batch, setBatch] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); // success / error message
  const [noticeKind, setNoticeKind] = useState<"success" | "error">("success");

  const showNotice = (msg: string, kind: "success" | "error" = "success") => {
    setNoticeKind(kind);
    setNotice(msg);
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false, // avoids SSR hydration mismatch in Next.js
    editorProps: {
      attributes: {
        class: "rich min-h-[180px] p-3 text-slate-100 focus:outline-none",
      },
    },
  });

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setOriginalDeadline("");
    setBatch("");
    setTitle("");
    setDeadline("");
    setError("");
    editor?.commands.setContent("");
  };

  // close modal on Escape (but not while a request is in flight)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !isSaving && closeForm();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSaving]);

  // auto-hide the notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const openCreate = () => {
    closeForm();
    setOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a.id);
    setOriginalDeadline(a.deadline);
    setBatch(a.batch);
    setTitle(a.title);
    setDeadline(toDateInput(a.deadline));
    setError("");
    setOpen(true);
    editor?.commands.setContent(a.description);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // block double submits

    if (!batch.trim()) return setError("Enter a batch.");
    if (!title.trim()) return setError("Add a title.");
    if (!editor || editor.isEmpty) return setError("Describe the assignment.");
    if (!deadline) return setError("Pick a deadline.");

    const deadlineChanged =
      !editingId || deadline !== toDateInput(originalDeadline);

    // only block past dates for new assignments or when the date was changed
    if (deadlineChanged && deadline < todayISO())
      return setError("The deadline can't be in the past.");

    const body = {
      batch: batch.trim(),
      title: title.trim(),
      description: editor.getHTML(),
      // unchanged date on edit -> resend the original ISO value untouched;
      // otherwise convert "yyyy-mm-dd" to an ISO datetime (end of that day)
      deadline: deadlineChanged
        ? new Date(`${deadline}T23:59:59`).toISOString()
        : originalDeadline,
    };

    setError("");

    try {
      if (editingId) {
        // ---- Update (API) ----
        // NOTE: if your mutation expects a different argument shape
        // (e.g. { id, ...body }), change it here.
        await updateAssigment({ id: editingId, data: body }).unwrap();
        closeForm();
        showNotice("Assignment updated successfully.");
        refetch();
      } else {
        // ---- Create (API) ----
        await createAssigment(body).unwrap();
        closeForm();
        showNotice("Assignment posted successfully.");

        // show the new item: clear search, go to page 1 and refresh the list
        setSearchInput("");
        setSearchTerm("");
        setPage(1);
        refetch();
      }
    } catch (err) {
      // modal stays open and the mentor's input is preserved
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return; // one delete at a time
    if (
      !window.confirm("Delete this assignment? Students will no longer see it.")
    )
      return;

    setDeletingId(id);
    try {
      await deleteAssigment({ id }).unwrap();

      if (expandedId === id) setExpandedId(null);
      showNotice("Assignment deleted.");

      // deleted the last item on this page -> go back one page,
      // otherwise just refresh the current one
      if (assignments.length === 1 && page > 1) setPage(page - 1);
      else refetch();
    } catch (err) {
      showNotice(getErrorMessage(err), "error");
    } finally {
      setDeletingId(null);
    }
  };

  const fieldClass = `w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 [color-scheme:dark] disabled:bg-slate-800/60 disabled:text-slate-400 ${focusRing}`;

  const pageBtn = `min-w-9 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-slate-100">
      {/* Rich text content styles (Tailwind preflight removes list/heading defaults) */}
      <style>{`
        .rich { caret-color: #e2e8f0; }
        .rich h2 { font-size: 1.25rem; font-weight: 600; margin: .75rem 0 .4rem; color: #f8fafc; }
        .rich p { margin: .4rem 0; }
        .rich ul { list-style: disc; padding-left: 1.4rem; margin: .4rem 0; }
        .rich ol { list-style: decimal; padding-left: 1.4rem; margin: .4rem 0; }
        .rich li::marker { color: #818cf8; }
        .rich strong { color: #f8fafc; }
        .rich blockquote { border-left: 3px solid #6366f1; padding-left: .8rem; color: #94a3b8; margin: .5rem 0; }
        .rich pre { background: #020617; color: #e2e8f0; border: 1px solid #1e293b; padding: .75rem; border-radius: .5rem; overflow-x: auto; margin: .5rem 0; }
        .rich code { font-family: ui-monospace, monospace; font-size: .9em; }
        .rich :not(pre) > code { background: #1e293b; color: #c7d2fe; padding: .1rem .35rem; border-radius: .25rem; }
        .rich a { color: #a5b4fc; text-decoration: underline; }
      `}</style>

      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Mentor dashboard
          </h1>
          <p className="mt-1 text-slate-400">
            Post assignments to a batch and manage what students see.
          </p>
        </div>
        <button
          onClick={openCreate}
          className={`rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/40 ${focusRing}`}>
          + New assignment
        </button>
      </header>

      {notice && (
        <p
          role={noticeKind === "error" ? "alert" : "status"}
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm font-medium ${
            noticeKind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}>
          {notice}
        </p>
      )}

      {/* ------------------------------ Cards ------------------------------ */}
      <section aria-labelledby="list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-heading" className="text-xl font-semibold text-white">
            Posted assignments
          </h2>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search batch, title or description"
            aria-label="Search assignments by batch, title or description"
            className={`w-72 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 [color-scheme:dark] ${focusRing}`}
          />
        </div>

        <div
          className={`transition-opacity ${
            isFetching && !assigmentLoading ? "opacity-60" : ""
          }`}
          aria-busy={isFetching}>
          {assigmentLoading ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-10 text-center text-slate-400">
              Loading assignments…
            </p>
          ) : assigmentError ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-10 text-center">
              <p role="alert" className="font-medium text-red-400">
                {getErrorMessage(assigmentError)}
              </p>
              <button onClick={() => refetch()} className={`mt-3 ${ghostBtn}`}>
                Try again
              </button>
            </div>
          ) : assignments.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-10 text-center text-slate-400">
              {searchTerm
                ? `No assignments match “${searchTerm}”.`
                : "No assignments yet. Select “New assignment” to post your first one."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {assignments.map((a) => {
                const left = daysLeft(a.deadline);
                const closed = left < 0;
                const expanded = expandedId === a.id;
                const deleting = deletingId === a.id;
                return (
                  <li
                    key={a.id}
                    className={`flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/30 transition-colors hover:border-slate-700 ${
                      deleting ? "opacity-50" : ""
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold leading-snug text-white">
                        {a.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          closed
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}>
                        {closed
                          ? "Closed"
                          : left === 0
                            ? "Due today"
                            : `${left} day${left === 1 ? "" : "s"} left`}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-950/60 p-3 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Batch
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-100">
                          {a.batch}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Deadline
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-100">
                          {formatDate(a.deadline)}
                        </dd>
                      </div>
                    </dl>

                    {expanded && (
                      <div className="mt-3 border-t border-slate-800 pt-3">
                        {/* Sanitize with DOMPurify before rendering HTML that comes from a server */}
                        <div
                          className="rich text-slate-300"
                          dangerouslySetInnerHTML={{ __html: a.description }}
                        />
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                      <button
                        onClick={() => setExpandedId(expanded ? null : a.id)}
                        aria-expanded={expanded}
                        className={ghostBtn}>
                        {expanded ? "Hide" : "View"}
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        disabled={deleting}
                        className={ghostBtn}>
                        Edit
                      </button>
                      <Link
                        href={`/submitted_assigment?assigmentId=${a.id}`}
                        className={`inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800/40 px-3 py-1 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 ${focusRing}`}>
                        Submission
                      </Link>
                      <ShareMenu id={a.id} title={a.title} />
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId !== null}
                        aria-busy={deleting}
                        className={`ml-auto rounded-md border border-red-500/40 px-3 py-1 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ---------------------------- Pagination ---------------------------- */}
        {!assigmentLoading && !assigmentError && meta.total > 0 && (
          <nav
            aria-label="Pagination"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-slate-400" aria-live="polite">
                Showing {from}–{to} of {meta.total}
              </p>
              <label className="flex items-center gap-2 text-slate-400">
                Per page
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className={`rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 [color-scheme:dark] ${focusRing}`}>
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1 || isFetching}
                className={pageBtn}>
                Previous
              </button>

              {pageItems.map((item, i) =>
                item === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-slate-500">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    disabled={isFetching}
                    aria-current={item === meta.page ? "page" : undefined}
                    className={`${pageBtn} ${
                      item === meta.page
                        ? "!border-indigo-500 !bg-indigo-600 !text-white hover:!bg-indigo-600"
                        : ""
                    }`}>
                    {item}
                  </button>
                ),
              )}

              <button
                onClick={() => setPage((p) => Math.min(meta.totalPage, p + 1))}
                disabled={meta.page >= meta.totalPage || isFetching}
                className={pageBtn}>
                Next
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* ------------------------------ Form modal ------------------------------ */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) =>
            e.target === e.currentTarget && !isSaving && closeForm()
          }>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-heading"
            className="my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/60">
            <h2
              id="form-heading"
              className="mb-5 text-xl font-semibold text-white">
              {editingId ? "Edit assignment" : "New assignment"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="batch"
                    className="mb-1 block text-sm font-medium text-slate-300">
                    Batch
                  </label>
                  <input
                    id="batch"
                    type="text"
                    value={batch}
                    disabled={isSaving}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="e.g. Batch 5"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="deadline"
                    className="mb-1 block text-sm font-medium text-slate-300">
                    Deadline
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    min={editingId ? undefined : todayISO()}
                    value={deadline}
                    disabled={isSaving}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium text-slate-300">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  disabled={isSaving}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build a responsive navbar"
                  className={fieldClass}
                />
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-300">
                  Description
                </span>
                <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-950 focus-within:outline focus-within:outline-2 focus-within:outline-indigo-400">
                  <Toolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className={`rounded-md border border-slate-700 bg-slate-800/40 px-4 py-2 font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className={`rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2 font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
                  {isSaving
                    ? editingId
                      ? "Saving…"
                      : "Posting…"
                    : editingId
                      ? "Save changes"
                      : "Post assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Page;