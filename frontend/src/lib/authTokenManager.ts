/**
 * In-Memory Authentication Token Manager
 *
 * SECURITY DESIGN (XSS Protection):
 * Storing access tokens in localStorage or sessionStorage exposes them to
 * Cross-Site Scripting (XSS) extraction via `localStorage.getItem()`.
 *
 * This module keeps the active JWT access token purely in an in-memory closure.
 * It is never written to disk or browser web storage. When a page is reloaded,
 * the session is restored via cookie or re-authentication.
 */

let inMemoryAccessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export const authTokenManager = {
  /**
   * Get the current in-memory access token.
   */
  getToken(): string | null {
    if (inMemoryAccessToken) {
      return inMemoryAccessToken;
    }

    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("moa_auth_token");
      if (stored) {
        inMemoryAccessToken = stored;
        return stored;
      }
    }

    if (typeof document !== "undefined") {
      const cookieNames = [
        process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || "moa_user_session",
        "moa_session",
      ];
      for (const name of cookieNames) {
        const regex = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
        const match = document.cookie.match(regex);
        if (match && match[1]) {
          const raw = match[1];
          let parsed: any = null;

          // 1. Try base64 decoding
          try {
            const decoded = decodeURIComponent(escape(atob(raw)));
            parsed = JSON.parse(decoded);
          } catch {
            // 2. Try URI decoding
            try {
              parsed = JSON.parse(decodeURIComponent(raw));
            } catch {
              // 3. Try direct parse
              try {
                parsed = JSON.parse(raw);
              } catch {
                // failed
              }
            }
          }

          if (parsed && typeof parsed.accessToken === "string") {
            const tokenStr: string = parsed.accessToken;
            inMemoryAccessToken = tokenStr;
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("moa_auth_token", tokenStr);
            }
            return tokenStr;
          }
        }
      }
    }

    return null;
  },

  /**
   * Set or update the active access token in memory.
   */
  setToken(token: string | null): void {
    inMemoryAccessToken = token;
    if (typeof window !== "undefined") {
      if (token) {
        window.sessionStorage.setItem("moa_auth_token", token);
      } else {
        window.sessionStorage.removeItem("moa_auth_token");
      }
    }
    listeners.forEach((listener) => {
      try {
        listener(token);
      } catch (err) {
        console.error("Error in authToken listener:", err);
      }
    });
  },

  /**
   * Clear the in-memory token on logout.
   */
  clearToken(): void {
    this.setToken(null);
  },

  /**
   * Subscribe to token changes.
   */
  subscribe(listener: (token: string | null) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
