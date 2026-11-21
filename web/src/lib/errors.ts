/** Safe message from a caught value (catch clauses give `unknown`). */
export function errorMessage(err: unknown, fallback = "Internal server error"): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

/** Error code (e.g. Firebase "auth/user-not-found") from a caught value, if any. */
export function errorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === "string") return c;
  }
  return undefined;
}

/** True when a navigation or fetch was aborted (e.g. router.push interrupted by another navigation). */
export function isAbortError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "name" in err && (err as { name?: unknown }).name === "AbortError";
}
