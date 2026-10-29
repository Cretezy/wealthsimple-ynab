export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;

  try {
    const e = err as Record<string, unknown>;

    // ynab package error shape: { error: { detail: "..." } }
    const apiErr = e?.["error"];
    if (apiErr && typeof apiErr === "object") {
      const detail = (apiErr as Record<string, unknown>)["detail"];
      if (typeof detail === "string") return detail;
    }

    // superagent HTTP error shape: { response: { body: { error: { detail: "..." } } } }
    const response = e?.["response"];
    if (response && typeof response === "object") {
      const body = (response as Record<string, unknown>)["body"];
      if (body && typeof body === "object") {
        const bodyErr = (body as Record<string, unknown>)["error"];
        if (bodyErr && typeof bodyErr === "object") {
          const detail = (bodyErr as Record<string, unknown>)["detail"];
          if (typeof detail === "string") return detail;
        }
      }
    }

    // Generic message/detail/error string
    if (typeof e?.["detail"] === "string") return e["detail"] as string;
    if (typeof e?.["message"] === "string") return e["message"] as string;

    // Fallback: stringify but truncate
    const status = e?.["status"];
    const s = JSON.stringify(err);
    const prefix = typeof status === "number" ? `HTTP ${status}: ` : "";
    const max = 200 - prefix.length;
    return prefix + (s.length > max ? s.slice(0, max) + "..." : s);
  } catch {
    return String(err);
  }
}

export function isAuthError(err: unknown): boolean {
  try {
    const e = err as Record<string, unknown>;
    if (typeof e?.status === "number" && e.status === 401) return true;
    if (typeof e?.statusCode === "number" && e.statusCode === 401) return true;
    // ynab SDK error shape: { error: { id: "401", name: "unauthorized", detail: "..." } }
    const apiErr = e?.["error"];
    if (apiErr && typeof apiErr === "object") {
      const ae = apiErr as Record<string, unknown>;
      if (ae["id"] === "401" || ae["name"] === "unauthorized") return true;
      if (typeof ae["id"] === "number" && ae["id"] === 401) return true;
    }
    // superagent HTTP error: { response: { status: 401 } }
    const response = e?.["response"];
    if (response && typeof response === "object") {
      const respStatus = (response as Record<string, unknown>)["status"];
      if (typeof respStatus === "number" && respStatus === 401) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Wealthsimple session expired (401 from the GraphQL API). Distinct from YNAB auth
// errors: this is fixed by re-opening Wealthsimple, not by re-authorizing YNAB.
export function isWealthsimpleAuthError(err: unknown): boolean {
  return err instanceof Error && err.name === "WealthsimpleAuthError";
}
