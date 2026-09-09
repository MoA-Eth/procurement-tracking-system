import type { AuthSession } from "./authTypes";

const TAB_SESSION_KEY = "pts_tab_session";
const TAB_AUTH_TOKEN_KEY = "pts_auth_token";

export const tabSessionManager = {
    hasTabSession(): boolean {
        if (typeof window === "undefined") return false;
        try {
            const raw = window.sessionStorage.getItem(TAB_SESSION_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return Boolean(parsed && parsed.user && parsed.status === "AUTHENTICATED");

        } catch {
            return false;
        }
    },
    getTabSession(): AuthSession | null {
        if (typeof window === "undefined") return null;
        try {
            const raw = window.sessionStorage.getItem(TAB_SESSION_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as AuthSession;
        } catch {
            return null;
        }
    },
    setTabSession(session: AuthSession): void {
        if (typeof window === "undefined") return;
        try {
            window.sessionStorage.setItem(TAB_SESSION_KEY, JSON.stringify(session));
            const token = session.accessToken;
            if (token) {
                window.sessionStorage.setItem(TAB_AUTH_TOKEN_KEY, token);
                window.sessionStorage.setItem("moa_auth_token", token);
            }

        } catch (err) {
            console.error("failed to save tab session", err);
        }
    },
    clearTabSession(): void {
        if (typeof window === "undefined") return;
        try {
            window.sessionStorage.removeItem(TAB_SESSION_KEY);
            window.sessionStorage.removeItem(TAB_AUTH_TOKEN_KEY);
            window.sessionStorage.removeItem("moa_auth_token");
        } catch { }
    }
}