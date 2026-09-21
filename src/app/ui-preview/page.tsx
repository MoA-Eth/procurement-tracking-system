"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  Gavel,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// Real sample activities matching the exact MoA schema and Directorate review view
const MOCK_ACTIVITIES = [
  {
    id: "act-1",
    activityRefNo: "MOA-G-01",
    description:
      "Procurement of 120HP Agricultural Tractors & Implements for Regional Centers",
    category: "Goods",
    method: "RFB - International",
    review: "Prior",
    estimatedAmount: "ETB 45,000,000.00",
    status: "Under Review",
    isFlagged: true,
    flagReason: "Technical specifications need revision as per committee notes",
    badgeType: "flagged",
  },
  {
    id: "act-2",
    activityRefNo: "MOA-CW-02",
    description:
      "Construction of Regional Certified Seed Storage Warehouse in Hawassa",
    category: "Works",
    method: "RFB - National",
    review: "Post",
    estimatedAmount: "ETB 18,500,000.00",
    status: "Completed",
    isFlagged: false,
    badgeType: "approved",
  },
  {
    id: "act-3",
    activityRefNo: "MOA-CS-03",
    description:
      "Consultancy Services for Small-Scale Irrigation Master Plan & Feasibility Study",
    category: "Consulting",
    method: "QCBS",
    review: "Prior",
    estimatedAmount: "ETB 6,200,000.00",
    status: "In Progress",
    isFlagged: false,
    badgeType: "in-progress",
  },
  {
    id: "act-4",
    activityRefNo: "MOA-G-04",
    description:
      "Supply and Delivery of Disease-Resistant Wheat Seed Varieties",
    category: "Goods",
    method: "Direct Procurement",
    review: "Prior",
    estimatedAmount: "ETB 28,900,000.00",
    status: "Delayed",
    isFlagged: false,
    badgeType: "delayed",
  },
  {
    id: "act-5",
    activityRefNo: "MOA-NCS-05",
    description:
      "Specialized Transport & Logistics Services for National Fertilizer Distribution",
    category: "Non-Consulting",
    method: "RFQ / Shopping",
    review: "Post",
    estimatedAmount: "ETB 4,150,000.00",
    status: "Not Started",
    isFlagged: false,
    badgeType: "not-started",
  },
];

