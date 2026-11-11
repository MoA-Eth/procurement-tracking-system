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

  const visiblePages = [
    ...new Set(
      [1, page - 1, page, page + 1, pageCount].filter(
        (pageNumber) => pageNumber >= 1 && pageNumber <= pageCount,
      ),
    ),
  ].sort((left, right) => left - right);
  const pageItems: (number | "ellipsis")[] = [];
  visiblePages.forEach((pageNumber, index) => {
    if (index > 0 && pageNumber - visiblePages[index - 1] > 1) {
      pageItems.push("ellipsis");
    }
    pageItems.push(pageNumber);
  });

  return (
    <nav
      aria-label="List pagination"
      className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs font-medium text-slate-600" aria-live="polite">
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {startIndex + 1}–{endIndex}
        </span>{" "}
        of <span className="font-semibold text-slate-900">{totalItems}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Page numbers"
        >
          {pageItems.map((pageItem, index) =>
            pageItem === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-xs text-slate-400"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={pageItem}
                type="button"
                onClick={() => setPage(pageItem)}
                aria-label={`Page ${pageItem}`}
                aria-current={pageItem === page ? "page" : undefined}
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                  pageItem === page
                    ? "bg-[#00843D] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {pageItem}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={() => setPage(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          aria-label="Next page"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
      <div
        ref={contentRef}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div
        ref={bottomRef}
        role="region"
        tabIndex={0}
        aria-label={`${label} horizontal scrollbar`}
        className={`mt-1 overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-emerald-700 ${isScrollable ? "h-4" : "invisible h-0"}`}
      >
        <div ref={spacerRef} className="h-px" />
      </div>
    </div>
  );
}
