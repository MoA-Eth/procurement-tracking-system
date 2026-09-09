"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tabSessionManager } from "@/lib/tabSessionManager";
interface TabSessionGuardProps {
    children: ReactNode;
}
export function TabSessionGuard({ children }: TabSessionGuardProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    useEffect(() => {
        if (tabSessionManager.hasTabSession()) {
            setIsAuthorized(true);

        } else {
            setIsAuthorized(false);
            router.replace("/");
        }
    }, [router]);
    if (isAuthorized === null || isAuthorized === false) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A3C2F] border-t-transparent" />
                    <p className="text-xs font-semibold text-slate-500"> Checking... </p>
                </div>
            </div>
        )
    }
    return <> {children} </>
}