export default function UIPreviewPage() {
  // Mode: "standardized" = unified theme, color, font & size
  const [mode, setMode] = useState<"standardized" | "current">("standardized");
  // Banner Theme: replace cliche #fdfbef with professional colors
  const [bannerTheme, setBannerTheme] = useState<
    "executive-white" | "moa-mint" | "slate-clean" | "cliche-amber"
  >("slate-clean");
  const [badgeStyle, setBadgeStyle] = useState<
    "dot-tag" | "text-dot" | "muted-tag" | "pastel-pill"
  >("muted-tag");
  const [activeNav, setActiveNav] = useState("Plan for Review");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const isStandardized = mode === "standardized";

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* ── TOP CONTROL BAR: TOGGLE BETWEEN CURRENT AND STANDARDIZED THEME ── */}
      <div className="sticky top-0 z-50 bg-[#072F25] text-white border-b border-[#0A3C2F] px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-[#A3E635] text-[#082920]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[#A3E635] uppercase tracking-wider">
                  Live Interactive Design Inspector
                </p>
                <h1 className="text-sm font-semibold text-white">
                  MoA Procurement Tracking System — Theme &amp; Status Badge
                  Inspector
                </h1>
              </div>
            </div>

            {/* Notice Card Style Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-emerald-200 font-medium">
                Notice Banner:
              </span>
              <div className="flex items-center gap-1 bg-[#0A3C2F] p-1 rounded-xl border border-[#072F25]">
                <button
                  onClick={() => {
                    setBannerTheme("slate-clean");
                    setMode("standardized");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bannerTheme === "slate-clean" && isStandardized
                      ? "bg-[#A3E635] text-[#082920] shadow-xs"
                      : "text-[#D1F2E7] hover:text-white"
                  }`}
                  title="Clean neutral slate card with normal border"
                >
                  Clean Slate (Normal Border)
                </button>

                <button
                  onClick={() => {
                    setBannerTheme("executive-white");
                    setMode("standardized");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bannerTheme === "executive-white" && isStandardized
                      ? "bg-[#A3E635] text-[#082920] shadow-xs"
                      : "text-[#D1F2E7] hover:text-white"
                  }`}
                  title="Crisp white card with normal border"
                >
                  Executive White
                </button>

                <button
                  onClick={() => {
                    setBannerTheme("moa-mint");
                    setMode("standardized");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bannerTheme === "moa-mint" && isStandardized
                      ? "bg-[#A3E635] text-[#082920] shadow-xs"
                      : "text-[#D1F2E7] hover:text-white"
                  }`}
                  title="Subtle fresh agricultural mint tint"
                >
                  MoA Mint
                </button>

                <button
                  onClick={() => {
                    setBannerTheme("cliche-amber");
                    setMode("current");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bannerTheme === "cliche-amber" || !isStandardized
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-[#D1F2E7] hover:text-white"
                  }`}
                  title="Original pale yellow #fdfbef cliche amber"
                >
                  Original (#fdfbef Cliche)
                </button>
              </div>
            </div>
          </div>

          {/* Status Badge Style Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#0A3C2F]">
            <span className="text-xs text-emerald-200 font-medium">
              Table Status Badges:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0A3C2F] p-1 rounded-xl border border-[#072F25]">
              <button
                onClick={() => setBadgeStyle("dot-tag")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  badgeStyle === "dot-tag"
                    ? "bg-[#A3E635] text-[#082920] shadow-xs"
                    : "text-[#D1F2E7] hover:text-white"
                }`}
                title="Discrete status dot + subtle neutral tag (No candy rainbow)"
              >
                1. Dot + Subtle Tag (Recommended)
              </button>

              <button
                onClick={() => setBadgeStyle("text-dot")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  badgeStyle === "text-dot"
                    ? "bg-[#A3E635] text-[#082920] shadow-xs"
                    : "text-[#D1F2E7] hover:text-white"
                }`}
                title="Minimalist clean text with colored dot (No background blob)"
              >
                2. Minimalist Text + Dot
              </button>

              <button
                onClick={() => setBadgeStyle("muted-tag")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  badgeStyle === "muted-tag"
                    ? "bg-[#A3E635] text-[#082920] shadow-xs"
                    : "text-[#D1F2E7] hover:text-white"
                }`}
                title="Muted square-rounded tags with calm low-saturation tints"
              >
                3. Muted Rounded Tag
              </button>

              <button
                onClick={() => setBadgeStyle("pastel-pill")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  badgeStyle === "pastel-pill"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-[#D1F2E7] hover:text-white"
                }`}
                title="The current full-round oval pastel candy pills"
              >
                Current Pastel Pills (Candy Style)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN SHELL: EXACT APPSHELL LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT SIDEBAR (EXACT APPSHELL SIDEBAR) ── */}
        <aside
          className={`flex w-64 flex-col justify-between shrink-0 border-r transition-colors ${
            isStandardized
              ? "bg-[#0A3C2F] text-white border-[#072F25]"
              : "bg-[#0A3C2F] text-white border-[#072F25]"
          }`}
        >
          <div>
            {/* Header / Logo */}
            <div className="p-4 flex items-center gap-3.5 border-b border-[#0A3C2F] bg-[#072F25]">
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-white shadow-sm border border-emerald-300/30 relative">
                <Image
                  src="/moa-logo.png"
                  alt="Ministry of Agriculture emblem"
                  width={220}
                  height={220}
                  priority
                  className="absolute w-28 h-auto max-w-none"
                  style={{ left: "-33px", top: "-4px" }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={
                    isStandardized
                      ? "font-semibold text-sm tracking-tight text-white leading-tight"
                      : "font-semibold text-md tracking-tight text-white leading-tight"
                  }
                >
                  MoA PTS
                </p>
                <p className="text-xs text-emerald-200 font-medium tracking-wide truncate mt-0.5">
                  Directorate Oversight
                </p>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="p-3 space-y-1 mt-2">
              {[
                { label: "Dashboard", icon: LayoutDashboard },
                { label: "Projects", icon: FolderKanban },
                { label: "Plan for Review", icon: ClipboardCheck },
                { label: "Committee Progress", icon: ListChecks },
                { label: "My Decisions", icon: Gavel },
                { label: "Reports", icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveNav(item.label)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-left ${
                      isStandardized
                        ? isActive
                          ? "bg-[#A3E635] text-[#082920] font-semibold shadow-xs"
                          : "text-[#D1F2E7] hover:bg-[#072F25] hover:text-white font-medium text-sm"
                        : isActive
                          ? "bg-[#A3E635] text-[#082920] font-semibold shadow-sm"
                          : "text-[#D1F2E7] hover:bg-[#072F25] hover:text-white text-sm font-medium"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={
                        isActive ? "text-[#082920]" : "text-emerald-300"
                      }
                    />
                    <span className={isStandardized ? "text-sm" : "text-sm"}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Card */}
          <div className="border-t border-[#0A3C2F] bg-[#072F25] p-3 space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#D1F2E7] hover:bg-[#072F25]/70 cursor-pointer">
              <Settings size={18} className="text-emerald-300" />
              <span className="text-sm font-medium">Settings</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#0A3C2F]/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-emerald-100 flex items-center justify-center font-semibold text-xs shrink-0">
                  DA
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    Director Abebe
                  </p>
                  <p className="text-[11px] text-emerald-300 truncate">
                    DIRECTOR
                  </p>
                </div>
              </div>
              <LogOut
                size={16}
                className="text-emerald-300/70 hover:text-white cursor-pointer"
              />
            </div>
          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT (EXACT DIRECTOR ACTIVITIES LIST VIEW) ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Top Header / Breadcrumb Bar */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <nav
              aria-label="Breadcrumb"
              className={`flex items-center gap-1.5 ${
                isStandardized ? "text-xs font-medium" : "text-xs"
              }`}
            >
              <Link
                href="#"
                className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <Home className="h-3.5 w-3.5" />
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-slate-500 hover:text-slate-900 cursor-pointer">
                Plan for Review
              </span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span
                className={`truncate max-w-[320px] ${
                  isStandardized
                    ? "font-semibold text-[#0A3C2F]"
                    : "font-semibold text-[#0A3C2F]"
                }`}
              >
                MoA 2017 EFY Agricultural Inputs &amp; Machinery Plan
              </span>
            </nav>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Fiscal Year 2017 EFY
              </span>
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 border border-slate-200 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>
            </div>
          </div>

          {/* PAGE TITLE */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className={
                  isStandardized
                    ? "text-xl font-semibold text-[#0A3C2F] tracking-tight"
                    : "text-lg font-semibold text-slate-950 tracking-tight"
                }
              >
                Package Activities Directory
              </h2>
              <p
                className={
                  isStandardized
                    ? "text-xs text-slate-600 mt-0.5"
                    : "text-xs text-slate-500 mt-0.5"
                }
              >
                Review and monitor planned activities, procurement methods,
                review thresholds, and roadmap milestones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs transition-all shadow-xs cursor-pointer ${
                  isStandardized
                    ? "bg-[#006837] hover:bg-[#00552c] font-semibold"
                    : "bg-[#006837] hover:bg-[#00552c] font-semibold"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#A3E635]" />
                Export Activity Sheet
              </button>
            </div>
          </div>

          {/* COMMITTEE FEEDBACK & FLAGGED ACTIVITIES BANNER (DYNAMIC PROFESSIONAL THEMES) */}
          <section
            className={`transition-all ${
              bannerTheme === "executive-white"
                ? "rounded-xl p-4 shadow-2xs space-y-3 bg-white border border-slate-200"
                : bannerTheme === "moa-mint"
                  ? "rounded-xl p-4 shadow-2xs space-y-3 bg-[#F0FDF4] border border-emerald-200/90"
                  : bannerTheme === "slate-clean"
                    ? "rounded-xl p-4 shadow-2xs space-y-3 bg-[#F8FAFC] border border-slate-200"
                    : "rounded-xl p-4 shadow-2xs space-y-3 border border-amber-200/80 bg-amber-50/70"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`shrink-0 ${
                    bannerTheme === "executive-white"
                      ? "p-1.5 rounded-lg bg-emerald-50 text-[#0A3C2F] border border-emerald-200"
                      : bannerTheme === "moa-mint"
                        ? "p-1.5 rounded-lg bg-white text-[#006837] border border-emerald-200"
                        : bannerTheme === "slate-clean"
                          ? "p-1.5 rounded-lg bg-white text-slate-700 border border-slate-200"
                          : "p-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-700"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3
                    className={
                      bannerTheme === "executive-white" ||
                      bannerTheme === "moa-mint"
                        ? "text-xs font-semibold text-[#0A3C2F] uppercase tracking-wider"
                        : bannerTheme === "slate-clean"
                          ? "text-xs font-semibold text-slate-900 uppercase tracking-wider"
                          : "text-xs font-semibold text-amber-950 uppercase tracking-wider"
                    }
                  >
                    Committee Review: Activity-Specific Objections Registered
                  </h3>
                  <p
                    className={
                      bannerTheme === "executive-white" ||
                      bannerTheme === "slate-clean"
                        ? "text-xs text-slate-600 mt-0.5"
                        : bannerTheme === "moa-mint"
                          ? "text-xs text-emerald-900/90 mt-0.5"
                          : "text-xs text-amber-900/90 mt-0.5"
                    }
                  >
                    Endorsement Committee members highlighted specific items
                    below requiring specification revision before final
                    endorsement.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs shrink-0 ${
                  bannerTheme === "executive-white"
                    ? "font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    : bannerTheme === "moa-mint"
                      ? "font-medium bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : bannerTheme === "slate-clean"
                        ? "font-medium bg-slate-200 text-slate-800 border border-slate-300"
                        : "font-semibold text-[11px] bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                Objection in Progress (2 Votes)
              </span>
            </div>

            {/* Flagged Activities Badges */}
            <div
              className={`flex flex-wrap items-center gap-2 pt-2 border-t text-xs ${
                bannerTheme === "executive-white" ||
                bannerTheme === "slate-clean"
                  ? "border-slate-100"
                  : bannerTheme === "moa-mint"
                    ? "border-emerald-200/60"
                    : "border-amber-200/60"
              }`}
            >
              <span
                className={`text-xs ${
                  bannerTheme === "executive-white" ||
                  bannerTheme === "slate-clean"
                    ? "font-semibold text-slate-800"
                    : bannerTheme === "moa-mint"
                      ? "font-semibold text-emerald-950"
                      : "font-semibold text-amber-950 text-[11px]"
                }`}
              >
                Flagged Activities:
              </span>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 font-mono text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  isStandardized
                    ? "text-xs font-semibold"
                    : "font-semibold text-[11px]"
                }`}
              >
                <AlertCircle className="h-3 w-3 text-rose-600" />
                <span>MOA-G-01</span>
                <span className="font-sans text-[11px] text-rose-700">
                  ↓ Jump to Activity
                </span>
              </button>
            </div>

            {/* Feedback Remarks */}
            <div
              className={`rounded-lg p-3.5 shadow-2xs ${
                bannerTheme === "executive-white"
                  ? "text-xs bg-slate-50 border border-slate-200/80 text-slate-800"
                  : bannerTheme === "moa-mint"
                    ? "text-xs bg-white/95 border border-emerald-200/80 text-emerald-950"
                    : bannerTheme === "slate-clean"
                      ? "text-xs bg-white border border-slate-200 text-slate-800"
                      : "text-xs bg-white/90 border border-amber-200/80 text-amber-950"
              }`}
            >
              <span
                className={
                  isStandardized
                    ? "font-semibold text-slate-800"
                    : "font-semibold text-slate-800"
                }
              >
                Committee Feedback &amp; Deliberation Notes:{" "}
              </span>
              <span className="italic text-slate-700 font-medium">
                &ldquo;Please revise the engine emissions standard to Tier-3 and
                extend delivery schedule to 90 days for the 120HP
                tractors.&rdquo;
              </span>
            </div>
          </section>

          {/* SEARCH & FILTER BAR (EXACT CURRENT CODE) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search package activities by Ref No or Description..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none transition-colors ${
                  isStandardized
                    ? "text-sm focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
                    : "text-xs focus:border-[#0A3C2F]"
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className={`bg-transparent text-slate-700 outline-none ${
                    isStandardized
                      ? "text-xs font-medium"
                      : "text-xs font-semibold"
                  }`}
                >
                  <option value="ALL">All Methods</option>
                  <option value="RFB - National">RFB - National</option>
                  <option value="RFB - International">
                    RFB - International
                  </option>
                  <option value="RFQ / Shopping">RFQ / Shopping</option>
                  <option value="QCBS">QCBS</option>
                  <option value="Direct Procurement">Direct Procurement</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  className={`bg-transparent text-slate-700 outline-none ${
                    isStandardized
                      ? "text-xs font-medium"
                      : "text-xs font-semibold"
                  }`}
                >
                  <option value="ALL">All Reviews</option>
                  <option value="Prior">Prior Review</option>
                  <option value="Post">Post Review</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`bg-transparent text-slate-700 outline-none ${
                    isStandardized
                      ? "text-xs font-medium"
                      : "text-xs font-semibold"
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Not Started">Not Started</option>
                </select>
              </div>
            </div>
          </div>

          {/* PACKAGE ACTIVITIES DIRECTORY TABLE (EXACT TABLE FROM DIRECTORACTIVITIESLISTVIEW) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr
                    className={`bg-[#0A3C2F] text-white uppercase tracking-wider ${
                      isStandardized
                        ? "text-xs font-semibold"
                        : "text-[11px] font-semibold"
                    }`}
                  >
                    <th className="py-3 px-3.5 w-10 text-center">#</th>
                    <th className="py-3 px-3.5 min-w-[170px]">
                      Activity Ref No
                    </th>
                    <th className="py-3 px-3.5 min-w-[280px]">
                      Description &amp; Scope
                    </th>
                    <th className="py-3 px-3.5 min-w-[160px]">
                      Method / Market
                    </th>
                    <th className="py-3 px-3.5 min-w-[90px]">Review</th>
                    <th className="py-3 px-3.5 min-w-[150px]">
                      Estimated Amount
                    </th>
                    <th className="py-3 px-3.5 text-center min-w-[120px]">
                      Status
                    </th>
                    <th className="py-3 px-3.5 text-center w-24">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {MOCK_ACTIVITIES.map((act, index) => {
                    return (
                      <tr
                        key={act.id}
                        className={`transition-colors cursor-pointer ${
                          act.isFlagged
                            ? "bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-rose-600"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* 1. Sequence # */}
                        <td
                          className={`py-3 px-3.5 text-center font-mono ${
                            isStandardized
                              ? "text-xs text-slate-500 font-medium"
                              : "text-xs text-slate-400 font-semibold"
                          }`}
                        >
                          {index + 1}
                        </td>

                        {/* 2. Activity Ref No */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-mono text-slate-900 ${
                                isStandardized
                                  ? "text-xs font-semibold"
                                  : "text-xs font-semibold"
                              }`}
                            >
                              {act.activityRefNo}
                            </span>
                            {act.badgeType === "approved" && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                                  isStandardized
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold"
                                }`}
                              >
                                ✓ Approved
                              </span>
                            )}
                          </div>
                          {act.isFlagged && (
                            <span
                              className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] bg-rose-100 text-rose-800 border border-rose-300 ${
                                isStandardized ? "font-medium" : "font-semibold"
                              }`}
                            >
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              Flagged by Committee
                            </span>
                          )}
                        </td>

                        {/* 3. Description & Scope */}
                        <td className="py-3 px-3.5 max-w-sm">
                          <p
                            className={`text-slate-900 leading-snug line-clamp-2 ${
                              isStandardized
                                ? "text-sm font-normal"
                                : "text-xs font-semibold"
                            }`}
                          >
                            {act.description}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Category:{" "}
                            <span className="font-medium text-slate-700">
                              {act.category}
                            </span>
                          </p>
                        </td>

                        {/* 4. Method / Market */}
                        <td className="py-3 px-3.5">
                          <div
                            className={
                              isStandardized
                                ? "text-xs font-semibold text-[#0A3C2F]"
                                : "text-xs font-semibold text-[#0A3C2F]"
                            }
                          >
                            {act.method}
                          </div>
                        </td>

                        {/* 5. Review */}
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              act.review === "Prior"
                                ? "bg-purple-100 text-purple-800 font-medium"
                                : "bg-slate-100 text-slate-700 font-medium"
                            }`}
                          >
                            {act.review}
                          </span>
                        </td>

                        {/* 6. Estimated Amount */}
                        <td className="py-3 px-3.5 font-mono">
                          <span
                            className={
                              isStandardized
                                ? "text-xs font-semibold text-[#006837]"
                                : "text-xs font-semibold text-[#0A3C2F]"
                            }
                          >
                            {act.estimatedAmount}
                          </span>
                        </td>

                        {/* 7. Status Badge */}
                        <td className="py-3 px-3.5 text-center">
                          {(() => {
                            if (badgeStyle === "dot-tag") {
                              const dotConfig: Record<
                                string,
                                {
                                  dot: string;
                                  text: string;
                                  bg: string;
                                  border: string;
                                }
                              > = {
                                Completed: {
                                  dot: "bg-emerald-600",
                                  text: "text-slate-800",
                                  bg: "bg-emerald-50/70",
                                  border: "border-emerald-200",
                                },
                                "In Progress": {
                                  dot: "bg-blue-600",
                                  text: "text-slate-800",
                                  bg: "bg-blue-50/70",
                                  border: "border-blue-200",
                                },
                                "Under Review": {
                                  dot: "bg-slate-600",
                                  text: "text-slate-800",
                                  bg: "bg-slate-100",
                                  border: "border-slate-200",
                                },
                                Delayed: {
                                  dot: "bg-rose-600",
                                  text: "text-slate-800",
                                  bg: "bg-rose-50/70",
                                  border: "border-rose-200",
                                },
                                "Not Started": {
                                  dot: "bg-slate-400",
                                  text: "text-slate-600",
                                  bg: "bg-slate-50",
                                  border: "border-slate-200",
                                },
                              };
                              const c =
                                dotConfig[act.status] ||
                                dotConfig["Not Started"];
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`}
                                  ></span>
                                  <span>{act.status}</span>
                                </span>
                              );
                            }

                            if (badgeStyle === "text-dot") {
                              const dotColors: Record<string, string> = {
                                Completed: "bg-emerald-600",
                                "In Progress": "bg-blue-600",
                                "Under Review": "bg-slate-600",
                                Delayed: "bg-rose-600",
                                "Not Started": "bg-slate-400",
                              };
                              return (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800">
                                  <span
                                    className={`w-2 h-2 rounded-full ${dotColors[act.status] || "bg-slate-400"} shrink-0`}
                                  ></span>
                                  <span>{act.status}</span>
                                </span>
                              );
                            }

                            if (badgeStyle === "muted-tag") {
                              const tagConfig: Record<string, string> = {
                                Completed:
                                  "bg-emerald-50 text-emerald-800 border-emerald-200/80",
                                "In Progress":
                                  "bg-blue-50/60 text-blue-800 border-blue-200/80",
                                "Under Review":
                                  "bg-slate-100 text-slate-800 border-slate-200",
                                Delayed:
                                  "bg-rose-50 text-rose-800 border-rose-200/80",
                                "Not Started":
                                  "bg-slate-50 text-slate-600 border-slate-200/70",
                              };
                              return (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${tagConfig[act.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                                >
                                  {act.status}
                                </span>
                              );
                            }

                            // pastel-pill (Exact colors from reference image)
                            const pillConfig: Record<string, string> = {
                              Completed:
                                "bg-[#D1FADF] text-[#027A48] border-[#A6F4C5]",
                              "In Progress":
                                "bg-[#D1E9FF] text-[#175CD3] border-[#B2DDFF]",
                              "Under Review":
                                "bg-[#EEF2F6] text-[#344054] border-[#D0D5DD]",
                              Delayed:
                                "bg-[#FEE4E2] text-[#B42318] border-[#FECDCA]",
                              "Not Started":
                                "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
                            };
                            return (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${pillConfig[act.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                              >
                                {act.status}
                              </span>
                            );
                          })()}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-3.5 text-center">
                          <button
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                              isStandardized
                                ? "bg-white hover:bg-emerald-50 text-[#0A3C2F] border-emerald-200 font-semibold"
                                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 font-semibold"
                            }`}
                          >
                            <Eye className="h-3.5 w-3.5 text-[#0A3C2F]" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <span className="font-medium">
                Showing <strong>5</strong> of <strong>5</strong> package
                activities
              </span>
              <span className="font-mono font-semibold text-[#006837]">
                Total Package Value: ETB 102,750,000.00
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
