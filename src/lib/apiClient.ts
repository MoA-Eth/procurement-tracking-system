import { authTokenManager } from "./authTokenManager";

export const BACKEND_API_URL = (() => {
  const envUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    process.env.BACKEND_API_URL ||
    "https://procurement-tracking-system-backend-3g8n.onrender.com/api";
  let url = envUrl.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }
  return url;
})();

export class ApiClientError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

export async function directApiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, skipAuth, headers: customHeaders, ...fetchOptions } = options;

  // Build full URL
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/")) {
    cleanPath = cleanPath.slice(4);
  }
  const url = new URL(`${BACKEND_API_URL}${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Build headers
  const headers = new Headers(customHeaders);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    fetchOptions.body &&
    typeof fetchOptions.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Attach in-memory token if available and not skipped
  if (!skipAuth) {
    const token = authTokenManager.getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Network error: Unable to connect to backend server.";
    throw new ApiClientError(errorMsg, 0, null);
  }

  // Parse response
  let responseData: any = null;
  const rawText = await response.text();

  if (rawText && rawText.trim()) {
    try {
      responseData = JSON.parse(rawText);
    } catch {
      responseData = rawText;
    }
  }

  if (!response.ok) {
    let errorMsg =
      response.statusText || `Request failed with status ${response.status}`;
    if (responseData) {
      if (typeof responseData === "object") {
        if (responseData.message) {
          errorMsg = Array.isArray(responseData.message)
            ? responseData.message.join(", ")
            : responseData.message;
        } else if (responseData.error) {
          errorMsg = responseData.error;
        }
      } else if (typeof responseData === "string") {
        errorMsg = responseData;
      }
    }
    if (response.status === 401) {
      const isAuthAttempt =
        cleanPath.includes("/auth/login") || Boolean(skipAuth);
      if (!isAuthAttempt && typeof window !== "undefined") {
        authTokenManager.clearToken();
        try {
          window.sessionStorage.removeItem("pts_tab_session");
          window.sessionStorage.removeItem("pts_auth_token");
          window.sessionStorage.removeItem("moa_auth_token");
        } catch {}
        if (typeof document !== "undefined") {
          const cookieName =
            process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "moa_user_session";
          document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
          document.cookie = "moa_session=; path=/; max-age=0; SameSite=Lax";
        }
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }

    const formattedError = `[${fetchOptions.method || "GET"} ${cleanPath}]: ${errorMsg}`;
    console.warn(`API Notice (${response.status}):`, formattedError);
    throw new ApiClientError(errorMsg, response.status, responseData);
  }

  return responseData as T;
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return directApiFetch<T>(path, { ...options, method: "GET" });
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return directApiFetch<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return directApiFetch<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return directApiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return directApiFetch<T>(path, { ...options, method: "DELETE" });
  },
};
