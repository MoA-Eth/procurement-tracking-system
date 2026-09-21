"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, User, History, ArrowRight } from "lucide-react";
import type { ApiUser, AuditLogEntry } from "@/lib/adminApi";

interface AdminDashboardSearchProps {
  value: string;
  onChange: (val: string) => void;
  users: ApiUser[];
  logs: AuditLogEntry[];
  placeholder?: string;
}

export function AdminDashboardSearch({
  value,
  onChange,
  users,
  logs,
  placeholder = "Search accounts, roles, logs...",
}: AdminDashboardSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: '/' or 'Ctrl+K' / 'Cmd+K' to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered preview for the instant dropdown
  const query = value.trim().toLowerCase();

  const matchedUsers = useMemo(() => {
    if (!query) return [];
    return users
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.role?.toLowerCase().includes(query) ||
          u.authRole?.toLowerCase().includes(query),
      )
      .slice(0, 4);
  }, [users, query]);

  const matchedLogs = useMemo(() => {
    if (!query) return [];
    return logs
      .filter(
        (l) =>
          l.user?.email?.toLowerCase().includes(query) ||
          l.user?.name?.toLowerCase().includes(query) ||
          l.action?.toLowerCase().includes(query),
      )
      .slice(0, 3);
  }, [logs, query]);

  const totalMatches = matchedUsers.length + matchedLogs.length;

  return (
    <div ref={containerRef} className="relative w-full sm:w-80">
      {/* Input container */}
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => {
            if (value.trim()) setIsOpen(true);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full h-10 pl-9.5 pr-14 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs transition-colors"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Floating Instant Search Dropdown */}
      {isOpen && value.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {/* 1. Matched User Accounts */}
            {matchedUsers.length > 0 && (
              <div className="p-2">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User size={12} />
                  <span>Accounts ({matchedUsers.length})</span>
                </div>
                <div className="space-y-0.5">
                  {matchedUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/workspace/admin?tab=users&search=${encodeURIComponent(u.email)}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-800 truncate group-hover:text-emerald-700">
                          {u.name || u.displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {u.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {u.authRole || u.role}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                          title={u.isActive ? "Active" : "Inactive"}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Matched System Logs */}
            {matchedLogs.length > 0 && (
              <div className="p-2">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History size={12} />
                  <span>Audit Logs ({matchedLogs.length})</span>
                </div>
                <div className="space-y-0.5">
                  {matchedLogs.map((l) => (
                    <Link
                      key={l.id}
                      href="/workspace/admin?tab=logs"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-slate-800 truncate group-hover:text-emerald-700">
                          {l.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {l.user?.email || "System"}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Empty state */}
            {totalMatches === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-700">No matches found</p>
                <p className="mt-1 text-slate-400">
                  No accounts or logs match &ldquo;{value}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Quick shortcuts footer */}
          <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Press{" "}
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-semibold">
                ESC
              </kbd>{" "}
              to close
            </span>
            <Link
              href={`/workspace/admin?tab=users&search=${encodeURIComponent(value)}`}
              onClick={() => setIsOpen(false)}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage users</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
