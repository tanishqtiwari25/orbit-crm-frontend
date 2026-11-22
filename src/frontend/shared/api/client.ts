export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let refreshPromise: Promise<Response> | undefined;
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const options = {
    ...init,
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    cache: "no-store" as const,
  };
  let r = await fetch(`/api/${path}`, options);
  if (r.status === 401 && !path.startsWith("auth/")) {
    refreshPromise ??= fetch("/api/auth/refresh", { method: "POST" }).finally(
      () => {
        refreshPromise = undefined;
      },
    );
    if ((await refreshPromise).ok) r = await fetch(`/api/${path}`, options);
    else {
      window.location.assign("/login");
      throw new ApiError("Sign in to continue.", 401);
    }
  }
  const d = await r.json();
  if (!r.ok) throw new ApiError(d.error ?? "Request failed.", r.status);
  return d as T;
}
export const mutate = <T>(path: string, data: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(data) });
