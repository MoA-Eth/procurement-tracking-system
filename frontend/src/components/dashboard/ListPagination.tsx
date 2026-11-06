"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function useListPagination<T>(items: readonly T[], pageSize = 15) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = items.length ? (currentPage - 1) * pageSize : 0;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  return {
    pageItems,
    page: currentPage,
    pageCount,
    startIndex,
    endIndex: Math.min(startIndex + pageItems.length, items.length),
    setPage,
  };
}

export function PaginationControls({
  page,
  pageCount,
  startIndex,
  endIndex,
  totalItems,
  setPage,
}: {
  page: number;
  pageCount: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  setPage: (page: number) => void;
}) {
  if (totalItems <= 15) return null;

  return (
    <nav
      aria-label="List pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-sm"
    >
      <p className="text-xs text-slate-600" aria-live="polite">
        Showing {startIndex + 1}–{endIndex} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="min-w-16 text-center text-xs text-slate-600">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => setPage(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export function HorizontalTableScroller({
  children,
  className = "",
  label = "Table",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    const bottom = bottomRef.current;
    const spacer = spacerRef.current;
    if (!content || !bottom || !spacer) return;

    const updateSize = () => {
      const width = content.scrollWidth;
      spacer.style.width = `${width}px`;
      setIsScrollable(width > content.clientWidth + 1);
    };
    const syncBottom = () => {
      if (bottom.scrollLeft !== content.scrollLeft) {
        bottom.scrollLeft = content.scrollLeft;
      }
    };
    const syncContent = () => {
      if (content.scrollLeft !== bottom.scrollLeft) {
        content.scrollLeft = bottom.scrollLeft;
      }
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateSize);
    observer?.observe(content);
    if (content.firstElementChild instanceof HTMLElement) {
      observer?.observe(content.firstElementChild);
    }
    updateSize();
    content.addEventListener("scroll", syncBottom, { passive: true });
    bottom.addEventListener("scroll", syncContent, { passive: true });
    window.addEventListener("resize", updateSize);

    return () => {
      observer?.disconnect();
      content.removeEventListener("scroll", syncBottom);
      bottom.removeEventListener("scroll", syncContent);
      window.removeEventListener("resize", updateSize);
    };
  }, [children]);

  return (
    <div className={className}>
      <div ref={contentRef} className="overflow-x-auto">
        {children}
      </div>
      <div
        ref={bottomRef}
        role="region"
        tabIndex={0}
        aria-label={`${label} horizontal scrollbar`}
        className={`mt-1 overflow-x-auto focus-visible:outline-2 focus-visible:outline-emerald-700 ${isScrollable ? "" : "invisible h-0"}`}
      >
        <div ref={spacerRef} className="h-px" />
      </div>
    </div>
  );
}
