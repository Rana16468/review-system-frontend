import React from "react";

export interface TErrorSource {
  path: string | number;
  message: string;
}

export interface TErrorResponse {
  success?: boolean;
  message?: string;
  errorSources?: TErrorSource[];
  err?: Record<string, unknown> & {
    statusCode?: number;
  };
  stack?: string;
}

// RTK Query Error টাইপ সাপোর্টসহ Props ইন্টারফেস
interface ErrorProps {
  error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeError(error: unknown): TErrorResponse {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }

  const outer = isRecord(error) ? error : undefined;
  const response = outer && isRecord(outer.data) ? outer.data : outer;
  if (!response) return { message: "An unexpected error occurred." };

  const responseError = isRecord(response.err) ? response.err : undefined;
  const statusCode =
    typeof responseError?.statusCode === "number"
      ? responseError.statusCode
      : typeof response.status === "number"
        ? response.status
        : typeof outer?.status === "number"
          ? outer.status
          : undefined;
  const errorSources = Array.isArray(response.errorSources)
    ? response.errorSources.flatMap((source): TErrorSource[] =>
        isRecord(source) &&
        (typeof source.path === "string" || typeof source.path === "number") &&
        typeof source.message === "string"
          ? [{ path: source.path, message: source.message }]
          : [],
      )
    : undefined;

  return {
    message:
      (typeof response.message === "string" && response.message) ||
      (typeof outer?.error === "string" && outer.error) ||
      "An unexpected error occurred.",
    errorSources,
    err: statusCode === undefined ? undefined : { ...responseError, statusCode },
    stack: typeof response.stack === "string" ? response.stack : undefined,
  };
}

const ErrorPage: React.FC<ErrorProps> = ({ error }) => {
  if (!error) return null;

  const { message, errorSources = [], err = {}, stack = "" } = normalizeError(error);

  return (
    <div className="mx-auto my-6 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-slate-800 shadow-md dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-slate-200">
      {/* Header / Status Banner */}
      <div className="mb-4 flex items-center gap-3 border-b border-rose-200 pb-3 dark:border-rose-900/70">
        {typeof err?.statusCode === "number" && (
          <span className="rounded bg-rose-600 px-2.5 py-1 text-sm font-bold text-white">
            {err.statusCode}
          </span>
        )}
        <h2 className="m-0 text-lg font-semibold text-rose-800 dark:text-rose-200">
          {message}
        </h2>
      </div>

      {/* Error Sources Breakdown */}
      {errorSources.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-300">
            Error Details
          </h4>
          <ul className="m-0 list-disc space-y-1 pl-5 text-rose-800 dark:text-rose-200">
            {errorSources.map((source: TErrorSource, index: number) => (
              <li key={index} className="text-sm">
                {source.path !== "" && <strong>{source.path}: </strong>}
                <span>{source.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stack Trace */}
      {stack && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-300">
            Stack Trace
          </h4>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-rose-100 p-3.5 font-mono text-xs text-rose-950 dark:bg-slate-900 dark:text-slate-200">
            {stack}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ErrorPage;